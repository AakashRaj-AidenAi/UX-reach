import { Component, inject, Output, EventEmitter, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
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
  selector: 'app-study-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="study-picker-dropdown animate-in" (click)="$event.stopPropagation()">
      <div class="study-picker-dropdown-header">
        <div>
          <div class="study-picker-dropdown-title">
            <span class="material-symbols-outlined icon-blue" style="vertical-align:middle;">{{ mode === 'progress' ? 'insights' : 'outgoing_mail' }}</span>
            {{ mode === 'progress' ? 'Study progress' : 'Send invites' }}
          </div>
          <div class="study-picker-dropdown-sub">
            {{ mode === 'progress' ? 'Pick a study to see its participant funnel.' : 'Select studies and enter the number of invites for each.' }}
          </div>
        </div>
        <button class="study-picker-close-btn" (click)="onCancel()" title="Close"><span class="material-symbols-outlined icon-sm">close</span></button>
      </div>

      @for (item of studies; track item.id) {
        <div class="study-picker-item" [class.selected]="item.selected">
          <label class="study-picker-label" (click)="$event.stopPropagation()">
            <input
              [type]="mode === 'progress' ? 'radio' : 'checkbox'"
              name="study-picker-selection"
              [checked]="item.selected"
              (change)="onSelectionChange(item, $event)">
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
            @if (mode === 'invite') {
              <div class="study-picker-count-wrap" [style.display]="item.selected ? 'flex' : 'none'">
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
            }
          </label>
        </div>
      }

      @if (studies.length === 0) {
        <div style="padding:16px;text-align:center;font-size:13px;color:var(--text-muted);">
          {{ mode === 'progress' ? 'No studies assigned to you yet.' : 'No studies with remaining invites.' }}
        </div>
      }

      @if (validationMsg) {
        <div style="font-size:12px;color:var(--rose);min-height:14px;">{{ validationMsg }}</div>
      }

      <div class="study-picker-footer">
        <button
          class="msg-btn primary"
          [disabled]="!canSubmit"
          [style.opacity]="canSubmit ? '1' : '0.45'"
          [style.pointer-events]="canSubmit ? 'auto' : 'none'"
          (click)="onSubmit()">
          {{ mode === 'progress' ? 'View progress' : 'Send invites' }}
        </button>
        <button class="msg-btn secondary" (click)="onCancel()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class StudyPickerComponent implements OnInit, OnChanges {
  private readonly studyService = inject(StudyService);
  private readonly appState = inject(AppStateService);

  @Input() mode: 'invite' | 'progress' = 'invite';
  @Input() refreshKey = 0;
  @Output() submit = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  studies: PickerStudy[] = [];
  validationMsg = '';

  get hasSelection(): boolean {
    return this.studies.some(s => s.selected);
  }

  get canSubmit(): boolean {
    if (this.mode === 'progress') {
      return this.studies.some(s => s.selected);
    }
    return this.studies.some(s => s.selected && s.count > 0);
  }

  ngOnInit(): void {
    this.loadStudies();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshKey'] && !changes['refreshKey'].firstChange) {
      this.loadStudies();
    }
  }

  private loadStudies(): void {
    const rcName = this.appState.userName();
    // Progress mode shows all studies the RC owns; invite mode only shows studies with remaining invites
    const source = this.mode === 'progress'
      ? this.studyService.getStudiesForRC(rcName)
      : this.studyService.getActiveStudiesForRC(rcName);

    // Preserve selection state across refreshes
    const priorSelection = new Map(this.studies.map(s => [s.id, { selected: s.selected, count: s.count }]));

    this.studies = Object.keys(source).map(id => {
      const s = source[id];
      const remaining = s.totalRequired - s.alreadySent;
      const prior = priorSelection.get(id);
      return {
        id,
        study: s,
        remaining,
        percent: Math.round((s.alreadySent / s.totalRequired) * 100),
        selected: prior?.selected ?? false,
        count: prior ? Math.min(prior.count, Math.max(remaining, 1)) : Math.min(Math.max(remaining, 1), 10)
      };
    });
  }

  onSelectionChange(item: PickerStudy, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (this.mode === 'progress') {
      this.studies.forEach(s => { s.selected = false; });
      item.selected = checked;
    } else {
      item.selected = checked;
    }
    this.validationMsg = '';
  }

  validateCount(item: PickerStudy): void {
    if (isNaN(item.count) || item.count < 1) item.count = 1;
    if (item.count > item.remaining) item.count = item.remaining;
    this.validationMsg = '';
  }

  onSubmit(): void {
    if (this.mode === 'progress') {
      const picked = this.studies.find(s => s.selected);
      if (!picked) {
        this.validationMsg = 'Please select a study.';
        return;
      }
      this.submit.emit(`Study progress: ${picked.id}`);
      return;
    }

    const selected = this.studies.filter(s => s.selected);
    if (selected.length === 0) {
      this.validationMsg = 'Please select at least one study.';
      return;
    }
    const zeroCount = selected.find(s => !s.count || s.count < 1);
    if (zeroCount) {
      this.validationMsg = `Enter a count greater than 0 for ${zeroCount.study.name}.`;
      return;
    }

    const commandText = 'Send invites: ' + selected.map(s => `${s.count} for study ${s.id}`).join(', ');
    this.submit.emit(commandText);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
