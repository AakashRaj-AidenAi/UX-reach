import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppStateService } from './services/app-state.service';
import { AuthService } from './services/auth.service';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { LoginOverlayComponent } from './layout/login-overlay/login-overlay.component';
import { ToastContainerComponent } from './layout/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, LoginOverlayComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly appState = inject(AppStateService);
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    // Restore an existing session; if none, initGoogleAuth sets up the GIS button
    if (!this.authService.checkSession()) {
      this.authService.initGoogleAuth();
    }
  }
}
