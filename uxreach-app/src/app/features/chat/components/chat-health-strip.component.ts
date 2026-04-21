import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';

interface DependencyStatus {
  label: string;
  status: string;
}

@Component({
  selector: 'app-chat-health-strip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-health-strip">
      @for (dep of dependencies(); track dep.label) {
        <span class="health-badge" [class.health-ok]="dep.status === 'ok' || dep.status === 'unknown'" [class.health-error]="dep.status === 'error'">
          {{ dep.label }}
          @if (dep.status === 'ok' || dep.status === 'unknown') {
            <span class="health-dot ok"></span>
          } @else {
            <span class="health-dot error"></span>
          }
        </span>
      }
    </div>
  `,
  styles: [`
    .chat-health-strip {
      margin-left: auto;
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .health-badge {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
      background: var(--bg);
      border: 1px solid var(--card-border);
      padding: 4px 10px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .health-badge.health-ok {
      color: var(--green);
      background: rgba(30, 142, 62, 0.06);
      border-color: rgba(30, 142, 62, 0.2);
    }

    .health-badge.health-error {
      color: var(--rose);
      background: rgba(217, 48, 37, 0.06);
      border-color: rgba(217, 48, 37, 0.2);
    }

    .health-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    .health-dot.ok {
      background: var(--green);
    }

    .health-dot.error {
      background: var(--rose);
    }
  `]
})
export class ChatHealthStripComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly dependencies = signal<DependencyStatus[]>([
    { label: 'SF', status: 'ok' },
    { label: 'Gemini', status: 'ok' },
    { label: 'Shortlisting', status: 'ok' }
  ]);

  ngOnInit(): void {
    this.api.getDependencies().subscribe({
      next: (data: any) => {
        const deps: DependencyStatus[] = [];
        for (const key of Object.keys(data)) {
          deps.push({
            label: data[key].label || key,
            status: data[key].status || 'unknown'
          });
        }
        if (deps.length > 0) {
          this.dependencies.set(deps);
        }
      }
    });
  }
}
