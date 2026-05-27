import {
  RetrievalCandidate,
  ReflectionBufferTelemetry,
  ContradictionFlags,
  AmbiguityFlags,
  GroundingFlags
} from "./types";
import { DetailFidelityEvaluator, QueryIntentParser } from "./arbitration";
import { logger } from "../../logger";

interface BaselineRule {
  ruleName: string;
  keywords: string[];
  expected: string;
  alternatives?: string[];
  mismatches: RegExp[];
}

export class ReflectionBuffer {
  private static BASELINE_RULES: BaselineRule[] = [
    {
      ruleName: "overlap threshold",
      keywords: ["threshold", "overlap"],
      expected: "0.70",
      alternatives: ["70%"],
      mismatches: [/0\.[5689]\d*/i, /0\.7[1-9]\d*/i, /75%/i, /80%/i, /60%/i],
    },
    {
      ruleName: "base duplicate penalty",
      keywords: ["duplicate penalty base", "base duplicate penalty", "duplicate penalty"],
      expected: "0.20",
      mismatches: [/0\.1[5-9]\d*/i, /0\.2[1-9]\d*/i, /0\.3\d*/i],
    },
    {
      ruleName: "echo penalty cap",
      keywords: ["echo penalty cap", "echo cap"],
      expected: "0.25",
      mismatches: [/0\.2[0-46-9]\d*/i, /0\.3\d*/i, /0\.1\d*/i],
    },
    {
      ruleName: "decay rate",
      keywords: ["decay rate", "decay continuity", "soft decay"],
      expected: "0.80",
      alternatives: ["80%"],
      mismatches: [/0\.7\d*/i, /0\.8[1-9]\d*/i, /0\.9\d*/i, /75%/i, /90%/i],
    },
    {
      ruleName: "active sprint boost",
      keywords: ["usefulness boost", "sprint boost", "active sprint boost"],
      expected: "0.25",
      mismatches: [/0\.3\d*/i, /0\.2[0-46-9]\d*/i, /0\.1\d*/i],
    },
    {
      ruleName: "intent boost",
      keywords: ["intent boost", "intent weight boost"],
      expected: "0.20",
      mismatches: [/0\.1\d*/i, /0\.2[1-9]\d*/i, /0\.3\d*/i],
    },
    {
      ruleName: "duplicate penalty cap",
      keywords: ["duplicate penalty cap", "duplicate cap"],
      expected: "0.45",
      mismatches: [/0\.4[0-46-9]\d*/i, /0\.5\d*/i, /0\.3\d*/i],
    },
    {
      ruleName: "echo penalty base",
      keywords: ["echo penalty base", "echo base"],
      expected: "0.10",
      mismatches: [/0\.0[5-9]\d*/i, /0\.1[1-9]\d*/i, /0\.2\d*/i],
    }
  ];

