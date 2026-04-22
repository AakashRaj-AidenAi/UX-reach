import {
  Component,
  Output,
  Input,
  EventEmitter,
  ChangeDetectionStrategy,
  HostListener,
  ViewChild,
  ElementRef,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatEngineService } from '../../../services/chat-engine.service';

@Component({
  selector: 'app-chat-input-bar',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-input-bar">
      <textarea
        #inputField
        class="chat-input-field"
        rows="1"
        placeholder="Type a command... (Enter to send, Shift+Enter for newline, ↑ for last)"
        [(ngModel)]="text"
        (keydown)="onKeydown($event)"
        (input)="autoResize()"
      ></textarea>
      <button class="chat-send-btn" (click)="send()" [disabled]="!text.trim()" title="Send (Enter)">
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
      align-items: flex-end;
    }

    .chat-input-field {
      flex: 1;
      padding: 10px 20px;
      border: 1px solid var(--card-border);
      border-radius: 22px;
      font-size: 14px;
      color: var(--text);
      background: var(--bg);
      outline: none;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      min-height: 44px;
      max-height: 160px;
      resize: none;
      line-height: 22px;
      overflow-y: auto;
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
  private readonly chatEngine = inject(ChatEngineService);

  @Output() messageSent = new EventEmitter<string>();
  @ViewChild('inputField') private inputField!: ElementRef<HTMLTextAreaElement>;

  text = '';

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.send();
      return;
    }
    if (event.key === 'ArrowUp' && this.text.trim().length === 0) {
      // Recall the last user message for editing.
      const messages = this.chatEngine.messages();
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].sender === 'user') {
          const div = document.createElement('div');
          div.innerHTML = messages[i].html;
          this.text = (div.textContent ?? '').trim();
          event.preventDefault();
          setTimeout(() => this.autoResize(), 0);
          return;
        }
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    // Cmd/Ctrl+K → focus the input from anywhere in the chat screen.
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.inputField?.nativeElement.focus();
    }
  }

  autoResize(): void {
    const el = this.inputField?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  send(): void {
    const trimmed = this.text.trim();
    if (!trimmed) return;
    this.messageSent.emit(trimmed);
    this.text = '';
    setTimeout(() => this.autoResize(), 0);
  }
}
