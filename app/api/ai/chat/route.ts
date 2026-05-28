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
import { WorkingMemory } from '@/lib/ai/working-memory/store';
import { traceWorkingMemory, logDevCognitionObservability } from '@/lib/ai/working-memory/observability';
import { TokenBudgetEngine } from '@/lib/ai/working-memory/budget';
import { RetrievalArbitrationHooks, DetailFidelityEvaluator } from '@/lib/ai/working-memory/arbitration';
import { ReflectionBuffer } from '@/lib/ai/working-memory/reflection-buffer';
import { ExecutiveFSM } from '@/lib/ai/orchestration/executive-fsm';
import { TransitionCause } from '@/lib/ai/working-memory/types';
import { 
  AsyncOrchestrator, 
  AsyncTaskRunner, 
  TimeoutManager, 
  CancellationManager 
} from '@/lib/ai/orchestration/async-runtime';
import { ToolExecutionManager } from '@/lib/ai/orchestration/tool-orchestrator';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { query, model, aiMode, sessionId } = await request.json();
  if (!query) {
    return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
  }

  // Initialize Working Memory Core (starts in IDLE state)
  const wm = new WorkingMemory(user.id, sessionId || 'chat_session_default', query, {
    executionSource: 'chat_api'
  });
  await wm.save();

  const executionId = wm.getState().executionId;
  const startTime = Date.now();
  let promptTokens = 0;
  let completionTokens = 0;

  // Initialize request-scoped async orchestrator
  const orchestrator = new AsyncOrchestrator(executionId);

  // Set Request-level timeout (e.g. 30 seconds) to cancel scope automatically
  TimeoutManager.registerTimeout(executionId, 30000, () => {
    CancellationManager.cancelScope(executionId, 'Request-level execution timeout triggered after 30000ms');
  });

  try {
    // 1. Transition to INTENT_ANALYSIS
    await ExecutiveFSM.transitionTo(wm, 'INTENT_ANALYSIS', 'USER_REQUEST');

    // AI agent routing
    const agentType = routeUserQuery(query);

    // Initialize ToolExecutionManager with the active intent
    const toolManager = new ToolExecutionManager(wm, agentType);

    // 2. Transition to PLANNING
    await ExecutiveFSM.transitionTo(wm, 'PLANNING', 'INTENT_ANALYZED', {
      intent: agentType
    });

    // 3. Transition to RETRIEVAL
    await ExecutiveFSM.transitionTo(wm, 'RETRIEVAL', 'PLANNING_COMPLETE');

    // Execute retrieval tools concurrently under ToolExecutionManager (which uses AsyncScheduler internally)
    const [memoriesResult, eventsResult] = await Promise.all([
      toolManager.execute('memory_search', { userId: user.id, query }),
      toolManager.execute('schedule_lookup', { userId: user.id })
    ]);

    const relevantMemories = memoriesResult || [];
    const events = eventsResult || [];

    // Check if schedule lookup failed/degraded to degrade FSM state gracefully
    const toolTelemetry = wm.getState().toolTelemetry || [];
    const scheduleLookupTelemetry = toolTelemetry.find(t => t.toolId === 'schedule_lookup');
    if (scheduleLookupTelemetry && (scheduleLookupTelemetry.lifecycleState === 'DEGRADED' || scheduleLookupTelemetry.lifecycleState === 'FAILED')) {
      await ExecutiveFSM.transitionTo(wm, 'DEGRADED', 'DEGRADED_FALLBACK', {
        causeMessage: 'Non-critical schedule retrieval task failed.'
      });
    }

    // 4. Transition to ARBITRATION
    await ExecutiveFSM.transitionTo(wm, 'ARBITRATION', 'RETRIEVAL_COMPLETE');

    // Stage candidates in Working Memory & run Token Budget pipeline via arbitration_engine tool
    const arbitrationResult = await toolManager.execute('arbitration_engine', {
      relevantMemories,
      options: {
        sessionId: wm.getState().sessionId,
        currentStage: wm.getState().currentStage,
        query: query,
        activeRoadmapPhase: process.env.ACTIVE_ROADMAP_PHASE || "phase-d",
        activeSprint: process.env.ACTIVE_SPRINT || "sprint-1",
        activeContinuityCluster: process.env.ACTIVE_CONTINUITY_CLUSTER || "d13-validation"
      }
    });

    await wm.updateState((state) => {
      state.retrievalStaging.rawCandidates = arbitrationResult.candidates;
      (state.retrievalStaging.metadata as any).arbitrationGuardrails = arbitrationResult.guardrails;
      (state.retrievalStaging.metadata as any).arbitrationTraces = arbitrationResult.traces;

      state.retrievalStaging.temporalCandidates = events.map((e: any) => ({
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

    // Capture arbitration metrics for the next transition
    const stateAfterArbitration = wm.getState();
    const arbitrationSnapshot = {
      candidateCount: stateAfterArbitration.retrievalStaging.rawCandidates.length,
      tokenCount: stateAfterArbitration.currentTokenCount,
      budgetPressure: (stateAfterArbitration.retrievalStaging.metadata as any).budgetingMetrics?.budgetPressureLevel
    };

    // 5. Transition to GENERATION
    await ExecutiveFSM.transitionTo(wm, 'GENERATION', 'ARBITRATION_COMPLETE', {
      arbitrationSnapshot
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

    // Retrieve user settings for API Key & Model defaults
    const settings = await getSettings(user.id);
    const customApiKey = settings.aiApiKey ? decrypt(settings.aiApiKey) : null;

    // Generate output utilizing response_generation tool
    const response = await toolManager.execute('response_generation', {
      query,
      context,
      options: {
        model: model || settings.aiModel,
        aiMode: aiMode || (settings.aiMode as any),
        customApiKey
      }
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

    // 6. Transition to REFLECTION
    await ExecutiveFSM.transitionTo(wm, 'REFLECTION', 'GENERATION_COMPLETE');

    // Execute post-generation Reflection Buffer verification via reflection_verify tool
    const selectedCandidates = wm.getState().retrievalStaging.rawCandidates.filter(
      c => c.arbitrationTrace?.selectionDecision === 'selected'
    );

    const reflectionTelemetry = await toolManager.execute('reflection_verify', {
      query,
      response,
      candidates: selectedCandidates
    });

    await wm.updateState((state) => {
      state.reflectionBuffer = reflectionTelemetry;
    });

    // Capture reflection metrics for the next transition
    const stateAfterReflection = wm.getState();
    const reflectionSnapshot = {
      confidenceScore: stateAfterReflection.reflectionBuffer?.confidenceScore,
      contradictionDetected: stateAfterReflection.reflectionBuffer?.contradictionFlags.possibleContradiction
    };

    // 7. Transition to PERSISTENCE
    await ExecutiveFSM.transitionTo(wm, 'PERSISTENCE', 'REFLECTION_COMPLETE', {
      reflectionSnapshot,
      persistenceStatus: 'pending'
    });

    // Evaluate detail preservation and attach metrics to arbitrationGuardrails in metadata
    await wm.updateState((state) => {
      state.reasoningState.draftResponse = response;

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

    // Compile telemetry and clean up timers/controllers
    await orchestrator.compileTelemetryAndCleanup(wm);

    // Save logs to PostgreSQL via postgres_persist tool
    await toolManager.execute('postgres_persist', {
      latencyMs: latency,
      promptTokens,
      completionTokens
    }, { wm });

    // 8. Transition to COMPLETED
    await ExecutiveFSM.transitionTo(wm, 'COMPLETED', 'PERSISTENCE_COMPLETE', {
      persistenceStatus: 'success'
    });

    // Cleanup ephemeral Redis cache
    await wm.delete('completed');

    return NextResponse.json({
      query,
      agentType,
      response,
      executionId
    });

  } catch (error: any) {
    console.error('AI chat endpoint error:', error);
    
    // Determine the type of failure deterministically
    const errorMsg = error?.message?.toLowerCase() || '';
    const errorName = error?.name || '';
    
    let failureState: 'TIMEOUT' | 'CANCELLED' | 'FAILED' = 'FAILED';
    let cause: TransitionCause = 'RUNTIME_ERROR';

    if (errorMsg.includes('timeout') || errorName.includes('Timeout')) {
      failureState = 'TIMEOUT';
      cause = 'TIMEOUT_TRIGGERED';
    } else if (errorMsg.includes('cancel') || errorMsg.includes('abort') || errorName.includes('Abort')) {
      failureState = 'CANCELLED';
      cause = 'CANCELLATION_TRIGGERED';
    }

    try {
      await ExecutiveFSM.transitionTo(wm, failureState, cause, {
        causeMessage: error?.message || 'Unknown error'
      });
    } catch (fsmErr) {
      console.error('FSM double fault during error transition:', fsmErr);
    }

    const latency = Date.now() - startTime;

    // Compile telemetry and clean up timers/controllers
    await orchestrator.compileTelemetryAndCleanup(wm);

    await wm.saveToDb(latency, 0, 0);
    await wm.delete(failureState.toLowerCase());

    return NextResponse.json({ error: 'Internal system error.' }, { status: 500 });
  }
}
