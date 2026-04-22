import { Injectable, effect, inject, signal, OnDestroy } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import { ChatMessage, MessageAction, SendQueueItem } from '../models/chat.model';
import { FilterSet } from '../models/candidate.model';
import { AgentType, determineAgent, extractStudyId } from '../models/agent-type';
import { AppStateService } from './app-state.service';
import { StudyService } from './study.service';
import { AuditService } from './audit.service';
import { SendingService } from './sending.service';
import { SchedulerService } from './scheduler.service';
import { ToastService } from './toast.service';
import { ApiService } from './api.service';
import { GuardrailsService } from './guardrails.service';
import { ChatHistoryService } from './chat-history.service';

@Injectable({ providedIn: 'root' })
export class ChatEngineService implements OnDestroy {
  private readonly appState = inject(AppStateService);
  private readonly studyService = inject(StudyService);
  private readonly auditService = inject(AuditService);
  private readonly sendingService = inject(SendingService);
  private readonly schedulerService = inject(SchedulerService);
  private readonly toastService = inject(ToastService);
  private readonly api = inject(ApiService);
  private readonly guardrails = inject(GuardrailsService);
  private readonly history = inject(ChatHistoryService);
  private suppressPersist = false;

  readonly messages = signal<ChatMessage[]>([]);

  // Signals for picker visibility
  readonly showStudyPicker = signal(false);
  readonly showSchedulePicker = signal(false);
  readonly pickerMode = signal<'invite' | 'progress'>('invite');

  // Guard against the opening click also triggering outside-click close
  justOpened = false;

  private subscriptions: Subscription[] = [];

