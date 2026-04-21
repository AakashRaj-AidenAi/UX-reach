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

  getIconName(toast: Toast): string {
    switch (toast.type) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'info': return 'info';
    }
  }

  getIconColorClass(toast: Toast): string {
    switch (toast.type) {
      case 'success': return 'icon-green';
      case 'warning': return 'icon-amber';
      case 'error': return 'icon-rose';
      case 'info': return 'icon-blue';
    }
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
