export interface AuditRun {
  id: string;
  studyId: string;
  studyName: string;
  date: string;
  rc: string;
  sent: number;
  failed: number;
  status: 'completed' | 'sending' | 'failed';
  duration: string;
  sla?: boolean;
}

export type AuditSortKey = keyof AuditRun;
