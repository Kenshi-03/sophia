# D2.3 — Tool Orchestration Layer Baseline Benchmark

This document freezes a stable baseline for SOPHIA's deterministic tool orchestration layer, ensuring future optimizations, FSM upgrades, or new tools comply with established contract validation, routing permissions, and budget constraints.

---

## 1. Registry Immutability & Lifecycle Rules

The tool registry enforces static, startup-only registration to preserve replay determinism and runtime compatibility:

- **Immutability**: Once registered and frozen, `ToolRegistry` definitions, execution contracts, routing rules, and permission scopes cannot be modified at runtime.
- **Explicit Lifecycle Flow**:
  - `REGISTERED` → `ROUTED` → `VALIDATED` → `EXECUTING` → `COMPLETED` / `FAILED` / `TIMEOUT` / `CANCELLED` / `DEGRADED`.
- **Deterministic Cleanup**:
  - On failed, cancelled, timeout, or degraded execution, resources (AbortSignals, active timers, execution handles) are instantly cleared to prevent memory leaks or zombie tasks.

---

## 2. Tool Execution Contracts & Validation

Every tool must implement a strict `ToolExecutionContract` using **Zod** schemas:

| Field | Purpose / Constraint |
|-------|----------------------|
| `toolId` / `toolName` | Unique identifier and human-readable name |
| `criticality` | `'CRITICAL' | 'IMPORTANT' | 'OPTIONAL'` |
| `inputSchema` | Zod schema validating input payload before execution |
| `outputSchema` | Zod schema verifying output payload after execution |
| `timeoutMs` | Tool-level latency budget (cancellable via task AbortSignal) |
| `maxRetries` | Maximum retries allowed (Default: `0` to prevent loop storms) |

- **Contract Enforcement**: Rejects execution instantly if input parsing fails (no task is scheduled). Throws a contract violation if output parsing fails.

---

## 3. Deterministic Tool Routing

- **Routing Rules**:
  - Selection is strictly governed by the current `ExecutiveLifecycleState` and analyzed user intent.
  - Active intent acts as a scope narrowing signal, not an autonomous planning flag.
  - Tools are mapped to explicit allowed FSM stages (e.g. `memory_search` is only allowed in `RETRIEVAL`).
- **Forbidden**: Recursive tool invocation, autonomous chaining, dynamic runtime injection, or hidden fallbacks.

---

## 4. Concurrency & Resource Budgets

| Budget Dimension | Baseline Limit | Enforcement Behavior |
|------------------|----------------|----------------------|
| Max Latency | Custom (`timeoutMs` per tool) | Rejects execution, logs `TIMEOUT` telemetry |
| Max Concurrency | `3` (inherited from AsyncScheduler) | Queues task or rejects on queue depth > 10 |
| Max Payload Size | Custom (e.g. 1MB - 4MB) | Blocks execution if input/output JSON string exceeds limit |

---

## 5. Telemetry & Observability

- **Observed Metrics in DB Logs**:
  - `toolId`, `toolName`, `toolVersion`
  - `requestId` (matching Working Memory executionId)
  - `executionOwner` (matching user id)
  - `lifecycleState`
  - `latencyMs`
  - `inputHash` and `outputHash` (SHA-256 for replay tracking, no raw data payload is persisted to DB)
  - `error` (detailed error message on failure)
  - `routingReasonCode` (`'FSM_STAGE_MATCH' | 'INTENT_SCOPE_MATCH' | 'PERMISSION_VALIDATED' | 'DEGRADED_FALLBACK' | 'ROUTE_REJECTED'`)
  - `routingReasonDetail`
