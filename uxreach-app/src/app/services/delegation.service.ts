import { Injectable, inject, signal } from '@angular/core';
import { Delegation } from '../models/delegation.model';
import { StudyService } from './study.service';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DelegationService {
  private readonly studyService = inject(StudyService);
  private readonly api = inject(ApiService);

  readonly delegations = signal<Delegation[]>([]);

  constructor() {
    this.fetchDelegations();
  }

  fetchDelegations(): void {
    this.api.getDelegations().subscribe({
      next: (data) => {
        this.delegations.set(data);
      },
      error: () => {
        // Keep local state as fallback
      }
    });
  }

  addDelegation(caseId: string, delegateTo: string): void {
    const study = this.studyService.getStudy(caseId);
    const delegation: Delegation = {
      caseId,
      studyName: study ? study.name : 'Unknown Study',
      delegateTo,
      date: new Date().toLocaleDateString(),
      status: 'Active'
    };

    // Optimistically add to local state
    this.delegations.update(list => [...list, delegation]);

    // Try to sync with API
    this.api.addDelegation(caseId, delegateTo).subscribe({
      error: () => {
        // Keep local state as fallback
      }
    });
  }

  revokeDelegation(index: number): void {
    this.delegations.update(list => {
      const updated = [...list];
      if (updated[index]) {
        updated[index] = { ...updated[index], status: 'Revoked' };
      }
      return updated;
    });

    // Try to sync with API
    this.api.revokeDelegation(index).subscribe({
      error: () => {
        // Keep local state as fallback
      }
    });
  }

  getActiveDelegations(): Delegation[] {
    return this.delegations().filter(d => d.status === 'Active');
  }
}
