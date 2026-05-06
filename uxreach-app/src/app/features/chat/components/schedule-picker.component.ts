import { Component, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudyService } from '../../../services/study.service';
import { AppStateService } from '../../../services/app-state.service';
import { Study } from '../../../models/study.model';

interface PickerStudy {
  id: string;
  study: Study;
  remaining: number;
  percent: number;
  selected: boolean;
  count: number;
}

@Component({
  selector: 'app-schedule-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="study-picker-dropdown animate-in" (click)="$event.stopPropagation()">
      <div class="study-picker-dropdown-header">
        <div>
          <div class="study-picker-dropdown-title"><span class="material-symbols-outlined icon-blue" style="vertical-align:middle;">calendar_today</span> Schedule invites</div>
          <div class="study-picker-dropdown-sub">{{ preselectedStudyId ? 'Set invite count and choose when to send.' : 'Select studies, set invite count, and choose when to send.' }}</div>
        </div>
        <button class="study-picker-close-btn" (click)="onCancel()" title="Close"><span class="material-symbols-outlined icon-sm">close</span></button>
      </div>

      @for (item of studies; track item.id) {
        <div class="study-picker-item" [class.selected]="item.selected">
          <label class="study-picker-label" (click)="$event.stopPropagation()">
            <input type="checkbox" [(ngModel)]="item.selected" (ngModelChange)="onToggle()" [style.display]="preselectedStudyId ? 'none' : ''">
            <div class="study-picker-info">
              <div class="study-picker-name">{{ item.study.name }}</div>
              <div class="study-picker-meta">#{{ item.id }} &middot; {{ item.remaining }} remaining &middot; Last: {{ item.study.lastRun || 'Never' }}</div>
              <div class="study-picker-progress-strip">
                <div class="study-picker-progress-bar">
                  <div class="study-picker-progress-fill" [style.width.%]="item.percent"></div>
                </div>
                <span>{{ item.study.alreadySent }}/{{ item.study.totalRequired }} sent</span>
              </div>
            </div>
            <div class="study-picker-count-wrap" [style.display]="item.selected || preselectedStudyId ? 'flex' : 'none'">
              <input
                type="number"
                class="study-picker-count-input"
                [min]="1"
                [max]="item.remaining"
                [(ngModel)]="item.count"
                (click)="$event.stopPropagation()"
                (input)="validateCount(item)"
              >
              <span class="study-picker-count-label">invites<br><span style="color:var(--text-faint);font-size:10px;">{{ item.remaining }}&nbsp;left</span></span>
            </div>
          </label>
        </div>
      }

      <!-- Date / Time row -->
      <div class="sched-datetime-row">
        <div class="sched-datetime-group">
          <span class="sched-datetime-label">Date</span>
          <input type="date" class="sched-date-input" [(ngModel)]="schedDate" [min]="todayStr" (click)="$event.stopPropagation()">
        </div>
        <div class="sched-datetime-group">
          <span class="sched-datetime-label">Time</span>
          <input type="time" class="sched-time-input" [(ngModel)]="schedTime" (click)="$event.stopPropagation()">
        </div>
      </div>

      @if (validationMsg) {
        <div style="font-size:12px;color:var(--rose);min-height:14px;">{{ validationMsg }}</div>
      }

      <div class="study-picker-footer">
        <button
          class="msg-btn primary"
          [disabled]="!hasSelection"
          [style.opacity]="hasSelection ? '1' : '0.45'"
          [style.pointer-events]="hasSelection ? 'auto' : 'none'"
          (click)="onSubmit()">
          Schedule invites
        </button>
        <button class="msg-btn secondary" (click)="onCancel()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SchedulePickerComponent implements OnInit {
  private readonly studyService = inject(StudyService);
  private readonly appState = inject(AppStateService);

  @Input() preselectedStudyId: string | null = null;
  @Input() preselectedCount: number | null = null;

  @Output() submit = new EventEmitter<{ displayText: string; command: string }>();
  @Output() cancel = new EventEmitter<void>();

  studies: PickerStudy[] = [];
  validationMsg = '';
  schedDate = '';
  schedTime = '09:00';
  todayStr = '';

  get hasSelection(): boolean {
    return this.studies.some(s => s.selected);
  }

  ngOnInit(): void {
    const rcName = this.appState.userName();
    const active = this.studyService.getActiveStudiesForRC(rcName);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.todayStr = now.toISOString().split('T')[0];
    this.schedDate = tomorrow.toISOString().split('T')[0];

    const allStudies = Object.keys(active).map(id => {
      const s = active[id];
      const remaining = Math.max(0, s.p0Ready || 0);
      const isPreselected = this.preselectedStudyId === id;
      return {
        id,
        study: s,
        remaining,
        percent: Math.round((s.alreadySent / s.totalRequired) * 100),
        selected: isPreselected,
        count: isPreselected && this.preselectedCount != null
          ? Math.min(this.preselectedCount, remaining)
          : Math.min(remaining, 10)
      };
    });

    this.studies = this.preselectedStudyId
      ? allStudies.filter(s => s.id === this.preselectedStudyId)
      : allStudies;
  }

  onToggle(): void {
    this.validationMsg = '';
  }

  validateCount(item: PickerStudy): void {
    if (isNaN(item.count) || item.count < 1) item.count = 1;
    if (item.count > item.remaining) item.count = item.remaining;
  }

  onSubmit(): void {
    const selected = this.studies.filter(s => s.selected && s.count > 0);
    if (selected.length === 0) {
      this.validationMsg = 'Please select at least one study.';
      return;
    }
    if (!this.schedDate) {
      this.validationMsg = 'Please select a date.';
      return;
    }
    if (!this.schedTime) {
      this.validationMsg = 'Please select a time.';
      return;
    }

    const dateObj = new Date(this.schedDate + 'T' + this.schedTime);
    const isoStr = dateObj.toISOString();

    const displayTime = dateObj.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    }) + ' IST';

    const item = selected[0];
    this.submit.emit({
      displayText: `Schedule ${item.count} invite${item.count > 1 ? 's' : ''} for study ${item.id} on ${displayTime}`,
      command: `Send ${item.count} invites for study ${item.id} at ${isoStr}`,
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
