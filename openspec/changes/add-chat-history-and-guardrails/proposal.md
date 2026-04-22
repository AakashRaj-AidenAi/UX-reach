# Add Chat History, UX Features & Frontend Guardrails

## Summary

Three related gaps in the UXReach chat experience:

1. **No chat history persists across reloads.** `ChatEngineService.messages` is an in-memory signal; every reload wipes the conversation and re-initializes with the welcome card. There's also no notion of past conversations — you can't revisit yesterday's funnel query.
2. **Baseline chat UX features are missing.** No timestamps rendered, no copy-message, no "clear chat" action, no keyboard shortcuts for power-users, no way to search prior messages.
3. **Frontend guardrails don't cover the 20 documented refusal scenarios.** A recent audit (Apr 22) shows only cross-RC sending and RC-scoped listings are enforced client-side. Everything else — template edits, assignment changes, candidate deletion, PII export, eligibility override, etc. — silently forwards to the Query Agent backend. Since the backend currently isn't running on `:8000`, those unsafe requests come back as a generic "Could not reach the server" instead of the documented refusals from the stakeholder sheet. This is a demo risk and a correctness bug.

## Why

- **History is demo table-stakes.** Stakeholders have been asking "where's yesterday's query" and the answer today is "it's gone". Re-running every query each session erodes trust in the funnel numbers.
- **Guardrails can't depend on the backend being up.** The refusal matrix is a contract with UXR Ops and Google Legal. "Modify the template" must produce "Sorry, I am not allowed to modify the template" — not a networking error. Frontend must enforce the refusals deterministically so the documented responses show up every time, offline or online.
- **UX features are small but highly visible.** Timestamps and copy-message are called out in every demo walkthrough; shipping them unblocks stakeholder confidence without touching the agent logic.

## What Changes

### A. Chat history & persistence (P0)
1. **localStorage-backed conversation store** keyed by `userName` + `conversationId`. Survives reloads; cleared on explicit user action only.
2. **Past-conversation sidebar** — list of prior conversations (date-bucketed: Today, Yesterday, Earlier), click to restore into the chat surface.
3. **New chat** action creates a fresh `conversationId`; current thread persists automatically.
4. **Conversation auto-titling** — the first user prompt (truncated ~40 chars) becomes the conversation title.
5. **Clear history** — per-conversation delete + "Clear all" (with confirm).
6. Strip transient fields (`isTyping`, in-flight progress bars) before persisting; restore static content only.

### B. Chat UX features (P1)
7. **Render timestamps** on each message (relative: "just now" / "2m ago" / absolute time on hover).
8. **Copy message** — hover action on bot messages that copies plain-text rendering to clipboard.
9. **Keyboard shortcuts** — `Cmd/Ctrl+Enter` to send, `ArrowUp` in an empty input to edit last user message, `Cmd/Ctrl+K` to focus chat input, `Esc` to close open pickers.
10. **Message search** — top-bar filter that highlights messages containing the query within the current conversation.

### C. Frontend guardrails (P0)
11. **`GuardrailsService`** — new service that classifies prompts against a ruleset before they reach any agent. Returns `{ allowed: true }` or `{ allowed: false, refusal: string, category: string }`.
12. **Refusal ruleset** — ordered regex rules covering the 20 documented scenarios from the stakeholder refusal matrix (template modification, case assignment, UXR ownership change, bulk-override requests, candidate deletion, eligibility override, study lifecycle, PII export, incentive change, direct candidate response, schedule reassignment, external recipients, credential leaks, out-of-scope study queries, escalation). Each rule carries the canonical refusal text verbatim from the matrix.
13. **Wire into `processCommand`** — guardrail check runs first, before state-specific command handlers. A blocked prompt produces a refusal message (tagged as Query Agent) and never hits the backend.
14. **Audit log** — refusals are recorded via the existing `AuditService` so we can show stakeholders "the agent refused X requests this session".
15. **Unit-testable rules** — the ruleset is a pure data structure + function, so the 20 canonical prompts from the refusal sheet can be asserted against it (via a simple in-code `__tests` block since no test harness is configured).

## Non-goals

- **Server-side conversation storage** — localStorage is sufficient for v1; server sync is a post-demo concern.
- **Multi-tenant history across devices** — single user, single device.
- **Markdown rendering** — current HTML-rendering is intentional (controlled fragments from the chat engine); switching to Markdown is a separate proposal.
- **Message reactions, threaded replies, @mentions** — not required by stakeholders.
- **Real-time multi-tab sync** — out of scope; last write wins on localStorage.
- **Dynamic/LLM-based guardrails** — the ruleset is deliberately static and deterministic. We're not asking the model to self-refuse; the frontend refuses before anything reaches the model.
- **Backend guardrail removal** — backend's LLM prompt guardrails stay. The frontend layer is a defense-in-depth addition, not a replacement.

## Impact

- **Affected capabilities:** new `chat-history` and `chat-guardrails` capability specs.
- **New services/files:** `services/chat-history.service.ts`, `services/guardrails.service.ts`, `models/conversation.ts`, `models/guardrail-rule.ts`, `features/chat/components/chat-history-sidebar.component.ts`, `features/chat/components/chat-search-bar.component.ts`.
- **Modified files:** `chat-engine.service.ts` (load/persist + guardrail gate), `chat-input-bar.component.ts` (keyboard shortcuts), `chat-message.component.ts` (timestamps, copy action), `chat-screen.component.html/ts` (sidebar + search integration), `audit.service.ts` (refusal audit type).
- **Risk:** Low. History is additive (no behavior change when localStorage is empty). Guardrails are deterministic regex + hardcoded responses — if a rule misfires, a user request gets refused with a clear message and can be fixed by adjusting the rule. Both services are pure/injectable and unit-friendly.
- **Demo win:** Unblocks the "show me yesterday's funnel" ask and makes every refusal scenario in the stakeholder sheet demonstrable live.
