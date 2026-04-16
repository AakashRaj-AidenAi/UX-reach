import { Injectable } from '@angular/core';
import { Study, StudyMap } from '../models/study.model';
import { Candidate, FilterSet, FilterBreakdown } from '../models/candidate.model';
import { STUDIES } from '../mock-data/studies.data';
import { SHORTLISTING_POOLS, COUNTRY_ALIASES, CUSTOMER_TYPE_ALIASES } from '../mock-data/candidates.data';

@Injectable({ providedIn: 'root' })
export class StudyService {
  private studies: StudyMap = { ...STUDIES };

  getStudy(id: string): Study | undefined {
    return this.studies[id];
  }

  getAllStudies(): StudyMap {
    return this.studies;
  }

  getStudiesForRC(rcName: string): Record<string, Study> {
    const result: Record<string, Study> = {};
    for (const id of Object.keys(this.studies)) {
      if (this.studies[id].ownerRC === rcName) {
        result[id] = this.studies[id];
      }
    }
    return result;
  }

  getActiveStudiesForRC(rcName: string): Record<string, Study> {
    const result: Record<string, Study> = {};
    for (const id of Object.keys(this.studies)) {
      const s = this.studies[id];
      if (s.ownerRC === rcName && (s.totalRequired - s.alreadySent) > 0) {
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
    if (filters.countries.length) parts.push('&#x1f30d; ' + filters.countries.join(', '));
    if (filters.customerTypes.length) parts.push('&#x1f3e2; ' + filters.customerTypes.join(', '));
    return parts.join(' &nbsp;&middot;&nbsp; ');
  }
}
