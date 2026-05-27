import { RetrievalCandidate, RetrievalSourceType, ArbitrationTrace, ArbitrationResult } from "./types";
import { logger } from "../../logger";

/**
 * Mappings for priority hierarchy governance.
 * Priorities: system anchors > active session continuity > explicit user memories > roadmap memories > episodic memories > semantic summaries > inferred/generated memories > noisy synthetic memories
 */
export class SourcePriorityResolver {
  public static resolve(candidate: RetrievalCandidate): number {
    const src = candidate.sourceType;
    
    // Check if it's a system anchor/instruction first
    const isSystemAnchor = 
      candidate.taxonomy === "system" || 
      candidate.taxonomy === "anchor" || 
      candidate.category.toLowerCase() === "system_anchor" ||
      candidate.category.toLowerCase() === "system";

    if (isSystemAnchor) {
      return 1.0;
    }

    switch (src) {
      case "system":
        return 1.0;
      case "active_session_context":
        return 0.90;
      case "user_profile":
      case "explicit_user":
        return 0.80; // Explicit user memories
      case "roadmap":
        return 0.70;
      case "episodic_memory":
      case "episodic":
        return 0.60;
      case "semantic_memory":
      case "relationship_link":
      case "calendar_event":
      case "google_calendar_event":
      case "task":
        // Check if category or taxonomy contains roadmap for roadmap memories
        const isRoadmap = 
          candidate.category.toLowerCase().includes("roadmap") ||
          candidate.taxonomy.toLowerCase().includes("roadmap");
        if (isRoadmap) {
          return 0.70;
        }
        return 0.50; // General semantic / calendar events
      case "synthetic_context":
      case "synthetic":
        // Differentiate high trust vs noisy synthetic memories based on relevance score
        return candidate.relevanceScore >= 50 ? 0.30 : 0.10;
      default:
        return 0.20;
    }
  }
}

/**
 * Usefulness Scoring Runtime
 * Determines how useful a candidate is to the current cognitive state.
 */
export class RetrievalUsefulnessScorer {
  public static score(
    candidate: RetrievalCandidate,
    options?: {
      activeTopic?: string;
      currentStage?: string;
      sprintTheme?: string;
      phaseTheme?: string;
      protectedAnchorIds?: string[];
      activeRoadmapPhase?: string;
      activeSprint?: string;
      activeContinuityCluster?: string;
      query?: string;
    }
  ): number {
    let score = 0.0;
    
    // 1. Roadmap & Sprint Theme Relevance (Max 0.30)
    if (options?.activeTopic && candidate.category.toLowerCase() === options.activeTopic.toLowerCase()) {
      score += 0.30;
    } else if (options?.sprintTheme && candidate.category.toLowerCase() === options.sprintTheme.toLowerCase()) {
      score += 0.20;
    }
    
    // Category or taxonomy keywords
    const isRoadmapOrSprint = 
      candidate.category.toLowerCase().includes("roadmap") ||
      candidate.taxonomy.toLowerCase().includes("roadmap") ||
      candidate.category.toLowerCase().includes("sprint") ||
      candidate.taxonomy.toLowerCase().includes("sprint");
      
    if (isRoadmapOrSprint) {
      score += 0.15;
    }

    // 2. Implementation & FSM Stage Alignment (Max 0.25)
    if (options?.currentStage && candidate.taxonomy.toLowerCase() === options.currentStage.toLowerCase()) {
      score += 0.20;
    } else if (options?.phaseTheme && candidate.category.toLowerCase() === options.phaseTheme.toLowerCase()) {
      score += 0.10;
    }

    // 3. Continuity & Anchor Preservation (Max 0.25)
    const isProtected = options?.protectedAnchorIds?.includes(candidate.id) ||
      candidate.sourceType === "active_session_context" ||
      candidate.sourceType === "system" ||
      candidate.sourceType === "user_profile";
      
    if (isProtected) {
      score += 0.25;
    }

    // 4. Cognition Utility & Assembly Contribution (Max 0.20)
    if (candidate.taxonomy === "insight" || candidate.taxonomy === "planning") {
      score += 0.15;
    } else if (candidate.taxonomy === "instruction") {
      score += 0.10;
    }

    // 5. Intent-Scope Aware Usefulness (Max 0.30)
    if (options?.query) {
      const parsedIntent = QueryIntentParser.parse(options.query);
      const alignment = QueryIntentParser.getCandidateAlignment(candidate);
      const dom = parsedIntent.dominantIntent;
      
      if (dom === "database" || dom === "infrastructure") {
        if (alignment.database > 0.4 || alignment.infrastructure > 0.4) {
          score += 0.30;
        }
      } else if (dom === "roadmap" || dom === "planning") {
        if (alignment.roadmap > 0.4 || alignment.planning > 0.4) {
          score += 0.30;
        }
      } else if (dom === "reflection") {
        if (alignment.reflection > 0.4) {
          score += 0.30;
        }
      } else if (dom === "observability") {
        if (alignment.observability > 0.4) {
          score += 0.30;
        }
      } else if (dom === "governance") {
        if (alignment.governance > 0.4) {
          score += 0.30;
        }
      } else if (dom === "deployment") {
        if (alignment.deployment > 0.4) {
          score += 0.30;
        }
      } else if (dom === "debugging") {
        if (alignment.debugging > 0.4) {
          score += 0.30;
        }
      } else if (dom === "implementation") {
        if (alignment.implementation > 0.4) {
          score += 0.30;
        }
      }
    }

    return Math.max(0.0, Math.min(1.0, Number(score.toFixed(4))));
  }
}

