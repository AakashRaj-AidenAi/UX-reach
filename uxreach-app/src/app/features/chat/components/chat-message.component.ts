import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { ChatMessage } from '../../../models/chat.model';
import { StudyProgressComponent } from './study-progress.component';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [NgClass, StudyProgressComponent],
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
          <!-- Agent badge -->
          @if (message.sender === 'bot' && message.agent && agentLabel) {
            <div class="agent-badge" [attr.data-agent]="message.agent">
              <span class="material-symbols-outlined icon-sm" style="vertical-align:middle;">{{ agentIcon }}</span>
              {{ agentLabel }}
            </div>
          }

          <!-- Sending progress bar -->
          @if (message.sendingProgress) {
            <div class="sending-progress">
              @if (message.sendingProgress.studyName) {
                <span style="font-weight:500;font-size:14px;">{{ message.sendingProgress.studyName }}</span>
                @if (message.sendingProgress.queuePosition) {
                  <span style="font-size:12px;color:var(--text-muted);font-weight:400;"> Study {{ message.sendingProgress.queuePosition }} of {{ message.sendingProgress.queueTotal }}</span>
                }
                <br>
              }
              <span class="send-count-display">
                Sending {{ message.sendingProgress.sent }}/{{ message.sendingProgress.total }}...
              </span><br>
              @if (message.sendingProgress.durationStr) {
                <span class="sla-timer-display">{{ message.sendingProgress.durationStr }}</span>
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

          <!-- Study progress funnel -->
          @if (message.studyProgress) {
            <app-study-progress [progress]="message.studyProgress" />
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
      font-size: 12px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .chat-msg-avatar.bot-avatar {
      background: rgba(26, 115, 232, 0.1);
      color: var(--blue);
    }

    .chat-msg-avatar.user-avatar {
      background: #e8f0fe;
      color: #1a73e8;
    }

    .chat-msg-content {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
    }

    .content--bot {
      background: var(--card);
      border: 1px solid var(--card-border);
      color: var(--text-dim);
      border-top-left-radius: 4px;
    }

    .content--user {
      background: #e8f0fe;
      border: none;
      color: #202124;
      border-top-right-radius: 4px;
    }

    .content--typing {
      padding: 12px 20px;
    }

    /* Typing indicator */
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

    /* Content */
    .content {
      ::ng-deep {
        strong { font-weight: 500; }
        em { font-style: italic; color: var(--text-muted); }
      }
    }

    /* Sending progress */
    .sending-progress {
      margin-bottom: 8px;
    }

    .send-count-display {
      font-weight: 500;
      font-size: 14px;
      color: var(--text);
    }

    .sla-timer-display {
      font-size: 12px;
      color: var(--text-muted);
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e8eaed;
      border-radius: 2px;
      margin-top: 8px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 2px;
      background: var(--blue);
      transition: width 0.5s ease;

      &.complete {
        background: var(--green);
      }
    }

    /* Action buttons */
    .msg-buttons {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .msg-btn {
      padding: 6px 16px;
      border-radius: 18px;
      font-size: 13px;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      font-weight: 500;
      font-family: 'Google Sans', 'Roboto', sans-serif;
      height: 32px;
      display: inline-flex;
      align-items: center;
    }

    .msg-btn.primary {
      background: rgba(26, 115, 232, 0.08);
      color: #1a73e8;
      border: 1px solid rgba(26, 115, 232, 0.3);
    }

    .msg-btn.primary:hover {
      background: rgba(26, 115, 232, 0.15);
      box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3);
    }

    .msg-btn.secondary {
      background: var(--card-alt);
      color: var(--text-dim);
      border: 1px solid var(--card-border);
    }

    .msg-btn.secondary:hover {
      background: #e8eaed;
    }

    .msg-btn.danger {
      background: rgba(217, 48, 37, 0.08);
      color: #d93025;
      border: 1px solid rgba(217, 48, 37, 0.3);
    }

    .msg-btn.danger:hover {
      background: rgba(217, 48, 37, 0.15);
    }

    .msg-btn.success {
      background: rgba(30, 142, 62, 0.08);
      color: #1e8e3e;
      border: 1px solid rgba(30, 142, 62, 0.3);
    }

    .msg-btn.success:hover {
      background: rgba(30, 142, 62, 0.15);
    }

    .msg-btn:hover {
      box-shadow: 0 1px 2px rgba(60, 64, 67, 0.3);
    }

    .msg-btn:disabled {
      opacity: 0.38;
      cursor: not-allowed;
      box-shadow: none;
    }

    @keyframes fadeInMsg {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .agent-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 10px;
      margin-bottom: 8px;
      letter-spacing: 0.2px;
    }
    .agent-badge[data-agent="invite"] {
      background: rgba(26, 115, 232, 0.08);
      color: #1a73e8;
    }
    .agent-badge[data-agent="query"] {
      background: rgba(124, 92, 217, 0.10);
      color: #5e3fbd;
    }
    .agent-badge[data-agent="scheduler"] {
      background: rgba(249, 171, 0, 0.12);
      color: #b47500;
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

  get agentLabel(): string {
    switch (this.message.agent) {
      case 'invite': return 'Invite Agent';
      case 'query': return 'Query Agent';
      case 'scheduler': return 'Scheduler';
      default: return '';
    }
  }

  get agentIcon(): string {
    switch (this.message.agent) {
      case 'invite': return 'outgoing_mail';
      case 'query': return 'insights';
      case 'scheduler': return 'schedule';
      default: return '';
    }
  }

  onActionClick(action: string, payload?: any): void {
    this.actionClicked.emit({ action, payload });
  }
}
