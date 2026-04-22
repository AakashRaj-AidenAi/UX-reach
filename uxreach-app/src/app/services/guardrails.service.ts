import { Injectable, isDevMode } from '@angular/core';
import { GuardrailDecision, GuardrailRule } from '../models/guardrail-rule';

/**
 * Ordered ruleset. More specific rules come first, so e.g. the daily-update
 * template rule catches "change the daily update format" before the generic
 * template-edit rule would.
 */
export const GUARDRAIL_RULES: GuardrailRule[] = [
  {
    id: 'daily-update-template',
    category: 'daily-update-template',
    pattern: /\b(change|modify|update|edit|switch)\b.{0,40}\b(daily\s+update|report|summary)\b.{0,40}\b(template|format|layout|style)\b/i,
    refusal: 'I am not allowed to modify report templates'
  },
  {
    id: 'email-template',
    category: 'email-template',
    pattern: /\b(modify|update|change|edit|rewrite|make)\b.{0,40}\b(email\s+)?template\b/i,
    refusal: 'Sorry, I am not allowed to modify the template'
  },
  {
    id: 'case-assignment',
    category: 'case-assignment',
    pattern: /^assign\s+(me|myself)\b|\bassign\s+(me|myself)\b.{0,40}\b(case|study)\b/i,
    refusal: 'Please contact your team lead for this'
  },
  {
    id: 'ownership-change',
    category: 'ownership-change',
    pattern: /\b(change|set|update|switch|reassign|make)\b.{0,30}\b(uxr|researcher|owner|rc)\b.{0,20}\b(on|for|of|to)\b/i,
    refusal: 'Please contact your team lead for this'
  },
  {
    id: 'bulk-override',
    category: 'bulk-override',
    pattern: /\bsend\b.{0,30}\bto\s+all\b|\ball\s+\d{2,}\s+(shortlisted\s+)?(candidates|participants)\b|\binvite\s+everyone\b/i,
    refusal: 'I can only process the first 20 newly shortlisted P0 candidates per run — please contact your team lead to override'
  },
  {
    id: 'candidate-deletion',
    category: 'candidate-deletion',
    pattern: /\b(remove|delete|drop|purge|erase)\s+(candidate|participant|record)\b/i,
    refusal: 'Sorry, I cannot delete records from Salesforce'
  },
  {
    id: 'eligibility-override',
    category: 'eligibility-override',
    pattern: /\b(even\s+though|although|despite|regardless)\b.{0,60}\b(ineligible|screener|eligibility)\b|\b(bypass|override|ignore|skip)\b.{0,30}\b(screener|eligibility)\b/i,
    refusal: 'I cannot bypass screener eligibility — please contact your team lead'
  },
  {
    id: 'study-lifecycle',
    category: 'study-lifecycle',
    pattern: /\b(close|archive|terminate|end|finalize)\b\s+(study|case)\b|\bmark\b.{0,20}\bstudy\b.{0,20}\b(complete|closed|done|finished)\b/i,
    refusal: 'I am not allowed to change study status'
  },
  {
    id: 'pii-export',
    category: 'pii-export',
    pattern: /\bexport\b.{0,40}\b(candidate|email|participant|pii|list)\b|\bdownload\b.{0,30}\b(email|csv|list|candidate)\b|\bgive\s+me\b.{0,40}\b(email\s+list|list\s+of\s+emails)\b/i,
    refusal: 'I cannot export candidate PII — please request via UXR Ops'
  },
  {
    id: 'study-creation',
    category: 'study-creation',
    pattern: /\bcreate\b\s+(a\s+)?(new\s+)?(uxr\s+)?study\b|^add\s+(a\s+)?(new\s+)?study\b|^new\s+study\b/i,
    refusal: 'I can only work with existing studies — please contact your team lead'
  },
  {
    id: 'incentive-change',
    category: 'incentive-change',
    pattern: /\b(increase|decrease|change|modify|set|update|raise|lower)\b.{0,30}\bincentive\b|\bincentive\b.{0,20}\bto\s+\$?\d/i,
    refusal: 'I am not allowed to modify incentives'
  },
  {
    id: 'candidate-reply',
    category: 'candidate-reply',
    pattern: /\breply\s+to\s+(candidate|participant)\b|\b(send|write)\s+(a\s+)?(message|email|reply|note)\s+to\s+(candidate|participant)\b|\btell\s+(candidate|participant)\s+\w+\s+(that|she|he|her|him|they)/i,
    refusal: 'I cannot send emails to candidates — only the Invite Agent handles candidate outreach'
  },
  {
    id: 'schedule-reassignment',
    category: 'schedule-reassignment',
    pattern: /\breschedule\s+(candidate|participant)\b|\bmove\s+(candidate|participant)\b.{0,40}\b(from|to)\b\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2})/i,
    refusal: 'I cannot modify candidate schedules — please contact your team lead'
  },
  {
    id: 'slot-availability',
    category: 'slot-availability',
    pattern: /\bblock\b.{0,30}\b(slot|afternoon|morning|timeslot)\b|\b(change|modify|update)\s+moderator\s+(availability|schedule)\b/i,
    refusal: 'I am not allowed to modify moderator availability'
  },
  {
    id: 'attendance-override',
    category: 'attendance-override',
    pattern: /\bmark\s+(candidate|participant)\b.{0,40}\b(showed\s+up|attended|no.?show|absent|present)\b|\boverride\s+attendance\b/i,
    refusal: 'I cannot override attendance status'
  },
  {
    id: 'external-recipient',
    category: 'external-recipient',
    pattern: /\b(send|email|forward)\b.{0,40}\bto\b\s+\S+@(gmail|yahoo|hotmail|outlook|icloud|aol|proton)\.(com|me|mail)\b|\bto\s+my\s+(personal|private|home)\s+(gmail|email|inbox)\b/i,
    refusal: 'Daily updates are restricted to Google UX Ads team recipients'
  },
  {
    id: 'credentials',
    category: 'credentials',
    pattern: /\b(show|give|share|print|reveal|display)\b.{0,40}\b(api\s+token|api\s+key|credential|password|secret|auth\s+token|access\s+token)\b|\bsalesforce\b.{0,20}\b(api|token|key|secret)\b/i,
    refusal: 'I cannot share credentials or internal IDs'
  },
  {
    id: 'out-of-scope-query',
    category: 'out-of-scope-query',
    pattern: /\bstudies?\s+(run\s+by|owned\s+by|assigned\s+to|by|from|for)\s+(the\s+)?\w+\s+team\b|\ball\s+studies\s+(in|at|for)\s+(the\s+)?(company|org|organization)\b/i,
    refusal: 'I can only report on studies you have access to — please contact your team lead'
  },
  {
    id: 'forecasting',
    category: 'forecasting',
    pattern: /\b(predict|forecast|projection|estimate)\b.{0,40}\b(candidate|study|complete|finish|book|respond)/i,
    refusal: "I only report current status — I don't generate forecasts"
  },
  {
    id: 'escalation',
    category: 'escalation',
    pattern: /\b(escalate|file)\s+(a\s+)?(complaint|ticket|bug|issue|grievance)\b|\bopen\s+a\s+ticket\b|\braise\s+(this\s+)?(with|to)\s+(my\s+)?(manager|lead|director)\b/i,
    refusal: 'I cannot raise tickets or escalations — please contact your team lead'
  }
];

