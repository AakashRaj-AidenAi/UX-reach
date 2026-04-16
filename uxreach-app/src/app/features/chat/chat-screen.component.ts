import {
  Component,
  inject,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectionStrategy,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatEngineService } from '../../services/chat-engine.service';
import { ChatHealthStripComponent } from './components/chat-health-strip.component';
import { ChatMessageComponent } from './components/chat-message.component';
import { ChatInputBarComponent } from './components/chat-input-bar.component';
import { StudyPickerComponent } from './components/study-picker.component';
import { SchedulePickerComponent } from './components/schedule-picker.component';

@Component({
  selector: 'app-chat-screen',
  standalone: true,
  imports: [
    CommonModule,
    ChatHealthStripComponent,
    ChatMessageComponent,
    ChatInputBarComponent,
    StudyPickerComponent,
    SchedulePickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  templateUrl: './chat-screen.component.html',
  styleUrl: './chat-screen.component.scss'
})
export class ChatScreenComponent implements OnInit, AfterViewChecked {
  protected readonly chatEngine = inject(ChatEngineService);
  readonly messages = this.chatEngine.messages;

  @ViewChild('messageContainer') private messageContainer!: ElementRef<HTMLDivElement>;

  private shouldScroll = true;

  ngOnInit(): void {
    this.chatEngine.initChat();
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
    // Close pickers when clicking outside
    const target = event.target as HTMLElement;
    if (this.chatEngine.showStudyPicker() && !target.closest('app-study-picker') && !target.closest('.chat-suggestion-btn')) {
      // small delay to avoid race condition
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
