import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import { AuthService } from '../../services/auth.service';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  section: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  protected readonly appState = inject(AppStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly mainNavItems: NavItem[] = [
    { icon: 'chat', label: 'Chat Agent', route: '/chat', section: 'main' },
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard', section: 'main' },
    { icon: 'history', label: 'Audit Trail', route: '/audit', section: 'main' },
    { icon: 'event', label: 'Scheduled Invites', route: '/scheduled', section: 'main' }
  ];

  signOut(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