  /**
   * Section 3: Contradiction Detection Hook
   * Strictly reads and scans response text for internal inconsistencies or baseline mismatches.
   */
  public static contradictionDetection(
    response: string,
    candidates: RetrievalCandidate[]
  ): {
    score: number;
    flags: ContradictionFlags;
    notes: string[];
  } {
    const responseLower = response.toLowerCase();
    let ruleConflicts = 0;
    let ruleMismatches = 0;
    const notes: string[] = [];
    const explanation: string[] = [];

    // Layer 1 & 2: Check baseline parameter rules in response text
    for (const rule of this.BASELINE_RULES) {
      const keywordMatched = rule.keywords.some(kw => responseLower.includes(kw));
      if (keywordMatched) {
        const hasExpected = responseLower.includes(rule.expected) || 
          (rule.alternatives && rule.alternatives.some(alt => responseLower.includes(alt)));
        const hasMismatch = rule.mismatches.some(regex => regex.test(responseLower));

        if (hasExpected && hasMismatch) {
          ruleConflicts++;
          explanation.push(`conflict:${rule.ruleName}`);
          notes.push(`Internal conflict regarding ${rule.ruleName} detected.`);
        } else if (hasMismatch && !hasExpected) {
          ruleMismatches++;
          explanation.push(`mismatch:${rule.ruleName}`);
          notes.push(`Baseline mismatch regarding ${rule.ruleName} detected.`);
        }
      }
    }

    // Layer 1: Conflicting roadmap phases
    const phases = ['phase-a', 'phase-b', 'phase-c', 'phase-d', 'phase-e'];
    const detectedPhases = phases.filter(p => responseLower.includes(p) || responseLower.includes(p.replace('-', ' ')));
    if (detectedPhases.length > 1) {
      ruleConflicts++;
      explanation.push("conflict:roadmap_phases");
      notes.push(`Conflicting roadmap phases detected: ${detectedPhases.join(', ')}`);
    }

    // Layer 1: Tie-break cascade order check
    if (responseLower.includes("tie-break") || responseLower.includes("cascade")) {
      const tieBreakTerms = [
        "finalscore",
        "usefulnessscore",
        "continuityscore",
        "semanticscore",
        "sourcescore",
        "temporalscore",
        "duplicatepenalty",
        "tokencount",
        "lexicographical"
      ];
      const cleanedResponse = responseLower.replace(/[\s_-]/g, "");
      let isSorted = true;
      let lastPosition = -1;
      for (const term of tieBreakTerms) {
        const pos = cleanedResponse.indexOf(term);
        if (pos !== -1) {
          if (pos < lastPosition) {
            isSorted = false;
            break;
          }
          lastPosition = pos;
        }
      }
      if (!isSorted) {
        ruleConflicts++;
        explanation.push("conflict:tie_break_order");
        notes.push("Tie-break cascade order contradiction detected.");
      }
    }

    let possibleContradiction = false;
    let contradictionSeverity: 'none' | 'low' | 'medium' | 'high' = 'none';
    let score = 0.0;

    if (ruleConflicts > 0 || ruleMismatches > 0) {
      possibleContradiction = true;
      const totalIssues = ruleConflicts + ruleMismatches;
      if (totalIssues >= 2) {
        contradictionSeverity = 'high';
        score = 0.8;
      } else {
        contradictionSeverity = 'medium';
        score = 0.5;
      }
    }

    return {
      score,
      flags: {
        possibleContradiction,
        contradictionSeverity
      },
      notes
    };
  }

  /**
   * Section 4: Ambiguity Detection Hook
   * Analyzes intent weights overlap and candidate score proximity.
   */
  public static ambiguityDetection(
    query: string,
    candidates: RetrievalCandidate[]
  ): {
    score: number;
    flags: AmbiguityFlags;
    notes: string[];
  } {
    let score = 0.0;
    const ambiguityType: string[] = [];
    const notes: string[] = [];

    // 1. Intent weights overlap analysis
    const parsedIntent = QueryIntentParser.parse(query);
    const sortedIntents = Object.entries(parsedIntent.intentWeightMap)
      .filter(([_, w]) => w > 0.0)
      .sort((a, b) => b[1] - a[1]);

    if (sortedIntents.length >= 2) {
      const [intentA, weightA] = sortedIntents[0];
      const [intentB, weightB] = sortedIntents[1];
      if (Math.abs(weightA - weightB) <= 0.15) {
        score += 0.40;
        ambiguityType.push(`intent_overlap:${intentA}_vs_${intentB}`);
        notes.push(`High intent overlap detected between ${intentA} and ${intentB}.`);
      }
    }

    // 2. Candidate arbitration score proximity
    const selected = candidates.filter(c => c.arbitrationTrace?.selectionDecision === "selected")
      .sort((a, b) => b.combinedScore - a.combinedScore);

    if (selected.length >= 2) {
      const top1 = selected[0];
      const top2 = selected[1];
      if (Math.abs(top1.combinedScore - top2.combinedScore) <= 0.08) {
        const top1Domain = top1.category || top1.sourceType;
        const top2Domain = top2.category || top2.sourceType;
        if (top1Domain !== top2Domain) {
          score += 0.40;
          ambiguityType.push("candidate_proximity");
          notes.push(`Top candidates from different domains (${top1Domain} vs ${top2Domain}) are close in score.`);
        }
      }
    }

    // 3. Continuity cluster competition
    const highContinuityCandidates = selected.filter(c => (c.arbitrationTrace?.continuityScore || 0) >= 0.7);
    const uniqueClusters = new Set(highContinuityCandidates.map(c => c.continuityCluster || c.category).filter(Boolean));
    if (uniqueClusters.size >= 2) {
      score += 0.20;
      ambiguityType.push("continuity_competition");
      notes.push("Competing continuity chains detected.");
    }

    score = Math.min(1.0, score);
    const ambiguityDetected = score > 0.3;

    return {
      score,
      flags: {
        ambiguityDetected,
        ambiguityType
      },
      notes
    };
  }

