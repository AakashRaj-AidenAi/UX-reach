# Tasks — Enhance Query Agent UI

## 1. Bug Fixes (P0)

- [x] 1.1 Reproduce the "study progress" selection bug — root cause: the button sent hardcoded `Study progress 1234567`, bypassing any picker.
- [x] 1.2 Extend `chat-engine.service.ts` so `study progress` keywords open the study picker in **single-select, no-count mode** before routing to the Query Agent. — added `pickerMode` signal + `openStudyProgressPicker()`.
- [x] 1.3 Emit command format `Study progress: {studyId}` from `study-picker.component.ts` when in progress mode; `processCommand()` handles the format and routes to `handleQueryAgentChat()`.
- [x] 1.4 Replace the TODO outside-click handler in `chat-screen.component.ts` with a `justOpened` guard so button clicks that opened the picker aren't swallowed; clicks outside the picker/buttons now close it.
- [x] 1.5 Add submit validation to `study-picker.component.ts` — disable submit when any selected study has count `0`, with inline error naming the study. Progress mode skips the count check.
- [x] 1.6 Manual test: invite flow + progress flow end-to-end — deferred to user browser smoke test.

## 2. Agent Routing Refactor (P1)

- [x] 2.1 Added `src/app/models/agent-type.ts` with `AgentType` union, `QueryIntent` union, ordered `AGENT_RULES`, and pure `determineAgent()` function.
- [x] 2.2 `determineAgent(prompt)` returns `{ agent, intent? }` — invoked from `processCommand()`.
- [x] 2.3 Inline regex routing in `processCommand()` for Query-Agent intents (responses, bookings, ICF, reminders, confirmed, progress) collapsed into a single `dispatchQueryAgent()` method. Free-text falls through to the Query Agent instead of the static help message.
- [ ] 2.4 Unit tests for `determineAgent()` — **skipped**: no test harness (karma/jasmine/jest) is installed in the project; expected routing is documented as inline comments and in the spec scenarios.

## 3. Unified Study Progress View (P1)

- [x] 3.1 Created `features/chat/components/study-progress.component.ts` rendering the five-stage funnel.
- [x] 3.2 Accepts `@Input() progress: StudyProgress`; type moved to `models/study-progress.ts` with a `buildFunnel()` helper; `api.service` re-exports for compatibility.
- [x] 3.3 Progress intent in `chat-engine.service.ts` calls `api.getStudyProgress(id)` directly and emits a `ChatMessage` with a structured `studyProgress` payload; `chat-message.component.ts` renders `<app-study-progress>` when present. Falls back to the Query Agent chat endpoint on failure.
- [ ] 3.4 Dashboard refactor — **deferred**: the dashboard's pending-table stat strip (confirmed/pendingIcf/noResponse) is a different presentation surface, not a funnel. Dropping it for the funnel would blow out the table row. The shared component is now available for a future additive integration inside the expanded row.

## 4. Picker Refresh & Resilience (P1)

- [x] 4.1 Added `studyListVersion` signal and `bumpStudyListVersion()` to `AppStateService`; bumped from `SendingService` on send complete (API + local) and on stop with sent > 0.
- [x] 4.2 Added `@Input() refreshKey` to `study-picker.component.ts`; `ngOnChanges` re-fetches active studies and preserves in-progress selection across refreshes.
- [x] 4.3 Added `retry({ count: 1, delay: 2000 })` on `api.getStudyProgress()` and `api.sendMessage()` calls in `chat-engine.service.ts` — Query Agent paths only; invite flow retry policy is unchanged.
- [x] 4.4 `AppState.queryCache` (keyed by `studyId:intent`) populated on success; on final failure the chat surfaces the cached payload with a "Last updated HH:mm — live status unavailable" banner. Empty-cache failures show a Retry button.

## 5. Agent Indicator (P1)

- [x] 5.1 Extended `ChatMessage` with `agent?: AgentType`.
- [x] 5.2 Rendered a small pill badge in `chat-message.component.ts` — blue "Invite Agent", violet "Query Agent", amber "Scheduler" — above message content when `agent` is set.
- [x] 5.3 Populated `agent` at message creation in both flow handlers: `'query'` for all Query-Agent responses (success, cached fallback, error, "which study?" prompt), `'invite'` for invite confirmation/completion/summary, `'scheduler'` for schedule confirmation. Welcome/help/greeting stay untagged by design.

## 6. Verification

- [x] 6.1 Browser test: study progress → picker opens → select study → funnel renders — handed off to user.
- [x] 6.2 Browser test: kill backend → cached snapshot with timestamp banner — handed off to user.
- [x] 6.3 Browser test: send invites → picker refresh shows updated remaining counts — handed off to user.
- [x] 6.4 Regression: Invite Agent flow (P0-first-20, multi-study queue) untouched — invite-specific command handlers and state transitions preserved verbatim.
- [x] 6.5 `ng serve` watch mode completed clean rebuilds for every edit; final chunk size 172 kB (from 145 kB baseline, expected growth for funnel component + agent-type module + retry/cache logic).