/**
 * Confidence Balancing Runtime
 * Normalizes, weights, and penalizes candidate confidence scores.
 */
export class ConfidenceBalancer {
  public static calculate(
    candidate: RetrievalCandidate,
    options?: {
      protectedAnchorIds?: string[];
    }
  ): number {
    const semantic = Math.max(0, Math.min(100, candidate.relevanceScore)) / 100;
    let baseConfidence = semantic;

    // Boost based on trust sources
    const isProtected = options?.protectedAnchorIds?.includes(candidate.id) ||
      candidate.sourceType === "user_profile" ||
      candidate.sourceType === "system" ||
      candidate.taxonomy === "anchor" ||
      candidate.taxonomy === "system";

    if (isProtected) {
      baseConfidence = 1.0;
    } else {
      const isRoadmap = 
        candidate.sourceType === "roadmap" ||
        candidate.category.toLowerCase().includes("roadmap") ||
        candidate.taxonomy.toLowerCase().includes("roadmap");
      if (isRoadmap && baseConfidence < 0.9) {
        baseConfidence = 0.9;
      } else if (
        (candidate.sourceType === "episodic_memory" || candidate.sourceType === "episodic") && 
        baseConfidence < 0.8
      ) {
        baseConfidence = 0.8;
      }
    }

    // Apply penalties
    let penalty = 0.0;

    // Stale memory penalty
    if (candidate.decayedImportance < 0.40) {
      penalty += 0.15;
    }

    // Inferred memory penalty
    const isInferred = candidate.sourceType === "synthetic" ||
      candidate.sourceType === "synthetic_context" || 
      candidate.taxonomy === "inferred" || 
      candidate.category.toLowerCase().includes("synthetic");
      
    if (isInferred) {
      penalty += 0.10;
    }

    return Math.max(0.0, Math.min(1.0, Number((baseConfidence - penalty).toFixed(4))));
  }
}

/**
 * Helper to calculate overlap coefficient similarity
 */
function calculateWordOverlap(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let intersection = 0;
  words1.forEach(w => {
    if (words2.has(w)) intersection++;
  });
  
  return intersection / Math.min(words1.size, words2.size);
}

/**
 * Local character-based token estimator to prevent circular dependencies
 */
function estimateTokenCount(text: string): number {
  if (!text) return 0;
  const charCount = text.length;
  let baseEstimate = Math.ceil(charCount / 4);
  const nonAlphanumeric = text.replace(/[a-zA-Z0-9\s]/g, "").length;
  if (charCount > 0 && nonAlphanumeric / charCount > 0.1) {
    baseEstimate *= 1.2;
  }
  return Math.ceil(baseEstimate * 1.15);
}

/**
 * Candidate Competition and Ranking governance.
 */
export class QueryIntentParser {
  private static KEYWORDS: Record<string, string[]> = {
    database: ["postgres", "indexing", "vector", "pgvector", "query", "schema", "migration", "database", "db", "sql", "tables"],
    infrastructure: ["docker", "redis", "kubernetes", "k8s", "cache", "caching", "infra", "port", "sockets", "connection pool", "deployment", "deploy", "ci/cd"],
    observability: ["telemetry", "metrics", "tracing", "logging", "replay", "observability", "spans", "logs", "opentelemetry", "guardrail", "variance"],
    governance: ["arbitration", "hooks", "governance", "suppression", "duplicate", "echo", "pruning", "budget", "exemption", "trust", "priority"],
    roadmap: ["roadmap", "phase", "sprint", "objective", "milestone", "active focus", "rencana", "target"],
    implementation: ["implementasi", "coding", "code", "write", "develop", "build", "buat", "tulis", "setup", "konfigurasi"],
    reflection: ["refleksi", "evaluasi", "feedback", "analisis", "penilaian", "insight", "kesimpulan", "temuan"],
    planning: ["perencanaan", "planning", "jadwal", "rencana", "langkah", "tahapan"],
    debugging: ["debugging", "debug", "error", "fix", "leak", "bug", "perbaikan", "masalah", "fail", "failed"],
    deployment: ["deployment", "deploy", "vercel", "cloud", "production", "serverless", "host"]
  };

