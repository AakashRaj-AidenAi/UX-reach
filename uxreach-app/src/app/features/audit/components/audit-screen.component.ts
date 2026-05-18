import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../../services/audit.service';
import { AuditRun, AuditSortKey } from '../../../models/audit-run.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';

interface FilterState {
  status: string;
  sla: string;
  date: string;
  rc: string;
}

@Component({
  selector: 'app-audit-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  templateUrl: './audit-screen.component.html',
  styleUrl: './audit-screen.component.scss'
})
export class AuditScreenComponent {
  protected readonly auditService = inject(AuditService);

  protected readonly columns: { key: AuditSortKey; label: string }[] = [
    { key: 'id',        label: 'Run ID'   },
    { key: 'studyId',   label: 'Study ID' },
    { key: 'studyName', label: 'Study'    },
    { key: 'date',      label: 'Date'     },
    { key: 'rc',        label: 'RC'       },
    { key: 'sent',      label: 'Sent'     },
    { key: 'failed',    label: 'Failed'   },
    { key: 'status',    label: 'Status'   },
    { key: 'duration',  label: 'Duration' },
    { key: 'sla',       label: 'On Time'  },
  ];

  protected searchQuery = signal('');
  protected filterModalOpen = signal(false);

  protected filters = signal<FilterState>({
    status: '',
    sla: '',
    date: '',
    rc: '',
  });

  protected readonly hasActiveFilters = computed(() => {
    const f = this.filters();
    return f.status !== '' || f.sla !== '' || f.date !== '' || f.rc !== '';
  });

  protected readonly activeFilterCount = computed(() => {
    const f = this.filters();
    return [f.status, f.sla, f.date, f.rc].filter(v => v !== '').length;
  });

  protected readonly filteredRuns = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const f = this.filters();
    let runs = this.auditService.sortedRuns();

    if (q) {
      runs = runs.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.studyId.toLowerCase().includes(q) ||
        r.studyName.toLowerCase().includes(q) ||
        r.rc.toLowerCase().includes(q)
      );
    }

    if (f.status) runs = runs.filter(r => r.status === f.status);
    if (f.sla === 'yes') runs = runs.filter(r => r.sla === true);
    if (f.sla === 'no')  runs = runs.filter(r => r.sla === false);
    if (f.date) runs = runs.filter(r => r.date === f.date);
    if (f.rc)   runs = runs.filter(r => r.rc.toLowerCase().includes(f.rc.toLowerCase()));

    return runs;
  });

  protected toggleFilterModal(): void {
    this.filterModalOpen.update(v => !v);
  }

  protected closeFilterModal(): void {
    this.filterModalOpen.set(false);
  }

  protected setFilter(key: keyof FilterState, value: string): void {
    this.filters.update(f => ({ ...f, [key]: value }));
  }

  protected clearFilters(): void {
    this.filters.set({ status: '', sla: '', date: '', rc: '' });
  }

  protected sort(key: AuditSortKey): void {
    this.auditService.sortBy(key);
  }

  protected getSortIcon(key: AuditSortKey): string {
    if (this.auditService.sortKey() !== key) return 'unfold_more';
    return this.auditService.sortAsc() ? 'arrow_drop_up' : 'arrow_drop_down';
  }
}
