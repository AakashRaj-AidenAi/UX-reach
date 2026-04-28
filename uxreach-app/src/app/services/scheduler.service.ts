import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { ScheduledJob } from '../models/scheduled-job.model';
import { ApiService } from './api.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class SchedulerService implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly toastService = inject(ToastService);

  readonly jobs = signal<ScheduledJob[]>([]);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.fetchJobs();
    // Poll every 30 seconds to pick up status changes from the backend scheduler
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
        // Detect jobs that just completed or failed
        for (const updated of fresh) {
          const prev = prevJobs.find(
            j => j.studyId === updated.studyId &&
                 j.scheduledTime === updated.scheduledTime &&
                 j.count === updated.count
          );
          if (prev?.status === 'scheduled' && updated.status === 'completed') {
            this.toastService.show(
              'success',
              `Scheduled send complete: ${updated.count} invites sent for Study ${updated.studyId}`
            );
          } else if (prev?.status === 'scheduled' && updated.status === 'failed') {
            this.toastService.show(
              'error',
              `Scheduled send failed for Study ${updated.studyId}`
            );
          }
        }
        this.jobs.set(fresh);
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