  public static parse(query: string): {
    intentWeightMap: Record<string, number>;
    detectedIntentCategories: string[];
    dominantIntent: string;
    technicalSpecificityScore: number;
    roadmapConstraintApplied: boolean;
  } {
    const q = query.toLowerCase();
    const intentWeightMap: Record<string, number> = {};
    const detectedIntentCategories: string[] = [];

    // Count keyword matches for each category
    for (const cat in this.KEYWORDS) {
      let score = 0.0;
      const keywords = this.KEYWORDS[cat];
      for (const kw of keywords) {
        if (q.includes(kw)) {
          score += 0.40;
        }
      }
      const finalScore = Number(Math.min(1.0, score).toFixed(4));
      if (finalScore > 0.0) {
        intentWeightMap[cat] = finalScore;
        detectedIntentCategories.push(cat);
      } else {
        intentWeightMap[cat] = 0.0;
      }
    }

    // Technical specificity
    const technicalCategories = ["database", "infrastructure", "observability", "governance", "implementation", "debugging", "deployment"];
    let technicalSpecificityScore = 0.0;
    for (const cat of technicalCategories) {
      if (intentWeightMap[cat] > technicalSpecificityScore) {
        technicalSpecificityScore = intentWeightMap[cat];
      }
    }

    // Roadmap constraint
    let roadmapConstraintApplied = false;
    let roadmapScore = intentWeightMap["roadmap"] || 0.0;
    if (technicalSpecificityScore > 0.30 && roadmapScore > 0.0) {
      roadmapConstraintApplied = true;
      roadmapScore = Math.max(0.10, Number((roadmapScore * (1.0 - Math.min(0.8, technicalSpecificityScore))).toFixed(4)));
      intentWeightMap["roadmap"] = roadmapScore;
      if (roadmapScore <= 0.0) {
        const index = detectedIntentCategories.indexOf("roadmap");
        if (index > -1) detectedIntentCategories.splice(index, 1);
      }
    }

    // Find dominant intent
    let dominantIntent = "none";
    let maxScore = 0.0;
    for (const cat in intentWeightMap) {
      if (intentWeightMap[cat] > maxScore) {
        maxScore = intentWeightMap[cat];
        dominantIntent = cat;
      }
    }

    return {
      intentWeightMap,
      detectedIntentCategories,
      dominantIntent,
      technicalSpecificityScore,
      roadmapConstraintApplied
    };
  }

  public static getCandidateAlignment(candidate: RetrievalCandidate): Record<string, number> {
    const alignment: Record<string, number> = {
      database: 0.0,
      infrastructure: 0.0,
      observability: 0.0,
      governance: 0.0,
      roadmap: 0.0,
      implementation: 0.0,
      reflection: 0.0,
      planning: 0.0,
      debugging: 0.0,
      deployment: 0.0
    };

    const cat = (candidate.category || "General").toLowerCase();
    const tax = (candidate.taxonomy || "reflection").toLowerCase();

    // Property-based mappings
    if (cat === "postgres" || cat === "vector" || cat === "database" || cat === "indexing") {
      alignment.database = 1.0;
    } else if (cat === "docker" || cat === "redis" || cat === "kubernetes" || cat === "cache" || cat === "caching") {
      alignment.infrastructure = 1.0;
      alignment.deployment = 0.5;
    } else if (cat === "telemetry" || cat === "observability") {
      alignment.observability = 1.0;
    } else if (cat === "governance" || cat === "retrieval" || cat === "arbitration") {
      alignment.governance = 1.0;
      alignment.implementation = 0.5;
    } else if (cat === "testing" || cat === "debugging") {
      alignment.debugging = 0.8;
      alignment.implementation = 0.5;
    } else if (cat === "roadmap") {
      alignment.roadmap = 1.0;
      alignment.planning = 0.5;
    } else if (cat === "deployment" || cat === "deploy") {
      alignment.deployment = 1.0;
      alignment.infrastructure = 0.8;
    }

    if (tax === "anchor") {
      alignment.governance = 0.5;
      alignment.roadmap = 0.5;
    } else if (tax === "planning") {
      alignment.planning = 1.0;
    } else if (tax === "insight" || tax === "reflection") {
      alignment.reflection = 1.0;
    } else if (tax === "inferred") {
      alignment.reflection = 0.5;
    }

    if (candidate.sourceType === "roadmap" || candidate.roadmapPhase || candidate.sprintTag) {
      alignment.roadmap = Math.max(alignment.roadmap, 0.8);
    }
    if (candidate.sourceType === "system") {
      alignment.governance = Math.max(alignment.governance, 0.5);
    }

    // Content-keyword based matching
    const content = candidate.content.toLowerCase();
    for (const key in this.KEYWORDS) {
      let matchCount = 0;
      for (const kw of this.KEYWORDS[key]) {
        if (content.includes(kw)) {
          matchCount++;
        }
      }
      const kwScore = Math.min(1.0, matchCount * 0.25);
      alignment[key] = Math.max(alignment[key], kwScore);
    }

    return alignment;
  }
}

