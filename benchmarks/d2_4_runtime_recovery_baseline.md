# D2.4 — Runtime Coordination & Recovery Baseline Benchmark

This document freezes a stable baseline for SOPHIA's runtime coordination, recovery, failure classification, and stability governance. Future runtime upgrades must comply with these rules, budgets, and telemetry expectations to preserve deterministic recovery governance.

---

## 1. Failure Classification & Detection Rules

Failure classification is declarative, matching errors against patterns declared in the tool execution contract:

- **Matching Heuristics**:
  - Exact or Regex match against `FailurePattern.match`.
  - Default fallbacks:
    - `TIMEOUT_FAILURE`: Error contains `timeout` or name is `TimeoutError`.
    - `VALIDATION_FAILURE`: Error contains `validation`, `contract violation`, or `zod`.
    - `RESOURCE_FAILURE`: Error contains `resource limit`, `payload`, or `exceeds limit`.
    - `CANCELLATION_FAILURE`: Error contains `abort` or `cancel`.
    - `OPTIONAL_FAILURE`: Tool is marked `OPTIONAL` and doesn't match above.
    - `CRITICAL_FAILURE`: Default fallback for critical tools.

---

## 2. Retry Governance Policies

Governance enforces strict retry limits and prevents infinite loops under retry storms:

- **Retry Policies**:
  - `NONE`: Max retries = 0.
  - `SAFE_ONCE`: Max retries = 1.
  - `SAFE_TWICE`: Max retries = 2.
- **Budget Enforcements**:
  - Retries are rejected if the Request-Scoped total retry count meets `maxRetryStormThreshold` (Default: `3`).
  - Retries are rejected if the Stability Guard Level 2 Cooldown is active.

---

## 3. Stability Guard & Escalation Rules

A request-scoped 3-tier stability escalation system manages runtime resilience:

- **LEVEL 1 (Warning)**:
  - Trigger: `failureCount >= 1` or `retryCount >= 1`.
  - Action: Logs warning to working memory diagnostics.
- **LEVEL 2 (Degraded)**:
  - Trigger: `failureCount >= 2` or `retryCount >= 2`.
  - Action: Activates a **3-second stabilization cooldown window** in-memory. Sets health status to `DEGRADED`, disables retry paths, and transitions FSM to `DEGRADED` state.
- **LEVEL 3 (Failed)**:
  - Trigger: `degradedCount >= 3` or `failureCount >= 5` or `retryCount >= 4`.
  - Action: Triggers request abort, FSM `FAILED` transition, sets health status to `FAILED`, and cleans up all scope resources.

---

## 4. Bounded Recovery Budgets

The runtime terminates deterministically if recovery budgets are exceeded:

| Budget Dimension | Baseline Limit | Enforcement Behavior |
|------------------|----------------|----------------------|
| `maxRecoveryAttempts` | `5` | Hard-rejects recovery, aborts request, transitions to `FAILED` |
| `maxDegradedTransitions` | `3` | Hard-rejects recovery, aborts request, transitions to `FAILED` |
| `maxRetryStormThreshold` | `3` | Prevents further tool execution retries |

---

## 5. Telemetry & Diagnostics Schema

All recovery actions and health transitions write request-scoped telemetry saved inside the PostgreSQL `retrievalTrace` column:

- **Diagnostics Report**:
  - `failureCount`, `retryCount`, `degradedCount`, `timeoutCount`, `cancellationCount`, `validationCount`, `resourceCount`
  - `stabilityWarnings` (Timestamped log array)
  - `healthStatus` (`'HEALTHY' | 'WARNING' | 'DEGRADED' | 'FAILED'`)
- **Recovery Telemetry**:
  - `failureType`, `recoveryAction`, `retryCount`, `degradedTransitions`, `failureSeverity`, `recoveryLatency`, `orchestrationHealth`, `stabilityWarnings`, `recoveryOutcome`, `escalationCount`, `degradedCount`, `retryStormCount`, `timestamp`.