  constructor() {
    // Persist message changes into the active conversation.
    effect(() => {
      const msgs = this.messages();
      if (this.suppressPersist) return;
      if (this.history.activeId()) {
        this.history.updateActiveMessages(msgs);
      }
    });

    this.subscriptions.push(
      this.sendingService.onEmailTick$.subscribe(({ sent, total }) => {
        this.updateSendingProgress(sent, total);
      })
    );

    this.subscriptions.push(
      this.sendingService.onComplete$.subscribe(result => {
        if (result.completed) {
          this.showCompletionMessage(result.studyId, result.sent, result.total, result.durationStr);
          this.toastService.show('success', `All ${result.total} invites sent successfully for Study ${result.studyId}`);
        } else {
          let msg = `<strong style="color:var(--amber);"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--amber);">warning</span> Send stopped.</strong> ${result.sent}/${result.total} emails were sent. Already-sent emails will NOT be recalled.<br><span class="msg-hint">Parent case notes updated for ${result.sent} sent emails.</span>`;
          if (result.queuePosition && result.queuePosition > 0) {
            msg += `<br><span style="font-size:12px;color:var(--text-muted);">${result.queuePosition} remaining ${result.queuePosition === 1 ? 'study' : 'studies'} in queue were cancelled.</span>`;
          }
          this.addBotMessage(msg);
          this.toastService.show('warning', `Send stopped at ${result.sent}/${result.total} emails`);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // ── INIT ──

  initChat(): void {
    // If there's a restored conversation with messages, load it without emitting a fresh welcome.
    const active = this.history.activeConversation();
    if (active && active.messages.length > 0) {
      this.suppressPersist = true;
      this.messages.set(active.messages);
      this.suppressPersist = false;
      return;
    }

    // Otherwise, start a fresh conversation and show the welcome card.
    if (!active) {
      this.history.startNewConversation();
    }
    this.messages.set([]);
    this.addBotMessage(
      'Hello! I can help you send invites, track participant responses, check ICF status, and more.',
      [
        { label: 'Send invites now', type: 'primary', action: 'open_study_picker' },
        { label: 'Schedule invites', type: 'primary', action: 'open_schedule_picker' },
        { label: 'Study progress', type: 'primary', action: 'open_study_progress_picker' },
        { label: 'Invites remaining', type: 'secondary', action: 'suggest', payload: 'How many invites are left?' },
        { label: "Today's summary", type: 'secondary', action: 'suggest', payload: "Show today's summary" },
        { label: 'My studies', type: 'secondary', action: 'suggest', payload: 'My studies' }
      ],
      0
    );
  }

  newConversation(): void {
    this.history.startNewConversation();
    this.suppressPersist = true;
    this.messages.set([]);
    this.suppressPersist = false;
    this.initChat();
  }

  selectConversation(id: string): void {
    const conv = this.history.selectConversation(id);
    if (!conv) return;
    this.suppressPersist = true;
    this.messages.set(conv.messages);
    this.suppressPersist = false;
  }

  deleteConversation(id: string): void {
    this.history.deleteConversation(id);
    const active = this.history.activeConversation();
    this.suppressPersist = true;
    this.messages.set(active?.messages ?? []);
    this.suppressPersist = false;
    if (!active) this.initChat();
  }

  clearAllConversations(): void {
    this.history.clearAll();
    this.suppressPersist = true;
    this.messages.set([]);
    this.suppressPersist = false;
    this.initChat();
  }

  // ── COMMAND PARSER ──

  processCommand(text: string): void {
    const lower = text.toLowerCase();

    // ── Guardrail gate ──
    // Runs before any state-specific handler so refusals are deterministic
    // regardless of backend availability or current chat state.
    const decision = this.guardrails.check(text);
    if (!decision.allowed) {
      this.auditService.recordRefusal(
        decision.category,
        decision.id,
        text,
        this.appState.userName()
      );
      this.addTyping();
      setTimeout(() => {
        this.removeTyping();
        this.addBotMessage(
          `<span class="material-symbols-outlined icon-sm" style="vertical-align:middle;color:var(--amber);">block</span> ${decision.refusal}`,
          undefined, 0, 'query'
        );
      }, 400);
      return;
    }

    // Study picker trigger
    if (lower.match(/^send invites?$|^choose studies?$|^select studies?$|^pick studies?$/)) {
      this.openStudyPicker();
      return;
    }

    // Cancel during picker
    if (this.appState.chatState() === 'study_picker_open' && lower === 'cancel') {
      this.cancelStudyPicker();
      return;
    }

    // Handle "send" during awaiting_confirm
    if (this.appState.chatState() === 'awaiting_confirm' && (lower === 'send' || lower === 'send now')) {
      this.handleSendNow();
      return;
    }
    if (this.appState.chatState() === 'awaiting_filtered_confirm' && (lower === 'send' || lower === 'send now')) {
      this.handleFilteredSendNow();
      return;
    }
    if (this.appState.chatState() === 'awaiting_crossrc' && (lower === 'yes, proceed' || lower === 'yes' || lower === 'proceed')) {
      this.handleCrossRcProceed();
      return;
    }
    if (this.appState.chatState() === 'awaiting_multi_confirm' && (lower === 'send all' || lower === 'send')) {
      this.handleMultiStudySend();
      return;
    }
    if (['awaiting_confirm', 'awaiting_crossrc', 'awaiting_filtered_confirm', 'awaiting_multi_confirm'].includes(this.appState.chatState()) && lower === 'cancel') {
      this.handleCancelSend();
      return;
    }

    // Scheduler flow
    const scheduleRe = /send\s+(\d+)\s+invite[s]?\s+(?:for\s+)?(?:case|study)?\s*(\d{7})\s+(?:(?:tomorrow|today)|(?:on\s+.+?)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2},\s+\d{4}|(?:\d{4}-\d{2}-\d{2}))\s+(?:at\s+)?(\d{1,2}[:\.]?\d{0,2}\s*(?:am|pm)?)/i;
    const scheduleMatch = lower.match(scheduleRe);
    if (scheduleMatch) {
      const count = parseInt(scheduleMatch[1], 10);
      const studyId = scheduleMatch[2];
      const dateTimeStr = text.substring(lower.indexOf(studyId) + studyId.length).trim();
      this.handleScheduleFlow(studyId, count, dateTimeStr);
      return;
    }

    // "Study progress: <id>" format (from study picker in progress mode)
    const pickerProgressMatch = lower.match(/^study progress:\s*(\d{7})/);
    if (pickerProgressMatch) {
      this.handleStudyProgressQuery(pickerProgressMatch[1]);
      return;
    }

    // "Send invites: N for study ID, ..." format (from study picker)
    if (lower.match(/^send invites:/)) {
      const pickerItems: SendQueueItem[] = [];
      const pickerRe = /(\d+)\s+for\s+(?:study\s+)?(\d{7})/gi;
      let pm;
      while ((pm = pickerRe.exec(lower)) !== null) {
        const study = this.studyService.getStudy(pm[2]);
        pickerItems.push({ count: parseInt(pm[1], 10), studyId: pm[2], studyName: study?.name ?? 'Unknown' });
      }
      if (pickerItems.length === 1) {
        this.handleInviteFlow(pickerItems[0].studyId, pickerItems[0].count);
        return;
      }
      if (pickerItems.length > 1) {
        this.handleMultiStudyCommand(pickerItems);
        return;
      }
    }

    // Multi-study compound: "send X invites for study A and Y invites for study B"
    const multiSegments: SendQueueItem[] = [];
    const multiRe = /(?:send|and)\s+(\d+)\s+invite[s]?\s+(?:for\s+)?(?:case|study)?\s*(\d{7})/gi;
    let mm;
    while ((mm = multiRe.exec(lower)) !== null) {
      const study = this.studyService.getStudy(mm[2]);
      multiSegments.push({ count: parseInt(mm[1], 10), studyId: mm[2], studyName: study?.name ?? 'Unknown' });
    }
    if (multiSegments.length > 1) {
      this.handleMultiStudyCommand(multiSegments);
      return;
    }

    // Invite with optional filter suffix
    const inviteMatch = lower.match(/send\s+(\d+)\s+invite[s]?\s+(?:for\s+)?(?:case|study)?\s*(\d{7})(.*)?/);
    if (inviteMatch) {
      const count = parseInt(inviteMatch[1], 10);
      const studyId = inviteMatch[2];
      const remainder = (inviteMatch[3] || '').trim();
      const filters = this.studyService.parseFilters(remainder);
      if (filters.countries.length > 0 || filters.customerTypes.length > 0) {
        this.handleFilteredInviteFlow(studyId, count, filters);
      } else {
        this.handleInviteFlow(studyId, count);
      }
      return;
    }

    // Status lookup
    const statusMatch = lower.match(/status\s+(?:of\s+)?(?:case|study)?\s*(\d{7})/);
    if (statusMatch) {
      this.handleStatusQuery(statusMatch[1]);
      return;
    }

    // Today's summary
    if (lower.includes('today') && lower.includes('summar')) {
      this.handleDailySummary();
      return;
    }

    // Pending studies
    if (lower.includes('pending')) {
      this.handlePendingStudies();
      return;
    }

    // Failure report
    if (lower.includes('fail') || lower.includes('error')) {
      this.handleFailureReport();
      return;
    }

    // Invites remaining
    if (lower.match(/how many|invites?\s+left|remaining invite|left to send|still need to send|invites?\s+remaining|how much left|how many more/)) {
      const studyMatch = lower.match(/(?:for\s+)?(?:study|case)?\s*(\d{7})/);
      this.handleInvitesRemaining(studyMatch ? studyMatch[1] : null);
      return;
    }

    // Scheduled jobs query
    if (lower.match(/when.*schedul|schedul.*send|my schedul|scheduled job|upcoming send|scheduled invite|show.*schedul/)) {
      this.handleScheduledQuery();
      return;
    }

    // My studies overview
    if (lower.match(/my studies|all studies|show studies|list studies|which studies|show all/)) {
      this.handleMyStudies();
      return;
    }

    // Help (local)
    if (lower.match(/^help$|what can you do|what do you know|available commands|^commands$/)) {
      this.handleHelp();
      return;
    }

    // Greeting (local)
    if (lower.match(/^(hi|hey|hello|howdy|good\s*(morning|afternoon|evening)|how are you|what'?s up|sup|yo)[\s!?]*$/)) {
      this.handleGreeting();
      return;
    }

    // ── Agent routing ──
    // Non-local intents and free-text Q&A fall through to the Query Agent backend.
    const routing = determineAgent(lower);
    if (routing.agent === 'query') {
      this.dispatchQueryAgent(lower, text, routing.intent);
      return;
    }

    // Unrecognized invite/scheduler phrasing — surface hints.
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      this.addBotMessage(
        'I\'m not sure what you mean. Here\'s what I can help with:<br>' +
        '&#x2022; <em>"send X invites for study 1234567"</em><br>' +
        '&#x2022; <em>"send 5 invites for study 1234567 from Japan"</em><br>' +
        '&#x2022; <em>"study progress 1234567"</em> &mdash; full participant funnel<br>' +
        '&#x2022; <em>"who responded to study 1234567"</em><br>' +
        '&#x2022; <em>"who needs a reminder for study 1234567"</em><br>' +
        '&#x2022; <em>"how many invites are left?"</em><br>' +
        'Or type <em>"help"</em> to see all commands.',
        undefined, 0
      );
    }, 1000);
  }

  // ── QUERY AGENT DISPATCHER ──

  private dispatchQueryAgent(lower: string, original: string, intent?: string): void {
    const sid = extractStudyId(lower);

    switch (intent) {
      case 'progress':
        if (sid) { this.handleStudyProgressQuery(sid); return; }
        break;
      case 'responses':
        if (sid) { this.handleQueryAgentChat(`responses for study ${sid}`, sid, intent); return; }
        break;
      case 'bookings':
        if (sid) { this.handleQueryAgentChat(`bookings for study ${sid}`, sid, intent); return; }
        break;
      case 'icf':
        if (sid) { this.handleQueryAgentChat(`icf status for study ${sid}`, sid, intent); return; }
        break;
      case 'reminders':
        if (sid) { this.handleQueryAgentChat(`who needs a reminder for study ${sid}`, sid, intent); return; }
        break;
      case 'confirmed':
        if (sid) { this.handleQueryAgentChat(`how many confirmed for study ${sid}`, sid, intent); return; }
        break;
    }

    // Known intent without a study id — ask the user to provide one.
    if (intent && intent !== 'free_text' && !sid) {
      this.addBotMessage(
        'Which study? Please include a 7-digit study ID (e.g. <em>1234567</em>).',
        undefined, 0, 'query'
      );
      return;
    }

    // Free-text Q&A — forward original prompt to the backend.
    this.handleQueryAgentChat(original);
  }

  // ── INVITE FLOW ──

  handleInviteFlow(studyId: string, count: number): void {
    const study = this.studyService.getStudy(studyId);
    if (!study) {
      this.handleInvalidStudy(studyId);
      return;
    }

    const remaining = study.totalRequired - study.alreadySent;
    const actualCount = Math.min(count, remaining);

    this.appState.currentStudyId.set(studyId);
    this.appState.currentInviteCount.set(actualCount);

    if (study.ownerRC !== this.appState.userName()) {
      if (!this.appState.allowCrossRcSend()) {
        this.addTyping();
        setTimeout(() => {
          this.removeTyping();
          this.addBotMessage(
            `<span style="color:var(--rose);"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--rose);">warning</span> Cross-RC sends are disabled.</span> Study ${studyId} belongs to ${study.ownerRC}. Enable cross-RC sending in Settings to proceed.`,
            undefined, 0
          );
        }, 1000);
        return;
      }

      this.appState.chatState.set('awaiting_crossrc');
      this.addTyping();
      setTimeout(() => {
        this.removeTyping();
        this.addBotMessage(
          `<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--amber);">warning</span> This study is worked on by ${study.ownerRC}. Are you sure you want to send invites for this study?`,
          [
            { label: 'Yes, proceed', type: 'primary', action: 'proceed_crossrc' },
            { label: 'Cancel', type: 'secondary', action: 'cancel' }
          ], 0
        );
      }, 1000);
      return;
    }

    this.showSendConfirmation(studyId, actualCount);
  }

  private handleCrossRcProceed(): void {
    if (this.appState.chatState() !== 'awaiting_crossrc') return;
    this.addUserMessage('Yes, proceed');
    const studyId = this.appState.currentStudyId()!;
    const actualCount = this.appState.currentInviteCount();
    this.showSendConfirmation(studyId, actualCount);
  }

  private showSendConfirmation(studyId: string, actualCount: number): void {
    this.appState.chatState.set('awaiting_confirm');
    const study = this.studyService.getStudy(studyId)!;
    const afterBatch = study.totalRequired - study.alreadySent - actualCount;

    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      const html =
        `<strong>Study ${studyId} - ${study.name}</strong><br>` +
        `Researcher: ${study.researcher}<br><br>` +
        `Currently sending: ${actualCount}<br>` +
        `${study.alreadySent} already sent out of ${study.totalRequired} required<br>` +
        `After this batch: ${afterBatch} remaining<br><br>` +
        `Ready to send?`;

      this.addBotMessage(html, [
        { label: 'Send', type: 'primary', action: 'send_now' },
        { label: 'Cancel', type: 'secondary', action: 'cancel' }
      ], 0, 'invite');
    }, 1000);
  }

  // ── FILTERED INVITE FLOW ──

  handleFilteredInviteFlow(studyId: string, count: number, filters: FilterSet): void {
    const study = this.studyService.getStudy(studyId);
    if (!study) {
      this.handleInvalidStudy(studyId);
      return;
    }

    const pool = this.studyService.getPool(studyId);
    const matched = this.studyService.applyFilters(pool, filters);
    const alreadySentCap = study.totalRequired - study.alreadySent;
    const available = Math.min(matched.length, alreadySentCap);
    const actualCount = Math.min(count, available);

    this.appState.currentStudyId.set(studyId);
    this.appState.currentInviteCount.set(actualCount);
    this.appState.currentFilters.set(filters);

    this.addTyping();
    setTimeout(() => {
      this.removeTyping();

      if (matched.length === 0) {
        const bd = this.studyService.filterBreakdown(pool);
        let html = `<span style="color:var(--amber);"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--amber);">warning</span> No candidates match the selected filters for Study ${studyId}.</span><br><br>`;
        html += `<strong>Filters applied:</strong> ${this.studyService.filterSummaryLine(filters)}<br><br>`;
        html += `<strong>What's available in the shortlisting pool (${pool.length} total):</strong><br>`;
        html += `<em>By region:</em> ${Object.entries(bd.byCountry).map(([k, v]) => `${k} (${v})`).join(', ')}<br>`;
        html += `<em>By customer type:</em> ${Object.entries(bd.byType).map(([k, v]) => `${k} (${v})`).join(', ')}`;
        html += '<div class="msg-buttons" style="margin-top:14px;">';
        html += `<button class="msg-btn primary" onclick="document.querySelector('app-chat-input-bar input')">Send without filters</button>`;
        html += '</div>';
        this.addBotMessage(html, [
          { label: 'Send without filters', type: 'primary', action: 'suggest', payload: `send ${count} invites for study ${studyId}` }
        ], 0);
        return;
      }

      if (alreadySentCap <= 0) {
        this.addBotMessage(`All required invites for Study ${studyId} have already been sent.`, undefined, 0);
        return;
      }

      this.appState.chatState.set('awaiting_filtered_confirm');

      const previewBd = this.studyService.filterBreakdown(matched.slice(0, actualCount));
      const afterBatch = study.totalRequired - study.alreadySent - actualCount;

      let html = `<strong>Study ${studyId} — ${study.name}</strong><br>`;
      html += `Researcher: ${study.researcher}<br><br>`;
      html += `<div style="background:rgba(37,99,235,0.06);border:1px solid rgba(37,99,235,0.18);border-radius:8px;padding:8px 12px;margin-bottom:10px;font-size:13px;">`;
      html += `<strong>Filters applied</strong><br>`;
      if (filters.countries.length) html += `<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">public</span> <strong>Region:</strong> ${filters.countries.join(', ')}<br>`;
      if (filters.customerTypes.length) html += `<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">business</span> <strong>Customer type:</strong> ${filters.customerTypes.join(', ')}`;
      html += `</div>`;
      html += `${matched.length} candidates match your filters`;
      html += ` <span style="color:var(--text-muted);font-size:12px;">(out of ${pool.length} shortlisted)</span><br>`;
      if (matched.length < count) {
        html += `<span style="color:var(--amber);font-size:12px;"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;color:var(--amber);">warning</span> You requested ${count}, but only ${available} are available — sending ${actualCount}.</span><br>`;
      }
      html += '<br>';
      html += '<table class="msg-table">';
      html += `<tr><td>Sending now</td><td><strong>${actualCount}</strong></td></tr>`;
      html += `<tr><td>Already sent</td><td>${study.alreadySent} of ${study.totalRequired} required</td></tr>`;
      html += `<tr><td>After this batch</td><td>${afterBatch} remaining</td></tr>`;
      html += '</table>';

      const breakdownParts = Object.entries(previewBd.byCountry).map(([k, v]) => `${k}: ${v}`)
        .concat(Object.entries(previewBd.byType).map(([k, v]) => `${k}: ${v}`));
      html += `<div style="margin-top:8px;font-size:12px;color:var(--text-muted);">${breakdownParts.join(' &nbsp;&#183;&nbsp; ')}</div>`;

      this.addBotMessage(html, [
        { label: 'Send', type: 'primary', action: 'filtered_send_now' },
        { label: 'Cancel', type: 'secondary', action: 'cancel' }
      ], 0);
    }, 1500);
  }

  handleFilteredSendNow(): void {
    if (this.appState.chatState() !== 'awaiting_filtered_confirm') return;
    this.appState.chatState.set('sending');
    this.addUserMessage('Send');
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      this.startSendingProgress();
    }, 1000);
  }