export class RetrievalCompetitionEngine {
  public static process(
    candidates: RetrievalCandidate[],
    options?: {
      sessionId?: string;
      activeTopic?: string;
      currentStage?: string;
      sprintTheme?: string;
      phaseTheme?: string;
      protectedAnchorIds?: string[];
      activeRoadmapPhase?: string;
      activeSprint?: string;
      activeContinuityCluster?: string;
      query?: string;
    }
  ): {
    arbitratedCandidates: RetrievalCandidate[];
    traces: ArbitrationTrace[];
  } {
    const protectedIds = new Set(options?.protectedAnchorIds || []);

    const activeRoadmapPhase = options?.activeRoadmapPhase || process.env.ACTIVE_ROADMAP_PHASE || "phase-d";
    const activeSprint = options?.activeSprint || process.env.ACTIVE_SPRINT || "sprint-1";
    const activeContinuityCluster = options?.activeContinuityCluster || process.env.ACTIVE_CONTINUITY_CLUSTER || "d13-validation";

    // Parse query intent if query option is provided
    const parsedIntent = options?.query 
      ? QueryIntentParser.parse(options.query)
      : {
          intentWeightMap: {} as Record<string, number>,
          detectedIntentCategories: [] as string[],
          dominantIntent: "none",
          technicalSpecificityScore: 0.0,
          roadmapConstraintApplied: false
        };

    // 1. Calculate Component Scores for all candidates
    const scoredList = candidates.map(candidate => {
      let semanticScore = Number((Math.max(0, Math.min(100, candidate.relevanceScore)) / 100).toFixed(4));
      
      // Extract metadata cleanly
      const candRoadmapPhase = candidate.roadmapPhase || candidate.tags?.find(t => t.startsWith("phase:"))?.split(":")[1];
      const candSprintTag = candidate.sprintTag || candidate.tags?.find(t => t.startsWith("sprint:"))?.split(":")[1];
      const candContinuityCluster = candidate.continuityCluster || candidate.tags?.find(t => t.startsWith("cluster:"))?.split(":")[1];
      const candProtectedAnchor = candidate.protectedAnchor || candidate.tags?.includes("protected:true");

      // Active Continuity Prioritization
      const isSessionMatch = 
        candidate.sourceType === "active_session_context" || 
        (options?.sessionId && candidate.id.includes(options.sessionId));
      
      const isClusterMatch = candContinuityCluster === activeContinuityCluster;
      const continuityType: "active" | "historical" = 
        isSessionMatch || isClusterMatch ? "active" : "historical";

      let continuityScore = 0.0;
      if (continuityType === "active") {
        continuityScore = 1.0;
      } else if (options?.activeTopic && candidate.category.toLowerCase() === options.activeTopic.toLowerCase()) {
        continuityScore = 0.7;
      } else if (options?.currentStage && candidate.taxonomy.toLowerCase() === options.currentStage.toLowerCase()) {
        continuityScore = 0.5;
      } else if (candidate.taxonomy === "planning" || candidate.taxonomy === "insight") {
        continuityScore = 0.3;
      }

      // Calculate intent overlap and decay for technical queries
      const candidateAlignment = QueryIntentParser.getCandidateAlignment(candidate);
      let intentOverlap = 1.0;
      if (options?.query) {
        let totalQueryWeight = 0.0;
        let weightedOverlap = 0.0;
        for (const cat in parsedIntent.intentWeightMap) {
          const queryWeight = parsedIntent.intentWeightMap[cat] || 0.0;
          if (queryWeight > 0.0) {
            totalQueryWeight += queryWeight;
            weightedOverlap += queryWeight * (candidateAlignment[cat] || 0.0);
          }
        }
        if (totalQueryWeight > 0.0) {
          intentOverlap = Number((weightedOverlap / totalQueryWeight).toFixed(4));
        }
      }

      if (options?.query && parsedIntent.technicalSpecificityScore > 0.30) {
        semanticScore = Number((semanticScore * (0.20 + 0.80 * intentOverlap)).toFixed(4));
        continuityScore = Number((continuityScore * (0.20 + 0.80 * intentOverlap)).toFixed(4));
      }

      // Historical Anchor Soft Decay
      let historicalDecayApplied = false;
      if (candProtectedAnchor && candRoadmapPhase && candRoadmapPhase !== activeRoadmapPhase) {
        continuityScore = Number((continuityScore * 0.80).toFixed(4));
        historicalDecayApplied = true;
      }

      // Active Sprint Dominance Boost
      let activeFocusBoostApplied = false;
      const roadmapAligned = candRoadmapPhase === activeRoadmapPhase;
      const sprintAligned = candSprintTag === activeSprint;
      const clusterAligned = candContinuityCluster === activeContinuityCluster;

      const roadmapAlignmentScore = roadmapAligned ? 1.0 : 0.0;
      const sprintAlignmentScore = sprintAligned ? 1.0 : 0.0;
      let usefulnessBoost = 0.0;
      if (roadmapAligned || sprintAligned || clusterAligned) {
        usefulnessBoost += 0.25;
        activeFocusBoostApplied = true;
      }

      // Bounded Soft Blended Intent Weighting
      let intentBoostApplied = false;
      let usefulnessIntentBoost = 0.0;

      if (options?.query) {
        let intentBlendWeight = 0.0;
        for (const cat in parsedIntent.intentWeightMap) {
          const queryWeight = parsedIntent.intentWeightMap[cat] || 0.0;
          const candAlign = candidateAlignment[cat] || 0.0;
          intentBlendWeight += queryWeight * candAlign;
        }

        if (intentBlendWeight > 0.0) {
          usefulnessIntentBoost = Number(Math.min(0.20, intentBlendWeight * 0.15).toFixed(4));
          usefulnessBoost += usefulnessIntentBoost;
          intentBoostApplied = true;
        }
      }

      const baseUsefulness = RetrievalUsefulnessScorer.score(candidate, options);
      const usefulnessScore = Number(Math.max(0.0, Math.min(1.0, baseUsefulness + usefulnessBoost)).toFixed(4));

      const sourceScore = SourcePriorityResolver.resolve(candidate);
      const temporalScore = Math.max(0, Math.min(1.0, candidate.decayedImportance));
      const confidenceScore = ConfidenceBalancer.calculate(candidate, options);

      const baseScore = Number(
        (
          semanticScore * 0.30 +
          continuityScore * 0.25 +
          sourceScore * 0.20 +
          temporalScore * 0.10 +
          usefulnessScore * 0.15
        ).toFixed(4)
      );

      return {
        candidate,
        semanticScore,
        continuityScore,
        sourceScore,
        temporalScore,
        usefulnessScore,
        confidenceScore,
        baseScore,
        activeFocusBoostApplied,
        historicalDecayApplied,
        continuityType,
        intentBoostApplied,
        roadmapAlignmentScore,
        sprintAlignmentScore,
        detectedIntentCategories: parsedIntent.detectedIntentCategories,
        intentWeightMap: parsedIntent.intentWeightMap,
        dominantIntent: parsedIntent.dominantIntent,
        technicalSpecificityScore: parsedIntent.technicalSpecificityScore,
        roadmapConstraintApplied: parsedIntent.roadmapConstraintApplied,
        intentBlendWeights: candidateAlignment
      };
    });

    // 2. Sort by baseScore descending to establish processing order
    scoredList.sort((a, b) => b.baseScore - a.baseScore);

    const processedPool: typeof scoredList = [];
    const traces: ArbitrationTrace[] = [];

    // 3. Sequential Arbitration & Penalty Attribution
    for (const item of scoredList) {
      const cand = item.candidate;

      // Determine Exemption Ratio
      // 100% exempt: multiplier = 0
      // 50% exempt: multiplier = 0.5
      // Otherwise: multiplier = 1.0
      let exemptRatio = 1.0;

      const is100Exempt = 
        protectedIds.has(cand.id) ||
        cand.sourceType === "user_profile" ||
        cand.sourceType === "active_session_context" ||
        cand.taxonomy === "system" ||
        cand.taxonomy === "anchor" ||
        cand.category.toLowerCase().includes("roadmap") ||
        cand.taxonomy.toLowerCase().includes("roadmap") ||
        cand.category.toLowerCase() === "focus" ||
        (options?.activeTopic && cand.category.toLowerCase() === options.activeTopic.toLowerCase()) ||
        (options?.currentStage && cand.taxonomy.toLowerCase() === options.currentStage.toLowerCase());

      const is50Exempt = !is100Exempt && (
        cand.sourceType === "episodic_memory" ||
        cand.category.toLowerCase().includes("sprint") ||
        cand.taxonomy.toLowerCase().includes("sprint") ||
        cand.category.toLowerCase().includes("phase") ||
        cand.taxonomy.toLowerCase().includes("phase")
      );

      if (is100Exempt) {
        exemptRatio = 0.0;
      } else if (is50Exempt) {
        exemptRatio = 0.5;
      }

      // Calculate Duplicate Overlap Penalty
      let duplicatePenalty = 0.0;
      let dupCount = 0;
      for (const processed of processedPool) {
        const overlap = calculateWordOverlap(cand.content, processed.candidate.content);
        if (overlap > 0.70) {
          dupCount++;
        }
      }
      if (dupCount > 0) {
        duplicatePenalty = Number(((0.20 + (dupCount - 1) * 0.04) * exemptRatio).toFixed(4));
        duplicatePenalty = Math.min(0.45 * exemptRatio, duplicatePenalty);
      }

      // Calculate Echo Penalty
      let echoPenalty = 0.0;
      let echoCount = 0;
      for (const processed of processedPool) {
        const isSameSource = cand.sourceType === processed.candidate.sourceType;
        const isSameCategory = cand.category === processed.candidate.category;
        
        // continuity cluster match check: check if it shares session matching or category/activeTopic boosts
        const bothContinuity = 
          (options?.sessionId && cand.id.includes(options.sessionId) && processed.candidate.id.includes(options.sessionId)) ||
          (options?.activeTopic && cand.category.toLowerCase() === options.activeTopic.toLowerCase() && processed.candidate.category.toLowerCase() === options.activeTopic.toLowerCase());

        if (isSameSource && isSameCategory && bothContinuity) {
          echoCount++;
        }
      }
      if (echoCount > 0) {
        echoPenalty = Number(((0.10 + (echoCount - 1) * 0.03) * exemptRatio).toFixed(4));
        echoPenalty = Math.min(0.25 * exemptRatio, echoPenalty);
      }

      // Compute Final Score
      const rawFinal = item.baseScore - duplicatePenalty - echoPenalty;
      const finalScore = Number(Math.max(0.0, Math.min(1.0, rawFinal)).toFixed(4));

      // Decide selection
      let selectionDecision: 'selected' | 'rejected' = 'selected';
      let rejectionReason: string | null = null;

      if (finalScore < 0.15) {
        selectionDecision = 'rejected';
        rejectionReason = 'Low Arbitration Score (<0.15)';
      }

      // Log the trace
      const trace: ArbitrationTrace = {
        candidateId: cand.id,
        semanticScore: item.semanticScore,
        continuityScore: item.continuityScore,
        sourceScore: item.sourceScore,
        confidenceScore: item.confidenceScore,
        temporalScore: item.temporalScore,
        usefulnessScore: item.usefulnessScore,
        duplicatePenalty: Number(duplicatePenalty.toFixed(4)),
        echoPenalty: Number(echoPenalty.toFixed(4)),
        finalScore,
        selectionDecision,
        rejectionReason,
        activeFocusBoostApplied: item.activeFocusBoostApplied,
        historicalDecayApplied: item.historicalDecayApplied,
        continuityType: item.continuityType,
        intentBoostApplied: item.intentBoostApplied,
        roadmapAlignmentScore: item.roadmapAlignmentScore,
        sprintAlignmentScore: item.sprintAlignmentScore,
        detectedIntentCategories: item.detectedIntentCategories,
        intentWeightMap: item.intentWeightMap,
        dominantIntent: item.dominantIntent,
        technicalSpecificityScore: item.technicalSpecificityScore,
        roadmapConstraintApplied: item.roadmapConstraintApplied,
        intentBlendWeights: item.intentBlendWeights
      };

      traces.push(trace);

      // Add to processed pool for future candidates to compare against
      processedPool.push(item);
    }

    // 4. Deterministic Multi-Stage Tie-Break Cascade Sorting
    // Sort processedPool by:
    // 1. finalScore descending
    // 2. usefulnessScore descending
    // 3. continuityScore descending
    // 4. semanticScore descending
    // 5. sourceScore descending
    // 6. temporalScore descending
    // 7. duplicatePenalty ascending (less suppression impact preferred)
    // 8. tokenCount ascending
    // 9. Lexicographical ID fallback
    processedPool.sort((a, b) => {
      const traceA = traces.find(t => t.candidateId === a.candidate.id)!;
      const traceB = traces.find(t => t.candidateId === b.candidate.id)!;

      if (traceA.finalScore !== traceB.finalScore) {
        return traceB.finalScore - traceA.finalScore;
      }
      if (a.usefulnessScore !== b.usefulnessScore) {
        return b.usefulnessScore - a.usefulnessScore;
      }
      if (a.continuityScore !== b.continuityScore) {
        return b.continuityScore - a.continuityScore;
      }
      if (a.semanticScore !== b.semanticScore) {
        return b.semanticScore - a.semanticScore;
      }
      if (a.sourceScore !== b.sourceScore) {
        return b.sourceScore - a.sourceScore;
      }
      if (a.temporalScore !== b.temporalScore) {
        return b.temporalScore - a.temporalScore;
      }
      if (traceA.duplicatePenalty !== traceB.duplicatePenalty) {
        return traceA.duplicatePenalty - traceB.duplicatePenalty;
      }
      
      const tokensA = estimateTokenCount(a.candidate.content);
      const tokensB = estimateTokenCount(b.candidate.content);
      if (tokensA !== tokensB) {
        return tokensA - tokensB;
      }
      
      return a.candidate.id.localeCompare(b.candidate.id);
    });

    // 5. Return updated candidates with trace attachment
    const arbitratedCandidates = processedPool.map(item => {
      const trace = traces.find(t => t.candidateId === item.candidate.id)!;
      return {
        ...item.candidate,
        combinedScore: trace.finalScore,
        arbitrationTrace: trace
      };
    });

    return {
      arbitratedCandidates,
      traces
    };
  }
}

