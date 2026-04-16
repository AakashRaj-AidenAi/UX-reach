import { Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { AppStateService } from './app-state.service';
import { StudyService } from './study.service';
import { AuditService } from './audit.service';
import { AuditRun } from '../models/audit-run.model';

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

  private sendingInterval: ReturnType<typeof setInterval> | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  readonly onEmailTick$ = new Subject<{ sent: number; total: number }>();
  readonly onComplete$ = new Subject<SendingResult>();

  startSending(studyId: string, count: number): void {
    this.appState.chatState.set('sending');
    this.appState.emailsSent.set(0);
    this.appState.elapsedSeconds.set(0);

    const total = count;

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
          sent: total,
          failed: 0,
          status: 'completed',
          duration: durationStr,
          sla: true
        };
        this.auditService.addRun(auditRun);

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

  stopSending(): void {
    const sent = this.appState.emailsSent();
    const total = this.appState.currentInviteCount();
    const durationStr = this.formatDuration(this.appState.elapsedSeconds());
    const studyId = this.appState.currentStudyId() ?? '';

    this.clearIntervals();
    this.appState.chatState.set('idle');

    if (sent > 0) {
      this.studyService.updateStudySent(studyId, sent);

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
