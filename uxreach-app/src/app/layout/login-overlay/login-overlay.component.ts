import { Component, inject } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-overlay',
  imports: [],
  templateUrl: './login-overlay.component.html',
  styleUrl: './login-overlay.component.scss'
})
export class LoginOverlayComponent {
  protected readonly appState = inject(AppStateService);
  private readonly authService = inject(AuthService);

  signIn(): void {
    this.authService.login();
  }
}