  /**
   * Section 5: Confidence Verification Hook
   * Verifies overall cognition confidence stability.
   */
  public static confidenceVerification(
    fidelity: {
      groundingDominanceScore: number;
      retrievalInfluenceRatio: number;
      detailCompressionRatio: number;
    },
    selectedCandidates: RetrievalCandidate[]
  ): {
    score: number;
    flags: { lowConfidence: boolean };
    notes: string[];
  } {
    // 1. Average candidate confidence
    let totalConf = 0;
    let confCount = 0;
    for (const c of selectedCandidates) {
      const conf = c.confidence ?? c.reliability ?? c.arbitrationTrace?.confidenceScore ?? 1.0;
      totalConf += conf;
      confCount++;
    }
    const averageCandidateConfidence = confCount > 0 ? (totalConf / confCount) : 1.0;

    // 2. Continuity stability score
    let continuityStabilityScore = 0.3;
    const hasActiveSession = selectedCandidates.some(c => 
      c.sourceType === "active_session_context" || c.arbitrationTrace?.continuityType === "active"
    );
    if (hasActiveSession) {
      continuityStabilityScore = 1.0;
    } else {
      const hasCategoryMatch = selectedCandidates.some(c => c.scoreBreakdown?.continuityReason === "category_match");
      if (hasCategoryMatch) {
        continuityStabilityScore = 0.7;
      } else {
        const hasStageOrTaxonomy = selectedCandidates.some(c => c.taxonomy === "planning" || c.taxonomy === "insight");
        if (hasStageOrTaxonomy) {
          continuityStabilityScore = 0.5;
        }
      }
    }

    // Formula calculation
    const confidenceScore = Number((
      (0.30 * fidelity.groundingDominanceScore) +
      (0.25 * fidelity.retrievalInfluenceRatio) +
      (0.25 * averageCandidateConfidence) +
      (0.20 * continuityStabilityScore)
    ).toFixed(4));

    const lowConfidence = confidenceScore < 0.60;
    const notes: string[] = [];
    if (lowConfidence) {
      notes.push("Cognition confidence stability is low.");
    }

    return {
      score: confidenceScore,
      flags: { lowConfidence },
      notes
    };
  }

  /**
   * Section 6: Grounding Verification Hook
   * Verifies retrieved memory details survived response generation.
   */
  public static groundingVerification(
    fidelity: {
      groundingDominanceScore: number;
      retrievalInfluenceRatio: number;
      detailCompressionRatio: number;
      genericFallbackScore: number;
    }
  ): {
    score: number;
    flags: {
      groundingWeak: boolean;
      genericFallbackDominance: boolean;
      retrievalDetailLoss: boolean;
      unstableGrounding: boolean;
      excessiveCompression: boolean;
    };
    notes: string[];
  } {
    const groundingDominanceScore = fidelity.groundingDominanceScore;
    const retrievalInfluenceRatio = fidelity.retrievalInfluenceRatio;
    const detailCompressionRatio = fidelity.detailCompressionRatio;
    const genericFallbackScore = fidelity.genericFallbackScore;

    // Formula: groundingScore = 0.40*groundingDominance + 0.30*retrievalInfluence + 0.20*groundingDominance - 0.10*detailCompression
    const groundingScore = Number(Math.max(0.0, Math.min(1.0, 
      (0.40 * groundingDominanceScore) +
      (0.30 * retrievalInfluenceRatio) +
      (0.20 * groundingDominanceScore) -
      (0.10 * detailCompressionRatio)
    )).toFixed(4));

    const groundingWeak = groundingScore < 0.55;
    const unstableGrounding = groundingScore < 0.55;
    const genericFallbackDominance = genericFallbackScore > 0.50;
    const retrievalDetailLoss = detailCompressionRatio > 0.40;
    const excessiveCompression = detailCompressionRatio > 0.45;

    const notes: string[] = [];
    if (groundingWeak) notes.push("Grounding score below threshold.");
    if (genericFallbackDominance) notes.push("Generic fallback content dominated reasoning.");
    if (retrievalDetailLoss) notes.push("Significant retrieval detail compression/loss observed.");

    return {
      score: groundingScore,
      flags: {
        groundingWeak,
        genericFallbackDominance,
        retrievalDetailLoss,
        unstableGrounding,
        excessiveCompression
      },
      notes
    };
  }

