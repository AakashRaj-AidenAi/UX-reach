export type GuardrailCategory =
  | 'daily-update-template'
  | 'email-template'
  | 'case-assignment'
  | 'ownership-change'
  | 'bulk-override'
  | 'candidate-deletion'
  | 'eligibility-override'
  | 'study-lifecycle'
  | 'pii-export'
  | 'study-creation'
  | 'incentive-change'
  | 'candidate-reply'
  | 'schedule-reassignment'
  | 'slot-availability'
  | 'attendance-override'
  | 'external-recipient'
  | 'credentials'
  | 'out-of-scope-query'
  | 'forecasting'
  | 'escalation';

export interface GuardrailRule {
  id: string;
  category: GuardrailCategory;
  pattern: RegExp;
  refusal: string;
}

export type GuardrailDecision =
  | { allowed: true }
  | { allowed: false; id: string; category: GuardrailCategory; refusal: string };
