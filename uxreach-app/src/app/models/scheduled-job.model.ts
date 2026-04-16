export interface ScheduledJob {
  studyId: string;
  studyName: string;
  count: number;
  scheduledTime: string;
  createdAt: string;
  status: 'scheduled' | 'cancelled' | 'completed';
}
