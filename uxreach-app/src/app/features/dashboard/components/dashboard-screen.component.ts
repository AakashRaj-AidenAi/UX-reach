import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StudyService } from '../../../services/study.service';
import { AuditService } from '../../../services/audit.service';
import { AppStateService } from '../../../services/app-state.service';

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
}

@Component({
  selector: 'app-dashboard-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-screen.component.html',
  styleUrl: './dashboard-screen.component.scss'
})
export class DashboardScreenComponent {
  private readonly studyService = inject(StudyService);
  private readonly auditService = inject(AuditService);
  protected readonly appState = inject(AppStateService);
  private readonly router = inject(Router);

  protected pendingStudies: PendingStudy[] = [];
  protected totalPendingInvites = 0;
  protected totalNewResponses = 0;
  protected totalP0Ready = 0;

  constructor() {
    this.refreshData();
  }

  refreshData(): void {
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

        this.pendingStudies.push({
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
          expanded: false
        });
      }
    }
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

  protected goToChatWithStudy(studyId: string, count: number): void {
    this.router.navigate(['/chat']);
  }

  protected goToChatScheduleStudy(studyId: string, count: number): void {
    this.router.navigate(['/chat']);
  }

  protected getCurrentStudyName(): string {
    const id = this.currentStudyId;
    if (!id) return '';
    const study = this.studyService.getStudy(id);
    return study ? `Study ${id} - ${study.name}` : `Study ${id}`;
  }
}
