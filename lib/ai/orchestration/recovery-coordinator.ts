import { logger } from '@/lib/logger';
import {
  ExecutiveLifecycleState,
  WorkingMemoryState,
  FailureClassification,
  RetryPolicy,
  FailurePattern,
  RecoveryOutcome,
  OrchestrationHealth,
  RecoveryTelemetry,
  DiagnosticsReport,
  ToolExecutionContract
} from '@/lib/ai/working-memory/types';
import { WorkingMemory } from '@/lib/ai/working-memory/store';
import { ExecutiveFSM } from './executive-fsm';
import { CancellationManager, TimeoutManager } from './async-runtime';

/**
 * Deterministically classifies runtime failures using declarative tool contract patterns.
 */
export class FailureClassificationSystem {
  public static classify(contract: ToolExecutionContract, error: Error): FailureClassification {
    const errorMsg = error.message || String(error);

    // Match against contract failure patterns
    if (contract.failurePatterns && contract.failurePatterns.length > 0) {
      for (const pattern of contract.failurePatterns) {
        try {
          const regex = new RegExp(pattern.match, 'i');
          if (regex.test(errorMsg)) {
            return pattern.classification;
          }
        } catch (regexErr) {
          // If match string is not a valid regex, check substring
          if (errorMsg.toLowerCase().includes(pattern.match.toLowerCase())) {
            return pattern.classification;
          }
        }
      }
    }

    // Default heuristics
    if (
      errorMsg.toLowerCase().includes('timeout') ||
      errorMsg.toLowerCase().includes('timed out') ||
      error.name?.toLowerCase().includes('timeout')
    ) {
      return 'TIMEOUT_FAILURE';
    }
    if (
      errorMsg.toLowerCase().includes('validation') ||
      errorMsg.toLowerCase().includes('contract violation') ||
      errorMsg.toLowerCase().includes('zod')
    ) {
      return 'VALIDATION_FAILURE';
    }
    if (
      errorMsg.toLowerCase().includes('resource limit') ||
      errorMsg.toLowerCase().includes('payload') ||
      errorMsg.toLowerCase().includes('exceeds limit')
    ) {
      return 'RESOURCE_FAILURE';
    }
    if (errorMsg.toLowerCase().includes('abort') || errorMsg.toLowerCase().includes('cancel')) {
      return 'CANCELLATION_FAILURE';
    }

    // If it's an optional tool, map to OPTIONAL_FAILURE
    if (contract.criticality === 'OPTIONAL') {
      return 'OPTIONAL_FAILURE';
    }

    return 'CRITICAL_FAILURE';
  }
}

/**
 * Enforces strict retry limitations and prevents loop storms.
 */
export class RetryGovernance {
  public static isRetryAllowed(
    contract: ToolExecutionContract,
    currentRetryCount: number,
    report: DiagnosticsReport | undefined,
    maxRetryStormThreshold = 3
  ): { allowed: boolean; reason?: string } {
    const policy = contract.failurePatterns?.[0]?.retryPolicy || 'NONE';

    // 1. Policy check
    let maxRetries = contract.maxRetries;
    if (policy === 'NONE') {
      maxRetries = 0;
    } else if (policy === 'SAFE_ONCE') {
      maxRetries = Math.min(maxRetries, 1);
    } else if (policy === 'SAFE_TWICE') {
      maxRetries = Math.min(maxRetries, 2);
    }

    if (currentRetryCount >= maxRetries) {
      return { allowed: false, reason: `Max retries reached (${currentRetryCount}/${maxRetries})` };
    }

    // 2. Retry storm check
    if (report && report.retryCount >= maxRetryStormThreshold) {
      return { allowed: false, reason: `Retry storm prevention triggered: total retries (${report.retryCount}) hit threshold of ${maxRetryStormThreshold}` };
    }

    return { allowed: true };
  }
}

/**
 * Accumulates request-scoped anomalies and updates diagnostics reports.
 */