/**
 * Arbitration Trace Formatting Runtime
 */
export class ArbitrationTraceRuntime {
  public static printTrace(trace: ArbitrationTrace): string {
    return `[Candidate: ${trace.candidateId}] Final: ${trace.finalScore.toFixed(3)} (Sem: ${trace.semanticScore.toFixed(2)}, Cont: ${trace.continuityScore.toFixed(2)}, Src: ${trace.sourceScore.toFixed(2)}, Temp: ${trace.temporalScore.toFixed(2)}, Useful: ${trace.usefulnessScore.toFixed(2)}, Conf: ${trace.confidenceScore.toFixed(2)}) Penalties -> Overlap: ${trace.duplicatePenalty.toFixed(2)}, Echo: ${trace.echoPenalty.toFixed(2)} | Decision: ${trace.selectionDecision}${trace.rejectionReason ? ` (${trace.rejectionReason})` : ""}`;
  }
}

/**
 * Arbitration Stability Guardrails
 */
export class ArbitrationStabilityGuardrails {
  public static monitor(
    candidates: RetrievalCandidate[],
    traces: ArbitrationTrace[]
  ) {
    if (traces.length === 0) {
      return {
        scoreMean: 0,
        scoreVariance: 0,
        continuityDominanceRatio: 0,
        sourceTypeCounts: {} as Record<string, number>,
        totalDuplicatePenalties: 0,
        totalEchoPenalties: 0,
        regressionSnapshot: "ar_snap_empty",
      };
    }

    const scores = traces.map(t => t.finalScore);
    const scoreMean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const scoreVariance = scores.reduce((sum, s) => sum + Math.pow(s - scoreMean, 2), 0) / scores.length;

    // Continuity Dominance: ratio of selected candidates that have high continuity scores (>0.4)
    const selectedTraces = traces.filter(t => t.selectionDecision === 'selected');
    const continuitySelected = selectedTraces.filter(t => t.continuityScore > 0.4);
    const continuityDominanceRatio = selectedTraces.length > 0
      ? continuitySelected.length / selectedTraces.length
      : 0;

    if (continuityDominanceRatio > 0.80) {
      logger.warn('Arbitration Stability Guardrail warning: high continuity dominance detected', {
        continuityDominanceRatio,
        selectedCount: selectedTraces.length
      });
    }

    // Source Distribution in Selected pool
    const sourceTypeCounts: Record<string, number> = {};
    selectedTraces.forEach(t => {
      const cand = candidates.find(c => c.id === t.candidateId);
      if (cand) {
        sourceTypeCounts[cand.sourceType] = (sourceTypeCounts[cand.sourceType] || 0) + 1;
      }
    });

    // Total Penalties applied
    const totalDuplicatePenalties = traces.reduce((sum, t) => sum + t.duplicatePenalty, 0);
    const totalEchoPenalties = traces.reduce((sum, t) => sum + t.echoPenalty, 0);

    // Deterministic footprint generation for regression check
    const footprint = traces
      .slice()
      .sort((a, b) => a.candidateId.localeCompare(b.candidateId))
      .map(t => `${t.candidateId}:${t.finalScore.toFixed(4)}:${t.selectionDecision}`)
      .join('|');

    let hash = 0;
    for (let i = 0; i < footprint.length; i++) {
      const char = footprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }

    return {
      scoreMean: Number(scoreMean.toFixed(4)),
      scoreVariance: Number(scoreVariance.toFixed(4)),
      continuityDominanceRatio: Number(continuityDominanceRatio.toFixed(4)),
      sourceTypeCounts,
      totalDuplicatePenalties: Number(totalDuplicatePenalties.toFixed(4)),
      totalEchoPenalties: Number(totalEchoPenalties.toFixed(4)),
      regressionSnapshot: `ar_snap_${Math.abs(hash).toString(16)}`,
    };
  }

