import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-chat-health-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-health-strip">
      <span class="health-badge">SF &#x1f7e2;</span>
      <span class="health-badge">Gemini &#x1f7e2;</span>
      <span class="health-badge">Shortlisting &#x1f7e2;</span>
    </div>
  `,
  styles: [`
    .chat-health-strip {
      margin-left: auto;
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .health-badge {
      font-size: 11px;
      color: var(--green);
      background: rgba(5, 150, 105, 0.08);
      border: 1px solid rgba(5, 150, 105, 0.2);
      padding: 3px 10px;
      border-radius: var(--radius-sm);
    }
  `]
})
export class ChatHealthStripComponent {}
