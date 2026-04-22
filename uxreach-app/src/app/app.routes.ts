import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'chat',
    pathMatch: 'full'
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/chat/chat-screen.component').then(
        m => m.ChatScreenComponent
      )
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/components/dashboard-screen.component').then(
        m => m.DashboardScreenComponent
      )
  },
  {
    path: 'audit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/audit/components/audit-screen.component').then(
        m => m.AuditScreenComponent
      )
  },
  {
    path: 'scheduled',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/components/settings-screen.component').then(
        m => m.SettingsScreenComponent
      )
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin-screen.component').then(
        m => m.AdminScreenComponent
      )
  },
  {
    path: 'settings',
    redirectTo: 'scheduled',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'chat'
  }
];
