export interface StudyProgress {
  studyId: string;
  studyName: string;
  researcher: string;
  totalInvited: number;
  booked: number;
  icfSigned: number;
  confirmed: number;
  noResponse: number;
  declined: number;
  pendingIcf: number;
  needsAttention: string[];
  // EOD activity fields — populated from backend or synthesizeProgress
  p0Ready?: number;
  invitesSentToday?: number;
  appointmentsBookedToday?: number;
  appointmentsCancelled?: number;
  appointmentsRescheduled?: number;
  psCompleted?: number;
  psInvited?: number;
  psCancelled?: number;
  psRescheduled?: number;
}

export interface FunnelStage {
  key: 'invited' | 'responded' | 'booked' | 'icfSigned' | 'confirmed';
  label: string;
  count: number;
  percent: number;
  tone: 'blue' | 'cyan' | 'violet' | 'amber' | 'green';
}

export function buildFunnel(progress: StudyProgress): FunnelStage[] {
  const invited = Math.max(progress.totalInvited, 0);
  const responded = Math.max(invited - progress.noResponse, 0);
  const pct = (n: number) => invited > 0 ? Math.round((n / invited) * 100) : 0;

  return [
    { key: 'invited',   label: 'Invited',    count: invited,              percent: 100,                  tone: 'blue' },
    { key: 'responded', label: 'Responded',  count: responded,            percent: pct(responded),       tone: 'cyan' },
    { key: 'booked',    label: 'Booked',     count: progress.booked,      percent: pct(progress.booked), tone: 'violet' },
    { key: 'icfSigned', label: 'ICF Signed', count: progress.icfSigned,   percent: pct(progress.icfSigned), tone: 'amber' },
    { key: 'confirmed', label: 'Confirmed',  count: progress.confirmed,   percent: pct(progress.confirmed), tone: 'green' },
  ];
}