  /**
   * Section 7 & 8: Observability, Diagnostics, and Telemetry Orchestration
   * Evaluates all hooks in a read-only post-generation pipeline.
   */
  public static verify(
    query: string,
    response: string,
    selectedCandidates: RetrievalCandidate[],
    options?: {
      startTime?: number;
    }
  ): ReflectionBufferTelemetry {
    const start = options?.startTime || Date.now();

    // 1. Calculate detail fidelity metrics first using DetailFidelityEvaluator
    const fidelity = DetailFidelityEvaluator.evaluate(selectedCandidates, response);

    // 2. Contradiction Detection
    const contradiction = this.contradictionDetection(response, selectedCandidates);

    // 3. Ambiguity Detection
    const ambiguity = this.ambiguityDetection(query, selectedCandidates);

    // 4. Confidence Verification
    const confidence = this.confidenceVerification(fidelity, selectedCandidates);

    // 5. Grounding Verification
    const grounding = this.groundingVerification({
      ...fidelity,
      genericFallbackScore: fidelity.genericFallbackScore
    });

    // 6. Severity & Health Diagnostics Band Mapping
    let overallStatus: 'healthy' | 'stable' | 'warning' | 'critical' = 'healthy';
    if (confidence.score < 0.45 || grounding.score < 0.45 || contradiction.score > 0.7) {
      overallStatus = 'critical';
    } else if (confidence.score < 0.60 || grounding.score < 0.55 || contradiction.score > 0.4 || fidelity.detailCompressionRatio > 0.45) {
      overallStatus = 'warning';
    } else if (confidence.score < 0.80 || grounding.score < 0.75 || ambiguity.score > 0.5) {
      overallStatus = 'stable';
    }

    // 7. Collect all triggered flags
    const triggeredFlags: string[] = [];
    if (contradiction.flags.possibleContradiction) triggeredFlags.push(`contradiction:${contradiction.flags.contradictionSeverity}`);
    if (ambiguity.flags.ambiguityDetected) triggeredFlags.push("ambiguityDetected");
    if (confidence.flags.lowConfidence) triggeredFlags.push("lowConfidence");
    if (grounding.flags.groundingWeak) triggeredFlags.push("groundingWeak");
    if (grounding.flags.genericFallbackDominance) triggeredFlags.push("genericFallbackDominance");
    if (grounding.flags.retrievalDetailLoss) triggeredFlags.push("retrievalDetailLoss");
    if (grounding.flags.excessiveCompression) triggeredFlags.push("excessiveCompression");

    // 8. Observational Notes
    const combinedNotes = [
      ...contradiction.notes,
      ...ambiguity.notes,
      ...confidence.notes,
      ...grounding.notes
    ];
    if (combinedNotes.length === 0) {
      combinedNotes.push("cognition, retrieval grounding, and parameters are stable and healthy");
    }

    // 9. Diagnostics Summary Formatting
    const diagnosticsSummary = `Status: ${overallStatus.toUpperCase()}
Scores: confidence=${confidence.score.toFixed(4)}, grounding=${grounding.score.toFixed(4)}, ambiguity=${ambiguity.score.toFixed(4)}, contradiction=${contradiction.score.toFixed(4)}
Flags: ${triggeredFlags.join(', ') || 'none'}
Notes: ${combinedNotes.join('; ')}`;

    // Monitor performance latency overhead (target <= 5-15%)
    const duration = Date.now() - start;
    logger.info("Reflection Buffer execution completed", {
      overallStatus,
      durationMs: duration,
      confidenceScore: confidence.score,
      groundingScore: grounding.score
    });

    return {
      contradictionScore: contradiction.score,
      ambiguityScore: ambiguity.score,
      confidenceScore: confidence.score,
      groundingScore: grounding.score,
      contradictionFlags: contradiction.flags,
      ambiguityFlags: ambiguity.flags,
      groundingFlags: {
        groundingWeak: grounding.flags.groundingWeak,
        genericFallbackDominance: grounding.flags.genericFallbackDominance,
        retrievalDetailLoss: grounding.flags.retrievalDetailLoss,
        lowConfidence: confidence.flags.lowConfidence,
        unstableGrounding: grounding.flags.unstableGrounding,
        excessiveCompression: grounding.flags.excessiveCompression
      },
      retrievalInfluenceRatio: fidelity.retrievalInfluenceRatio,
      detailCompressionRatio: fidelity.detailCompressionRatio,
      diagnosticsSummary
    };
  }
}
