import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatHistoryService } from '../../../services/chat-history.service';
import { ConversationBucket } from '../../../models/conversation';

@Component({
  selector: 'app-chat-history-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <aside class="history-sidebar" [class.open]="open">
      <div class="history-header">
        <div class="history-title"><span class="material-symbols-outlined icon-sm">forum</span> Chats</div>
        <div class="history-header-actions">
          <button class="history-btn-ghost" (click)="onNewChat()" title="New chat">
            <span class="material-symbols-outlined icon-sm">add</span>
          </button>
          <button class="history-btn-ghost" (click)="onClose()" title="Close">
            <span class="material-symbols-outlined icon-sm">close</span>
          </button>
        </div>
      </div>

      <button class="history-new-chat" (click)="onNewChat()">
        <span class="material-symbols-outlined icon-sm">edit_square</span> New chat
      </button>

      @if (history.conversations().length === 0) {
        <div class="history-empty">No chats yet. Send a message to start one.</div>
      } @else {
        @for (group of history.bucketed(); track group.bucket) {
          <div class="history-bucket-label">{{ bucketLabel(group.bucket) }}</div>
          @for (conv of group.conversations; track conv.id) {
            <div
              class="history-row"
              [class.active]="history.activeId() === conv.id"
              (click)="onSelect(conv.id)">
              <div class="history-row-title">{{ conv.title }}</div>
              <div class="history-row-meta">{{ relativeTime(conv.updatedAt) }} · {{ conv.messages.length }} msg</div>
              <button
                class="history-row-delete"
                (click)="onDelete($event, conv.id)"
                title="Delete conversation">
                <span class="material-symbols-outlined icon-sm">delete</span>
              </button>
            </div>
          }
        }

        <button class="history-clear-all" (click)="onClearAll()">
          <span class="material-symbols-outlined icon-sm">delete_sweep</span> Clear all
        </button>
      }
    </aside>
  `,
  styles: [`
    :host { display: contents; }

    .history-sidebar {
      width: 260px;
      border-right: 1px solid var(--card-border);
      background: var(--card);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      flex-shrink: 0;
      transition: margin-left 0.2s ease, width 0.2s ease;
    }
    .history-sidebar:not(.open) {
      width: 0;
      margin-left: -1px;
      overflow: hidden;
    }

    .history-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-bottom: 1px solid var(--card-border);
    }
    .history-title { font-weight: 500; color: var(--text); display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
    .history-header-actions { display: inline-flex; gap: 4px; }
    .history-btn-ghost {
      background: transparent; border: none; color: var(--text-dim);
      padding: 4px; border-radius: 4px; cursor: pointer;
      display: inline-flex; align-items: center;
    }
    .history-btn-ghost:hover { background: var(--card-alt); color: var(--text); }

    .history-new-chat {
      margin: 10px 12px 6px; padding: 8px 12px;
      border: 1px dashed var(--card-border); border-radius: 8px;
      background: transparent; color: var(--blue); font-weight: 500;
      cursor: pointer; font-size: 13px; text-align: left;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .history-new-chat:hover { background: rgba(26,115,232,0.06); border-color: var(--blue); }

    .history-bucket-label {
      font-size: 11px; font-weight: 600; letter-spacing: 0.4px;
      color: var(--text-muted); text-transform: uppercase;
      padding: 12px 14px 4px;
    }

    .history-row {
      position: relative;
      padding: 8px 14px; margin: 0 6px; border-radius: 6px;
      cursor: pointer;
    }
    .history-row:hover { background: var(--card-alt); }
    .history-row:hover .history-row-delete { opacity: 1; }
    .history-row.active { background: rgba(26,115,232,0.08); }
    .history-row.active .history-row-title { color: var(--blue); font-weight: 500; }

    .history-row-title {
      font-size: 13px; color: var(--text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      padding-right: 24px;
    }
    .history-row-meta {
      font-size: 11px; color: var(--text-muted); margin-top: 2px;
    }
    .history-row-delete {
      position: absolute; right: 8px; top: 8px;
      background: transparent; border: none; color: var(--text-muted);
      padding: 2px; border-radius: 4px; cursor: pointer;
      opacity: 0; transition: opacity 0.15s ease;
    }
    .history-row-delete:hover { color: var(--rose); background: rgba(217,48,37,0.08); }

    .history-empty {
      padding: 24px 14px; text-align: center;
      font-size: 12px; color: var(--text-muted);
    }

    .history-clear-all {
      margin: 12px; padding: 8px 12px;
      background: transparent; border: 1px solid var(--card-border);
      border-radius: 6px; color: var(--text-muted); font-size: 12px;
      cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
    }
    .history-clear-all:hover { background: rgba(217,48,37,0.06); color: var(--rose); border-color: var(--rose); }
  `]
})
export class ChatHistorySidebarComponent {
  protected readonly history = inject(ChatHistoryService);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() newChat = new EventEmitter<void>();
  @Output() selectConversation = new EventEmitter<string>();
  @Output() deleteConversation = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();

  bucketLabel(b: ConversationBucket): string {
    return b === 'today' ? 'Today' : b === 'yesterday' ? 'Yesterday' : 'Earlier';
  }

  relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  onClose(): void { this.close.emit(); }
  onNewChat(): void { this.newChat.emit(); }
  onSelect(id: string): void { this.selectConversation.emit(id); }

  onDelete(ev: Event, id: string): void {
    ev.stopPropagation();
    if (confirm('Delete this conversation? This cannot be undone.')) {
      this.deleteConversation.emit(id);
    }
  }

  onClearAll(): void {
    if (confirm('Delete all conversations? This cannot be undone.')) {
      this.clearAll.emit();
    }
  }
}