export class RuntimeDiagnosticsEngine {
  public static async logAnomaly(
    wm: WorkingMemory,
    anomalyType: FailureClassification | 'STABILITY_ALERT' | 'COOLDOWN_ALERT',
    detail: string
  ): Promise<DiagnosticsReport> {
    let report: DiagnosticsReport = {
      failureCount: 0,
      retryCount: 0,
      degradedCount: 0,
      timeoutCount: 0,
      cancellationCount: 0,
      validationCount: 0,
      resourceCount: 0,
      stabilityWarnings: [],
      healthStatus: 'HEALTHY'
    };

    await wm.updateState((state) => {
      if (!state.diagnosticsReport) {
        state.diagnosticsReport = report;
      }
      report = state.diagnosticsReport;

      report.failureCount++;
      if (anomalyType === 'TIMEOUT_FAILURE') {
        report.timeoutCount++;
      } else if (anomalyType === 'CANCELLATION_FAILURE') {
        report.cancellationCount++;
      } else if (anomalyType === 'VALIDATION_FAILURE') {
        report.validationCount++;
      } else if (anomalyType === 'RESOURCE_FAILURE') {
        report.resourceCount++;
      }

      const warningMsg = `[${new Date().toISOString()}] ${anomalyType}: ${detail}`;
      report.stabilityWarnings.push(warningMsg);
    });

    return report;
  }

  public static async incrementRetryCount(wm: WorkingMemory): Promise<void> {
    await wm.updateState((state) => {
      if (state.diagnosticsReport) {
        state.diagnosticsReport.retryCount++;
      }
    });
  }

  public static async incrementDegradedCount(wm: WorkingMemory): Promise<void> {
    await wm.updateState((state) => {
      if (state.diagnosticsReport) {
        state.diagnosticsReport.degradedCount++;
      }
    });
  }

  public static async setHealthStatus(wm: WorkingMemory, status: OrchestrationHealth): Promise<void> {
    await wm.updateState((state) => {
      if (state.diagnosticsReport) {
        state.diagnosticsReport.healthStatus = status;
      }
    });
  }
}

/**
 * Implements 3-tier escalation stability guardrails and cooldown windows.
 */
export class RuntimeStabilityGuard {
  private static cooldownWindows = new Map<string, number>(); // executionId -> expiration epoch ms

  public static checkInstability(
    report: DiagnosticsReport | undefined,
    executionId: string
  ): { active: boolean; level: OrchestrationHealth; reason?: string } {
    if (!report) {
      return { active: false, level: 'HEALTHY' };
    }

    const now = Date.now();
    const cooldownUntil = this.cooldownWindows.get(executionId) || 0;

    // 1. Check if Cooldown is active
    if (now < cooldownUntil) {
      return {
        active: true,
        level: 'DEGRADED',
        reason: `Instability Guard: Cooldown window active until ${new Date(cooldownUntil).toISOString()}`
      };
    }

    // LEVEL 3 — FAILED
    // Repeated degraded loops or massive failure rates
    if (
      report.degradedCount >= 3 ||
      report.failureCount >= 5 ||
      report.retryCount >= 4
    ) {
      return {
        active: true,
        level: 'FAILED',
        reason: `Stability Guard Level 3 Triggered: Repeated failures/degradation detected. Degraded count: ${report.degradedCount}, Retry count: ${report.retryCount}`
      };
    }

    // LEVEL 2 — DEGRADED
    // Multiple optional failures or retry contention
    if (report.failureCount >= 2 || report.retryCount >= 2) {
      // Activate Cooldown Window (e.g. 3 seconds stabilization time)
      const cooldownMs = 3000;
      this.cooldownWindows.set(executionId, now + cooldownMs);
      logger.warn("Instability Guard Level 2: Activating stabilization cooldown window", {
        executionId,
        durationMs: cooldownMs
      });

      return {
        active: true,
        level: 'DEGRADED',
        reason: `Stability Guard Level 2 Triggered: Multiple anomalies. Cooldown window activated.`
      };
    }

    // LEVEL 1 — WARNING
    if (report.failureCount >= 1 || report.retryCount >= 1) {
      return {
        active: true,
        level: 'WARNING',
        reason: `Stability Guard Level 1 Triggered: Anomaly count increased. Monitoring active.`
      };
    }

    return { active: false, level: 'HEALTHY' };
  }

