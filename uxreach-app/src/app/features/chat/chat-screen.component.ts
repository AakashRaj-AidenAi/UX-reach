import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  HostListener,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatEngineService } from '../../services/chat-engine.service';
import { AppStateService } from '../../services/app-state.service';
import { AuthService } from '../../services/auth.service';
import { ChatHealthStripComponent } from './components/chat-health-strip.component';
import { ChatMessageComponent } from './components/chat-message.component';
import { ChatInputBarComponent } from './components/chat-input-bar.component';
import { StudyPickerComponent } from './components/study-picker.component';
import { SchedulePickerComponent } from './components/schedule-picker.component';
import { ChatSwitcherComponent } from './components/chat-switcher.component';

@Component({
  selector: 'app-chat-screen',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChatHealthStripComponent,
    ChatMessageComponent,
    ChatInputBarComponent,
    StudyPickerComponent,
    SchedulePickerComponent,
    ChatSwitcherComponent
  ],
  templateUrl: './chat-screen.component.html',
  styleUrl: './chat-screen.component.scss'
})
export class ChatScreenComponent implements OnInit, AfterViewChecked {
  protected readonly chatEngine = inject(ChatEngineService);
  protected readonly appState = inject(AppStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly messages = this.chatEngine.messages;

  protected searchQuery = '';
  protected switcherRequestOpen = signal(false);
  protected profileMenuOpen = signal(false);
  protected readonly hasMessages = computed(() => this.messages().length > 0);
  protected readonly searchMatchCount = computed(() => {
    const q = this.searchQuery.trim();
    if (!q) return 0;
    return this.messages().filter(m => !m.isTyping && this.messageMatchesSearch(m.html)).length;
  });

  @ViewChild('messageContainer') private messageContainer!: ElementRef<HTMLDivElement>;

  private shouldScroll = true;

  ngOnInit(): void {
    this.chatEngine.initChat();
    this.handlePendingAction();
  }

  private handlePendingAction(): void {
    const pending = this.appState.pendingChatAction();
    if (!pending) return;
    this.appState.pendingChatAction.set(null);

    setTimeout(() => {
      if (pending.action === 'send_invite') {
        this.chatEngine.openStudyPicker(pending.studyId, pending.count ?? undefined);
      } else if (pending.action === 'schedule_invite') {
        this.chatEngine.openSchedulePicker(pending.studyId, pending.count ?? undefined);
      }
    }, 300);
  }

  onNewChat(): void {
    this.chatEngine.newConversation();
    this.searchQuery = '';
  }

  onSelectConversation(id: string): void {
    this.chatEngine.selectConversation(id);
    this.searchQuery = '';
    this.shouldScroll = true;
  }

  onDeleteConversation(id: string): void {
    this.chatEngine.deleteConversation(id);
  }

  onClearAll(): void {
    this.chatEngine.clearAllConversations();
    this.searchQuery = '';
  }

  messageMatchesSearch(html: string): boolean {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return true;
    if (!html) return false;
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = (div.textContent ?? html).toLowerCase();
    return text.includes(q);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const inEditable = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    // Cmd/Ctrl+Shift+O → open chat switcher popover
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      this.switcherRequestOpen.set(true);
      // Reset the trigger so a subsequent press can re-open after a close.
      setTimeout(() => this.switcherRequestOpen.set(false), 0);
      return;
    }
    // Esc → close open pickers (switcher handles its own Esc)
    if (event.key === 'Escape' && !inEditable) {
      if (this.chatEngine.showStudyPicker()) { this.chatEngine.cancelStudyPicker(); return; }
      if (this.chatEngine.showSchedulePicker()) { this.chatEngine.cancelSchedulePicker(); return; }
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  onSend(text: string): void {
    this.shouldScroll = true;
    const command = this.chatEngine.consumePendingCommand() ?? text;
    this.chatEngine.addUserMessage(text);
    this.chatEngine.processCommand(command);
  }

  onAction(event: { action: string; payload?: any }): void {
    this.shouldScroll = true;
    this.chatEngine.handleAction(event.action, event.payload);
  }

  onStudyPickerSubmit(commandText: string): void {
    this.chatEngine.cancelStudyPicker();
    this.chatEngine.suggestInput(commandText);
  }

  onStudyPickerCancel(): void {
    this.chatEngine.cancelStudyPicker();
  }

  onSchedulePickerSubmit(event: { displayText: string; command: string }): void {
    this.chatEngine.cancelSchedulePicker();
    this.chatEngine.suggestInputWithCommand(event.displayText, event.command);
  }

  onSchedulePickerCancel(): void {
    this.chatEngine.cancelSchedulePicker();
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen.update(v => !v);
  }

  signOut(): void {
    this.profileMenuOpen.set(false);
    this.authService.logout();
    this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.chatEngine.justOpened) return;

    const target = event.target as HTMLElement;
    if (!target) return;

    if (this.profileMenuOpen() && !target.closest('.user-menu-wrapper')) {
      this.profileMenuOpen.set(false);
    }

    if (
      this.chatEngine.showStudyPicker() &&
      !target.closest('app-study-picker') &&
      !target.closest('.msg-btn') &&
      !target.closest('.chat-suggestion-btn')
    ) {
      this.chatEngine.cancelStudyPicker();
    }

    if (
      this.chatEngine.showSchedulePicker() &&
      !target.closest('app-schedule-picker') &&
      !target.closest('.msg-btn') &&
      !target.closest('.chat-suggestion-btn')
    ) {
      this.chatEngine.cancelSchedulePicker();
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messageContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch (_) { /* noop */ }
  }
}
