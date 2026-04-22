# Enhance Query Agent UI — Study Progress Fixes & UX Advancements

## Summary

The Daily Update / Query Agent in the chat UI has usability defects — most notably, **study selection is broken in the "study progress" flow** — plus several latent gaps in agent routing, picker validation, and API resilience. This change fixes the blocking bugs and layers in small but high-value enhancements so the Query Agent reaches parity with the Invite Agent and feels cohesive across chat + dashboard.

## Why

- **Blocker:** Users cannot select a study when asking for "study progress" — the picker either doesn't open or doesn't emit a valid command to the Query Agent. This breaks the primary demo path for the Daily Update Agent.
- **Routing is implicit:** Agent dispatch lives inline in `processCommand()` as regex-in-a-switch. Adding new agents (scheduler, analytics) or writing tests requires rewriting control flow.
- **Two code paths for the same data:** `study progress` queries go through the Query Agent API, while the dashboard calls `api.getStudyProgress()` directly. Output formats drift.
- **Picker is fragile:** Outside-click close has a TODO where the race-condition guard should be, and `getActiveStudiesForRC()` is fetched once — studies that flip to "has remaining candidates" mid-session never appear.
- **No fallback on Query Agent failures:** If the backend at `localhost:8000` is down, the user sees a toast and a dead chat — no cached response, no retry.

## What Changes

### Bug fixes (P0)
1. **Fix study selection in the Study Progress flow** — `study progress` prompt must open the study picker, accept a selected study, and emit a well-formed query to the Query Agent. Single-study mode (no count entry) for progress queries.
2. **Complete the outside-click close guard** in `chat-screen.component.ts` — replace the TODO with a proper `setTimeout(0)` microtask or `mousedown`-vs-`click` guard so the picker doesn't close before the button handler runs.
3. **Validate picker submit** — block submission when any selected row has count = 0; today `[disabled]` only checks `hasSelection`.

### Enhancements (P1)
4. **Explicit agent routing** — introduce `AgentType = 'invite' | 'query' | 'scheduler'` and a `determineAgent(prompt)` dispatcher in `chat-engine.service.ts`. Remove inline regex from `processCommand`.
5. **Unified Study Progress view** — new `study-progress.component.ts` rendering the full funnel (Invited → Responded → Booked → ICF Signed → Confirmed). Used by both the Query Agent response and the dashboard tile.
6. **Picker refresh signal** — `@Input() refreshKey` on `study-picker.component.ts` so studies re-fetch when `AppState.studyListVersion` ticks (e.g., after a send completes).
7. **Query Agent resilience** — retry wrapper (1 retry, 2s backoff) around `api.sendMessage()` calls for the Query Agent, plus a graceful offline response ("I can't reach the status service right now — showing last known snapshot from {timestamp}").
8. **Agent indicator in chat** — show which agent answered (Invite / Query) as a small badge on assistant messages, so users learn the mental model.

## Non-goals

- No changes to the Invite Agent business logic or the P0-first-20 policy.
- No backend changes beyond what's needed for the offline snapshot cache (local-only cache in `AppState`, no new endpoints).
- No new agent types beyond the routing scaffolding — scheduler/analytics agents are out of scope.
- No Salesforce schema or permission changes.

## Impact

- **Affected capabilities:** `query-agent-ui` (new capability spec).
- **Code:** 7 files — `chat-engine.service.ts`, `study-picker.component.ts`, `chat-screen.component.ts`, `api.service.ts`, `dashboard-screen.component.ts`, `app-state.service.ts`, `study.service.ts`.
- **New files:** `features/chat/components/study-progress.component.ts`, `models/agent-type.ts`.
- **Risk:** Low — routing refactor is mechanical; study-progress component is additive; picker fix is localized.
- **Demo readiness:** Unblocks the Daily Update Agent demo path for the next stakeholder review.
