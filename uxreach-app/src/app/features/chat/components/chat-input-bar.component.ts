import {
  Component,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  ViewChild,
  ElementRef,
  inject,
  effect
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatEngineService } from '../../../services/chat-engine.service';

@Component({
  selector: 'app-chat-input-bar',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gemini-input-wrap">
      <div class="gemini-input-card" [class.focused]="isFocused">
        <textarea
          #inputField
          class="gemini-textarea"
          rows="1"
          placeholder="Ask me anything..."
          [(ngModel)]="text"
          (keydown)="onKeydown($event)"
          (input)="autoResize()"
          (focus)="isFocused = true"
          (blur)="isFocused = false"
        ></textarea>
        <div class="gemini-input-actions">
          <button
            class="gemini-add-btn"
            title="Open study picker"
            (click)="openStudyPicker()"
            tabindex="-1"
          >
            <span class="material-symbols-outlined" style="font-size:20px;">add</span>
          </button>
          <div class="gemini-input-spacer"></div>
          <button
            class="gemini-send-btn"
            (click)="send()"
            [disabled]="!text.trim()"
            title="Send (Enter)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      <p class="gemini-input-hint">UXReach may make mistakes. Always verify invite counts before sending.</p>
    </div>
  `,
  styles: [`
    .gemini-input-wrap {
      padding: 8px 20px 16px;
      background: var(--bg);
    }

    .gemini-input-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 28px;
      padding: 14px 16px 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 1px 6px rgba(60, 64, 67, 0.08);
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .gemini-input-card.focused {
      box-shadow: 0 2px 14px rgba(26, 115, 232, 0.12);
      border-color: rgba(26, 115, 232, 0.5);
    }

    .gemini-textarea {
      border: none;
      background: transparent;
      outline: none;
      font-size: 15px;
      color: var(--text);
      font-family: 'Google Sans', 'Roboto', sans-serif;
      resize: none;
      line-height: 1.5;
      min-height: 24px;
      max-height: 200px;
      overflow-y: auto;
      padding: 0 2px;
      width: 100%;
    }

    .gemini-textarea::placeholder {
      color: var(--text-faint);
    }

    .gemini-input-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .gemini-input-spacer {
      flex: 1;
    }

    .gemini-add-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--card-alt);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
      padding: 0;
      flex-shrink: 0;
    }

    .gemini-add-btn:hover {
      background: var(--card-border);
      color: var(--text);
    }

    .gemini-send-btn {
      width: 36px;
      height: 36px;
      min-width: 36px;
      border-radius: 50%;
      background: var(--blue);
      border: none;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 0;
      flex-shrink: 0;
    }

    .gemini-send-btn:hover:not(:disabled) {
      background: #1765cc;
      box-shadow: 0 2px 8px rgba(26, 115, 232, 0.35);
    }

    .gemini-send-btn:disabled {
      background: var(--card-border);
      color: var(--text-faint);
      cursor: not-allowed;
    }

    .gemini-input-hint {
      font-size: 11px;
      color: var(--text-faint);
      text-align: center;
      margin: 6px 0 0;
      padding: 0;
    }
  `]
})
export class ChatInputBarComponent {
  private readonly chatEngine = inject(ChatEngineService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Output() messageSent = new EventEmitter<string>();
  @ViewChild('inputField') private inputField!: ElementRef<HTMLTextAreaElement>;

  text = '';
  isFocused = false;

  constructor() {
    effect(() => {
      const { text } = this.chatEngine.inputDraft();
      if (text) {
        this.text = text;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.autoResize();
          this.inputField?.nativeElement.focus();
        }, 0);
      }
    });
  }

  openStudyPicker(): void {
    this.chatEngine.openStudyPicker();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.send();
      return;
    }
    if (event.key === 'ArrowUp' && this.text.trim().length === 0) {
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
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.inputField?.nativeElement.focus();
    }
  }

  autoResize(): void {
    const el = this.inputField?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  send(): void {
    const trimmed = this.text.trim();
    if (!trimmed) return;
    this.messageSent.emit(trimmed);
    this.text = '';
    setTimeout(() => this.autoResize(), 0);
  }
}
