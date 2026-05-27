# D1.3 Retrieval Arbitration — Stable Calibration Baseline

This benchmark document snapshots the D1.3 Retrieval Arbitration Hooks calibration state, freezing all weights, thresholds, and cascade parameters to establish a stable governance baseline prior to entering D1.4.

---

## 1. Governance Calibration Snapshot

These parameters control semantic relevance, temporal decay, intent routing, and active focus boosts:

| Calibration Parameter | Value / Formula | Role & Governance Logic |
| :--- | :--- | :--- |
| **Overlap Threshold** | `> 0.70` | Triggers duplicate overlap penalty on semantically redundant candidates. |
| **Base Duplicate Penalty** | `0.20` | Penalty applied for the first duplicate candidate found in a cluster. |
| **Duplicate Scaling Rate** | `+0.04` | Incremental penalty added per additional duplicate candidate. |
| **Duplicate Penalty Cap** | `0.45` | Maximum total duplicate penalty applied to a candidate. |
| **Base Echo Penalty** | `0.10` | Penalty applied for repeated sources and categories in active continuity context. |
| **Echo Scaling Rate** | `+0.03` | Incremental penalty added per additional matching echo source. |
| **Echo Penalty Cap** | `0.25` | Maximum total echo penalty applied to a candidate. |
| **Active Sprint Boost** | `+0.25` | Usefulness score boost for active roadmap/sprint/cluster candidates. |
| **Historical Anchor Decay** | `*0.80` | Continuity score decay for historical anchors from older roadmap phases. |
| **Intent Weight Boost** | `+0.20` (max) | Maximum usefulness score boost based on domain intent mapping. |
| **Exempt Category Exemption** | `0.0` (100% exempt) | Total suppression immunity for system anchors, active session nodes, and category focus matches. |
| **Episodic Exemption** | `0.5` (50% exempt) | Half-suppression immunity for episodic memories, sprint/phase tags. |

---

## 2. Bounded Tie-Break Cascade Priority

When multiple candidates share identical final scores, the cascade resolves ties deterministically using the following ordering:

1. **`finalScore`** (descending)
2. **`usefulnessScore`** (descending)
3. **`continuityScore`** (descending)
4. **`semanticScore`** (descending)
5. **`sourceScore`** (descending)
6. **`temporalScore`** (descending)
7. **`duplicatePenalty`** (ascending - prioritizes less suppressed candidates)
8. **`tokenCount`** (ascending - prioritizes shorter context footprint)
9. **`Lexicographical ID`** fallback (alphabetic string comparison of node IDs)

---

## 3. Telemetry Grounding Metrics & Expectations

Observed synthesis logs are processed against these telemetry expectations to determine fidelity health:

| Metric | Target / Healthy Range | Verification Constraint |
| :--- | :--- | :--- |
| **`retrievedDetailCount`** | `N >= 0` | Counts total matching target parameters in selected memories. |
| **`preservedGovernanceFacts`** | `P >= 0` | Counts total matching parameters that survived in the response. |
| **`groundingDominanceScore`** | `0.0 → 1.0` | `preservedGovernanceFacts / retrievedDetailCount` |
| **`genericFallbackScore`** | `0.0 → 1.0` | `1.0 - groundingDominanceScore` (measure of generic abstraction). |
| **`retrievalInfluenceRatio`** | **`0.55 → 0.80`** | Must remain within bounds to prevent verbatim regurgitation or generic fallback. |
| **`detailCompressionRatio`** | **`< 0.45`** | Ratio of lost details. Warning is triggered if it exceeds 0.45. |

---

## 4. Replay Validation & Determinism

- **Stable Footprint Hash**: Candidate pool sorting and final scores must compile into an identical footprint hash across execution runs.
- **Drift Tolerance**: Replay snapshots must flag a mismatch if a single node relevance changes, guaranteeing replay safety.
