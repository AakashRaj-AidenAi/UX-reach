import {
  Component,
  ChangeDetectionStrategy,
  EventEmitter,
  Input,
  Output,
  HostListener,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatHistoryService } from '../../../services/chat-history.service';
import { ConversationBucket } from '../../../models/conversation';

@Component({
  selector: 'app-chat-switcher',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <!-- Hamburger trigger -->
    <button
      class="hamburger-btn"
      (click)="toggle($event)"
      title="Chat history (Ctrl+Shift+O)">
      <span class="material-symbols-outlined">menu</span>
    </button>

    <!-- Backdrop -->
    @if (open()) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div>
    }

    <!-- Left drawer -->
    <div class="chat-history-drawer" [class.open]="open()">
      <div class="drawer-header">
        <span class="drawer-title">Chat History</span>
        <button class="drawer-close-btn" (click)="closeDrawer()" title="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="drawer-body">
        <button class="switcher-new" (click)="onNewChat()">
          <span class="material-symbols-outlined icon-sm">edit_square</span>
          New chat
        </button>

        @if (history.conversations().length === 0) {
          <div class="switcher-empty">No past chats yet.</div>
        } @else {
          <div class="switcher-list">
            @for (group of history.bucketed(); track group.bucket) {
              <div class="switcher-bucket">{{ bucketLabel(group.bucket) }}</div>
              @for (conv of group.conversations; track conv.id) {
                <div
                  class="switcher-row"
                  [class.active]="history.activeId() === conv.id"
                  (click)="onSelect(conv.id)">
                  <div class="switcher-row-body">
                    <div class="switcher-row-title">{{ conv.title }}</div>
                    <div class="switcher-row-meta">
                      {{ relativeTime(conv.updatedAt) }} &middot; {{ conv.messages.length }} msg
                    </div>
                  </div>
                  <button
                    class="switcher-row-delete"
                    (click)="onDelete($event, conv.id)"
                    title="Delete conversation">
                    <span class="material-symbols-outlined icon-sm">delete</span>
                  </button>
                </div>
              }
            }
          </div>
        }
      </div>

      <div class="drawer-footer">
        <button class="switcher-clear" (click)="onClearAll()">
          <span class="material-symbols-outlined icon-sm">delete_sweep</span>
          Clear all
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; }

    /* ── Hamburger trigger ───────────────────────────── */
    .hamburger-btn {
      width: 36px;
      height: 36px;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, color 0.15s ease;
      flex-shrink: 0;
    }
    .hamburger-btn:hover {
      background: var(--card-alt);
      color: var(--text);
    }
    .hamburger-btn .material-symbols-outlined {
      font-size: 22px;
    }

    /* ── Backdrop ────────────────────────────────────── */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(32, 33, 36, 0.42);
      z-index: 3999;
      animation: backdropIn 0.2s ease;
    }
    @keyframes backdropIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ── Drawer panel ────────────────────────────────── */
    .chat-history-drawer {
      position: fixed;
      top: 0;
      left: 0;
      width: 300px;
      height: 100vh;
      background: var(--card);
      border-right: 1px solid var(--card-border);
      z-index: 4000;
      display: flex;
      flex-direction: column;
      box-shadow: 4px 0 24px rgba(60, 64, 67, 0.18);
      transform: translateX(-100%);
      transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }
    .chat-history-drawer.open {
      transform: translateX(0);
    }

    /* ── Drawer header ───────────────────────────────── */
    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--card-border);
      flex-shrink: 0;
    }
    .drawer-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }
    .drawer-close-btn {
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .drawer-close-btn:hover {
      background: var(--card-alt);
      color: var(--text);
    }
    .drawer-close-btn .material-symbols-outlined {
      font-size: 20px;
    }

    /* ── Drawer body ─────────────────────────────────── */
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      padding-bottom: 8px;
    }

    .switcher-new {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 12px 6px;
      padding: 9px 12px;
      border: 1px dashed var(--card-border);
      border-radius: 8px;
      background: transparent;
      color: var(--blue);
      font-weight: 500;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .switcher-new:hover {
      background: rgba(26, 115, 232, 0.06);
      border-color: var(--blue);
    }

    .switcher-list {
      flex: 1;
      padding: 4px 0 6px;
    }

    .switcher-bucket {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      text-transform: uppercase;
      padding: 10px 16px 4px;
    }

    .switcher-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 7px 12px;
      margin: 1px 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.12s ease;
    }
    .switcher-row:hover { background: var(--card-alt); }
    .switcher-row.active { background: rgba(26, 115, 232, 0.08); }
    .switcher-row.active .switcher-row-title { color: var(--blue); }

    .switcher-row-body { flex: 1; min-width: 0; }
    .switcher-row-title {
      font-size: 13px;
      color: var(--text);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .switcher-row-meta {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .switcher-row-delete {
      background: transparent;
      border: none;
      color: var(--text-faint);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      opacity: 0;
      transition: opacity 0.15s ease, color 0.15s ease;
      display: inline-flex;
      align-items: center;
    }
    .switcher-row:hover .switcher-row-delete { opacity: 1; }
    .switcher-row-delete:hover { color: var(--rose); background: rgba(217, 48, 37, 0.08); }

    .switcher-empty {
      padding: 24px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
    }

    /* ── Drawer footer ───────────────────────────────── */
    .drawer-footer {
      border-top: 1px solid var(--card-border);
      padding: 8px 12px;
      flex-shrink: 0;
    }
    .switcher-clear {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      font-family: inherit;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: color 0.15s ease, background 0.15s ease;
    }
    .switcher-clear:hover {
      color: var(--rose);
      background: rgba(217, 48, 37, 0.06);
    }
  `]
})
export class ChatSwitcherComponent {
  protected readonly history = inject(ChatHistoryService);

  readonly open = signal(false);

  @Input() set requestOpen(value: boolean) {
    if (value) this.open.set(true);
  }

  @Output() newChat = new EventEmitter<void>();
  @Output() selectConversation = new EventEmitter<string>();
  @Output() deleteConversation = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();

  bucketLabel(b: ConversationBucket): string {
    return b === 'today' ? 'Today' : b === 'yesterday' ? 'Yesterday' : 'Earlier';
  }

  relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  toggle(ev: MouseEvent): void {
    ev.stopPropagation();
    this.open.update(v => !v);
  }

  closeDrawer(): void { this.open.set(false); }

  onNewChat(): void { this.newChat.emit(); this.closeDrawer(); }
  onSelect(id: string): void { this.selectConversation.emit(id); this.closeDrawer(); }

  onDelete(ev: Event, id: string): void {
    ev.stopPropagation();
    if (confirm('Delete this conversation? This cannot be undone.')) {
      this.deleteConversation.emit(id);
    }
  }

  onClearAll(): void {
    if (confirm('Delete all conversations? This cannot be undone.')) {
      this.clearAll.emit();
      this.closeDrawer();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open()) this.closeDrawer();
  }
}
