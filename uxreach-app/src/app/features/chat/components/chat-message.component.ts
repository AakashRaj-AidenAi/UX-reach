import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { ChatMessage } from '../../../models/chat.model';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-msg-wrapper" [ngClass]="{ 'user-msg': message.sender === 'user' }">
      <!-- Avatar -->
      @if (message.sender === 'bot') {
        <div class="chat-msg-avatar bot-avatar">AI</div>
      }

      <div class="chat-msg-content" [ngClass]="{
        'content--user': message.sender === 'user',
        'content--bot': message.sender === 'bot',
        'content--typing': message.isTyping
      }">
        <!-- Typing indicator -->
        @if (message.isTyping) {
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        } @else {
          <!-- Sending progress bar -->
          @if (message.sendingProgress) {
            <div class="sending-progress">
              @if (message.sendingProgress.studyName) {
                <span style="font-weight:600;font-size:13px;">{{ message.sendingProgress.studyName }}</span>
                @if (message.sendingProgress.queuePosition) {
                  <span style="font-size:11px;color:var(--text-muted);font-weight:400;"> Study {{ message.sendingProgress.queuePosition }} of {{ message.sendingProgress.queueTotal }}</span>
                }
                <br>
              }
              <span class="send-count-display">
                Sending {{ message.sendingProgress.sent }}/{{ message.sendingProgress.total }}...
              </span><br>
              @if (message.sendingProgress.durationStr) {
                <span class="sla-timer-display">&#x23f1; {{ message.sendingProgress.durationStr }}</span>
              }
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  [ngClass]="{ 'complete': message.sendingProgress.isComplete }"
                  [style.width.%]="progressPercent">
                </div>
              </div>
            </div>
          }

          <!-- Message content -->
          @if (message.html) {
            <div class="content" [innerHTML]="message.html"></div>
          }

          <!-- Action buttons -->
          @if (message.actions && message.actions.length > 0) {
            <div class="msg-buttons">
              @for (act of message.actions; track act.action) {
                <button
                  class="msg-btn"
                  [ngClass]="{
                    'primary': act.type === 'primary',
                    'secondary': act.type === 'secondary',
                    'danger': act.type === 'danger',
                    'success': act.type === 'success'
                  }"
                  (click)="onActionClick(act.action, act.payload)">
                  {{ act.label }}
                </button>
              }
            </div>
          }
        }
      </div>

      @if (message.sender === 'user') {
        <div class="chat-msg-avatar user-avatar">RC</div>
      }
    </div>
  `,
  styles: [`
    .chat-msg-wrapper {
      display: flex;
      gap: 10px;
      animation: fadeInMsg 0.25s ease;
    }

    .chat-msg-wrapper.user-msg {
      flex-direction: row-reverse;
    }

    .chat-msg-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .chat-msg-avatar.bot-avatar {
      background: rgba(37, 99, 235, 0.1);
      color: var(--blue);
    }

    .chat-msg-avatar.user-avatar {
      background: rgba(124, 58, 237, 0.1);
      color: var(--purple);
    }

    .chat-msg-content {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.6;
    }

    .content--bot {
      background: var(--card);
      border: 1px solid var(--card-border);
      color: var(--text-dim);
      border-top-left-radius: 4px;
    }

    .content--user {
      background: rgba(37, 99, 235, 0.08);
      border: 1px solid rgba(37, 99, 235, 0.2);
      color: #1e40af;
      border-top-right-radius: 4px;
    }

    .content--typing {
      padding: 12px 20px;
    }

    /* ── Typing indicator ── */
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 8px 0;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: var(--text-faint);
      border-radius: 50%;
      animation: typingBounce 1.4s infinite ease-in-out;
    }

    .typing-indicator span:nth-child(1) { animation-delay: 0s; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    /* ── Content ── */
    .content {
      ::ng-deep {
        strong { font-weight: 600; }
        em { font-style: italic; color: var(--text-muted); }
      }
    }

    /* ── Sending progress ── */
    .sending-progress {
      margin-bottom: 8px;
    }

    .send-count-display {
      font-weight: 600;
      font-size: 13px;
    }

    .sla-timer-display {
      font-size: 12px;
      color: var(--text-muted);
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      margin-top: 8px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 2px;
      background: linear-gradient(90deg, #3b82f6, #10b981);
      transition: width 0.5s ease;

      &.complete {
        background: var(--green);
      }
    }

    /* ── Action buttons ── */
    .msg-buttons {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .msg-btn {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      font-weight: 600;
    }

    .msg-btn.primary {
      background: rgba(37, 99, 235, 0.1);
      color: #2563eb;
      border: 1px solid rgba(37, 99, 235, 0.3);
    }

    .msg-btn.secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }

    .msg-btn.danger {
      background: rgba(225, 29, 72, 0.1);
      color: #e11d48;
      border: 1px solid rgba(225, 29, 72, 0.3);
    }

    .msg-btn.success {
      background: rgba(5, 150, 105, 0.1);
      color: #059669;
      border: 1px solid rgba(5, 150, 105, 0.3);
    }

    .msg-btn:hover {
      transform: translateY(-1px);
    }

    .msg-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    @keyframes fadeInMsg {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ChatMessageComponent {
  @Input({ required: true }) message!: ChatMessage;
  @Output() actionClicked = new EventEmitter<{ action: string; payload?: any }>();

  get progressPercent(): number {
    if (!this.message.sendingProgress) return 0;
    const { sent, total } = this.message.sendingProgress;
    return total > 0 ? Math.round((sent / total) * 100) : 0;
  }

  onActionClick(action: string, payload?: any): void {
    this.actionClicked.emit({ action, payload });
  }
}
