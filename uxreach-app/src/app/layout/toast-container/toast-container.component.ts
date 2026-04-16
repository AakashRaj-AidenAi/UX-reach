import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { Toast } from '../../models/toast.model';

@Component({
  selector: 'app-toast-container',
  imports: [],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss'
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);

  getIcon(toast: Toast): string {
    switch (toast.type) {
      case 'success': return '\u2705';
      case 'warning': return '\u26A0\uFE0F';
      case 'error': return '\u274C';
      case 'info': return '\u2139\uFE0F';
    }
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
