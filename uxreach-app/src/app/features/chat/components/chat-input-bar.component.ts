import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-input-bar',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-input-bar">
      <input
        class="chat-input-field"
        type="text"
        placeholder="Type a command... (e.g., 'send 10 invites for study 1234567' or 'today&apos;s summary')"
        [(ngModel)]="text"
        (keydown.enter)="send()"
      />
      <button class="chat-send-btn" (click)="send()" [disabled]="!text.trim()">&#x27A4;</button>
    </div>
  `,
  styles: [`
    .chat-input-bar {
      padding: 16px 24px;
      background: var(--card);
      border-top: 1px solid var(--card-border);
      display: flex;
      gap: 10px;
    }

    .chat-input-field {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      font-size: 14px;
      color: var(--text);
      background: var(--card-alt);
      outline: none;
      font-family: inherit;
    }

    .chat-input-field:focus {
      border-color: var(--blue);
    }

    .chat-input-field::placeholder {
      color: var(--text-faint);
    }

    .chat-send-btn {
      width: 44px;
      height: 44px;
      min-width: 44px;
      background: var(--gradient-brand);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .chat-send-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
    }

    .chat-send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `]
})
export class ChatInputBarComponent {
  @Output() messageSent = new EventEmitter<string>();

  text = '';

  send(): void {
    const trimmed = this.text.trim();
    if (!trimmed) return;
    this.messageSent.emit(trimmed);
    this.text = '';
  }
}