  // ── MULTI-STUDY ──

  handleMultiStudyCommand(segments: SendQueueItem[]): void {
    const queue: SendQueueItem[] = [];
    const unknown: string[] = [];

    segments.forEach(seg => {
      const study = this.studyService.getStudy(seg.studyId);
      if (!study) { unknown.push(seg.studyId); return; }
      const remaining = study.totalRequired - study.alreadySent;
      const actualCount = Math.min(seg.count, remaining);
      if (actualCount > 0) queue.push({ studyId: seg.studyId, count: actualCount, studyName: study.name });
    });

    if (unknown.length > 0) {
      this.addBotMessage(`<span style="color:var(--rose);">Study ${unknown.join(', ')} not found.</span> Please verify the study ID and try again.`, undefined, 0);
      return;
    }
    if (queue.length === 0) {
      this.addBotMessage('All selected studies have already met their invite targets. Nothing to send.', undefined, 0);
      return;
    }

    this.appState.sendQueue.set(queue);
    this.appState.sendQueueIndex.set(0);
    this.appState.chatState.set('awaiting_multi_confirm');

    const totalCount = queue.reduce((s, i) => s + i.count, 0);
    let html = `<strong>Ready to send invites across ${queue.length} studies:</strong><br><br>`;
    html += '<table class="msg-table">';
    queue.forEach((item, i) => {
      html += `<tr><td style="color:var(--text-muted);font-size:11px;">${i + 1}</td><td>${item.studyName}</td><td style="color:var(--text-muted);font-size:12px;">#${item.studyId}</td><td style="color:var(--green);font-weight:600;white-space:nowrap;">${item.count} invites</td></tr>`;
    });
    html += '</table>';
    html += `<br><strong>${totalCount}</strong> invites total across <strong>${queue.length}</strong> studies.`;

    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      this.addBotMessage(html, [
        { label: 'Send all', type: 'primary', action: 'multi_send' },
        { label: 'Cancel', type: 'secondary', action: 'cancel' }
      ], 0);
    }, 800);
  }

  handleMultiStudySend(): void {
    if (this.appState.chatState() !== 'awaiting_multi_confirm') return;
    this.addUserMessage('Send all');
    this.appState.chatState.set('sending');
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      this.processNextInQueue();
    }, 900);
  }

  processNextInQueue(): void {
    const queue = this.appState.sendQueue();
    const idx = this.appState.sendQueueIndex();

    if (idx >= queue.length) return;

    const item = queue[idx];
    const study = this.studyService.getStudy(item.studyId);
    if (!study) {
      this.appState.sendQueueIndex.update(i => i + 1);
      this.processNextInQueue();
      return;
    }

    this.appState.currentStudyId.set(item.studyId);
    this.appState.currentInviteCount.set(item.count);
    this.appState.currentFilters.set(null);
    this.appState.elapsedSeconds.set(0);
    this.appState.emailsSent.set(0);
    this.appState.chatState.set('sending');

    if (queue.length > 1 && idx > 0) {
      this.addBotMessage(
        `<span style="font-size:12px;color:var(--text-muted);">Study ${idx + 1} of ${queue.length}</span><br>` +
        `Starting: <strong>${item.studyName}</strong> — ${item.count} invites`,
        undefined, 0
      );
      setTimeout(() => this.startSendingProgress(), 600);
    } else {
      this.startSendingProgress();
    }
  }

  // ── SEND NOW ──

  handleSendNow(): void {
    if (this.appState.chatState() !== 'awaiting_confirm') return;
    this.addUserMessage('Send');
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      this.startSendingProgress();
    }, 1000);
  }

  private startSendingProgress(): void {
    const studyId = this.appState.currentStudyId()!;
    const count = this.appState.currentInviteCount();
    const study = this.studyService.getStudy(studyId);
    const queue = this.appState.sendQueue();
    const queueIdx = this.appState.sendQueueIndex();

    const msgId = this.generateId();
    const msg: ChatMessage = {
      id: msgId,
      sender: 'bot',
      html: '',
      timestamp: new Date(),
      actions: [
        { label: 'Stop', type: 'secondary', action: 'stop_send' }
      ],
      sendingProgress: {
        sent: 0,
        total: count,
        elapsedSeconds: 0,
        isComplete: false,
        studyName: study?.name,
        queuePosition: queue.length > 1 ? queueIdx + 1 : undefined,
        queueTotal: queue.length > 1 ? queue.length : undefined
      }
    };
    this.messages.update(list => [...list, msg]);

    this.sendingService.startSending(studyId, count);
  }

  handleStopSend(): void {
    this.sendingService.stopSending();
  }

  handleCancelSend(): void {
    this.appState.chatState.set('idle');
    this.appState.currentFilters.set(null);
    this.appState.resetQueue();
    this.addUserMessage('Cancel');
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      this.addBotMessage('Send cancelled. No emails were sent. What would you like to do next?', undefined, 0);
    }, 800);
  }

  private updateSendingProgress(sent: number, total: number): void {
    const elapsed = this.appState.elapsedSeconds();
    this.messages.update(list => {
      const updated = [...list];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].sendingProgress && !updated[i].sendingProgress!.isComplete) {
          updated[i] = {
            ...updated[i],
            sendingProgress: {
              ...updated[i].sendingProgress!,
              sent,
              total,
              elapsedSeconds: elapsed,
              isComplete: sent >= total,
              durationStr: this.sendingService.formatDuration(elapsed)
            }
          };
          break;
        }
      }
      return updated;
    });
  }

  private showCompletionMessage(studyId: string, sent: number, total: number, durationStr: string): void {
    const study = this.studyService.getStudy(studyId);
    const totalSent = study ? study.alreadySent : sent;
    const totalRequired = study ? study.totalRequired : total;
    const filters = this.appState.currentFilters();
    const queue = this.appState.sendQueue();
    const queueIdx = this.appState.sendQueueIndex();
    const hasMore = queue.length > 0 && (queueIdx + 1 < queue.length);

    // Mark progress message as complete
    this.messages.update(list => {
      const updated = [...list];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].sendingProgress) {
          updated[i] = {
            ...updated[i],
            actions: [],
            sendingProgress: {
              ...updated[i].sendingProgress!,
              isComplete: true,
              durationStr
            }
          };
          break;
        }
      }
      return updated;
    });

    let html = `<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> ${sent}/${total} sent — ${durationStr}`;
    if (queue.length > 1) {
      html += ` <span style="font-size:11px;color:var(--text-muted);">(Study ${queueIdx + 1} of ${queue.length})</span>`;
    }
    html += '<br>';

    if (filters && (filters.countries.length > 0 || filters.customerTypes.length > 0)) {
      html += `<span style="font-size:12px;color:var(--text-muted);">Filtered by: ${this.studyService.filterSummaryLine(filters)}</span><br>`;
    }

    html += `Parent case notes updated.<br>${totalSent} sent out of ${totalRequired} required.`;

    if (hasMore) {
      const next = queue[queueIdx + 1];
      html += `<br><span style="font-size:12px;color:var(--text-muted);"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;color:var(--amber);">hourglass_empty</span> Up next: <strong>${next.count}</strong> invites for <strong>${next.studyName}</strong>...</span>`;
    }

    this.appState.currentFilters.set(null);
    this.addBotMessage(html, undefined, 0, 'invite');

    if (queue.length <= 1) {
      // Single study — show summary
      setTimeout(() => {
        this.addTyping();
        setTimeout(() => {
          this.removeTyping();
          this.showSendSummary([{ studyName: study?.name ?? '', studyId, count: total }]);
        }, 600);
      }, 800);
    } else {
      // Multi-study queue
      this.appState.sendQueueIndex.update(i => i + 1);
      if (this.appState.sendQueueIndex() < queue.length) {
        setTimeout(() => {
          this.addTyping();
          setTimeout(() => {
            this.removeTyping();
            this.processNextInQueue();
          }, 700);
        }, 1200);
      } else {
        setTimeout(() => {
          const completedQueue = [...queue];
          this.appState.resetQueue();
          this.showSendSummary(completedQueue);
        }, 1000);
      }
    }
  }

  private showSendSummary(items: SendQueueItem[]): void {
    const totalSent = items.reduce((s, i) => s + i.count, 0);
    let html = '<strong><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">celebration</span> All done! Here\'s your send summary:</strong><br><br>';
    html += '<table class="msg-table">';
    items.forEach(item => {
      html += `<tr><td>${item.studyName}</td><td style="color:var(--text-muted);font-size:12px;">#${item.studyId}</td><td style="color:var(--green);font-weight:600;white-space:nowrap;">${item.count} sent <span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;color:var(--green);">check_circle</span></td></tr>`;
    });
    html += '</table>';
    if (items.length > 1) {
      html += `<br><strong>${totalSent}</strong> invites sent across <strong>${items.length}</strong> studies.`;
    }
    this.addBotMessage(html, [
      { label: 'Send more invites', type: 'primary', action: 'open_study_picker' }
    ], 0, 'invite');
  }

  // ── SEND MORE ──

  private handleSendMore(): void {
    this.addUserMessage('Send More');
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      const studyId = this.appState.currentStudyId();
      if (!studyId) return;

      const study = this.studyService.getStudy(studyId);
      if (!study) return;

      const remaining = study.totalRequired - study.alreadySent;
      if (remaining <= 0) {
        this.addBotMessage('All candidates for this study have been invited. Wait for new shortlistings.', undefined, 0);
      } else {
        const nextCount = Math.min(remaining, 10);
        const cmd = `Send ${nextCount} invites for study ${studyId}`;
        this.addBotMessage(
          `There are <strong>${remaining}</strong> candidates remaining for Study ${studyId}.`,
          [
            { label: cmd, type: 'primary', action: 'suggest', payload: cmd },
            { label: "Show today's summary", type: 'secondary', action: 'suggest', payload: "Show today's summary" }
          ], 0
        );
      }
    }, 1000);
  }

  // ── SCHEDULE FLOW ──

  handleScheduleFlow(studyId: string, count: number, dateTimeStr: string): void {
    const study = this.studyService.getStudy(studyId);
    if (!study) {
      this.addTyping();
      setTimeout(() => {
        this.removeTyping();
        this.addBotMessage(
          `<span style="color:var(--rose);">Study ${studyId} not found.</span> Please verify the ID and try again.`,
          undefined, 0
        );
      }, 1200);
      return;
    }

    this.addTyping();
    setTimeout(() => {
      this.removeTyping();

      this.schedulerService.addJob(studyId, study.name, count, dateTimeStr);
      const jobIndex = this.schedulerService.jobs().length - 1;

      const html =
        `<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> <strong>Scheduled:</strong> ${count} invites for Study ${studyId} - ${study.name} on ${dateTimeStr}.<br>` +
        `<span class="msg-hint">I'll notify you when it's done.</span>`;

      this.addBotMessage(html, [
        { label: 'Cancel', type: 'danger', action: 'cancel_schedule', payload: jobIndex },
        { label: 'Confirm', type: 'primary', action: 'confirm_schedule', payload: jobIndex }
      ], 0, 'scheduler');
    }, 1500);
  }

  // ── QUERY RESPONSES ──

  handleStatusQuery(studyId: string): void {
    const study = this.studyService.getStudy(studyId);
    if (!study) {
      this.addTyping();
      setTimeout(() => {
        this.removeTyping();
        this.addBotMessage(`<span style="color:var(--rose);">Study ${studyId} not found.</span> Please verify and try again.`, undefined, 0);
      }, 1000);
      return;
    }

    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      const remaining = study.totalRequired - study.alreadySent;
      let html = `<strong>Status — Study ${studyId}</strong>`;
      html += '<table class="msg-table" style="margin-top:8px;">';
      html += `<tr><td>Study</td><td>${study.name}</td></tr>`;
      html += `<tr><td>Sent</td><td>${study.alreadySent} of ${study.totalRequired} required</td></tr>`;
      html += `<tr><td>Remaining</td><td>${remaining}</td></tr>`;
      html += `<tr><td>Last Run</td><td>${study.lastRun || 'Never'}</td></tr>`;
      html += '</table>';

      const runs = this.auditService.getRunsForStudy(studyId);
      if (runs.length > 0) {
        html += '<br><strong>Run History</strong>';
        html += '<table class="msg-table" style="margin-top:8px;">';
        runs.forEach(r => {
          const statusIcon = r.status === 'completed'
            ? '<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;color:var(--green);">check_circle</span>'
            : '<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;color:var(--amber);">warning</span>';
          html += `<tr><td>${r.date}</td><td>${r.sent} sent &#x2022; ${r.duration} &#x2022; ${statusIcon}</td></tr>`;
        });
        html += '</table>';
      }

      const actions: MessageAction[] = [];
      if (remaining > 0) {
        const sendCount = Math.min(remaining, 10);
        actions.push({
          label: `Send ${sendCount} More`,
          type: 'primary',
          action: 'suggest',
          payload: `send ${sendCount} invites for study ${studyId}`
        });
      }

      this.addBotMessage(html, actions.length > 0 ? actions : undefined, 0);
    }, 1500);
  }

  handleDailySummary(): void {
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      const today = new Date().toISOString().split('T')[0];
      const todayRuns = this.auditService.runs().filter(r => r.date === today);

      let html: string;
      if (todayRuns.length === 0) {
        const allRuns = this.auditService.runs();
        const latestDate = allRuns.length > 0 ? allRuns[0].date : null;
        if (latestDate) {
          const latestRuns = allRuns.filter(r => r.date === latestDate);
          const dateDisplay = new Date(latestDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          html = `<strong>Latest activity — ${dateDisplay}</strong><br>`;
          let totalSent = 0;
          latestRuns.forEach(r => {
            html += `&#x2022; Study ${r.studyId}: ${r.sent} sent, ${r.failed} failed<br>`;
            totalSent += r.sent;
          });
          html += `Total: ${totalSent} sent`;
        } else {
          html = 'No runs recorded yet.';
        }
      } else {
        const dateDisplay = new Date(today + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        html = `<strong>Today — ${dateDisplay}</strong><br>`;
        let totalSent = 0;
        todayRuns.forEach(r => {
          html += `&#x2022; Study ${r.studyId}: ${r.sent} sent, ${r.failed} failed<br>`;
          totalSent += r.sent;
        });
        html += `Total: ${totalSent} sent today`;
      }

      this.addBotMessage(html, undefined, 0);
    }, 1500);
  }

  handlePendingStudies(): void {
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      let html = '<strong>Studies needing invites:</strong><br>';
      const actions: MessageAction[] = [];
      const allStudies = this.studyService.getAllStudies();

      for (const id of Object.keys(allStudies)) {
        const s = allStudies[id];
        const remaining = s.totalRequired - s.alreadySent;
        if (remaining > 0) {
          html += `&#x2022; Study ${id} - ${s.name} (${s.alreadySent}/${s.totalRequired} sent)<br>`;
          actions.push({
            label: `Send for ${id}`,
            type: 'primary',
            action: 'suggest',
            payload: `send 10 invites for study ${id}`
          });
        }
      }

      this.addBotMessage(html, actions.length > 0 ? actions : undefined, 0);
    }, 1500);
  }

  handleFailureReport(): void {
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      const failedRuns = this.auditService.runs().filter(r => r.failed > 0);
      if (failedRuns.length === 0) {
        this.addBotMessage('No failures today. <span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span>', undefined, 0);
      } else {
        let html = '<strong>Runs with failures:</strong><br>';
        failedRuns.forEach(r => {
          html += `&#x2022; ${r.date} — Study ${r.studyId}: ${r.failed} failed out of ${r.sent + r.failed}<br>`;
        });
        this.addBotMessage(html, undefined, 0);
      }
    }, 1500);
  }

  handleInvitesRemaining(studyId: string | null): void {
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();

      if (studyId) {
        const study = this.studyService.getStudy(studyId);
        if (!study) {
          this.addBotMessage(`<span style="color:var(--rose);">Study ${studyId} not found.</span> Please verify and try again.`, undefined, 0);
          return;
        }
        const remaining = study.totalRequired - study.alreadySent;
        let html = `<strong>Invites remaining — Study ${studyId}</strong>`;
        html += '<table class="msg-table" style="margin-top:8px;">';
        html += `<tr><td>Study</td><td>${study.name}</td></tr>`;
        html += `<tr><td>Sent</td><td>${study.alreadySent} of ${study.totalRequired} required</td></tr>`;
        html += `<tr><td>Remaining</td><td><strong>${remaining}</strong></td></tr>`;
        html += `<tr><td>Last run</td><td>${study.lastRun || 'Never'}</td></tr>`;
        html += '</table>';

        const actions: MessageAction[] = [];
        if (remaining > 0) {
          const sendCount = Math.min(remaining, 10);
          actions.push({ label: `Send ${sendCount} now`, type: 'primary', action: 'suggest', payload: `send ${sendCount} invites for study ${studyId}` });
          actions.push({ label: 'Schedule for later', type: 'secondary', action: 'suggest', payload: `Send ${sendCount} invites for study ${studyId} tomorrow at 9am` });
        } else {
          html += '<br><span style="color:var(--green);"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> All invites sent for this study!</span>';
        }
        this.addBotMessage(html, actions.length > 0 ? actions : undefined, 0);
      } else {
        let totalRemaining = 0;
        let studyLines = '';
        const actions: MessageAction[] = [];

        const allStudies = this.studyService.getAllStudies();
        Object.keys(allStudies).forEach(id => {
          const s = allStudies[id];
          if (s.ownerRC !== this.appState.userName()) return;
          const remaining = s.totalRequired - s.alreadySent;
          const pct = Math.round((s.alreadySent / s.totalRequired) * 100);
          if (remaining > 0) {
            totalRemaining += remaining;
            studyLines += `<tr><td>Study ${id}</td><td>${s.name}</td><td><strong>${remaining}</strong> left (${pct}% sent)</td></tr>`;
            const sendCount = Math.min(remaining, 10);
            actions.push({ label: `Send for ${id}`, type: 'primary', action: 'suggest', payload: `send ${sendCount} invites for study ${id}` });
          }
        });

        if (!studyLines) {
          this.addBotMessage('<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span> All your studies are fully invited — nothing remaining.', undefined, 0);
          return;
        }

        let html = '<strong>Invites remaining across your studies</strong>';
        html += `<table class="msg-table" style="margin-top:8px;">${studyLines}</table>`;
        html += `<br>Total: <strong>${totalRemaining}</strong> invites still needed`;
        this.addBotMessage(html, actions.length > 0 ? actions : undefined, 0);
      }
    }, 1200);
  }

  handleScheduledQuery(): void {
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      const activeJobs = this.schedulerService.getActiveJobs();
      if (activeJobs.length === 0) {
        this.addBotMessage(
          'You have no scheduled invite jobs right now.',
          [{ label: 'Schedule one now', type: 'secondary', action: 'suggest', payload: 'Send 10 invites for study 1234567 tomorrow at 9am' }], 0
        );
      } else {
        let html = '<strong>Your scheduled invite jobs:</strong>';
        html += '<table class="msg-table" style="margin-top:8px;">';
        html += '<tr><td style="font-weight:600;">Study</td><td style="font-weight:600;">Count</td><td style="font-weight:600;">Scheduled for</td></tr>';
        activeJobs.forEach(j => {
          html += `<tr><td>Study ${j.studyId}<br><span style="font-size:11px;color:var(--text-faint);">${j.studyName}</span></td><td>${j.count} invites</td><td>${j.scheduledTime}</td></tr>`;
        });
        html += '</table>';
        this.addBotMessage(html, [
          { label: 'Manage scheduled jobs', type: 'secondary', action: 'navigate', payload: 'scheduled' }
        ], 0);
      }
    }, 1200);
  }

  handleMyStudies(): void {
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      let studyLines = '';
      const actions: MessageAction[] = [];
      const allStudies = this.studyService.getAllStudies();

      Object.keys(allStudies).forEach(id => {
        const s = allStudies[id];
        if (s.ownerRC !== this.appState.userName()) return;
        const remaining = s.totalRequired - s.alreadySent;
        const pct = Math.round((s.alreadySent / s.totalRequired) * 100);
        const icon = remaining === 0
          ? '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--green);">check_circle</span>'
          : (s.alreadySent === 0
            ? '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--text-muted);">radio_button_unchecked</span>'
            : '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;color:var(--amber);">fiber_manual_record</span>');
        studyLines += `<tr><td>${icon} Study ${id}<br><span style="font-size:11px;color:var(--text-faint);">${s.researcher}</span></td><td>${s.name}</td><td>${s.alreadySent}/${s.totalRequired} (${pct}%)</td><td>${remaining > 0 ? '<strong>' + remaining + '</strong> left' : '<span style="color:var(--green);">Done</span>'}</td></tr>`;
        if (remaining > 0) {
          const sendCount = Math.min(remaining, 10);
          actions.push({ label: `Send for ${id}`, type: 'primary', action: 'suggest', payload: `send ${sendCount} invites for study ${id}` });
        }
      });

      let html = '<strong>Your studies:</strong>';
      html += '<table class="msg-table" style="margin-top:8px;">';
      html += '<tr><td style="font-weight:600;">Study</td><td style="font-weight:600;">Name</td><td style="font-weight:600;">Progress</td><td style="font-weight:600;">Remaining</td></tr>';
      html += studyLines + '</table>';
      this.addBotMessage(html, actions.length > 0 ? actions : undefined, 0);
    }, 1200);
  }

  // ── QUERY AGENT (calls backend for participant data) ──

  handleStudyProgressQuery(studyId: string): void {
    this.addTyping();
    this.api.getStudyProgress(studyId).pipe(
      retry({ count: 1, delay: () => timer(2000) })
    ).subscribe({
      next: (progress) => {
        this.removeTyping();
        this.appState.cacheQueryResponse({
          studyId,
          intent: 'progress',
          progress,
          timestamp: Date.now()
        });
        this.messages.update(list => [...list, {
          id: this.generateId(),
          sender: 'bot',
          html: '',
          timestamp: new Date(),
          studyProgress: progress,
          agent: 'query',
          actions: [
            { label: `Who needs a reminder`, type: 'secondary', action: 'suggest', payload: `who needs a reminder for study ${studyId}` },
            { label: `Send more invites`, type: 'primary', action: 'open_study_picker' }
          ]
        }]);
      },
      error: () => {
        this.removeTyping();
        const cached = this.appState.getCachedQueryResponse(studyId, 'progress');
        if (cached?.progress) {
          this.messages.update(list => [...list, {
            id: this.generateId(),
            sender: 'bot',
            html: this.staleCacheBanner(cached.timestamp),
            timestamp: new Date(),
            studyProgress: cached.progress,
            agent: 'query'
          }]);
          this.toastService.show('warning', 'Live status unavailable — showing last snapshot');
          return;
        }
        // No cache — synthesize a plausible funnel from local study state so the UI stays useful offline.
        const synthesized = this.studyService.synthesizeProgress(studyId);
        if (synthesized) {
          this.messages.update(list => [...list, {
            id: this.generateId(),
            sender: 'bot',
            html: this.offlineSyntheticBanner(),
            timestamp: new Date(),
            studyProgress: synthesized,
            agent: 'query',
            actions: [
              { label: `Who needs a reminder`, type: 'secondary', action: 'suggest', payload: `who needs a reminder for study ${studyId}` },
              { label: `Send more invites`, type: 'primary', action: 'open_study_picker' }
            ]
          }]);
          return;
        }
        // Study id unknown — fall back to the Query Agent chat endpoint for a text-only answer.
        this.handleQueryAgentChat(`study progress ${studyId}`, studyId, 'progress');
      }
    });
  }

  handleQueryAgentChat(queryText: string, studyId?: string, intent?: string): void {
    this.addTyping();
    const userName = this.appState.userName();

    this.api.sendMessage(queryText, userName).pipe(
      retry({ count: 1, delay: () => timer(2000) })
    ).subscribe({
      next: (response) => {
        this.removeTyping();
        if (studyId && intent) {
          this.appState.cacheQueryResponse({
            studyId,
            intent,
            html: response.html,
            timestamp: Date.now()
          });
        }
        const actions: MessageAction[] = [];
        if (response.actions) {
          response.actions.forEach((a: any) => {
            actions.push({
              label: a.label,
              type: a.type || 'secondary',
              action: a.action || 'suggest',
              payload: a.payload
            });
          });
        }
        this.addBotMessage(response.html, actions.length > 0 ? actions : undefined, 0, 'query');
      },
      error: () => {
        this.removeTyping();
        if (studyId && intent) {
          const cached = this.appState.getCachedQueryResponse(studyId, intent);
          if (cached?.html) {
            this.addBotMessage(this.staleCacheBanner(cached.timestamp) + cached.html, undefined, 0, 'query');
            this.toastService.show('warning', 'Live status unavailable — showing last snapshot');
            return;
          }
        }
        this.addBotMessage(
          '<span style="color:var(--rose);">Could not reach the server.</span> Please check the backend is running on localhost:8000.',
          [{ label: 'Retry', type: 'secondary', action: 'suggest', payload: queryText }],
          0, 'query'
        );
        this.toastService.show('error', 'Backend API unavailable');
      }
    });
  }

  private staleCacheBanner(timestamp: number): string {
    const when = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `<div style="background:rgba(249,171,0,0.08);border:1px solid rgba(249,171,0,0.25);border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:var(--text-dim);"><span class="material-symbols-outlined icon-sm icon-amber" style="vertical-align:middle;">wifi_off</span> Last updated ${when} — live status unavailable, showing cached snapshot.</div>`;
  }

  private offlineSyntheticBanner(): string {
    return `<div style="background:rgba(249,171,0,0.08);border:1px solid rgba(249,171,0,0.25);border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:var(--text-dim);"><span class="material-symbols-outlined icon-sm icon-amber" style="vertical-align:middle;">wifi_off</span> Backend unavailable — showing a synthesized funnel from local study state.</div>`;
  }

  handleGreeting(): void {
    const firstName = this.appState.userName().split(' ')[0] || 'there';
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      this.addBotMessage(
        `Hey ${firstName}! Good to see you. I'm your UXReach assistant — I can help you send invites, check study status, track responses, and more.<br><br>What would you like to do today?`,
        [
          { label: 'My studies', type: 'secondary', action: 'suggest', payload: 'My studies' },
          { label: "Today's summary", type: 'secondary', action: 'suggest', payload: "Today's summary" },
          { label: 'Help', type: 'secondary', action: 'suggest', payload: 'help' }
        ], 0
      );
    }, 800);
  }

  handleHelp(): void {
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();
      const hIcon = (name: string, color?: string) => `<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;${color ? 'color:' + color + ';' : ''}">${name}</span>`;
      let html = '<strong>Here\'s what I can help you with:</strong><br><br>';
      html += `<strong>${hIcon('outgoing_mail', 'var(--blue)')} Sending invites</strong><br>`;
      html += '&#x2022; <em>"Send 10 invites for study 1234567"</em><br>';
      html += '&#x2022; <em>"Send 5 invites for study 1234567 tomorrow at 9am"</em><br><br>';
      html += `<strong>${hIcon('public', 'var(--blue)')} Filtered sending</strong><br>`;
      html += '&#x2022; <em>"Send 5 invites for study 1234567 from Japan"</em><br>';
      html += '&#x2022; <em>"Send 5 invites for study 1234567 from India, large enterprise"</em><br>';
      html += '&#x2022; <em>"Send 8 invites for study 1234567 media agency only"</em><br>';
      html += '<span style="font-size:12px;color:var(--text-muted);">Regions: US, Japan, India, Germany, UK, Spain, France, Brazil, Australia, Canada, Singapore...<br>Customer types: Large Enterprise, Media Agency, SMB, Startup, Government, Non-profit</span><br><br>';
      html += `<strong>${hIcon('insights', 'var(--blue)')} Checking status</strong><br>`;
      html += '&#x2022; <em>"How many invites are left?"</em><br>';
      html += '&#x2022; <em>"Status of study 1234567"</em><br>';
      html += '&#x2022; <em>"Today\'s summary"</em> &nbsp;&#x2022; <em>"Pending studies"</em> &nbsp;&#x2022; <em>"My studies"</em><br><br>';
      html += `<strong>${hIcon('group', 'var(--blue)')} Participant tracking</strong><br>`;
      html += '&#x2022; <em>"Who responded to study 1234567"</em><br>';
      html += '&#x2022; <em>"Who booked for study 1234567"</em><br>';
      html += '&#x2022; <em>"ICF status for study 1234567"</em><br>';
      html += '&#x2022; <em>"Who needs a reminder for study 1234567"</em><br>';
      html += '&#x2022; <em>"How many confirmed for study 1234567"</em><br>';
      html += '&#x2022; <em>"Study progress 1234567"</em><br><br>';
      html += `<strong>${hIcon('calendar_today', 'var(--blue)')} Schedules</strong><br>`;
      html += '&#x2022; <em>"Show my scheduled invites"</em><br><br>';
      html += '<strong>Other</strong><br>';
      html += '&#x2022; <em>"What failed?"</em>';

      this.addBotMessage(html, [
        { label: 'Try filtered send', type: 'primary', action: 'suggest', payload: 'Send 5 invites for study 1234567 from Japan' },
        { label: 'Study progress', type: 'primary', action: 'open_study_progress_picker' },
        { label: 'Invites remaining', type: 'secondary', action: 'suggest', payload: 'How many invites are left?' },
        { label: 'My studies', type: 'secondary', action: 'suggest', payload: 'My studies' }
      ], 0);
    }, 800);
  }

  handleInvalidStudy(studyId: string): void {
    this.addTyping();
    setTimeout(() => {
      this.removeTyping();

      const rcStudies = this.studyService.getStudiesForRC(this.appState.userName());
      const actions: MessageAction[] = [];

      let html = `I couldn't find study ${studyId}. Here are your recent studies:<br><br>`;

      for (const id of Object.keys(rcStudies)) {
        const s = rcStudies[id];
        actions.push({
          label: `Study ${id} - ${s.name} (${s.alreadySent}/${s.totalRequired} sent)`,
          type: 'primary',
          action: 'suggest',
          payload: `send 10 invites for study ${id}`
        });
      }

      html += 'Which study would you like to work on?';
      this.addBotMessage(html, actions.length > 0 ? actions : undefined, 0);
    }, 1200);
  }

  // ── PICKER CONTROL ──

  openStudyPicker(): void {
    if (this.appState.chatState() !== 'idle') return;
    this.pickerMode.set('invite');
    this.appState.chatState.set('study_picker_open');
    this.showStudyPicker.set(true);
    this.flagJustOpened();
  }

  openStudyProgressPicker(): void {
    if (this.appState.chatState() !== 'idle') return;
    this.pickerMode.set('progress');
    this.appState.chatState.set('study_picker_open');
    this.showStudyPicker.set(true);
    this.flagJustOpened();
  }

  cancelStudyPicker(): void {
    this.showStudyPicker.set(false);
    this.pickerMode.set('invite');
    if (this.appState.chatState() === 'study_picker_open') {
      this.appState.chatState.set('idle');
    }
  }

  private flagJustOpened(): void {
    this.justOpened = true;
    setTimeout(() => { this.justOpened = false; }, 0);
  }

  openSchedulePicker(): void {
    if (this.appState.chatState() !== 'idle') return;
    this.appState.chatState.set('schedule_picker_open');
    this.showSchedulePicker.set(true);
    this.flagJustOpened();
  }

  cancelSchedulePicker(): void {
    this.showSchedulePicker.set(false);
    if (this.appState.chatState() === 'schedule_picker_open') {
      this.appState.chatState.set('idle');
    }
  }

  // ── ACTION DISPATCHER ──

  handleAction(actionId: string, payload?: any): void {
    switch (actionId) {
      case 'suggest':
        if (typeof payload === 'string') {
          this.addUserMessage(payload);
          this.processCommand(payload);
        }
        break;

      case 'send_now':
        this.handleSendNow();
        break;

      case 'filtered_send_now':
        this.handleFilteredSendNow();
        break;

      case 'multi_send':
        this.handleMultiStudySend();
        break;

      case 'cancel':
        this.handleCancelSend();
        break;

      case 'proceed_crossrc':
        this.handleCrossRcProceed();
        break;

      case 'stop_send':
        this.handleStopSend();
        break;

      case 'send_more':
        this.handleSendMore();
        break;

      case 'open_study_picker':
        this.openStudyPicker();
        break;

      case 'open_study_progress_picker':
        this.openStudyProgressPicker();
        break;

      case 'open_schedule_picker':
        this.openSchedulePicker();
        break;

      case 'navigate':
        if (typeof payload === 'string') {
          this.appState.currentScreen.set(payload);
        }
        break;

      case 'view_status':
        this.addUserMessage('View Status');
        this.appState.currentScreen.set('dashboard');
        this.toastService.show('info', 'Navigated to Dashboard');
        break;

      case 'cancel_schedule':
        if (typeof payload === 'number') {
          this.schedulerService.cancelJob(payload);
          this.toastService.show('warning', 'Scheduled job cancelled');
          this.disableActionsOnLastBotMessage();
        }
        break;

      case 'confirm_schedule':
        this.toastService.show('success', 'Schedule confirmed!');
        this.disableActionsOnLastBotMessage();
        break;

      default:
        if (actionId.startsWith('select_study_')) {
          const selectedStudyId = actionId.replace('select_study_', '');
          const cmd = `send 10 invites for study ${selectedStudyId}`;
          this.addUserMessage(cmd);
          this.processCommand(cmd);
        }
        break;
    }
  }

  // ── MESSAGE HELPERS ──

  addUserMessage(text: string): void {
    const msg: ChatMessage = {
      id: this.generateId(),
      sender: 'user',
      html: this.escapeHtml(text),
      timestamp: new Date()
    };
    this.messages.update(list => [...list, msg]);
  }

  addBotMessage(html: string, actions?: MessageAction[], delay?: number, agent?: AgentType): void {
    const actualDelay = delay ?? 0;
    if (actualDelay > 0) {
      this.addTyping();
      setTimeout(() => {
        this.removeTyping();
        this.pushBotMessage(html, actions, agent);
      }, actualDelay);
    } else {
      this.pushBotMessage(html, actions, agent);
    }
  }

  private pushBotMessage(html: string, actions?: MessageAction[], agent?: AgentType): void {
    const msg: ChatMessage = {
      id: this.generateId(),
      sender: 'bot',
      html,
      timestamp: new Date(),
      actions,
      agent
    };
    this.messages.update(list => [...list, msg]);
  }

  addTyping(): void {
    const existing = this.messages().find(m => m.isTyping);
    if (existing) return;

    const msg: ChatMessage = {
      id: 'typing',
      sender: 'bot',
      html: '',
      timestamp: new Date(),
      isTyping: true
    };
    this.messages.update(list => [...list, msg]);
  }

  removeTyping(): void {
    this.messages.update(list => list.filter(m => !m.isTyping));
  }

  private disableActionsOnLastBotMessage(): void {
    this.messages.update(list => {
      const updated = [...list];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].sender === 'bot' && updated[i].actions && updated[i].actions!.length > 0) {
          updated[i] = { ...updated[i], actions: [] };
          break;
        }
      }
      return updated;
    });
  }

  generateId(): string {
    return 'msg-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
