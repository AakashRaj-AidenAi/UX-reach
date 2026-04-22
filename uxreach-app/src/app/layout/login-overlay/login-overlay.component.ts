import { Component, inject } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-login-overlay',
  imports: [],
  templateUrl: './login-overlay.component.html',
  styleUrl: './login-overlay.component.scss'
})
export class LoginOverlayComponent {
  protected readonly appState = inject(AppStateService);
  // GIS button is rendered into #google-btn by AuthService.initGis()
}