  public static clearCooldown(executionId: string) {
    this.cooldownWindows.delete(executionId);
  }
}

/**
 * Request-scoped authority governing tool execution failure recovery, retries, and cleanups.
 */
export class RecoveryCoordinator {
  private wm: WorkingMemory;
  private requestId: string;
  private userId: string;

  // Recovery budgets
  private maxRecoveryAttempts = 5;
  private maxDegradedTransitions = 3;
  private maxRetryStormThreshold = 3;

  constructor(wm: WorkingMemory) {
    this.wm = wm;
    this.requestId = wm.getState().executionId;
    this.userId = wm.getState().userId;
  }

  public async handleToolFailure(
    toolId: string,
    contract: ToolExecutionContract,
    error: Error,
    currentRetryCount: number
  ): Promise<{ action: 'retry' | 'degrade' | 'fail'; retryDelayMs?: number }> {
    const state = this.wm.getState();

    const classification = FailureClassificationSystem.classify(contract, error);
    const startTimeMs = Date.now();

    // 1. Log anomaly inside DiagnosticsEngine
    const report = await RuntimeDiagnosticsEngine.logAnomaly(this.wm, classification, error.message || String(error));

    // 2. Check Stability Guardrails
    const stability = RuntimeStabilityGuard.checkInstability(report, this.requestId);
    if (stability.active) {
      await RuntimeDiagnosticsEngine.logAnomaly(this.wm, 'STABILITY_ALERT', stability.reason || '');
      
      if (stability.level === 'DEGRADED') {
        await RuntimeDiagnosticsEngine.setHealthStatus(this.wm, 'DEGRADED');
        // Escalate FSM to DEGRADED state
        if (state.currentStage !== 'DEGRADED' && state.currentStage !== 'FAILED') {
          await ExecutiveFSM.transitionTo(this.wm, 'DEGRADED', 'DEGRADED_FALLBACK', {
            causeMessage: stability.reason
          });
        }
      } else if (stability.level === 'FAILED') {
        await RuntimeDiagnosticsEngine.setHealthStatus(this.wm, 'FAILED');
        await this.writeTelemetry(classification, stability.reason || 'Stability Guard level 3 triggered', currentRetryCount, 'FAILED', contract.failureSeverity);
        await this.terminateAndCleanup('FAILED', stability.reason || 'Stability Guard level 3 triggered');
        return { action: 'fail' };
      }
    }

    // 3. Budget enforcement check
    if (report.failureCount > this.maxRecoveryAttempts) {
      const reason = `Recovery budget exceeded: total failures (${report.failureCount}) exceeds budget of ${this.maxRecoveryAttempts}`;
      await this.writeTelemetry(classification, reason, currentRetryCount, 'FAILED', contract.failureSeverity);
      await this.terminateAndCleanup('FAILED', reason);
      return { action: 'fail' };
    }

    if (report.degradedCount > this.maxDegradedTransitions) {
      const reason = `Degradation budget exceeded: total degraded transitions (${report.degradedCount}) exceeds budget of ${this.maxDegradedTransitions}`;
      await this.writeTelemetry(classification, reason, currentRetryCount, 'FAILED', contract.failureSeverity);
      await this.terminateAndCleanup('FAILED', reason);
      return { action: 'fail' };
    }

    // 4. Retry Eligibility Evaluation
    const retryCheck = RetryGovernance.isRetryAllowed(contract, currentRetryCount, report, this.maxRetryStormThreshold);
    
    // Do not allow retries if level 2 degraded mode cooldown is active
    const isCooldownActive = stability.active && stability.level === 'DEGRADED';
    if (retryCheck.allowed && !isCooldownActive) {
      await RuntimeDiagnosticsEngine.incrementRetryCount(this.wm);
      await this.writeTelemetry(classification, `Retrying tool execution (attempt ${currentRetryCount + 1})`, currentRetryCount + 1, 'RECOVERED', contract.failureSeverity);
      return { action: 'retry', retryDelayMs: 100 }; // 100ms deterministic delay
    }

    // 5. Degradation fallback evaluation
    const canDegrade = contract.degradationAllowed || contract.criticality === 'OPTIONAL';
    if (canDegrade) {
      await RuntimeDiagnosticsEngine.incrementDegradedCount(this.wm);
      await RuntimeDiagnosticsEngine.setHealthStatus(this.wm, 'DEGRADED');
      
      if (this.wm.getState().currentStage !== 'DEGRADED') {
        await ExecutiveFSM.transitionTo(this.wm, 'DEGRADED', 'DEGRADED_FALLBACK', {
          causeMessage: `Gracefully degrading tool ${toolId}`
        });
      }

      await this.writeTelemetry(classification, `Degrading gracefully to fallback`, currentRetryCount, 'DEGRADED', contract.failureSeverity);
      return { action: 'degrade' };
    }

    // 6. Otherwise: Hard failure
    const failReason = `Unrecoverable tool failure of critical tool ${toolId}. Reason: ${error.message}`;
    await this.writeTelemetry(classification, failReason, currentRetryCount, 'FAILED', contract.failureSeverity);
    await this.terminateAndCleanup('FAILED', failReason);
    return { action: 'fail' };
  }

