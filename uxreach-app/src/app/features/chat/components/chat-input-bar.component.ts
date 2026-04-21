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
      <button class="chat-send-btn" (click)="send()" [disabled]="!text.trim()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .chat-input-bar {
      padding: 12px 24px 16px;
      background: var(--card);
      border-top: 1px solid var(--card-border);
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .chat-input-field {
      flex: 1;
      padding: 10px 20px;
      border: 1px solid var(--card-border);
      border-radius: 24px;
      font-size: 14px;
      color: var(--text);
      background: var(--bg);
      outline: none;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      height: 44px;
    }

    .chat-input-field:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
    }

    .chat-input-field::placeholder {
      color: var(--text-faint);
    }

    .chat-send-btn {
      width: 40px;
      height: 40px;
      min-width: 40px;
      background: var(--blue);
      border: none;
      border-radius: 50%;
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .chat-send-btn:hover:not(:disabled) {
      background: #1765cc;
      box-shadow: 0 1px 3px rgba(60, 64, 67, 0.3);
    }

    .chat-send-btn:disabled {
      opacity: 0.38;
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
