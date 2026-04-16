import { Injectable, inject, signal } from '@angular/core';
import { Delegation } from '../models/delegation.model';
import { StudyService } from './study.service';

@Injectable({ providedIn: 'root' })
export class DelegationService {
  private readonly studyService = inject(StudyService);

  readonly delegations = signal<Delegation[]>([]);

  addDelegation(caseId: string, delegateTo: string): void {
    const study = this.studyService.getStudy(caseId);
    const delegation: Delegation = {
      caseId,
      studyName: study ? study.name : 'Unknown Study',
      delegateTo,
      date: new Date().toLocaleDateString(),
      status: 'Active'
    };
    this.delegations.update(list => [...list, delegation]);
  }

  revokeDelegation(index: number): void {
    this.delegations.update(list => {
      const updated = [...list];
      if (updated[index]) {
        updated[index] = { ...updated[index], status: 'Revoked' };
      }
      return updated;
    });
  }

  getActiveDelegations(): Delegation[] {
    return this.delegations().filter(d => d.status === 'Active');
  }
}
