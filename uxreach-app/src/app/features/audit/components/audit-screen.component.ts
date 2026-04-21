import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService } from '../../../services/audit.service';
import { AuditSortKey } from '../../../models/audit-run.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';

@Component({
  selector: 'app-audit-screen',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './audit-screen.component.html',
  styleUrl: './audit-screen.component.scss'
})
export class AuditScreenComponent {
  protected readonly auditService = inject(AuditService);

  protected readonly columns: { key: AuditSortKey; label: string }[] = [
    { key: 'id', label: 'Run ID' },
    { key: 'studyId', label: 'Study ID' },
    { key: 'studyName', label: 'Study' },
    { key: 'date', label: 'Date' },
    { key: 'rc', label: 'RC' },
    { key: 'sent', label: 'Sent' },
    { key: 'failed', label: 'Failed' },
    { key: 'status', label: 'Status' },
    { key: 'duration', label: 'Duration' },
    { key: 'sla', label: 'On Time' }
  ];

  protected sort(key: AuditSortKey): void {
    this.auditService.sortBy(key);
  }

  protected getSortIcon(key: AuditSortKey): string {
    if (this.auditService.sortKey() !== key) return 'unfold_more';
    return this.auditService.sortAsc() ? 'arrow_drop_up' : 'arrow_drop_down';
  }
}
