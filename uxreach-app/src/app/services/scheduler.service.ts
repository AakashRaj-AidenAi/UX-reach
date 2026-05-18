import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { ScheduledJob } from '../models/scheduled-job.model';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';
import { StudyService } from './study.service';

@Injectable({ providedIn: 'root' })
export class SchedulerService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly toastService = inject(ToastService);
  private readonly studyService = inject(StudyService);

  readonly jobs = signal<ScheduledJob[]>([]);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.fetchJobs();
    this.pollTimer = setInterval(() => this.pollForUpdates(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  fetchJobs(): void {
    this.api.getScheduledJobs().subscribe({
      next: (data) => this.jobs.set(data),
      error: () => {}
    });
  }

  private pollForUpdates(): void {
    const prevJobs = this.jobs();
    this.api.getScheduledJobs().subscribe({
      next: (fresh) => {
        let studyRefreshNeeded = false;

        for (const updated of fresh) {
          const prev = prevJobs.find(
            j => j.studyId === updated.studyId &&
                 j.scheduledTime === updated.scheduledTime &&
                 j.count === updated.count
          );

          if (prev?.status === 'scheduled' && updated.status === 'running') {
            this.toastService.show(
              'info',
              `Scheduled send started: ${updated.count} invites for Study ${updated.studyId}`
            );
          }

          if ((prev?.status === 'scheduled' || prev?.status === 'running') && updated.status === 'completed') {
            this.toastService.show(
              'success',
              `Scheduled send complete: ${updated.count} invites sent for Study ${updated.studyId}`
            );
            studyRefreshNeeded = true;
          }

          if ((prev?.status === 'scheduled' || prev?.status === 'running') && updated.status === 'failed') {
            this.toastService.show(
              'error',
              `Scheduled send failed for Study ${updated.studyId}`
            );
          }
        }

        this.jobs.set(fresh);

        if (studyRefreshNeeded) {
          this.studyService.fetchStudies();
        }
      },
      error: () => {}
    });
  }

  addJob(studyId: string, studyName: string, count: number, scheduledTime: string): ScheduledJob {
    const job: ScheduledJob = {
      studyId,
      studyName,
      count,
      scheduledTime,
      createdAt: new Date().toLocaleString(),
      status: 'scheduled'
    };

    this.jobs.update(list => [...list, job]);

    this.api.scheduleSend(studyId, count, scheduledTime, '').subscribe({
      next: () => {},
      error: () => {}
    });

    return job;
  }

  cancelJob(index: number): void {
    this.jobs.update(list => {
      const updated = [...list];
      if (updated[index]) updated[index] = { ...updated[index], status: 'cancelled' };
      return updated;
    });

    this.api.cancelScheduledJob(index).subscribe({ error: () => {} });
  }

  getActiveJobs(): ScheduledJob[] {
    return this.jobs().filter(j => j.status === 'scheduled');
  }
}
