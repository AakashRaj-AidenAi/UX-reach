import { Injectable, inject, computed, signal } from '@angular/core';
import { AuditRun, AuditSortKey } from '../models/audit-run.model';
import { AUDIT_RUNS } from '../mock-data/audit-runs.data';
import { ApiService } from './api.service';
import { GuardrailCategory } from '../models/guardrail-rule';

export interface RefusalEntry {
  id: string;
  timestamp: string;
  category: GuardrailCategory;
  ruleId: string;
  prompt: string;
  userName: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly api = inject(ApiService);

  readonly runs = signal<AuditRun[]>([...AUDIT_RUNS]);
  readonly refusals = signal<RefusalEntry[]>([]);
  readonly sortKey = signal<AuditSortKey>('date');
  readonly sortAsc = signal(false);

  readonly sortedRuns = computed(() => {
    const key = this.sortKey();
    const asc = this.sortAsc();
    const list = [...this.runs()];

    list.sort((a, b) => {
      let valA: any = a[key];
      let valB: any = b[key];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (typeof valA === 'boolean') { valA = valA ? 1 : 0; valB = valB ? 1 : 0; }

      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });

    return list;
  });

  constructor() {
    this.fetchRuns();
  }

  fetchRuns(): void {
    this.api.getAuditRuns().subscribe({
      next: (data) => {
        this.runs.set(data);
      },
      error: () => {
        // Fallback to mock data already loaded
      }
    });
  }

  sortBy(key: AuditSortKey): void {
    if (this.sortKey() === key) {
      this.sortAsc.update(v => !v);
    } else {
      this.sortKey.set(key);
      this.sortAsc.set(true);
    }
  }

  addRun(run: AuditRun): void {
    this.runs.update(list => [run, ...list]);
  }

  getRunsForStudy(studyId: string): AuditRun[] {
    return this.runs().filter(r => r.studyId === studyId);
  }

  recordRefusal(category: GuardrailCategory, ruleId: string, prompt: string, userName: string): void {
    const entry: RefusalEntry = {
      id: 'ref-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      category,
      ruleId,
      prompt: prompt.length > 240 ? prompt.slice(0, 240) + '…' : prompt,
      userName
    };
    this.refusals.update(list => [entry, ...list]);
  }
}
