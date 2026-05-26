import { RetrievalCandidate, DiversityMetrics } from "./types";
import { ContextScoringEngine } from "./scoring";

export const DIVERSITY_CONSTANTS = {
  MAX_TAXONOMY_DENSITY: 2,
  MAX_SOURCE_DENSITY: 3,
  MAX_SOURCE_THEME_DENSITY: 2,
  ECHO_OVERLAP_THRESHOLD: 0.60,
  MIN_TEMPORAL_WEIGHT: 0.20,
  ROADMAP_TEMPORAL_BOOST: 0.20
} as const;

export class ContextDiversityEngine {
  /**
   * Runs the diversity-aware candidate balancing pipeline.
   * Input: candidates that have already been pruned.
   * Output: balanced candidates and detailed metrics.
   */
  public static balanceCandidates(
    candidates: RetrievalCandidate[],
    options?: {
      sessionId?: string;
      activeTopic?: string;
      currentStage?: string;
      protectedAnchorIds?: string[];
    }
  ): {
    balanced: RetrievalCandidate[];
    metrics: DiversityMetrics;
  } {
    const protectedIds = new Set(options?.protectedAnchorIds || []);
    
    // Telemetry trace collections
    const diversityActions: string[] = [];
    const echoPreventionActions: string[] = [];
    const continuityProtectionSkips: string[] = [];
    
    let repeatedClusterReductionCount = 0;
    const freshnessWeightingContribution: Record<string, number> = {};
    const temporalInfluence: Record<string, number> = {};

    // 1. Initial sorted copy by combinedScore descending
    let workingList = [...candidates].sort((a, b) => b.combinedScore - a.combinedScore);

    // 2. Taxonomy Diversity Balancing (Phase 1)
    const taxonomyCounts: Record<string, number> = {};
    let afterTaxonomy: RetrievalCandidate[] = [];

    for (const c of workingList) {
      const tax = c.taxonomy || "general";
      if (protectedIds.has(c.id)) {
        afterTaxonomy.push(c);
        taxonomyCounts[tax] = (taxonomyCounts[tax] || 0) + 1;
        continuityProtectionSkips.push(`taxonomy:${c.id}`);
      } else {
        const currentCount = taxonomyCounts[tax] || 0;
        if (currentCount >= DIVERSITY_CONSTANTS.MAX_TAXONOMY_DENSITY) {
          diversityActions.push(`taxonomy_cap_exceeded:${c.id} (taxonomy: ${tax})`);
        } else {
          afterTaxonomy.push(c);
          taxonomyCounts[tax] = currentCount + 1;
        }
      }
    }

    // 3. Source Diversity Balancing (Phase 2)
    const sourceCounts: Record<string, number> = {};
    let afterSource: RetrievalCandidate[] = [];

    for (const c of afterTaxonomy) {
      const src = c.sourceType;
      if (protectedIds.has(c.id)) {
        afterSource.push(c);
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
        continuityProtectionSkips.push(`source:${c.id}`);
      } else {
        const currentCount = sourceCounts[src] || 0;
        if (currentCount >= DIVERSITY_CONSTANTS.MAX_SOURCE_DENSITY) {
          diversityActions.push(`source_cap_exceeded:${c.id} (source: ${src})`);
        } else {
          afterSource.push(c);
          sourceCounts[src] = currentCount + 1;
        }
      }
    }

    // 4. Temporal Weighting (Phase 3)
    let afterTemporal = afterSource.map(c => {
      let tempWeight = c.decayedImportance;
      
      const isFreshSource = 
        c.sourceType === "active_session_context" || 
        c.sourceType === "calendar_event" || 
        c.sourceType === "google_calendar_event";
        
      if (isFreshSource) {
        tempWeight = 1.0;
        freshnessWeightingContribution[c.id] = 1.0;
      } else {
        // Roadmap boost
        const isRoadmapMatch = 
          (options?.activeTopic && c.category.toLowerCase() === options.activeTopic.toLowerCase()) ||
          c.category.toLowerCase().includes("roadmap") ||
          c.taxonomy.toLowerCase().includes("roadmap") ||
          c.category.toLowerCase() === "focus";
          
        if (isRoadmapMatch) {
          tempWeight = Math.min(1.0, tempWeight + DIVERSITY_CONSTANTS.ROADMAP_TEMPORAL_BOOST);
          freshnessWeightingContribution[c.id] = tempWeight;
        }
      }

      // Floor decay for long-term memory preservation
      if (tempWeight < DIVERSITY_CONSTANTS.MIN_TEMPORAL_WEIGHT) {
        tempWeight = DIVERSITY_CONSTANTS.MIN_TEMPORAL_WEIGHT;
      }

      temporalInfluence[c.id] = tempWeight;

      // Re-score candidate using updated decayedImportance
      const updatedCandidate = {
        ...c,
        decayedImportance: tempWeight
      };

      return ContextScoringEngine.scoreCandidate(updatedCandidate, {
        sessionId: options?.sessionId,
        activeTopic: options?.activeTopic,
        currentStage: options?.currentStage
      });
    });

    // Re-sort after temporal scoring changes
    afterTemporal.sort((a, b) => b.combinedScore - a.combinedScore);

    // 5. Echo Chamber Prevention (Phase 4)
    let finalBalanced: RetrievalCandidate[] = [];
    const sourceThemeCounts: Record<string, number> = {};

    for (const c of afterTemporal) {
      if (protectedIds.has(c.id)) {
        finalBalanced.push(c);
        const comboKey = `${c.sourceType}:${c.category}`;
        sourceThemeCounts[comboKey] = (sourceThemeCounts[comboKey] || 0) + 1;
        continuityProtectionSkips.push(`echo:${c.id}`);
      } else {
        // A. Word Overlap Similarity Check
        let hasDuplicateOverlap = false;
        let overlapWithId = "";
        for (const accepted of finalBalanced) {
          const overlap = calculateWordOverlap(c.content, accepted.content);
          if (overlap > DIVERSITY_CONSTANTS.ECHO_OVERLAP_THRESHOLD) {
            hasDuplicateOverlap = true;
            overlapWithId = accepted.id;
            break;
          }
        }

        if (hasDuplicateOverlap) {
          echoPreventionActions.push(`duplicate_overlap:${c.id} with ${overlapWithId}`);
          continue;
        }

        // B. Source-Theme Cluster Density Capping
        const comboKey = `${c.sourceType}:${c.category}`;
        const currentComboCount = sourceThemeCounts[comboKey] || 0;
        
        if (currentComboCount >= DIVERSITY_CONSTANTS.MAX_SOURCE_THEME_DENSITY) {
          echoPreventionActions.push(`source_theme_cap_exceeded:${c.id} (${comboKey})`);
          repeatedClusterReductionCount++;
        } else {
          finalBalanced.push(c);
          sourceThemeCounts[comboKey] = currentComboCount + 1;
        }
      }
    }

    // Final Distribution Telemetry mapping
    const finalTaxonomyDist: Record<string, number> = {};
    const finalSourceDist: Record<string, number> = {};

    for (const c of finalBalanced) {
      const tax = c.taxonomy || "general";
      finalTaxonomyDist[tax] = (finalTaxonomyDist[tax] || 0) + 1;
      finalSourceDist[c.sourceType] = (finalSourceDist[c.sourceType] || 0) + 1;
    }

    return {
      balanced: finalBalanced,
      metrics: {
        taxonomyDistribution: finalTaxonomyDist,
        sourceDistribution: finalSourceDist,
        temporalInfluence,
        diversityActions,
        echoPreventionActions,
        repeatedClusterReductionCount,
        freshnessWeightingContribution,
        continuityProtectionSkips
      }
    };
  }
}

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
