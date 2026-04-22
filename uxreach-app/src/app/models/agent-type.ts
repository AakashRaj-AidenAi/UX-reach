export type AgentType = 'invite' | 'query' | 'scheduler' | 'unknown';

export type QueryIntent =
  | 'responses'
  | 'bookings'
  | 'icf'
  | 'reminders'
  | 'confirmed'
  | 'progress'
  | 'free_text';

interface KeywordRule {
  pattern: RegExp;
  agent: AgentType;
  intent?: QueryIntent;
}

// Order matters — first match wins, so more specific rules come first.
export const AGENT_RULES: KeywordRule[] = [
  // Scheduler (invite flow with a future date/time)
  { pattern: /\b(tomorrow|today)\b.*\bat\b/i, agent: 'scheduler' },
  { pattern: /\bon\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i, agent: 'scheduler' },
  { pattern: /\b(show|list|my|upcoming)\s+schedul/i, agent: 'scheduler' },

  // Invite agent — action verbs with counts / study picker triggers
  { pattern: /\bsend\s+\d+\s+invite/i, agent: 'invite' },
  { pattern: /^send\s+invites?:?\s/i, agent: 'invite' },
  { pattern: /^(send\s+invites?|choose\s+studies?|select\s+studies?|pick\s+studies?)\s*$/i, agent: 'invite' },

  // Query agent — specific participant tracking intents
  { pattern: /\bprogress\b|\bfunnel\b/i, agent: 'query', intent: 'progress' },
  { pattern: /\b(respond(ed)?|who\s+replied)\b/i, agent: 'query', intent: 'responses' },
  { pattern: /\b(book(ed|ing)?|slot|calendar)\b/i, agent: 'query', intent: 'bookings' },
  { pattern: /\b(icf|consent|signed)\b/i, agent: 'query', intent: 'icf' },
  { pattern: /\b(remind|follow.?up|non.?respond)\b/i, agent: 'query', intent: 'reminders' },
  { pattern: /\b(confirm(ed)?|locked.?in|ready)\b/i, agent: 'query', intent: 'confirmed' },
];

export interface AgentRouting {
  agent: AgentType;
  intent?: QueryIntent;
}

export function determineAgent(prompt: string): AgentRouting {
  const p = prompt.toLowerCase();
  for (const rule of AGENT_RULES) {
    if (rule.pattern.test(p)) {
      return { agent: rule.agent, intent: rule.intent };
    }
  }
  // Ambiguous free-text defaults to Query Agent
  return { agent: 'query', intent: 'free_text' };
}

export function extractStudyId(text: string): string | null {
  const m = text.match(/(\d{7})/);
  return m ? m[1] : null;
}
