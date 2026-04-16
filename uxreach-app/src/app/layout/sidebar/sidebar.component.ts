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
    { icon: '\uD83D\uDCAC', label: 'Chat Agent', route: '/chat', section: 'main' },
    { icon: '\uD83D\uDCCA', label: 'Dashboard', route: '/dashboard', section: 'main' },
    { icon: '\uD83D\uDCDC', label: 'Audit Trail', route: '/audit', section: 'main' },
    { icon: '\uD83D\uDCC5', label: 'Scheduled Invites', route: '/scheduled', section: 'main' }
  ];

  readonly refNavItems: NavItem[] = [
    { icon: '\uD83C\uDFD7\uFE0F', label: 'Architecture', route: '/architecture', section: 'ref' }
  ];

  signOut(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
