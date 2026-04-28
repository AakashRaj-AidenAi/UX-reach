import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyProgress, FunnelStage, buildFunnel } from '../../../models/study-progress';

@Component({
  selector: 'app-study-progress',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="study-progress">
      <div class="study-progress-header">
        <div class="study-progress-title">
          <span class="material-symbols-outlined icon-blue" style="vertical-align:middle;">insights</span>
          Study {{ progress.studyId }} — {{ progress.studyName }}
        </div>
        <div class="study-progress-sub">UXR: {{ progress.researcher }}</div>
      </div>

      <div class="funnel">
        @for (stage of stages; track stage.key) {
          <div class="funnel-row" [attr.data-tone]="stage.tone">
            <div class="funnel-row-head">
              <span class="funnel-label">{{ stage.label }}</span>
              <span class="funnel-count"><strong>{{ stage.count }}</strong> <span class="funnel-pct">({{ stage.percent }}%)</span></span>
            </div>
            <div class="funnel-bar"><div class="funnel-fill" [style.width.%]="stage.percent"></div></div>
          </div>
        }
      </div>

      @if (progress.needsAttention && progress.needsAttention.length > 0) {
        <div class="funnel-needs-attention">
          <span class="material-symbols-outlined icon-amber icon-sm" style="vertical-align:middle;">warning</span>
          <strong>Needs attention:</strong>
          @for (item of progress.needsAttention; track item; let last = $last) {
            <span>{{ item }}{{ last ? '' : ', ' }}</span>
          }
        </div>
      }

      @if (hasActivityData) {
        <div class="activity-section">
          <div class="activity-title">
            <span class="material-symbols-outlined icon-sm" style="vertical-align:middle;color:var(--text-muted);">today</span>
            Today's Activity
          </div>
          <div class="activity-grid">
            <div class="activity-row">
              <span class="activity-label">P0s shortlisted</span>
              <span class="activity-value">{{ progress.p0Ready }}</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Invites sent today</span>
              <span class="activity-value">{{ progress.invitesSentToday }}</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Appointments booked</span>
              <span class="activity-value">{{ progress.appointmentsBookedToday }}</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Appointments cancelled</span>
              <span class="activity-value">{{ progress.appointmentsCancelled }}</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Appointments rescheduled</span>
              <span class="activity-value">{{ progress.appointmentsRescheduled }}</span>
            </div>
            <div class="activity-divider"></div>
            <div class="activity-row">
              <span class="activity-label">Pre-screening completed</span>
              <span class="activity-value">{{ progress.psCompleted }}</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Invited for pre-screening</span>
              <span class="activity-value">{{ progress.psInvited }}</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Pre-screening cancelled</span>
              <span class="activity-value">{{ progress.psCancelled }}</span>
            </div>
            <div class="activity-row">
              <span class="activity-label">Pre-screening rescheduled</span>
              <span class="activity-value">{{ progress.psRescheduled }}</span>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .study-progress {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 13px;
    }
    .study-progress-header { margin-bottom: 10px; }
    .study-progress-title { font-weight: 500; color: var(--text); font-size: 14px; }
    .study-progress-sub { color: var(--text-muted); font-size: 12px; margin-top: 2px; }

    .funnel { display: flex; flex-direction: column; gap: 8px; }

    .funnel-row-head {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 4px;
    }
    .funnel-label { color: var(--text-dim); }
    .funnel-count strong { color: var(--text); }
    .funnel-pct { color: var(--text-muted); font-size: 11px; margin-left: 4px; }

    .funnel-bar {
      width: 100%; height: 6px;
      background: #e8eaed;
      border-radius: 3px; overflow: hidden;
    }
    .funnel-fill {
      height: 100%; border-radius: 3px;
      transition: width 0.4s ease;
    }
    .funnel-row[data-tone="blue"]    .funnel-fill { background: #1a73e8; }
    .funnel-row[data-tone="cyan"]    .funnel-fill { background: #18a0b8; }
    .funnel-row[data-tone="violet"]  .funnel-fill { background: #7c5cd9; }
    .funnel-row[data-tone="amber"]   .funnel-fill { background: #f9ab00; }
    .funnel-row[data-tone="green"]   .funnel-fill { background: #1e8e3e; }

    .funnel-needs-attention {
      margin-top: 12px; padding-top: 10px;
      border-top: 1px dashed var(--card-border);
      font-size: 12px; color: var(--text-dim);
    }

    .activity-section {
      margin-top: 12px; padding-top: 10px;
      border-top: 1px solid var(--card-border);
    }
    .activity-title {
      font-size: 12px; font-weight: 500;
      color: var(--text-muted); margin-bottom: 8px;
      display: flex; align-items: center; gap: 4px;
    }
    .activity-grid { display: flex; flex-direction: column; gap: 4px; }
    .activity-row {
      display: flex; justify-content: space-between;
      font-size: 12px;
    }
    .activity-label { color: var(--text-dim); }
    .activity-value { font-weight: 500; color: var(--text); }
    .activity-divider { height: 1px; background: var(--card-border); margin: 4px 0; }
  `]
})
export class StudyProgressComponent {
  @Input({ required: true }) progress!: StudyProgress;

  get stages(): FunnelStage[] {
    return buildFunnel(this.progress);
  }

  get hasActivityData(): boolean {
    return this.progress.p0Ready != null;
  }
}
