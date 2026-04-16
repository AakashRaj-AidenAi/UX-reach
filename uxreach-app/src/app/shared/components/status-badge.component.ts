import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="badgeClass">{{ status }}</span>
  `,
  styles: [`
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.4;
      text-transform: capitalize;
      white-space: nowrap;
    }

    .badge-completed,
    .badge-active {
      background: rgba(5, 150, 105, 0.1);
      color: var(--green, #059669);
    }

    .badge-sending {
      background: rgba(37, 99, 235, 0.1);
      color: var(--blue, #2563eb);
    }

    .badge-failed,
    .badge-revoked {
      background: rgba(225, 29, 72, 0.1);
      color: var(--rose, #e11d48);
    }

    .badge-scheduled,
    .badge-amber {
      background: rgba(217, 119, 6, 0.1);
      color: var(--amber, #d97706);
    }

    .badge-cancelled {
      background: rgba(148, 163, 184, 0.15);
      color: var(--text-muted, #64748b);
    }
  `]
})
export class StatusBadgeComponent {
  @Input() status: string = '';

  get badgeClass(): string {
    const s = this.status.toLowerCase();
    switch (s) {
      case 'completed':
      case 'active':
        return 'badge-' + s;
      case 'sending':
        return 'badge-sending';
      case 'failed':
      case 'revoked':
        return 'badge-' + s;
      case 'scheduled':
        return 'badge-scheduled';
      case 'cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-cancelled';
    }
  }
}
