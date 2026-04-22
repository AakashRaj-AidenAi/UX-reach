import { Injectable, inject, signal } from '@angular/core';
import { Study, StudyMap } from '../models/study.model';
import { Candidate, FilterSet, FilterBreakdown } from '../models/candidate.model';
import { STUDIES } from '../mock-data/studies.data';
import { SHORTLISTING_POOLS, COUNTRY_ALIASES, CUSTOMER_TYPE_ALIASES } from '../mock-data/candidates.data';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class StudyService {
  private readonly api = inject(ApiService);
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
    return this.studies[id];
  }

  getAllStudies(): StudyMap {
    return this.studies;
  }

  getStudiesForRC(_rcName: string): Record<string, Study> {
    return { ...this.studies };
  }

  getActiveStudiesForRC(_rcName: string): Record<string, Study> {
    const result: Record<string, Study> = {};
    for (const id of Object.keys(this.studies)) {
      const s = this.studies[id];
      if ((s.totalRequired - s.alreadySent) > 0) {
        result[id] = s;
      }
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