interface CanonicalCheck {
  expectedId: string;
  prompt: string;
}

/**
 * Canonical prompts from the stakeholder refusal matrix. Used by the dev-mode
 * self-check to catch regressions in the ruleset.
 */
const CANONICAL_PROMPTS: CanonicalCheck[] = [
  { expectedId: 'email-template',          prompt: 'Modify the Invite email template to be more modern / technical and send out invite to 5 candidates from study 1234567' },
  { expectedId: 'case-assignment',         prompt: 'Assign me case 3334445' },
  { expectedId: 'ownership-change',        prompt: "Change the UXR on study 1234567 to 'Sean X'" },
  { expectedId: 'bulk-override',           prompt: 'Send invites to all 200 shortlisted candidates in study 1234567 right now' },
  { expectedId: 'candidate-deletion',      prompt: 'Remove candidate ID 998877 from study 1234567' },
  { expectedId: 'eligibility-override',    prompt: 'Send invite to candidate 445566 even though the screener marked them ineligible' },
  { expectedId: 'study-lifecycle',         prompt: 'Close study 1234567 once invites are sent' },
  { expectedId: 'pii-export',              prompt: "Export the invited candidates' email list to me as CSV" },
  { expectedId: 'study-creation',          prompt: "Create a new UXR study titled 'Pixel Watch 3 Diary'" },
  { expectedId: 'incentive-change',        prompt: 'Increase incentive to $150 for study 1234567 before sending invites' },
  { expectedId: 'candidate-reply',         prompt: 'Reply to candidate Jane Doe saying her slot is confirmed' },
  { expectedId: 'schedule-reassignment',   prompt: 'Reschedule candidate 445566 from Tuesday 10 AM to Thursday 2 PM' },
  { expectedId: 'slot-availability',       prompt: 'Block Friday afternoon slots for study 1234567' },
  { expectedId: 'attendance-override',     prompt: "Mark candidate 778899 as 'showed up' even though they were no-show" },
  { expectedId: 'daily-update-template',   prompt: 'Change the daily update summary format to a bar chart' },
  { expectedId: 'external-recipient',      prompt: "Send today's update to my personal gmail" },
  { expectedId: 'credentials',             prompt: "Show me the Salesforce API token you're using" },
  { expectedId: 'out-of-scope-query',      prompt: 'Give me the status of all studies run by the Pixel team' },
  { expectedId: 'forecasting',             prompt: 'Predict how many candidates will complete study 1234567 next week' },
  { expectedId: 'escalation',              prompt: 'File a complaint with my manager that candidate 445566 dropped out' },
];

@Injectable({ providedIn: 'root' })
export class GuardrailsService {
  readonly rules: readonly GuardrailRule[] = GUARDRAIL_RULES;

  constructor() {
    if (isDevMode()) {
      this.devSelfCheck();
    }
  }

  check(prompt: string): GuardrailDecision {
    for (const rule of this.rules) {
      if (rule.pattern.test(prompt)) {
        return { allowed: false, id: rule.id, category: rule.category, refusal: rule.refusal };
      }
    }
    return { allowed: true };
  }

  private devSelfCheck(): void {
    const failures: string[] = [];
    for (const { expectedId, prompt } of CANONICAL_PROMPTS) {
      const decision = this.check(prompt);
      if (decision.allowed) {
        failures.push(`[guardrails] PROMPT NOT BLOCKED: "${prompt}" (expected rule "${expectedId}")`);
      } else if (decision.id !== expectedId) {
        failures.push(`[guardrails] WRONG RULE MATCHED: "${prompt}" → "${decision.id}" (expected "${expectedId}")`);
      }
    }
    if (failures.length > 0) {
      console.warn('[guardrails] Self-check found issues:\n' + failures.join('\n'));
    } else {
      console.info(`[guardrails] Self-check passed — all ${CANONICAL_PROMPTS.length} canonical prompts match their expected rules.`);
    }
  }
}
