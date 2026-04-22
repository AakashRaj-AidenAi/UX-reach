import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../../../services/study.service';
import { AuditService } from '../../../services/audit.service';
import { AppStateService } from '../../../services/app-state.service';
import { ApiService, StudyProgress } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { SendingService } from '../../../services/sending.service';
import { SchedulerService } from '../../../services/scheduler.service';

interface PendingStudy {
  id: string;
  name: string;
  researcher: string;
  sent: number;
  required: number;
  remaining: number;
  lastRun: string | null;
  failed: number;
  p0Ready: number;
  p0NewlyMarked: number;
  expanded: boolean;
  // Participant progress from API
  confirmed: number;
  pendingIcf: number;
  noResponse: number;
  progressLoaded: boolean;
}

@Component({
  selector: 'app-dashboard-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-screen.component.html',
  styleUrl: './dashboard-screen.component.scss'
})
export class DashboardScreenComponent {
  private readonly studyService = inject(StudyService);
  private readonly auditService = inject(AuditService);
  protected readonly appState = inject(AppStateService);
  private readonly api = inject(ApiService);
  private readonly toastService = inject(ToastService);
  private readonly sendingService = inject(SendingService);
  private readonly schedulerService = inject(SchedulerService);

  protected pendingStudies: PendingStudy[] = [];
  protected totalPendingInvites = 0;
  protected totalNewResponses = 0;
  protected totalP0Ready = 0;
  protected loading = true;

  // ── Modal state ──
  protected modalStudy: PendingStudy | null = null;
  protected modalMode: 'send' | 'schedule' | 'sending' | null = null;
  protected modalCount = 10;
  protected modalScheduleDate = '';
  protected modalScheduleTime = '09:00';
  protected modalSendPercent = 0;
  protected modalSendComplete = false;

  constructor() {
    this.refreshData();
  }

  refreshData(): void {
    this.loading = true;
    const rcName = this.appState.userName();
    const studyMap = this.studyService.getStudiesForRC(rcName);
    const auditRuns = this.auditService.runs();

    this.pendingStudies = [];
    this.totalPendingInvites = 0;
    this.totalNewResponses = 0;
    this.totalP0Ready = 0;

    for (const id of Object.keys(studyMap)) {
      const s = studyMap[id];
      const remaining = Math.max(0, s.totalRequired - s.alreadySent);
      this.totalNewResponses += (s.newResponses || 0);
      this.totalP0Ready += (s.p0Ready || 0);

      if (remaining > 0) {
        this.totalPendingInvites += remaining;
        const failedRuns = auditRuns.filter(r => r.studyId === id && r.failed > 0);
        const totalFailed = failedRuns.reduce((sum, r) => sum + r.failed, 0);

        const study: PendingStudy = {
          id,
          name: s.name,
          researcher: s.researcher,
          sent: s.alreadySent,
          required: s.totalRequired,
          remaining,
          lastRun: s.lastRun,
          failed: totalFailed,
          p0Ready: s.p0Ready || 0,
          p0NewlyMarked: s.p0NewlyMarked || 0,
          expanded: false,
          confirmed: 0,
          pendingIcf: 0,
          noResponse: 0,
          progressLoaded: false
        };
        this.pendingStudies.push(study);

        // Fetch participant progress from API
        this.api.getStudyProgress(id).subscribe({
          next: (progress: StudyProgress) => {
            study.confirmed = progress.confirmed;
            study.pendingIcf = progress.pendingIcf;
            study.noResponse = progress.noResponse;
            study.progressLoaded = true;
          },
          error: () => {
            study.progressLoaded = true; // still mark as loaded to remove spinner
          }
        });
      }
    }
    this.loading = false;
  }

  protected get isSending(): boolean {
    return this.appState.isSending();
  }

  protected get currentStudyId(): string | null {
    return this.appState.currentStudyId();
  }

  protected get emailsSent(): number {
    return this.appState.emailsSent();
  }

  protected get currentInviteCount(): number {
    return this.appState.currentInviteCount();
  }

  protected get sendProgressPercent(): number {
    const total = this.currentInviteCount;
    return total > 0 ? Math.round((this.emailsSent / total) * 100) : 0;
  }

  protected get elapsedSeconds(): number {
    return this.appState.elapsedSeconds();
  }

  protected formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  protected toggleExpand(study: PendingStudy): void {
    study.expanded = !study.expanded;
  }

  protected openSendModal(study: PendingStudy): void {
    this.modalStudy = study;
    this.modalCount = Math.min(10, study.remaining);
    this.modalMode = 'send';
    this.modalSendPercent = 0;
    this.modalSendComplete = false;
  }

  protected openScheduleModal(study: PendingStudy): void {
    this.modalStudy = study;
    this.modalCount = Math.min(10, study.remaining);
    this.modalMode = 'schedule';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.modalScheduleDate = tomorrow.toISOString().split('T')[0];
    this.modalScheduleTime = '09:00';
  }

  protected closeModal(): void {
    this.modalStudy = null;
    this.modalMode = null;
    this.modalSendComplete = false;
  }

  protected setQuickCount(n: number): void {
    this.modalCount = n;
  }

  protected confirmSend(): void {
    if (!this.modalStudy) return;
    const study = this.modalStudy;
    const count = Math.min(this.modalCount, study.remaining);
    this.modalMode = 'sending';
    this.modalSendPercent = 0;
    this.modalSendComplete = false;

    const sub = this.sendingService.onEmailTick$.subscribe(({ sent, total }) => {
      this.modalSendPercent = total > 0 ? Math.round((sent / total) * 100) : 0;
    });

    const doneSub = this.sendingService.onComplete$.subscribe(result => {
      sub.unsubscribe();
      doneSub.unsubscribe();
      this.modalSendPercent = 100;
      this.modalSendComplete = true;
      this.toastService.show('success', `${result.sent} invites sent for Study ${result.studyId}`);
      setTimeout(() => {
        this.closeModal();
        this.refreshData();
      }, 1800);
    });

    this.sendingService.startSending(study.id, count);
  }

  protected confirmSchedule(): void {
    if (!this.modalStudy) return;
    const study = this.modalStudy;
    const dateTimeStr = `${this.modalScheduleDate} at ${this.modalScheduleTime}`;
    this.schedulerService.addJob(study.id, study.name, this.modalCount, dateTimeStr);
    this.toastService.show('success', `Scheduled ${this.modalCount} invites for Study ${study.id} on ${dateTimeStr}`);
    this.closeModal();
  }

  protected getCurrentStudyName(): string {
    const id = this.currentStudyId;
    if (!id) return '';
    const study = this.studyService.getStudy(id);
    return study ? `Study ${id} - ${study.name}` : `Study ${id}`;
  }
}