  public static verifyReplay(
    candidates: RetrievalCandidate[],
    previousSnapshot: string,
    options?: any
  ): boolean {
    const result = RetrievalArbitrationHooks.arbitrate(candidates, options);
    return result.guardrails.regressionSnapshot === previousSnapshot;
  }
}

/**
 * Entrypoints for Stage Retrieval lifecycle
 */
export class RetrievalArbitrationHooks {
  /**
   * Main arbitration entrypoint.
   */
  public static arbitrate(
    candidates: RetrievalCandidate[],
    options?: {
      sessionId?: string;
      activeTopic?: string;
      currentStage?: string;
      sprintTheme?: string;
      phaseTheme?: string;
      protectedAnchorIds?: string[];
      activeRoadmapPhase?: string;
      activeSprint?: string;
      activeContinuityCluster?: string;
      query?: string;
    }
  ): ArbitrationResult {
    const startTime = Date.now();
    logger.info("Executing RetrievalArbitrationHooks.arbitrate", {
      candidateCount: candidates.length,
      sessionId: options?.sessionId,
      activeTopic: options?.activeTopic
    });

    const { arbitratedCandidates, traces } = RetrievalCompetitionEngine.process(candidates, options);
    const guardrails = ArbitrationStabilityGuardrails.monitor(candidates, traces);

    const latencyMs = Date.now() - startTime;
    logger.info("RetrievalArbitrationHooks completed", {
      latencyMs,
      selectedCount: arbitratedCandidates.filter(c => c.arbitrationTrace?.selectionDecision === 'selected').length,
      regressionSnapshot: guardrails.regressionSnapshot
    });

    return {
      candidates: arbitratedCandidates,
      traces,
      guardrails
    };
  }
}