  /**
   * Deterministically terminates request scope, cleans up all async handlers, and records failure status.
   */
  public async terminateAndCleanup(targetState: 'FAILED' | 'TIMEOUT' | 'CANCELLED', reason: string): Promise<void> {
    logger.error(`Terminating Recovery Scope: ${reason}`, { requestId: this.requestId });
    
    // Write diagnostics warnings
    let failType: FailureClassification = 'CRITICAL_FAILURE';
    if (targetState === 'TIMEOUT') {
      failType = 'TIMEOUT_FAILURE';
    } else if (targetState === 'CANCELLED') {
      failType = 'CANCELLATION_FAILURE';
    }
    await this.writeTelemetry(failType, `Orchestration terminated: ${reason}`, 0, 'FAILED', 'critical');

    // 1. Cleanup all timers and AbortControllers
    TimeoutManager.clearScopeTimers(this.requestId);
    CancellationManager.cancelScope(this.requestId, reason);
    CancellationManager.releaseScope(this.requestId);
    RuntimeStabilityGuard.clearCooldown(this.requestId);

    // 2. FSM Transition to target state
    if (targetState === 'FAILED') {
      await ExecutiveFSM.triggerFailure(this.wm, reason);
    } else if (targetState === 'TIMEOUT') {
      await ExecutiveFSM.triggerTimeout(this.wm, reason);
    } else if (targetState === 'CANCELLED') {
      await ExecutiveFSM.triggerCancellation(this.wm, reason);
    }
  }

  private async writeTelemetry(
    failureType: FailureClassification,
    action: string,
    retryCount: number,
    outcome: RecoveryOutcome,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    const report = this.wm.getState().diagnosticsReport;
    const telemetry: RecoveryTelemetry = {
      failureType,
      recoveryAction: action,
      retryCount,
      degradedTransitions: report?.degradedCount || 0,
      failureSeverity: severity,
      recoveryLatency: 0,
      orchestrationHealth: report?.healthStatus || 'HEALTHY',
      stabilityWarnings: report?.stabilityWarnings || [],
      recoveryOutcome: outcome,
      escalationCount: report?.healthStatus === 'FAILED' ? 2 : (report?.healthStatus === 'DEGRADED' ? 1 : 0),
      degradedCount: report?.degradedCount || 0,
      retryStormCount: report?.retryCount || 0,
      timestamp: new Date().toISOString()
    };

    await this.wm.updateState((state) => {
      if (!state.recoveryTelemetry) {
        state.recoveryTelemetry = [];
      }
      state.recoveryTelemetry.push(telemetry);
    });
  }
}
