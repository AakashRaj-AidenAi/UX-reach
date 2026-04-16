import { AuditRun } from '../models/audit-run.model';

export const AUDIT_RUNS: AuditRun[] = [
  { id: 'RUN-0412-001', studyId: '1234567', studyName: 'Global Ads Experience Survey', date: '2026-04-12', rc: 'Sarah Chen', sent: 10, failed: 0, status: 'completed', duration: '4m 12s', sla: true },
  { id: 'RUN-0408-001', studyId: '6789012', studyName: 'Assistant Voice Interface Study', date: '2026-04-08', rc: 'Sarah Chen', sent: 5, failed: 0, status: 'completed', duration: '2m 10s', sla: true },
  { id: 'RUN-0405-001', studyId: '1234567', studyName: 'Global Ads Experience Survey', date: '2026-04-05', rc: 'Sarah Chen', sent: 5, failed: 0, status: 'completed', duration: '1m 20s', sla: true }
];
