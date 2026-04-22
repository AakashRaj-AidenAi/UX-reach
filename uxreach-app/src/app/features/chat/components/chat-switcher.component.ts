import {
  Component,
  ChangeDetectionStrategy,
  EventEmitter,
  Input,
  Output,
  ElementRef,
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
    <div class="switcher-wrap">
      <button
        class="switcher-trigger"
        [class.open]="open()"
        (click)="toggle($event)"
        [title]="activeTitle() + ' — click to switch chat (Ctrl+Shift+O)'">
        <span class="material-symbols-outlined icon-sm">forum</span>
        <span class="switcher-title">{{ activeTitle() }}</span>
        <span class="material-symbols-outlined icon-sm switcher-caret">{{ open() ? 'expand_less' : 'expand_more' }}</span>
      </button>

      @if (open()) {
        <div class="switcher-popover" (click)="$event.stopPropagation()">
          <button class="switcher-new" (click)="onNewChat()">
            <span class="material-symbols-outlined icon-sm">edit_square</span> New chat
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
                      <div class="switcher-row-meta">{{ relativeTime(conv.updatedAt) }} &middot; {{ conv.messages.length }} msg</div>
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

            <div class="switcher-footer">
              <button class="switcher-clear" (click)="onClearAll()">
                <span class="material-symbols-outlined icon-sm">delete_sweep</span> Clear all
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-block; }

    .switcher-wrap { position: relative; }

    .switcher-trigger {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 10px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--text-dim);
      font-size: 13px; font-family: inherit; font-weight: 500;
      max-width: 260px;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .switcher-trigger:hover { background: var(--card-alt); color: var(--text); }
    .switcher-trigger.open { background: var(--card-alt); border-color: var(--card-border); }
    .switcher-title {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      max-width: 180px;
    }
    .switcher-caret { color: var(--text-muted); }

    .switcher-popover {
      position: absolute; top: calc(100% + 6px); left: 0;
      width: 320px;
      max-height: 440px;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(60,64,67,0.18), 0 2px 6px rgba(60,64,67,0.08);
      overflow: hidden;
      display: flex; flex-direction: column;
      z-index: 4000;
      animation: switcherIn 0.12s ease;
    }
    @keyframes switcherIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .switcher-new {
      display: inline-flex; align-items: center; gap: 6px;
      margin: 10px 10px 4px;
      padding: 8px 10px;
      border: 1px dashed var(--card-border);
      border-radius: 8px;
      background: transparent;
      color: var(--blue);
      font-weight: 500; font-size: 13px;
      cursor: pointer; text-align: left;
    }
    .switcher-new:hover { background: rgba(26,115,232,0.06); border-color: var(--blue); }

    .switcher-list { overflow-y: auto; padding: 4px 0 6px; flex: 1; }

    .switcher-bucket {
      font-size: 11px; font-weight: 600; letter-spacing: 0.4px;
      color: var(--text-muted); text-transform: uppercase;
      padding: 10px 14px 4px;
    }

    .switcher-row {
      display: flex; align-items: center; gap: 4px;
      padding: 6px 10px; margin: 0 6px;
      border-radius: 6px; cursor: pointer;
    }
    .switcher-row:hover { background: var(--card-alt); }
    .switcher-row.active { background: rgba(26,115,232,0.08); }
    .switcher-row.active .switcher-row-title { color: var(--blue); }
    .switcher-row-body { flex: 1; min-width: 0; }
    .switcher-row-title {
      font-size: 13px; color: var(--text); font-weight: 500;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .switcher-row-meta {
      font-size: 11px; color: var(--text-muted); margin-top: 1px;
    }
    .switcher-row-delete {
      background: transparent; border: none;
      color: var(--text-faint); cursor: pointer;
      padding: 4px; border-radius: 4px;
      opacity: 0; transition: opacity 0.15s ease, color 0.15s ease;
      display: inline-flex; align-items: center;
    }
    .switcher-row:hover .switcher-row-delete { opacity: 1; }
    .switcher-row-delete:hover { color: var(--rose); background: rgba(217,48,37,0.08); }

    .switcher-empty {
      padding: 20px 14px; text-align: center;
      color: var(--text-muted); font-size: 12px;
    }

    .switcher-footer {
      border-top: 1px solid var(--card-border);
      padding: 6px 10px;
      display: flex; justify-content: flex-end;
    }
    .switcher-clear {
      background: transparent; border: none;
      color: var(--text-muted); font-size: 12px;
      padding: 4px 8px; border-radius: 4px;
      cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
    }
    .switcher-clear:hover { color: var(--rose); background: rgba(217,48,37,0.06); }
  `]
})
export class ChatSwitcherComponent {
  protected readonly history = inject(ChatHistoryService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly open = signal(false);

  @Input() set requestOpen(value: boolean) {
    if (value) this.open.set(true);
  }

  @Output() newChat = new EventEmitter<void>();
  @Output() selectConversation = new EventEmitter<string>();
  @Output() deleteConversation = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();

  activeTitle(): string {
    const active = this.history.activeConversation();
    return active?.title || 'New chat';
  }

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

  openPopover(): void { this.open.set(true); }
  closePopover(): void { this.open.set(false); }

  onNewChat(): void { this.newChat.emit(); this.closePopover(); }
  onSelect(id: string): void { this.selectConversation.emit(id); this.closePopover(); }

  onDelete(ev: Event, id: string): void {
    ev.stopPropagation();
    if (confirm('Delete this conversation? This cannot be undone.')) {
      this.deleteConversation.emit(id);
    }
  }

  onClearAll(): void {
    if (confirm('Delete all conversations? This cannot be undone.')) {
      this.clearAll.emit();
      this.closePopover();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(ev.target as Node)) {
      this.closePopover();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open()) this.closePopover();
  }
}
