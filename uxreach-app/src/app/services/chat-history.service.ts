import { Injectable, computed, inject, signal } from '@angular/core';
import { AppStateService } from './app-state.service';
import { Conversation, BucketedConversation } from '../models/conversation';
import { ChatMessage } from '../models/chat.model';

const STORAGE_KEY_PREFIX = 'uxreach.chat.history.v1';
const MAX_CONVERSATIONS = 200;
const PERSIST_DEBOUNCE_MS = 300;

@Injectable({ providedIn: 'root' })
export class ChatHistoryService {
  private readonly appState = inject(AppStateService);

  readonly conversations = signal<Conversation[]>([]);
  readonly activeId = signal<string | null>(null);

  readonly activeConversation = computed<Conversation | null>(() => {
    const id = this.activeId();
    if (!id) return null;
    return this.conversations().find(c => c.id === id) ?? null;
  });

  readonly bucketed = computed<BucketedConversation[]>(() => {
    const list = [...this.conversations()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const earlier: Conversation[] = [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = y.toISOString().slice(0, 10);

    for (const c of list) {
      const d = c.updatedAt.slice(0, 10);
      if (d === todayStr) today.push(c);
      else if (d === yesterdayStr) yesterday.push(c);
      else earlier.push(c);
    }

    const buckets: BucketedConversation[] = [];
    if (today.length)     buckets.push({ bucket: 'today',     conversations: today });
    if (yesterday.length) buckets.push({ bucket: 'yesterday', conversations: yesterday });
    if (earlier.length)   buckets.push({ bucket: 'earlier',   conversations: earlier });
    return buckets;
  });

  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.load();
  }

  private storageKey(): string {
    return `${STORAGE_KEY_PREFIX}.${this.appState.userName()}`;
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return;
      const parsed = JSON.parse(raw) as { conversations: Conversation[]; activeId: string | null };
      if (!parsed || !Array.isArray(parsed.conversations)) return;
      const cleaned = parsed.conversations.map(c => ({
        ...c,
        messages: (c.messages ?? []).map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
      }));
      this.conversations.set(cleaned);
      if (parsed.activeId && cleaned.some(c => c.id === parsed.activeId)) {
        this.activeId.set(parsed.activeId);
      } else if (cleaned.length) {
        this.activeId.set(cleaned[0].id);
      }
    } catch (e) {
      console.warn('[chat-history] failed to load history, starting fresh', e);
    }
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.persistNow(), PERSIST_DEBOUNCE_MS);
  }

  private persistNow(): void {
    try {
      const payload = {
        conversations: this.conversations().map(c => ({
          ...c,
          messages: c.messages
            .filter(m => !m.isTyping)
            .map(m => this.sanitizeMessage(m))
        })),
        activeId: this.activeId()
      };
      localStorage.setItem(this.storageKey(), JSON.stringify(payload));
    } catch (e) {
      console.warn('[chat-history] failed to persist', e);
    }
  }

  private sanitizeMessage(m: ChatMessage): ChatMessage {
    // sendingProgress is transient UI state; don't bloat storage with live progress bars.
    const { sendingProgress, ...rest } = m;
    return { ...rest, sendingProgress: null } as ChatMessage;
  }

  startNewConversation(): Conversation {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: 'conv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      userName: this.appState.userName(),
      title: 'New chat',
      createdAt: now,
      updatedAt: now,
      messages: []
    };
    this.conversations.update(list => {
      const next = [conv, ...list];
      if (next.length > MAX_CONVERSATIONS) next.length = MAX_CONVERSATIONS;
      return next;
    });
    this.activeId.set(conv.id);
    this.schedulePersist();
    return conv;
  }

  selectConversation(id: string): Conversation | null {
    const conv = this.conversations().find(c => c.id === id) ?? null;
    if (conv) {
      this.activeId.set(id);
      this.schedulePersist();
    }
    return conv;
  }

  updateActiveMessages(messages: ChatMessage[]): void {
    const id = this.activeId();
    if (!id) return;
    this.conversations.update(list => list.map(c => {
      if (c.id !== id) return c;
      const prevUserCount = c.messages.filter(m => m.sender === 'user').length;
      const newUserCount  = messages.filter(m => m.sender === 'user').length;
      const hasNewContent = newUserCount > prevUserCount;
      const firstUser = messages.find(m => m.sender === 'user');
      const title = c.title === 'New chat' && firstUser
        ? this.deriveTitle(typeof firstUser.html === 'string' ? this.stripHtml(firstUser.html) : 'New chat')
        : c.title;
      return {
        ...c,
        title,
        updatedAt: hasNewContent ? new Date().toISOString() : c.updatedAt,
        messages
      };
    }));
    this.schedulePersist();
  }

  deleteConversation(id: string): void {
    this.conversations.update(list => list.filter(c => c.id !== id));
    if (this.activeId() === id) {
      const next = this.conversations()[0];
      this.activeId.set(next ? next.id : null);
    }
    this.schedulePersist();
  }

  clearAll(): void {
    this.conversations.set([]);
    this.activeId.set(null);
    try { localStorage.removeItem(this.storageKey()); } catch { /* noop */ }
  }

  private deriveTitle(raw: string): string {
    const cleaned = raw.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= 40) return cleaned || 'New chat';
    const cut = cleaned.slice(0, 40);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '…';
  }

  private stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent ?? div.innerText ?? '';
  }
}
