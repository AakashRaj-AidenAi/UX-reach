import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-track">
      <div
        class="progress-fill"
        [style.width.%]="clampedPercent"
        [style.background]="color">
      </div>
    </div>
  `,
  styles: [`
    .progress-track {
      width: 100%;
      height: 8px;
      background: var(--card-alt, #f8fafc);
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid var(--card-border, #e2e8f0);
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.4s ease;
      min-width: 0;
    }
  `]
})
export class ProgressBarComponent {
  @Input() percent: number = 0;
  @Input() color: string = 'var(--blue, #2563eb)';

  get clampedPercent(): number {
    return Math.max(0, Math.min(100, this.percent));
  }
}