export function detectRetrievalIntent(query: string): boolean {
  const q = query.toLowerCase();
  const keywords = [
    "roadmap", "fokus", "sprint", "tujuan", "phase", "fase", 
    "d1.3", "d1.2", "sprint-1", "phase-d", "sprint aktif", "roadmap aktif",
    "arbitration", "hooks", "usefulness", "suppression", "duplicate",
    "continuity", "governance", "stabilization", "replay", "determinism"
  ];
  return keywords.some(kw => q.includes(kw));
}

export class DetailFidelityEvaluator {
  private static GOVERNANCE_DETAIL_PATTERNS = [
    { name: "overlap threshold > 0.70", regex: /0\.70|70%/i },
    { name: "base duplicate penalty = 0.20", regex: /0\.20/i },
    { name: "echo penalty cap = 0.25", regex: /0\.25/i },
    { name: "decay rate *0.80", regex: /0\.80|80%/i },
    { name: "echo penalty base = 0.10", regex: /0\.10/i },
    { name: "duplicate scaling = 0.04", regex: /0\.04/i },
    { name: "echo scaling = 0.03", regex: /0\.03/i },
    { name: "duplicate penalty cap = 0.45", regex: /0\.45/i },
    { name: "usefulness boost = +0.25", regex: /\+0\.25/i },
    { name: "intent boost = +0.20", regex: /\+0\.20/i },
    { name: "finalScore", regex: /finalScore|final score/i },
    { name: "usefulnessScore", regex: /usefulnessScore|usefulness score/i },
    { name: "continuityScore", regex: /continuityScore|continuity score/i },
    { name: "semanticScore", regex: /semanticScore|semantic score/i },
    { name: "sourceScore", regex: /sourceScore|source score/i },
    { name: "temporalScore", regex: /temporalScore|temporal score/i },
    { name: "duplicatePenalty", regex: /duplicatePenalty|duplicate penalty/i },
    { name: "tokenCount", regex: /tokenCount|token count/i },
    { name: "lexicographical ID", regex: /lexicographical|lexikografis/i }
  ];

