import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { AppStateService } from './app-state.service';
import { StudyService } from './study.service';
import { AuditService } from './audit.service';
import { AuditRun } from '../models/audit-run.model';
import { ApiService } from './api.service';

export interface SendingResult {
  studyId: string;
  sent: number;
  total: number;
  durationStr: string;
  completed: boolean;
  queuePosition?: number;
  queueTotal?: number;
}

@Injectable({ providedIn: 'root' })
export class SendingService {
  private readonly appState = inject(AppStateService);
  private readonly studyService = inject(StudyService);
  private readonly auditService = inject(AuditService);
  private readonly api = inject(ApiService);

  private sendingInterval: ReturnType<typeof setInterval> | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private currentSessionId: string | null = null;

  readonly onEmailTick$ = new Subject<{ sent: number; total: number }>();
  readonly onComplete$ = new Subject<SendingResult>();

  startSending(studyId: string, count: number): void {
    this.appState.chatState.set('sending');
    this.appState.emailsSent.set(0);
    this.appState.elapsedSeconds.set(0);

    const total = count;
    const userName = this.appState.userName();

    // Try API first, fallback to local simulation
    this.api.startSend(studyId, count, userName).subscribe({
      next: (response) => {
        this.currentSessionId = response.sessionId;
        this.startApiPolling(studyId, total);
      },
      error: () => {
        // Fallback to local simulation
        this.startLocalSimulation(studyId, total);
      }
    });
  }

  private startApiPolling(studyId: string, total: number): void {
    if (!this.currentSessionId) return;

    this.timerInterval = setInterval(() => {
      this.appState.elapsedSeconds.update(s => s + 1);
    }, 1000);

    this.sendingInterval = setInterval(() => {
      if (!this.currentSessionId) return;

      this.api.getSendProgress(this.currentSessionId).subscribe({
        next: (progress) => {
          const tickSent = progress.emailsSent ?? progress.sent ?? 0;
          this.appState.emailsSent.set(tickSent);
          this.onEmailTick$.next({ sent: tickSent, total: progress.total });

          if (progress.isComplete) {
            this.clearIntervals();
            this.appState.chatState.set('idle');
            this.currentSessionId = null;

            const durationStr = progress.durationStr || this.formatDuration(this.appState.elapsedSeconds());
            const sentCount = progress.emailsSent ?? progress.sent ?? total;

            this.studyService.updateStudySent(studyId, progress.sent);
            this.recordAuditRun(studyId, progress.sent, durationStr);
            this.appState.bumpStudyListVersion();

            const queue = this.appState.sendQueue();
            const queueIdx = this.appState.sendQueueIndex();

            this.onComplete$.next({
              studyId,
              sent: sentCount,
              total: progress.total,
              durationStr,
              completed: true,
              queuePosition: queue.length > 1 ? queueIdx + 1 : undefined,
              queueTotal: queue.length > 1 ? queue.length : undefined
            });
          }
        },
        error: () => {
          // If polling fails, switch to local simulation
          this.clearIntervals();
          this.currentSessionId = null;
          this.startLocalSimulation(studyId, total);
        }
      });
    }, 1000);
  }

  private startLocalSimulation(studyId: string, total: number): void {
    this.timerInterval = setInterval(() => {
      this.appState.elapsedSeconds.update(s => s + 1);
    }, 1000);

    this.sendingInterval = setInterval(() => {
      const newSent = this.appState.emailsSent() + 1;
      this.appState.emailsSent.set(newSent);

      this.onEmailTick$.next({ sent: newSent, total });

      if (newSent >= total) {
        this.clearIntervals();
        this.appState.chatState.set('idle');

        const durationStr = this.formatDuration(this.appState.elapsedSeconds());

        this.studyService.updateStudySent(studyId, total);
        this.recordAuditRun(studyId, total, durationStr);
        this.appState.bumpStudyListVersion();

        const queue = this.appState.sendQueue();
        const queueIdx = this.appState.sendQueueIndex();

        this.onComplete$.next({
          studyId,
          sent: total,
          total,
          durationStr,
          completed: true,
          queuePosition: queue.length > 1 ? queueIdx + 1 : undefined,
          queueTotal: queue.length > 1 ? queue.length : undefined
        });
      }
    }, 500);
  }

  private recordAuditRun(studyId: string, sent: number, durationStr: string): void {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const runId = `RUN-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
    const study = this.studyService.getStudy(studyId);

    const auditRun: AuditRun = {
      id: runId,
      studyId,
      studyName: study?.name ?? 'Unknown Study',
      date: dateStr,
      rc: this.appState.userName(),
      sent,
      failed: 0,
      status: 'completed',
      duration: durationStr,
      sla: true
    };
    this.auditService.addRun(auditRun);
  }

  stopSending(): void {
    const sent = this.appState.emailsSent();
    const total = this.appState.currentInviteCount();
    const durationStr = this.formatDuration(this.appState.elapsedSeconds());
    const studyId = this.appState.currentStudyId() ?? '';

    // Try to stop via API
    if (this.currentSessionId) {
      this.api.stopSend(this.currentSessionId).subscribe();
      this.currentSessionId = null;
    }

    this.clearIntervals();
    this.appState.chatState.set('idle');

    if (sent > 0) {
      this.studyService.updateStudySent(studyId, sent);
      this.recordAuditRun(studyId, sent, durationStr);
      this.appState.bumpStudyListVersion();
    }

    const wasQueued = this.appState.sendQueue().length > 1;
    const remainingInQueue = wasQueued
      ? (this.appState.sendQueue().length - this.appState.sendQueueIndex() - 1)
      : 0;

    this.appState.resetQueue();

    this.onComplete$.next({
      studyId,
      sent,
      total,
      durationStr,
      completed: false,
      queuePosition: remainingInQueue > 0 ? remainingInQueue : undefined
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}m ${secs}s`;
  }

  private clearIntervals(): void {
    if (this.sendingInterval !== null) {
      clearInterval(this.sendingInterval);
      this.sendingInterval = null;
    }
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
