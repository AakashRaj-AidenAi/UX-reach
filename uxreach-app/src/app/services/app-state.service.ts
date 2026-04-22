import { Injectable, computed, signal } from '@angular/core';
import { ChatState, SendQueueItem } from '../models/chat.model';
import { FilterSet } from '../models/candidate.model';
import { StudyProgress } from '../models/study-progress';

export interface CachedQueryResponse {
  studyId: string;
  intent: string;
  html?: string;
  progress?: StudyProgress;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly loggedIn = signal(false);
  readonly userName = signal('Sarah Chen');
  readonly currentScreen = signal('chat');
  readonly chatState = signal<ChatState>('idle');
  readonly currentStudyId = signal<string | null>(null);
  readonly currentInviteCount = signal(0);
  readonly emailsSent = signal(0);
  readonly elapsedSeconds = signal(0);
  readonly allowCrossRcSend = signal(true);

  // Bumped whenever study state changes (e.g. a send completes). Pickers watch it to re-fetch.
  readonly studyListVersion = signal(0);

  // Last successful Query Agent response per (studyId + intent), for offline fallback.
  readonly queryCache = signal<Record<string, CachedQueryResponse>>({});

  // Multi-study queue
  readonly sendQueue = signal<SendQueueItem[]>([]);
  readonly sendQueueIndex = signal(0);

  // Filters
  readonly currentFilters = signal<FilterSet | null>(null);

  readonly isSending = computed(() => this.chatState() === 'sending');

  readonly userInitials = computed(() =>
    this.userName()
      .split(' ')
      .map(n => n[0])
      .join('')
  );

  resetSendingState(): void {
    this.chatState.set('idle');
    this.currentStudyId.set(null);
    this.currentInviteCount.set(0);
    this.emailsSent.set(0);
    this.elapsedSeconds.set(0);
    this.currentFilters.set(null);
  }

  resetQueue(): void {
    this.sendQueue.set([]);
    this.sendQueueIndex.set(0);
  }

  bumpStudyListVersion(): void {
    this.studyListVersion.update(v => v + 1);
  }

  cacheQueryResponse(entry: CachedQueryResponse): void {
    const key = `${entry.studyId}:${entry.intent}`;
    this.queryCache.update(cache => ({ ...cache, [key]: entry }));
  }

  getCachedQueryResponse(studyId: string, intent: string): CachedQueryResponse | null {
    return this.queryCache()[`${studyId}:${intent}`] ?? null;
  }
}
