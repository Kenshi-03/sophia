import { RetrievalCandidate, AssembledReasoningContext } from "./types";
import { ContextScoringEngine } from "./scoring";

export class ContextAssemblyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContextAssemblyError";
  }
}

export class ContextAssemblyEngine {
  /**
   * Estimates tokens locally to prevent circular dependency with budget.ts
   */
  public static estimateTokenCount(text: string): number {
    if (!text) return 0;
    const charCount = text.length;
    let baseEstimate = Math.ceil(charCount / 4);

    const nonAlphanumeric = text.replace(/[a-zA-Z0-9\s]/g, "").length;
    if (charCount > 0 && nonAlphanumeric / charCount > 0.1) {
      baseEstimate *= 1.2;
    }

    const isIndonesian = /\b(yang|di|dan|itu|untuk|saya|dengan|adalah|dari|ke)\b/i.test(text);
    if (isIndonesian) {
      baseEstimate *= 1.15;
    }

    if (text.includes("```")) {
      baseEstimate *= 1.2;
    }

    const trimmed = text.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      baseEstimate *= 1.3;
    }

    if (/https?:\/\/[^\s]+/i.test(text)) {
      baseEstimate *= 1.25;
    }

    return Math.ceil(baseEstimate * 1.15);
  }

  /**
   * Deterministically assembles balanced context candidates into structured executive layers,
   * performs final token validation, and truncates excess non-protected items if overflow occurs.
   */
  public static assemble(
    candidates: RetrievalCandidate[],
    options: {
      tokenBudget: number;
      sessionId?: string;
      activeTopic?: string;
      currentStage?: string;
      protectedAnchorIds?: string[];
      systemPromptOverride?: string;
      calendarEvents?: any[];
      extraTokenCount?: number;
    }
  ): AssembledReasoningContext {
    const startTime = Date.now();
    const protectedIds = new Set(options.protectedAnchorIds || []);

    // 1. Construct System Layer Prompt
    const systemPrompt = options.systemPromptOverride || 
      `SOPHIA Personal Cognitive Operating System Runtime.\nActive Stage: ${options.currentStage || "reasoning"}\nActive Topic: ${options.activeTopic || "None"}`;

    // 2. Initial candidates partitioning into layers
    let workingCandidates = [...candidates];
    
    // Sort all candidates by combinedScore descending
    workingCandidates.sort((a, b) => b.combinedScore - a.combinedScore);

    const checkIsRoadmap = (c: RetrievalCandidate): boolean => {
      const activeTopicLower = (options.activeTopic || "").toLowerCase();
      return (
        c.category.toLowerCase().includes("roadmap") ||
        c.taxonomy.toLowerCase().includes("roadmap") ||
        c.category.toLowerCase() === "focus" ||
        (activeTopicLower !== "" && c.category.toLowerCase() === activeTopicLower)
      );
    };

    // Partition logic (partition-safe)
    const layersMap = {
      continuity: [] as RetrievalCandidate[],
      identity: [] as RetrievalCandidate[],
      roadmap: [] as RetrievalCandidate[],
      semantic: [] as RetrievalCandidate[],
      historical: [] as RetrievalCandidate[],
    };

    for (const c of workingCandidates) {
      const isContinuity = c.sourceType === "active_session_context" || (options.sessionId && c.id.includes(options.sessionId));
      if (isContinuity) {
        layersMap.continuity.push(c);
      } else if (c.sourceType === "user_profile") {
        layersMap.identity.push(c);
      } else if (checkIsRoadmap(c)) {
        layersMap.roadmap.push(c);
      } else if (c.sourceType === "semantic_memory" || c.sourceType === "relationship_link") {
        layersMap.semantic.push(c);
      } else {
        layersMap.historical.push(c);
      }
    }

    // 3. Format auxiliary items
    const events = options.calendarEvents || [];
    const formattedEvents = events.map((e, idx) => 
      `Event [${idx + 1}]: ${e.title || e.summary || "Scheduled Event"} (${e.startTime || e.start?.dateTime || "N/A"} to ${e.endTime || e.end?.dateTime || "N/A"})`
    );

    // Helper to format candidate lists
    const formatCandidates = (list: RetrievalCandidate[]): string[] => {
      return list.map(c => `[Category: ${c.category}] (Score: ${c.combinedScore.toFixed(2)}) - ${c.content}`);
    };

    const formatLayer = (title: string, items: string[]): string => {
      if (items.length === 0) return "";
      return `=== ${title} ===\n${items.join("\n")}\n`;
    };

    // State tracks for truncation loop
    let overflowDetected = false;
    let overflowTokens = 0;
    const truncatedCandidateIds: string[] = [];
    let truncatedReason = "";
    
    // We keep track of active candidates in the assembly
    let activeContinuity = [...layersMap.continuity];
    let activeIdentity = [...layersMap.identity];
    let activeRoadmap = [...layersMap.roadmap];
    let activeSemantic = [...layersMap.semantic];
    let activeHistorical = [...layersMap.historical];

    const generateAllLayers = () => {
      const sysStr = formatLayer("SYSTEM CONTEXT", [systemPrompt]);
      const contStr = formatLayer("ACTIVE SESSION CONTINUITY", formatCandidates(activeContinuity));
      const identStr = formatLayer("USER IDENTITY & PROFILE", formatCandidates(activeIdentity));
      const roadStr = formatLayer("ROADMAP & FOCUS CONTEXT", formatCandidates(activeRoadmap));
      const semStr = formatLayer("TOP SEMANTIC MEMORIES", formatCandidates(activeSemantic));
      const histStr = formatLayer("HISTORICAL CONTEXT", formatCandidates(activeHistorical));
      const auxStr = formatLayer("AUXILIARY METADATA", formattedEvents);

      const tokens = {
        system: ContextAssemblyEngine.estimateTokenCount(sysStr),
        continuity: ContextAssemblyEngine.estimateTokenCount(contStr),
        identity: ContextAssemblyEngine.estimateTokenCount(identStr),
        roadmap: ContextAssemblyEngine.estimateTokenCount(roadStr),
        semantic: ContextAssemblyEngine.estimateTokenCount(semStr),
        historical: ContextAssemblyEngine.estimateTokenCount(histStr),
        auxiliary: ContextAssemblyEngine.estimateTokenCount(auxStr),
      };

      const extra = options.extraTokenCount !== undefined ? options.extraTokenCount : 500;
      const total = Object.values(tokens).reduce((sum, v) => sum + v, 0) + extra;
      
      return {
        sysStr,
        contStr,
        identStr,
        roadStr,
        semStr,
        histStr,
        auxStr,
        tokens,
        total
      };
    };

    let result = generateAllLayers();

    // 4. Token validation and Last-Resort Truncation Loop
    if (result.total > options.tokenBudget) {
      overflowDetected = true;
      overflowTokens = result.total - options.tokenBudget;

      // Find all non-protected candidates in order of combinedScore ascending (lowest first)
      const isCandidateProtected = (c: RetrievalCandidate): boolean => {
        return (
          protectedIds.has(c.id) ||
          c.sourceType === "user_profile" ||
          c.sourceType === "active_session_context"
        );
      };

      const getNonProtectedCandidatesSorted = () => {
        const list: RetrievalCandidate[] = [];
        [...activeHistorical, ...activeSemantic, ...activeRoadmap, ...activeIdentity, ...activeContinuity].forEach(c => {
          if (!isCandidateProtected(c)) {
            list.push(c);
          }
        });
        // Sort lowest score first
        return list.sort((a, b) => a.combinedScore - b.combinedScore);
      };

      const nonProtectedList = getNonProtectedCandidatesSorted();
      
      for (const toDrop of nonProtectedList) {
        if (result.total <= options.tokenBudget) break;

        // Remove from the appropriate list
        activeContinuity = activeContinuity.filter(c => c.id !== toDrop.id);
        activeIdentity = activeIdentity.filter(c => c.id !== toDrop.id);
        activeRoadmap = activeRoadmap.filter(c => c.id !== toDrop.id);
        activeSemantic = activeSemantic.filter(c => c.id !== toDrop.id);
        activeHistorical = activeHistorical.filter(c => c.id !== toDrop.id);

        truncatedCandidateIds.push(toDrop.id);
        
        // Regenerate and re-evaluate
        result = generateAllLayers();
      }

      // If still overflowing after all non-protected are dropped -> severe budgeting anomaly!
      if (result.total > options.tokenBudget) {
        truncatedReason = "Severe Budget Anomaly: Context overflowed token budget even after dropping all non-protected candidates.";
        throw new ContextAssemblyError(`Context assembly overflowed token budget (${result.total}/${options.tokenBudget} tokens) after final safeguard truncation.`);
      } else {
        truncatedReason = "Graceful degradation: Removed lowest-scoring non-protected candidates to fit within token budget.";
      }
    }

    const assemblyDurationMs = Date.now() - startTime;
    const finalCandidateCount = 
      activeContinuity.length + 
      activeIdentity.length + 
      activeRoadmap.length + 
      activeSemantic.length + 
      activeHistorical.length;

    const finalProtectedAnchorIds = workingCandidates
      .filter(c => protectedIds.has(c.id) || c.sourceType === "user_profile" || c.sourceType === "active_session_context")
      .map(c => c.id);

    const orderingRationale = [
      "Continuity-first layering layout applied top-down.",
      "Intra-layer relevance ordering applied by combinedScore descending.",
      overflowDetected ? "Safeguard structural truncation triggered." : "Assembly completed within budget constraints."
    ];

    return {
      systemLayer: result.sysStr,
      continuityLayer: result.contStr,
      identityLayer: result.identStr,
      roadmapLayer: result.roadStr,
      semanticLayer: result.semStr,
      historicalLayer: result.histStr,
      auxiliaryLayer: result.auxStr,
      metadata: {
        totalTokens: result.total,
        tokensPerLayer: {
          system: result.tokens.system,
          continuity: result.tokens.continuity,
          identity: result.tokens.identity,
          roadmap: result.tokens.roadmap,
          semantic: result.tokens.semantic,
          historical: result.tokens.historical,
          auxiliary: result.tokens.auxiliary
        },
        validationPassed: result.total <= options.tokenBudget,
        assemblyDurationMs,
        candidateCount: finalCandidateCount,
        protectedAnchorIds: finalProtectedAnchorIds,
        orderingRationale,
        overflowDetected,
        overflowTokens,
        truncatedCandidateIds,
        truncatedReason,
        finalResolvedTokenCount: result.total
      }
    };
  }
}
