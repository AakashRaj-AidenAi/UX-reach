import { Injectable, computed, signal } from '@angular/core';
import { ChatState, SendQueueItem } from '../models/chat.model';
import { FilterSet } from '../models/candidate.model';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly loggedIn = signal(false);
  readonly userName = signal('');
  readonly userEmail = signal('');
  readonly userPicture = signal('');
  readonly userRole = signal('rc');
  readonly loginError = signal('');
  readonly currentScreen = signal('chat');
  readonly chatState = signal<ChatState>('idle');
  readonly currentStudyId = signal<string | null>(null);
  readonly currentInviteCount = signal(0);
  readonly emailsSent = signal(0);
  readonly elapsedSeconds = signal(0);
  readonly allowCrossRcSend = signal(true);

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
}
