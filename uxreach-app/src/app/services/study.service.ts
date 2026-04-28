import { Injectable, inject, signal } from '@angular/core';
import { Study, StudyMap } from '../models/study.model';
import { Candidate, FilterSet, FilterBreakdown } from '../models/candidate.model';
import { StudyProgress } from '../models/study-progress';
import { STUDIES } from '../mock-data/studies.data';
import { SHORTLISTING_POOLS, COUNTRY_ALIASES, CUSTOMER_TYPE_ALIASES } from '../mock-data/candidates.data';
import { ApiService } from './api.service';
import { AppStateService } from './app-state.service';

@Injectable({ providedIn: 'root' })
export class StudyService {
  private readonly api = inject(ApiService);
  private readonly appState = inject(AppStateService);
  private studies: StudyMap = { ...STUDIES };
  private readonly studiesLoaded = signal(false);

  constructor() {
    this.fetchStudies();
  }

  fetchStudies(): void {
    this.api.getStudies().subscribe({
      next: (data: any) => {
        // Backend returns an array of studies; convert to map
        if (Array.isArray(data)) {
          const map: StudyMap = {};
          data.forEach((s: any) => {
            map[s.id] = {
              name: s.name,
              researcher: s.researcher,
              ownerRC: s.ownerRc || s.ownerRC || 'Sarah Chen',
              totalRequired: s.totalRequired,
              alreadySent: s.alreadySent,
              lastRun: s.lastRun || null,
              newResponses: s.newResponses || 0,
              p0Ready: s.p0Ready || 0,
              p0NewlyMarked: s.p0NewlyMarked || 0,
            };
          });
          this.studies = map;
        } else {
          this.studies = data;
        }
        this.studiesLoaded.set(true);
      },
      error: () => {
        // Fallback to mock data
        this.studies = { ...STUDIES };
        this.studiesLoaded.set(true);
      }
    });
  }

  getStudy(id: string): Study | undefined {
    const study = this.studies[id];
    if (!study) return undefined;
    if (study.ownerRC !== this.appState.userName()) return undefined;
    return study;
  }

  isOwnedByOther(id: string): boolean {
    const study = this.studies[id];
    if (!study) return false;
    return study.ownerRC !== this.appState.userName();
  }

  /**
   * Derive a plausible participant funnel from local study state when the backend
   * is unavailable. Used by chat + dashboard for demo/offline resilience.
   */
  synthesizeProgress(id: string): StudyProgress | null {
    const study = this.studies[id];
    if (!study) return null;

    const invited = Math.max(study.alreadySent, 0);
    const p0Total  = study.p0Ready ?? 0;
    const invitesSent = study.p0NewlyMarked ?? 0;

    // Use the same formula as buildStudyNote so both views show identical numbers
    const booked  = invited > 0
      ? Math.min(study.newResponses, Math.max(1, Math.floor(invitesSent * 0.4)))
      : 0;
    const responded  = Math.max(booked, Math.round(invited * 0.55));
    const icfSigned  = Math.round(booked * 0.70);
    const confirmed  = Math.round(icfSigned * 0.85);
    const noResponse = Math.max(invited - responded, 0);
    const declined   = Math.max(responded - booked, 0);
    const pendingIcf = Math.max(booked - icfSigned, 0);

    // Appointment & pre-screening stats — identical to buildStudyNote formulas
    const appointmentsCancelled    = p0Total > 5 ? 1 : 0;
    const appointmentsRescheduled  = p0Total > 8 ? 1 : 0;
    const psCompleted   = Math.floor(p0Total * 0.7);
    const psInvited     = invitesSent > 0 ? Math.min(2, invitesSent) : 0;
    const psCancelled   = psCompleted > 4 ? 1 : 0;
    const psRescheduled = psCompleted > 5 ? 1 : 0;

    const needsAttention: string[] = [];
    if (pendingIcf > 0) needsAttention.push(`${pendingIcf} pending ICF`);
    if (noResponse > Math.round(invited * 0.3)) needsAttention.push(`${noResponse} no response — consider reminders`);
    if (appointmentsCancelled > 0) needsAttention.push(`${appointmentsCancelled} appointment${appointmentsCancelled !== 1 ? 's' : ''} cancelled`);

    return {
      studyId: id,
      studyName: study.name,
      researcher: study.researcher,
      totalInvited: invited,
      booked,
      icfSigned,
      confirmed,
      noResponse,
      declined,
      pendingIcf,
      needsAttention,
      p0Ready: p0Total,
      invitesSentToday: invitesSent,
      appointmentsCancelled,
      appointmentsRescheduled,
      psCompleted,
      psInvited,
      psCancelled,
      psRescheduled
    };
  }

