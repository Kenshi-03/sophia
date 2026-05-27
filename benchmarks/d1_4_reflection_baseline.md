# D1.4 Reflection Buffer — Verification & Diagnostics Baseline

This benchmark document snapshots the D1.4 Reflection Buffer calibration state, freezing all scoring formulas, thresholds, severity bands, and performance guardrails to establish a stable post-generation verification baseline.

---

## 1. Governance Verification Rules (Contradiction Scan)

These rules define the expected parameter values mapped during Layer 2 baseline checks. If a parameter is referenced in the response but does not match these values, it constitutes a baseline mismatch:

| Parameter / Rule | Expected Value | Conflict Detection Matchers (Mismatches) |
| :--- | :--- | :--- |
| **Overlap Threshold** | `0.70` (or `70%`) | `/0\.[5689]\d*/i`, `/0\.7[1-9]\d*/i`, `75%`, `80%`, `60%` |
| **Base Duplicate Penalty** | `0.20` | `/0\.1[5-9]\d*/i`, `/0\.2[1-9]\d*/i`, `/0\.3\d*/i` |
| **Echo Penalty Cap** | `0.25` | `/0\.2[0-46-9]\d*/i`, `/0\.3\d*/i`, `/0\.1\d*/i` |
| **Active Sprint Boost** | `0.25` (or `+0.25`) | `/0\.3\d*/i`, `/0\.2[0-46-9]\d*/i`, `/0\.1\d*/i` |
| **Historical Anchor Decay** | `0.80` (or `80%`) | `/0\.7\d*/i`, `/0\.8[1-9]\d*/i`, `/0\.9\d*/i`, `75%`, `90%` |
| **Intent Boost** | `0.20` (or `+0.20`) | `/0\.1\d*/i`, `/0\.2[1-9]\d*/i`, `/0\.3\d*/i` |
| **Duplicate Penalty Cap** | `0.45` | `/0\.4[0-46-9]\d*/i`, `/0\.5\d*/i`, `/0\.3\d*/i` |
| **Echo Penalty Base** | `0.10` | `/0\.0[5-9]\d*/i`, `/0\.1[1-9]\d*/i`, `/0\.2\d*/i` |

---

## 2. Bounded Verification Formulas

The Reflection Buffer computes quality scores using the following weighted formulas:

### A. Confidence Score
Measures the overall reliability and consistency of the retrieved context and continuity anchors:
$$\text{confidenceScore} = 0.30 \cdot \text{groundingDominanceScore} + 0.25 \cdot \text{retrievalInfluenceRatio} + 0.25 \cdot \text{averageCandidateConfidence} + 0.20 \cdot \text{continuityStabilityScore}$$

### B. Grounding Score
Measures whether the retrieved governance details survived response generation and are dominant over fallback reasoning:
$$\text{groundingScore} = 0.40 \cdot \text{groundingDominanceScore} + 0.30 \cdot \text{retrievalInfluenceRatio} + 0.20 \cdot \text{groundingDominanceScore} - 0.10 \cdot \text{detailCompressionRatio}$$

---

## 3. Diagnostics Telemetry Flags & Thresholds

We define the following diagnostic flags triggered under warning and anomaly conditions:

| Flag Name | Condition | Interpretation |
| :--- | :--- | :--- |
| **`possibleContradiction`** | `totalIssues >= 1` | Conflicting values or out-of-order tie-breaks found in response. |
| **`ambiguityDetected`** | `ambiguityScore > 0.30` | Overlapping intents or high arbitration score proximity observed. |
| **`lowConfidence`** | `confidenceScore < 0.60` | Overall synthesis confidence is low or continuity is unstable. |
| **`groundingWeak`** | `groundingScore < 0.55` | Details did not survive generation or fallback content dominates. |
| **`genericFallbackDominance`** | `genericFallbackScore > 0.50` | Synthesized response lacks grounding in retrieved details. |
| **`retrievalDetailLoss`** | `detailCompressionRatio > 0.40` | Significant proportion of retrieved details were compressed/omitted. |
| **`excessiveCompression`** | `detailCompressionRatio > 0.45` | Critical warning threshold for loss of retrieved governance details. |

---

## 4. Health Status Severity Bands

Scores are mapped deterministically into severity bands:

- **HEALTHY** (Default): High grounding, high confidence, no contradictions.
- **STABLE**: Slight compression or ambiguity, but within acceptable parameters:
  - `confidenceScore >= 0.60` and `groundingScore >= 0.55` and `ambiguityScore <= 0.50`
- **WARNING**: Low grounding, high compression, or minor contradictions:
  - `confidenceScore < 0.60` or `groundingScore < 0.55` or `contradictionScore > 0.40` or `detailCompressionRatio > 0.45`
- **CRITICAL**: Significant contradictions, extremely low grounding, or low confidence:
  - `confidenceScore < 0.45` or `groundingScore < 0.45` or `contradictionScore > 0.70`

---

## 5. Performance & Safety Guardrails

- **Strictly Read-Only**: Verification must never mutate state, reorder candidates, modify output text, or trigger recursive self-reflections.
- **Latency Budget**: Overhead must remain `<= 5–15%` of total response generation time.
- **Complexity Limit**: Operations must behave as O(1) in relation to the candidates pool size, scanning only bounded strings and arrays.
