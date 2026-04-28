import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from '../../../services/audit.service';
import { AuditRun, AuditSortKey } from '../../../models/audit-run.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';

interface AuditColumn {
  key: AuditSortKey;
  label: string;
  filterType: 'text' | 'select';
  options?: { value: string; label: string }[];
}

@Component({
  selector: 'app-audit-screen',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './audit-screen.component.html',
  styleUrl: './audit-screen.component.scss'
})
export class AuditScreenComponent {
  protected readonly auditService = inject(AuditService);

  protected readonly columns: AuditColumn[] = [
    { key: 'id',        label: 'Run ID',   filterType: 'text' },
    { key: 'studyId',   label: 'Study ID', filterType: 'text' },
    { key: 'studyName', label: 'Study',    filterType: 'text' },
    { key: 'date',      label: 'Date',     filterType: 'text' },
    { key: 'rc',        label: 'RC',       filterType: 'text' },
    { key: 'sent',      label: 'Sent',     filterType: 'text' },
    { key: 'failed',    label: 'Failed',   filterType: 'text' },
    { key: 'status',    label: 'Status',   filterType: 'select', options: [
      { value: '',          label: 'All'       },
      { value: 'completed', label: 'Completed' },
      { value: 'sending',   label: 'Sending'   },
      { value: 'failed',    label: 'Failed'    },
    ]},
    { key: 'duration',  label: 'Duration', filterType: 'text' },
    { key: 'sla',       label: 'On Time',  filterType: 'select', options: [
      { value: '',    label: 'All' },
      { value: 'yes', label: 'Yes' },
      { value: 'no',  label: 'No'  },
    ]},
  ];

  protected readonly filterValues = signal<Record<string, string>>({});

  protected readonly filteredRuns = computed(() => {
    const filters = this.filterValues();
    const runs = this.auditService.sortedRuns();
    const active = Object.entries(filters).filter(([, v]) => v !== '');
    if (active.length === 0) return runs;

    return runs.filter(run =>
      active.every(([key, value]) => {
        const k = key as keyof AuditRun;
        if (k === 'sla') {
          if (value === 'yes') return run.sla === true;
          if (value === 'no')  return run.sla === false;
          return true;
        }
        const runVal = run[k];
        if (runVal == null) return false;
        return runVal.toString().toLowerCase().includes(value.toLowerCase());
      })
    );
  });

  protected readonly hasActiveFilters = computed(() =>
    Object.values(this.filterValues()).some(v => v !== '')
  );

  protected sort(key: AuditSortKey): void {
    this.auditService.sortBy(key);
  }

  protected getSortIcon(key: AuditSortKey): string {
    if (this.auditService.sortKey() !== key) return 'unfold_more';
    return this.auditService.sortAsc() ? 'arrow_drop_up' : 'arrow_drop_down';
  }

  protected getFilterValue(key: string): string {
    return this.filterValues()[key] ?? '';
  }

  protected setFilter(key: string, value: string): void {
    this.filterValues.update(f => ({ ...f, [key]: value }));
  }

  protected clearFilters(): void {
    this.filterValues.set({});
  }
}
