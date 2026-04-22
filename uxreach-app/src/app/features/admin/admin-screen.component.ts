import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AppStateService } from '../../services/app-state.service';
import { AllowedUser } from '../../models/user.model';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-screen',
  imports: [FormsModule],
  templateUrl: './admin-screen.component.html',
  styleUrl: './admin-screen.component.scss'
})
export class AdminScreenComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly appState = inject(AppStateService);
  private readonly toast = inject(ToastService);

  users = signal<AllowedUser[]>([]);
  loading = signal(true);
  saving = signal(false);

  newEmail = '';
  newName = '';
  newRole: 'rc' | 'admin' = 'rc';

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.api.getUsers().subscribe({
      next: (list) => { this.users.set(list); this.loading.set(false); },
      error: () => { this.toast.show('error', 'Failed to load users'); this.loading.set(false); }
    });
  }

  addUser(): void {
    if (!this.newEmail.trim() || !this.newName.trim()) return;
    this.saving.set(true);
    this.api.addUser(this.newEmail.trim(), this.newName.trim(), this.newRole).subscribe({
      next: (user) => {
        this.users.update(list => [...list, user]);
        this.newEmail = '';
        this.newName = '';
        this.newRole = 'rc';
        this.saving.set(false);
        this.toast.show('success', `${user.name} added to allowlist`);
      },
      error: (err) => {
        this.toast.show('error', err?.error?.detail ?? 'Failed to add user');
        this.saving.set(false);
      }
    });
  }

  removeUser(email: string): void {
    this.api.removeUser(email).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.email !== email));
        this.toast.show('warning', `${email} removed from allowlist`);
      },
      error: () => this.toast.show('error', 'Failed to remove user')
    });
  }
}
