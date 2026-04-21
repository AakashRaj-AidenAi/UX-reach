import { Component, inject, Output, EventEmitter, OnInit } from '@angular/core';
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
          <div class="study-picker-dropdown-title"><span class="material-symbols-outlined icon-blue" style="vertical-align:middle;">outgoing_mail</span> Send invites</div>
          <div class="study-picker-dropdown-sub">Select studies and enter the number of invites for each.</div>
        </div>
        <button class="study-picker-close-btn" (click)="onCancel()" title="Close"><span class="material-symbols-outlined icon-sm">close</span></button>
      </div>

      @for (item of studies; track item.id) {
        <div class="study-picker-item" [class.selected]="item.selected">
          <label class="study-picker-label" (click)="$event.stopPropagation()">
            <input type="checkbox" [(ngModel)]="item.selected" (ngModelChange)="onToggle(item)">
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
          </label>
        </div>
      }

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
          Send invites
        </button>
        <button class="msg-btn secondary" (click)="onCancel()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class StudyPickerComponent implements OnInit {
  private readonly studyService = inject(StudyService);
  private readonly appState = inject(AppStateService);

  @Output() submit = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  studies: PickerStudy[] = [];
  validationMsg = '';

  get hasSelection(): boolean {
    return this.studies.some(s => s.selected);
  }

  ngOnInit(): void {
    const rcName = this.appState.userName();
    const active = this.studyService.getActiveStudiesForRC(rcName);

    this.studies = Object.keys(active).map(id => {
      const s = active[id];
      const remaining = s.totalRequired - s.alreadySent;
      return {
        id,
        study: s,
        remaining,
        percent: Math.round((s.alreadySent / s.totalRequired) * 100),
        selected: false,
        count: Math.min(remaining, 10)
      };
    });
  }

  onToggle(item: PickerStudy): void {
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

    const commandText = 'Send invites: ' + selected.map(s => `${s.count} for study ${s.id}`).join(', ');
    this.submit.emit(commandText);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