  private visibleStudies(): StudyMap {
    const name = this.appState.userName();
    const result: StudyMap = {};
    for (const id of Object.keys(this.studies)) {
      if (this.studies[id].ownerRC === name) result[id] = this.studies[id];
    }
    return result;
  }

  getAllStudies(): StudyMap {
    return this.visibleStudies();
  }

  getStudiesForRC(_rcName: string): Record<string, Study> {
    return this.visibleStudies();
  }

  getActiveStudiesForRC(_rcName: string): Record<string, Study> {
    const result: Record<string, Study> = {};
    for (const [id, s] of Object.entries(this.visibleStudies())) {
      if ((s.totalRequired - s.alreadySent) > 0) result[id] = s;
    }
    return result;
  }

  getRemaining(id: string): number {
    const study = this.studies[id];
    if (!study) return 0;
    return Math.max(0, study.totalRequired - study.alreadySent);
  }

  getPendingStudies(): Record<string, Study> {
    const result: Record<string, Study> = {};
    for (const id of Object.keys(this.studies)) {
      const s = this.studies[id];
      if (s.alreadySent < s.totalRequired) {
        result[id] = s;
      }
    }
    return result;
  }

  updateStudySent(studyId: string, additionalSent: number): void {
    const study = this.studies[studyId];
    if (!study) return;
    study.alreadySent += additionalSent;
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = now.getDate();
    study.lastRun = `${month} ${day}`;
  }

  // ── Filter helpers ──

  getPool(studyId: string): Candidate[] {
    return SHORTLISTING_POOLS[studyId] || [];
  }

  parseFilters(text: string): FilterSet {
    let cleaned = text.toLowerCase()
      .replace(/\b(from|only|in|filter(?:ed)?(?:\s+by)?|region|country|type|customers?|with|just|exclusively)\b/g, ' ')
      .replace(/\s+(?:and|&)\s+|\s*,\s*/g, ' ');

    const foundCountries: string[] = [];
    const seenCountries: Record<string, boolean> = {};
    const countryKeys = Object.keys(COUNTRY_ALIASES).sort((a, b) => b.length - a.length);
    for (const alias of countryKeys) {
      const canonical = COUNTRY_ALIASES[alias];
      if (!seenCountries[canonical] && cleaned.includes(alias)) {
        seenCountries[canonical] = true;
        foundCountries.push(canonical);
      }
    }

    const foundTypes: string[] = [];
    const seenTypes: Record<string, boolean> = {};
    const typeKeys = Object.keys(CUSTOMER_TYPE_ALIASES).sort((a, b) => b.length - a.length);
    for (const alias of typeKeys) {
      const canonical = CUSTOMER_TYPE_ALIASES[alias];
      if (!seenTypes[canonical] && cleaned.includes(alias)) {
        seenTypes[canonical] = true;
        foundTypes.push(canonical);
      }
    }

    return { countries: foundCountries, customerTypes: foundTypes };
  }

  applyFilters(pool: Candidate[], filters: FilterSet): Candidate[] {
    return pool.filter(c => {
      const countryOk = filters.countries.length === 0 || filters.countries.includes(c.country);
      const typeOk = filters.customerTypes.length === 0 || filters.customerTypes.includes(c.customerType);
      return countryOk && typeOk;
    });
  }

  filterBreakdown(candidates: Candidate[]): FilterBreakdown {
    const byCountry: Record<string, number> = {};
    const byType: Record<string, number> = {};
    candidates.forEach(c => {
      byCountry[c.country] = (byCountry[c.country] || 0) + 1;
      byType[c.customerType] = (byType[c.customerType] || 0) + 1;
    });
    return { byCountry, byType };
  }

  filterSummaryLine(filters: FilterSet): string {
    const parts: string[] = [];
    if (filters.countries.length) parts.push('<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">public</span> ' + filters.countries.join(', '));
    if (filters.customerTypes.length) parts.push('<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;">business</span> ' + filters.customerTypes.join(', '));
    return parts.join(' &nbsp;&middot;&nbsp; ');
  }
}
