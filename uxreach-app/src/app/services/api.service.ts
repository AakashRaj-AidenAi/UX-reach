import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { Study, StudyMap } from '../models/study.model';
import { AuditRun } from '../models/audit-run.model';
import { ScheduledJob } from '../models/scheduled-job.model';
import { Delegation } from '../models/delegation.model';
import { SendingProgress } from '../models/chat.model';

export interface ChatApiResponse {
  html: string;
  actions?: any[];
  intent: string;
}

export interface Participant {
  id: string;
  studyId: string;
  name: string;
  status: string;
  invitedDate: string;
  responseDate: string | null;
  bookedSlot: string | null;
  icfSigned: boolean;
  needsReminder: boolean;
  daysSinceInvite: number;
}

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
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // ── Studies ──

  getStudies(): Observable<StudyMap> {
    return this.http.get<StudyMap>(`${this.baseUrl}/studies`);
  }

  getStudy(id: string): Observable<Study> {
    return this.http.get<Study>(`${this.baseUrl}/studies/${id}`);
  }

  getPendingStudies(): Observable<StudyMap> {
    return this.http.get<StudyMap>(`${this.baseUrl}/studies/pending`);
  }

  getRemaining(studyId: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/studies/${studyId}/remaining`);
  }

  // ── Participants ──

  getParticipants(studyId: string): Observable<Participant[]> {
    return this.http.get<Participant[]>(`${this.baseUrl}/studies/${studyId}/participants`);
  }

  getStudyProgress(studyId: string): Observable<StudyProgress> {
    return this.http.get<StudyProgress>(`${this.baseUrl}/studies/${studyId}/progress`);
  }

  getParticipantsNeedingReminder(studyId: string): Observable<Participant[]> {
    return this.http.get<Participant[]>(`${this.baseUrl}/studies/${studyId}/participants/needs-reminder`);
  }

  getConfirmedParticipants(studyId: string): Observable<Participant[]> {
    return this.http.get<Participant[]>(`${this.baseUrl}/studies/${studyId}/participants/confirmed`);
  }

  // ── Chat ──

  sendMessage(message: string, userName: string): Observable<ChatApiResponse> {
    return this.http.post<ChatApiResponse>(`${this.baseUrl}/chat/message`, { message, userName });
  }

  // ── Sending ──

  startSend(studyId: string, count: number, userName: string): Observable<{ sessionId: string }> {
    return this.http.post<{ sessionId: string }>(`${this.baseUrl}/send/start`, { studyId, count, userName });
  }

  getSendProgress(sessionId: string): Observable<SendingProgress> {
    return this.http.get<SendingProgress>(`${this.baseUrl}/send/progress/${sessionId}`);
  }

  stopSend(sessionId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/send/stop/${sessionId}`, {});
  }

  // ── Scheduling ──

  scheduleSend(studyId: string, count: number, scheduledTime: string, userName: string): Observable<ScheduledJob> {
    return this.http.post<ScheduledJob>(`${this.baseUrl}/send/schedule`, { studyId, count, scheduledTime, userName });
  }

  getScheduledJobs(): Observable<ScheduledJob[]> {
    return this.http.get<ScheduledJob[]>(`${this.baseUrl}/send/scheduled`);
  }

  cancelScheduledJob(index: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/send/scheduled/${index}`);
  }

  // ── Audit ──

  getAuditRuns(sortBy?: string, ascending?: boolean): Observable<AuditRun[]> {
    let params = new HttpParams();
    if (sortBy) params = params.set('sort_by', sortBy);
    if (ascending !== undefined) params = params.set('order', ascending ? 'asc' : 'desc');
    return this.http.get<AuditRun[]>(`${this.baseUrl}/audit/runs`, { params });
  }

  getAuditSummary(): Observable<any> {
    return this.http.get(`${this.baseUrl}/audit/summary/today`);
  }

  // ── Settings / Delegations ──

  getDelegations(): Observable<Delegation[]> {
    return this.http.get<Delegation[]>(`${this.baseUrl}/settings/delegations`);
  }

  addDelegation(caseId: string, delegateTo: string): Observable<Delegation> {
    return this.http.post<Delegation>(`${this.baseUrl}/settings/delegations`, { caseId, delegateTo });
  }

  revokeDelegation(index: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/settings/delegations/${index}`);
  }

  getPreferences(): Observable<any> {
    return this.http.get(`${this.baseUrl}/settings/preferences`);
  }

  updatePreferences(prefs: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/settings/preferences`, prefs);
  }

  // ── Health ──

  getHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  getDependencies(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health/dependencies`).pipe(
      catchError(() => of({
        salesforce: { status: 'unknown', label: 'SF' },
        gemini: { status: 'unknown', label: 'Gemini' },
        shortlisting: { status: 'unknown', label: 'Shortlisting' }
      }))
    );
  }
}
