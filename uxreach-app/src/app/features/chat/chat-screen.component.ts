import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectionStrategy,
  HostListener,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatEngineService } from '../../services/chat-engine.service';
import { AppStateService } from '../../services/app-state.service';
import { ChatHealthStripComponent } from './components/chat-health-strip.component';
import { ChatMessageComponent } from './components/chat-message.component';
import { ChatInputBarComponent } from './components/chat-input-bar.component';
import { StudyPickerComponent } from './components/study-picker.component';
import { SchedulePickerComponent } from './components/schedule-picker.component';
import { ChatHistorySidebarComponent } from './components/chat-history-sidebar.component';

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
    ChatHistorySidebarComponent
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  templateUrl: './chat-screen.component.html',
  styleUrl: './chat-screen.component.scss'
})
export class ChatScreenComponent implements OnInit, AfterViewChecked {
  protected readonly chatEngine = inject(ChatEngineService);
  protected readonly appState = inject(AppStateService);
  readonly messages = this.chatEngine.messages;

  protected readonly sidebarOpen = signal(false);
  protected searchQuery = '';

  @ViewChild('messageContainer') private messageContainer!: ElementRef<HTMLDivElement>;

  private shouldScroll = true;

  ngOnInit(): void {
    this.chatEngine.initChat();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
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
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = (div.textContent ?? '').toLowerCase();
    return text.includes(q);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const inEditable = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    // Cmd/Ctrl+Shift+O → toggle sidebar
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      this.toggleSidebar();
      return;
    }
    // Esc → close sidebar / open pickers
    if (event.key === 'Escape' && !inEditable) {
      if (this.sidebarOpen()) { this.sidebarOpen.set(false); return; }
      if (this.chatEngine.showStudyPicker()) { this.chatEngine.cancelStudyPicker(); return; }
      if (this.chatEngine.showSchedulePicker()) { this.chatEngine.cancelSchedulePicker(); return; }
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
    }
  }

  onSend(text: string): void {
    this.shouldScroll = true;
    this.chatEngine.addUserMessage(text);
    this.chatEngine.processCommand(text);
  }

  onAction(event: { action: string; payload?: any }): void {
    this.shouldScroll = true;
    this.chatEngine.handleAction(event.action, event.payload);
  }

  onStudyPickerSubmit(commandText: string): void {
    this.chatEngine.cancelStudyPicker();
    this.shouldScroll = true;
    this.chatEngine.addUserMessage(commandText);
    this.chatEngine.processCommand(commandText);
  }

  onStudyPickerCancel(): void {
    this.chatEngine.cancelStudyPicker();
  }

  onSchedulePickerSubmit(commandText: string): void {
    this.chatEngine.cancelSchedulePicker();
    this.shouldScroll = true;
    this.chatEngine.addUserMessage(commandText);
    this.chatEngine.processCommand(commandText);
  }

  onSchedulePickerCancel(): void {
    this.chatEngine.cancelSchedulePicker();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.chatEngine.justOpened) return;

    const target = event.target as HTMLElement;
    if (!target) return;

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