  public static evaluate(
    selectedCandidates: RetrievalCandidate[],
    response: string
  ): {
    retrievedDetailCount: number;
    preservedGovernanceFacts: number;
    groundingDominanceScore: number;
    genericFallbackScore: number;
    retrievalInfluenceRatio: number;
    detailCompressionRatio: number;
  } {
    const responseLower = response.toLowerCase();
    const retrievedText = selectedCandidates.map(c => c.content).join(" ").toLowerCase();

    // 1. Identify which detail patterns are present in the retrieved candidates
    const matchedPatternsInRetrieval = this.GOVERNANCE_DETAIL_PATTERNS.filter(pattern => 
      pattern.regex.test(retrievedText)
    );

    const retrievedDetailCount = matchedPatternsInRetrieval.length;

    // 2. Count how many of these matched patterns also survive in the response
    const preservedPatternsInResponse = matchedPatternsInRetrieval.filter(pattern => 
      pattern.regex.test(responseLower)
    );

    const preservedGovernanceFacts = preservedPatternsInResponse.length;

    // 3. Compute metrics
    const groundingDominanceScore = retrievedDetailCount > 0
      ? Number((preservedGovernanceFacts / retrievedDetailCount).toFixed(4))
      : 1.0;

    const genericFallbackScore = Number((1.0 - groundingDominanceScore).toFixed(4));
    const retrievalInfluenceRatio = groundingDominanceScore;
    const detailCompressionRatio = Number((1.0 - groundingDominanceScore).toFixed(4));

    // Emit warning logs if telemetry thresholds are breached
    if (retrievedDetailCount > 0) {
      if (detailCompressionRatio > 0.45) {
        logger.warn("Detail Compression Alert: Significant detail loss detected in cognition synthesis.", {
          retrievedDetailCount,
          preservedGovernanceFacts,
          detailCompressionRatio,
          genericFallbackScore
        });
      }
      
      if (retrievalInfluenceRatio < 0.55) {
        logger.warn("Detail Bounding Warning: Low retrieval influence ratio detected. Response is too generic.", {
          retrievalInfluenceRatio,
          targetMin: 0.55
        });
      } else if (retrievalInfluenceRatio > 0.80) {
        logger.warn("Detail Regurgitation Warning: High retrieval influence ratio detected. Response may lack synthesis.", {
          retrievalInfluenceRatio,
          targetMax: 0.80
        });
      }
    }

    return {
      retrievedDetailCount,
      preservedGovernanceFacts,
      groundingDominanceScore,
      genericFallbackScore,
      retrievalInfluenceRatio,
      detailCompressionRatio
    };
  }
}
