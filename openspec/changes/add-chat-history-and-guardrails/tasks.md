# Tasks — Add Chat History, UX Features & Frontend Guardrails

## 1. Chat History & Persistence (P0)

- [ ] 1.1 Define `Conversation` model in `models/conversation.ts` — `{ id, userName, title, createdAt, updatedAt, messages: ChatMessage[] }`.
- [ ] 1.2 Create `ChatHistoryService` with localStorage backend — key `uxreach.chat.history.v1.{userName}`; debounced write on message update.
- [ ] 1.3 Strip transient fields (`isTyping`, in-flight `sendingProgress` rows still updating) before persisting; `studyProgress` payloads are preserved verbatim.
- [ ] 1.4 On `ChatEngineService.initChat()`, if history exists for current user, restore the last-active conversation instead of emitting a fresh welcome card.
- [ ] 1.5 Every bot/user message push bumps the current conversation's `updatedAt` and persists.
- [ ] 1.6 Auto-derive conversation title from the first user message (≤40 chars, trimmed on word boundary); fall back to "New chat" until a user message arrives.

## 2. Conversation Sidebar & Controls (P0)

- [ ] 2.1 Create `ChatHistorySidebarComponent` — collapsible panel listing conversations bucketed by Today / Yesterday / Earlier.
- [ ] 2.2 "New chat" button at the top of the sidebar creates a fresh conversation and empties the message surface.
- [ ] 2.3 Selecting a past conversation restores it into the surface (read + append mode; new messages land in the selected conversation).
- [ ] 2.4 Per-row delete button (trash icon, confirm-on-click) and a "Clear all" affordance at the bottom of the sidebar (confirm modal).
- [ ] 2.5 Keyboard: `Cmd/Ctrl+Shift+O` opens the sidebar; `Esc` closes.
- [ ] 2.6 Sidebar integrates into `chat-screen.component.html` behind a toggle button in the chat header.

## 3. Chat UX Features (P1)

- [ ] 3.1 Render timestamps on every message in `chat-message.component.ts` — relative ("just now" / "2m ago" / "1h ago" / day) with full absolute timestamp in `title` tooltip.
- [ ] 3.2 Hover-only "Copy" action on bot messages; strips HTML to plain text using a lightweight DOMParser pass.
- [ ] 3.3 Keyboard shortcuts in `chat-input-bar.component.ts`: `Enter` sends, `Shift+Enter` newline, `ArrowUp` on empty input populates the last user message for edit, `Cmd/Ctrl+K` focuses input from anywhere in the chat screen, `Esc` closes any open picker.
- [ ] 3.4 Create `ChatSearchBarComponent` — filter input in the chat header; highlights (yellow background) messages in the active conversation whose plain-text content matches.
- [ ] 3.5 Ensure search + restored conversations respect the existing auto-scroll behavior (pause scroll while searching).

## 4. Frontend Guardrails (P0)

- [ ] 4.1 Define `GuardrailRule` model in `models/guardrail-rule.ts` — `{ id, category, pattern: RegExp, refusal: string, suggestion?: string }`.
- [ ] 4.2 Create `GuardrailsService.check(prompt: string): GuardrailDecision` — iterates rules, returns `{ allowed: true }` or `{ allowed: false, refusal, category, id }` on first match.
- [ ] 4.3 Encode all 20 refusal rules from the stakeholder matrix as a `GUARDRAIL_RULES` array, using the exact refusal text from the sheet (e.g. "Sorry, I am not allowed to modify the template" for template edits).
- [ ] 4.4 In `ChatEngineService.processCommand`, run the guardrail check first. On refusal, emit a bot message tagged as `query` agent with the refusal text, log to audit, and return without invoking any agent.
- [ ] 4.5 Extend `AuditService` with a `recordRefusal(category, prompt)` method and a new `RefusalRun` type so refusals appear on the audit screen.
- [ ] 4.6 Add a guarded "Test guardrails" dev affordance (hidden behind a chat slash command like `/test-guardrails`) that runs the 20 canonical prompts through the classifier and prints pass/fail inline. Useful for demos.
- [ ] 4.7 Unit test as an in-file `if (!environment.production) { /* assertions */ }` block inside `guardrails.service.ts` — asserts each canonical prompt → rule match. Runs at service instantiation in dev mode only.

## 5. Integration & Regression

- [ ] 5.1 Ensure guardrail layer runs BEFORE the picker-open / state transition handlers, so even a refused phrase ("modify template") during an awaiting-confirm state still triggers refusal without breaking confirmation state.
- [ ] 5.2 Confirm `StudyProgress` payloads survive round-trip through localStorage (JSON serialization — no Date objects in the funnel payload).
- [ ] 5.3 Regression: Invite flow, study progress picker, funnel rendering, agent badges, retry/cache/synthesis fallback all still work end-to-end.
- [ ] 5.4 Storage versioning: key includes `.v1`; write a migration stub that drops unknown versions on read.
- [ ] 5.5 Size cap: if localStorage has >200 conversations, evict oldest on write.

## 6. Verification

- [ ] 6.1 Browser: send a prompt, reload, confirm history restores with the last conversation active.
- [ ] 6.2 Browser: create three conversations across different prompts, confirm sidebar groups them correctly and click-to-restore works.
- [ ] 6.3 Browser: run each of the 20 canonical refusal prompts and confirm the documented refusal text renders verbatim with the Query Agent badge, and shows up in audit.
- [ ] 6.4 Browser: test each keyboard shortcut.
- [ ] 6.5 Browser: search highlights only matches in the active conversation, is case-insensitive.
- [ ] 6.6 `ng serve` clean rebuild after all changes; chunk growth reasonable (expect +20–35 kB over current baseline).
