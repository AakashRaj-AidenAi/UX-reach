import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStateService } from './app-state.service';
import { ApiService } from './api.service';
import { Session } from '../models/user.model';

const SESSION_KEY = 'uxreach_session';
const SESSION_TTL = 86400000; // 24 hours

declare const google: any;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly appState = inject(AppStateService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  private clientId = '';

  /** Called once from App.ngOnInit — fetches client ID then initialises GIS. */
  initGoogleAuth(): void {
    this.api.getAuthConfig().subscribe({
      next: (cfg) => {
        this.clientId = cfg.googleClientId ?? '';
        if (!this.clientId) {
          this.appState.loginError.set(
            'OAuth is not configured. Add GOOGLE_CLIENT_ID to backend/.env and restart the server.'
          );
          return;
        }
        this.loadGis();
      },
      error: () => {
        this.appState.loginError.set(
          'Could not reach the backend. Make sure it is running on localhost:8080.'
        );
      },
    });
  }

  private loadGis(): void {
    if (typeof google !== 'undefined') {
      this.initGis();
      return;
    }
    // GIS script loads async — poll until available
    const t = setInterval(() => {
      if (typeof google !== 'undefined') {
        clearInterval(t);
        this.initGis();
      }
    }, 100);
  }

  private initGis(): void {
    google.accounts.id.initialize({
      client_id: this.clientId,
      callback: (resp: { credential: string }) => this.handleCredential(resp),
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    const btn = document.getElementById('google-btn');
    if (btn) {
      google.accounts.id.renderButton(btn, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        text: 'signin_with',
        size: 'large',
        width: 300,
      });
    }
  }

  private handleCredential(resp: { credential: string }): void {
    this.appState.loginError.set('');
    this.api.verifyGoogleToken(resp.credential).subscribe({
      next: (res) => {
        if (res.success && res.user) {
          const session: Session = {
            loggedIn: true,
            userName: res.user.name,
            userEmail: res.user.email,
            userPicture: res.user.picture ?? '',
            userRole: res.user.role ?? 'rc',
            timestamp: Date.now(),
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          this.appState.loggedIn.set(true);
          this.appState.userName.set(session.userName);
          this.appState.userEmail.set(session.userEmail);
          this.appState.userPicture.set(session.userPicture ?? '');
          this.appState.userRole.set(session.userRole ?? 'rc');
          this.router.navigate(['/chat']);
        }
      },
      error: (err) => {
        const detail: string =
          err?.error?.detail ?? 'Sign-in failed. Please try again.';
        this.appState.loginError.set(detail);
      },
    });
  }

  logout(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.disableAutoSelect();
    }
    localStorage.removeItem(SESSION_KEY);
    this.appState.loggedIn.set(false);
    this.appState.loginError.set('');
    this.router.navigate(['/']);
  }

  checkSession(): boolean {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;

    try {
      const session: Session = JSON.parse(raw);
      if (Date.now() - session.timestamp < SESSION_TTL) {
        this.appState.loggedIn.set(true);
        this.appState.userName.set(session.userName);
        this.appState.userEmail.set(session.userEmail ?? '');
        this.appState.userPicture.set(session.userPicture ?? '');
        this.appState.userRole.set(session.userRole ?? 'rc');
        const url = this.router.url;
        if (url === '/' || url === '') this.router.navigate(['/chat']);
        return true;
      }
    } catch {
      // corrupted session
    }

    localStorage.removeItem(SESSION_KEY);
    return false;
  }
}
