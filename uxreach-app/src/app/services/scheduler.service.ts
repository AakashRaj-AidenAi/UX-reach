import { Injectable, signal } from '@angular/core';
import { ScheduledJob } from '../models/scheduled-job.model';

@Injectable({ providedIn: 'root' })
export class SchedulerService {
  readonly jobs = signal<ScheduledJob[]>([]);

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
  }

  getActiveJobs(): ScheduledJob[] {
    return this.jobs().filter(j => j.status === 'scheduled');
  }
}
