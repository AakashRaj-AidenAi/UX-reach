import { Injectable, inject, signal } from '@angular/core';
import { ScheduledJob } from '../models/scheduled-job.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SchedulerService {
  private readonly api = inject(ApiService);
  readonly jobs = signal<ScheduledJob[]>([]);

  constructor() {
    this.fetchJobs();
  }

  fetchJobs(): void {
    this.api.getScheduledJobs().subscribe({
      next: (data) => {
        this.jobs.set(data);
      },
      error: () => {
        // Keep local state as fallback
      }
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

    // Optimistically add to local state
    this.jobs.update(list => [...list, job]);

    // Try to sync with API
    this.api.scheduleSend(studyId, count, scheduledTime, '').subscribe({
      next: (serverJob) => {
        // Update the last job with server response if needed
      },
      error: () => {
        // Keep local state as fallback
      }
    });

    return job;
  }

  cancelJob(index: number): void {
    this.jobs.update(list => {
      const updated = [...list];
      if (updated[index]) {
        updated[index] = { ...updated[index], status: 'cancelled' };
      }
      return updated;
    });

    // Try to sync with API
    this.api.cancelScheduledJob(index).subscribe({
      error: () => {
        // Keep local state as fallback
      }
    });
  }

  getActiveJobs(): ScheduledJob[] {
    return this.jobs().filter(j => j.status === 'scheduled');
  }
}
