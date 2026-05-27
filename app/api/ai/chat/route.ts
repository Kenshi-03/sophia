import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getSettings } from '@/lib/settings/settings';
import { routeUserQuery } from '@/lib/ai/orchestration/ai-router';
import { assembleAgentContext } from '@/lib/ai/orchestration/context-manager';
import { generateAiResponse } from '@/lib/ai/orchestration/response-generator';
import { retrieveRelevantMemories } from '@/lib/ai/memory/retrieve-memory';
import { getUserSchedule } from '@/lib/db/queries/schedule';
import { decrypt } from '@/lib/security/encryption';
import prisma from '@/lib/db/prisma';
import { WorkingMemory, estimateTokensFromChars } from '@/lib/ai/working-memory/store';
import { traceWorkingMemory, logDevCognitionObservability } from '@/lib/ai/working-memory/observability';
import { TokenBudgetEngine } from '@/lib/ai/working-memory/budget';
import { ContextScoringEngine } from '@/lib/ai/working-memory/scoring';
import { RetrievalArbitrationHooks, DetailFidelityEvaluator } from '@/lib/ai/working-memory/arbitration';
import { ReflectionBuffer } from '@/lib/ai/working-memory/reflection-buffer';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { query, model, aiMode, sessionId } = await request.json();
  if (!query) {
    return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
  }

  // Initialize Working Memory Core
  const wm = new WorkingMemory(user.id, sessionId || 'chat_session_default', query, {
    executionSource: 'chat_api'
  });
  await wm.save();

  const startTime = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;

  try {
    // 1. Transition to 'retrieval_staging'
    await wm.updateState((state) => {
      state.currentStage = 'retrieval_staging';
    });

    // AI agent routing
    const agentType = routeUserQuery(query);

    // Retrieve contextual memories
    const relevantMemories = await retrieveRelevantMemories(user.id, query);

    // Fetch user schedule/events
    const events = await getUserSchedule(user.id);

    // Stage candidates in Working Memory
    await wm.updateState((state) => {
      // Run Retrieval Arbitration Hooks to select/score best candidates deterministically
      const arbitrationResult = RetrievalArbitrationHooks.arbitrate(relevantMemories, {
        sessionId: state.sessionId,
        currentStage: state.currentStage,
        query: query,
        activeRoadmapPhase: process.env.ACTIVE_ROADMAP_PHASE || "phase-d",
        activeSprint: process.env.ACTIVE_SPRINT || "sprint-1",
        activeContinuityCluster: process.env.ACTIVE_CONTINUITY_CLUSTER || "d13-validation"
      });

      state.retrievalStaging.rawCandidates = arbitrationResult.candidates;
      (state.retrievalStaging.metadata as any).arbitrationGuardrails = arbitrationResult.guardrails;
      (state.retrievalStaging.metadata as any).arbitrationTraces = arbitrationResult.traces;

      state.retrievalStaging.temporalCandidates = events.map((e) => ({
        id: e.id,
        title: e.title,
        startTime: typeof e.startTime === 'string' ? e.startTime : e.startTime.toISOString(),
        endTime: typeof e.endTime === 'string' ? e.endTime : e.endTime.toISOString(),
        category: e.categoryName || 'General'
      }));

      // Run Token Budget Engine safe pipeline to enforce budgeting, warning levels, and emergency pruning
      const budgetResult = TokenBudgetEngine.buildSafePipeline(state);
      
      // Update state with pruned/accepted candidates and budgeting metrics
      state.retrievalStaging.rawCandidates = budgetResult.state.retrievalStaging.rawCandidates;
      state.retrievalStaging.metadata = budgetResult.state.retrievalStaging.metadata;
      state.retrievalStaging.traceability.discardedIds = budgetResult.state.retrievalStaging.traceability.discardedIds;
      state.currentTokenCount = budgetResult.state.currentTokenCount;
    });

    // Assemble LLM context payload using the budgeted candidates
    const activeState = wm.getState();
    const context = assembleAgentContext(
      query,
      activeState.retrievalStaging.rawCandidates,
      events,
      {
        sessionId: activeState.sessionId,
        currentStage: activeState.currentStage,
        protectedAnchorIds: (activeState.retrievalStaging.metadata as any).budgetingMetrics?.protectedAnchorIds
      }
    );

    // Call Dev Cognition Observability Logging if enabled
    if (process.env.NODE_ENV === 'development' && process.env.DEV_COGNITION_MODE === 'true') {
      const budgetMetrics = (activeState.retrievalStaging.metadata as any).budgetingMetrics;
      const assembledCtx = (activeState.retrievalStaging.metadata as any).assembledContext;
      
      logDevCognitionObservability("RETRIEVAL & PRUNING", {
        candidatesBefore: relevantMemories,
        pruningResult: budgetMetrics,
      });

      if (assembledCtx) {
        logDevCognitionObservability("FINAL ASSEMBLY", {
          assembledContext: assembledCtx,
        });
      }
    }

    // 2. Transition to 'reasoning'
    await wm.updateState((state) => {
      state.currentStage = 'reasoning';
      state.reasoningState.scratchpad = 'Staging completed. Requesting response generation from Gemini Gateway...\n';
    });

    // Retrieve user settings for API Key & Model defaults
    const settings = await getSettings(user.id);
    const customApiKey = settings.aiApiKey ? decrypt(settings.aiApiKey) : null;

    // Generate output utilizing MAIA gateway
    const response = await generateAiResponse(query, context, { 
      model: model || settings.aiModel, 
      aiMode: aiMode || (settings.aiMode as any), 
      customApiKey 
    });

    // Fetch exact token count from the tracked AI usage table
    const latestUsage = await prisma.aiUsage.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    if (latestUsage && (Date.now() - latestUsage.createdAt.getTime() < 15000)) {
      promptTokens = latestUsage.promptTokens;
      completionTokens = latestUsage.completionTokens;
    }

    // 3. Transition to 'reflection'
    await wm.updateState((state) => {
      state.currentStage = 'reflection';

      const selectedCandidates = state.retrievalStaging.rawCandidates.filter(
        c => c.arbitrationTrace?.selectionDecision === 'selected'
      );

      // Execute post-generation Reflection Buffer verification (Read-Only)
      const reflectionTelemetry = ReflectionBuffer.verify(
        query,
        response,
        selectedCandidates
      );

      state.reflectionBuffer = reflectionTelemetry;
    });

    // 4. Transition to 'completed'
    await wm.updateState((state) => {
      state.currentStage = 'completed';
      state.lifecycleStatus = 'completed';
      state.reasoningState.draftResponse = response;

      // Evaluate detail preservation and attach metrics to arbitrationGuardrails in metadata
      const metrics = DetailFidelityEvaluator.evaluate(
        state.retrievalStaging.rawCandidates.filter(
          c => c.arbitrationTrace?.selectionDecision === 'selected'
        ),
        response
      );
      if (state.retrievalStaging.metadata.arbitrationGuardrails) {
        state.retrievalStaging.metadata.arbitrationGuardrails = {
          ...state.retrievalStaging.metadata.arbitrationGuardrails,
          ...metrics
        };
      } else {
        (state.retrievalStaging.metadata as any).arbitrationGuardrails = metrics;
      }
    });

    const latency = Date.now() - startTime;

    // Trace diagnostics
    traceWorkingMemory(wm);

    // Save logs to PostgreSQL
    await wm.saveToDb(latency, promptTokens, completionTokens);

    // Cleanup ephemeral Redis cache
    await wm.delete('completed');

    return NextResponse.json({
      query,
      agentType,
      response,
      executionId: wm.getState().executionId
    });

  } catch (error) {
    console.error('AI chat endpoint error:', error);
    
    // Transition to failed
    await wm.updateState((state) => {
      state.currentStage = 'failed';
      state.lifecycleStatus = 'completed';
      state.cleanupReason = 'failed';
    });

    const latency = Date.now() - startTime;
    await wm.saveToDb(latency, 0, 0);
    await wm.delete('failed');

    return NextResponse.json({ error: 'Internal system error.' }, { status: 500 });
  }
}
