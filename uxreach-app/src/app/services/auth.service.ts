import { Injectable, inject } from '@angular/core';
import { AppStateService } from './app-state.service';
import { Session } from '../models/user.model';

const SESSION_KEY = 'uxreach_session';
const SESSION_TTL = 86400000; // 24 hours

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly appState = inject(AppStateService);

  login(): void {
    const session: Session = {
      loggedIn: true,
      userName: 'Sarah Chen',
      timestamp: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.appState.loggedIn.set(true);
    this.appState.userName.set(session.userName);
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this.appState.loggedIn.set(false);
  }

  checkSession(): boolean {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;

    try {
      const session: Session = JSON.parse(raw);
      if (Date.now() - session.timestamp < SESSION_TTL) {
        this.appState.loggedIn.set(true);
        this.appState.userName.set(session.userName);
        return true;
      }
    } catch {
      // corrupted session
    }

    localStorage.removeItem(SESSION_KEY);
    return false;
  }
}
