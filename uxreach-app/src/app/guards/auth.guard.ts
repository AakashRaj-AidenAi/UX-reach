import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AppStateService } from '../services/app-state.service';

export const authGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  return appState.loggedIn();
};
