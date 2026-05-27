# D2.2 — Async Orchestration Runtime Baseline Benchmark

This document freezes a stable baseline for SOPHIA's async orchestration runtime, ensuring future optimizations or features do not cause scheduler regressions, starvation, or race conditions.

---

## 1. Concurrency & Queue Budgets

The async scheduler enforces hard limits to prevent execution explosion and resource leaks:

| Budget Parameter | Baseline Value | Purpose |
|------------------|----------------|---------|
| `maxConcurrentTasks` | `3` | Caps concurrent running tasks in request scope |
| `maxTaskQueueDepth` | `10` | Bounded queue size before backpressure triggers |
| `maxAsyncFanout` | `5` | Total number of async tasks spawned per request |

### Starvation & Backpressure
- **Backpressure**: Task scheduling will throw an error immediately if the queue depth exceeds `maxTaskQueueDepth`.
- **Starvation Avoidance**: The scheduler handles dispatching strictly in a **FIFO (First-In, First-Out)** order.

---

## 2. Timeout & Cancellation Governance

| Level | Mechanism | Trigger | Behavior |
|-------|-----------|---------|----------|
| Request Scope | AbortController | `30000ms` | Aborts request scope, cancelling all running sub-tasks |
| Task Scope | AbortSignal | Custom (default `10000ms`) | Aborts individual task runner, mapping state to `TIMEOUT` / `CANCELLED` |

- **Cancellation Propagation**: Aborting the parent `AbortController` instantly triggers abort signals on all active sub-tasks.
- **Orphan Cleanup**: Calling `compileTelemetryAndCleanup()` clears request timers and deletes controllers to guarantee no memory leaks.

---

## 3. Execution Isolation & Degraded Flow

- **Degraded Execution**:
  - Critical tasks (e.g. `retrieval_memory`) propagate failure and abort the originating request.
  - Non-critical tasks (e.g. `retrieval_schedule`) isolate failures. A thrown exception will set task state to `FAILED`, record the error trace, and return `null` fallback.
  - If a non-critical task fails, the FSM transitions to `DEGRADED` stage but continues execution to complete the query.

---

## 4. Replay & Telemetry Expectations

- **Replay Determinism**:
  - Runs with matching query inputs and mock conditions generate identical task execution order, counts, and final state histories.
- **Observed Metrics in DB Logs**:
  - `activeTasks`, `completedTasks`, `failedTasks`, `cancelledTasks`, `timeoutTasks`
  - `queueDepth`, `concurrencyUsage`
  - `taskDurations` (mapping of taskId -> durationMs)
  - `cancellationEvents` and `timeoutEvents`
  - `schedulerLatency`

---

## 5. Latency & Responsiveness Benchmarks

- **Scheduler Dispatch Cost**: `< 1ms`
- **Telemetry Compiler Overhead**: `< 2ms`
- **Total Orchestration Overhead**: `< 5ms` per request (excluding actual task payload execution time)
