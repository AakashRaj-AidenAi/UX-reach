export interface Delegation {
  caseId: string;
  studyName: string;
  delegateTo: string;
  date: string;
  status: 'Active' | 'Revoked';
}
