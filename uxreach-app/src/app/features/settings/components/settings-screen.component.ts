import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchedulerService } from '../../../services/scheduler.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';

@Component({
  selector: 'app-settings-screen',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './settings-screen.component.html',
  styleUrl: './settings-screen.component.scss'
})
export class SettingsScreenComponent {
  protected readonly schedulerService = inject(SchedulerService);

  protected onCancelJob(index: number): void {
    this.schedulerService.cancelJob(index);
  }
}
