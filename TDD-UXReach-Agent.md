go/uxreach-agent

Technical Design Doc | UXReach — Invite & Daily-Update Agent for UXR Study Lifecycle



Date of Document creation: 04-28-2026

Last update on: 04-28-2026

Author: Aakash R (Dev Lead, xWF) · Vinothkumar D (xWF) · Shubham Kapadia (xWF)

Version: 1.0


Project Overview
UXReach is an AI-powered, two-agent system that automates **Step 07 (Invitations & Scheduling)** of the UXR study lifecycle for the Google UX Ads team at Cognizant. It replaces the manual, recruiter-driven workflow of triaging shortlisted candidates, drafting personalised invite emails, sending them in batches, and tracking participant status with two co-operating sub-agents:

1. **Invite Agent** — an action agent that converts a typed RC instruction (e.g. "send 10 invites for study 1234567 from Japan") into a confirmation card, an audited Salesforce write, and a per-candidate email batch.
2. **Daily Update Agent (Query Agent)** — a read-only agent that answers participant-tracking questions ("who responded for study 1234567?", "study progress 7654321") and renders a five-stage funnel (Invited → Responded → Booked → ICF Signed → Confirmed).

A deterministic frontend **Guardrails Service** sits in front of both agents and enforces the 20 refusal scenarios documented in `Agent-Capabilities-Full-List.md`, so unsafe requests (template edits, ownership changes, candidate deletions, PII export, etc.) are refused offline with the canonical text.

Problem Statements
The current Step 07 workflow is manual end-to-end. Each Recruiter Coordinator (RC) spends an average of **~7.5 hours per study** on:

- Pulling shortlisted candidates from the Shortlisting App and cross-referencing with Salesforce.
- Drafting study-specific invite copy from a template kept in Drive.
- Sending invites one-by-one to remain within compliance and avoid "send all" gaffes.
- Tracking responses, booked slots, ICF signatures, and confirmations across Salesforce, Calendar, and Sheets.
- Composing a daily End-of-Day status update for the UXR team.

This is time-consuming, error-prone (especially around the **P0-first-20** policy and cross-RC sends), and diverts RC time from higher-value activities like screener calibration and stakeholder management. UXReach addresses this by automating the invite pipeline, giving the RC a single chat surface for both action and status, and locking unsafe requests behind a deterministic refusal layer.

Success Criteria
**Time savings.** Reduce per-study Step 07 effort from ~7.5 hours to ~3.0 hours — a **2.5× speedup** with **2.9× ROI** vs. the manual baseline (per Apr-2026 Dev Sync targets).

**Refusal accuracy.** All 20 documented refusal scenarios SHALL render the canonical text verbatim, regardless of backend availability. Validated by dev-mode self-check at service init and by SME review during weekly demos. Target: **100% rule coverage**, **0 silent backend fall-throughs**.

**Funnel data freshness.** Study Progress queries SHALL return the live funnel within 2 s when the backend is reachable, or a synthesized funnel from local study state with a clear "synthesized" banner when not. Target: **≥ 95% of queries served within SLA**.

**Demo readiness with offline mode.** Stakeholder demos SHALL work even when the backend is unavailable — Invite Agent flows fall back to a local send simulation, Query Agent intents fall back to cached snapshots with timestamp banners or local synthesis. Target: **0 demo-stopping errors when `:8000` is down**.

**Successful Quarterly Refresh.** Salesforce schema, study allow-list, and Looker dashboards must roll over with the next UXR planning cycle without code changes — only data/config updates.

Tech Stack
Frontend
- Angular 21 (standalone components, signals)
- Angular Forms (reactive + template-driven for picker)
- RxJS 7.8 with `retry({ count, delay })` for Query Agent resilience
- Material Symbols icon font
- localStorage (chat history, query cache)

Backend
- Python 3.10+
- FastAPI 0.115 + Uvicorn 0.31
- Pydantic 2.9
- google-generativeai 0.8.3 (Gemini SDK)
- google-auth 2.37 (Google Sign-In ID-token verification)
- python-dotenv 1.0

Data & AI
- Gemini 2.5 Flash (default) — model id pinned in `backend/.env` via `GEMINI_MODEL`
- Vertex AI / Gemini API (planned: Gemini 3.1 Pro per Apr-2026 Dev Sync)
- Salesforce — system of record (read + write only, no delete)
- Looker Studio — VoS-style overview dashboard (TBD)
- Google Sheets / Drive — daily summary archive (TBD)

Auth & infra
- Google Sign-In (OAuth 2.0 web client)
- ALLOWED_USERS allowlist (in `backend/app/services/mock_data.py`, mirrored to admin screen)
- Local dev: `ng serve` :4200 + `uvicorn` :8000, proxied via `proxy.conf.json`

Architecture Diagram

```
                        ┌────────────────────────────────────────┐
                        │              RC (User)                 │
                        │   Chrome browser · Google account      │
                        └──────────┬─────────────────────────────┘
                                   │ HTTPS (Google Sign-In ID token)
                                   ▼
                ┌──────────────────────────────────────────────┐
                │          Angular 21 Frontend (:4200)         │
                │                                              │
                │  ┌─────────────┐   ┌──────────────────────┐  │
                │  │   Chat UI   │←─►│ ChatEngineService    │  │
                │  │  (signals)  │   │  ┌────────────────┐  │  │
                │  └─────────────┘   │  │ Guardrails     │←─┼──┼─ 20-rule denylist (offline)
                │                    │  │ Service        │  │  │
                │  ┌─────────────┐   │  └────────────────┘  │  │
                │  │ Study       │←─►│  ┌────────────────┐  │  │
                │  │ Picker      │   │  │ Routing        │  │  │
                │  └─────────────┘   │  │ (AgentType)    │  │  │
                │                    │  └────────────────┘  │  │
                │  ┌─────────────┐   │                      │  │
                │  │ Funnel      │←──┤  ┌────────────────┐  │  │
                │  │ Component   │   │  │ ChatHistory    │←─┼──┼─ localStorage (per-user)
                │  │             │   │  │ Service        │  │  │
                │  └─────────────┘   │  └────────────────┘  │  │
                │                    └──────────────────────┘  │
                └──────────┬───────────────────────────────────┘
                           │  /api/* (relative URL, dev proxy)
                           ▼
                ┌──────────────────────────────────────────────┐
                │       FastAPI Backend (:8000) — Uvicorn      │
                │                                              │
                │  /auth/google     /studies/{id}/progress     │
                │  /chat/message    /send/start, /progress     │
                │  /audit/runs      /settings/welcome          │
                │                                              │
                └──────────┬─────────────────┬─────────────────┘
                           │                 │
                           ▼                 ▼
                ┌────────────────────┐  ┌────────────────────────┐
                │   Gemini API       │  │   Salesforce           │
                │   (2.5 Flash now;  │  │   (system of record    │
                │    3.1 Pro target) │  │    for studies + cases)│
                └────────────────────┘  └────────────────────────┘
                           │
                           ▼
                  ┌─────────────────────┐
                  │  Looker Studio /    │
                  │  Google Sheets      │
                  │  (analytics + EOD)  │
                  └─────────────────────┘
```

Solution Steps:

**Sign-in & session bootstrap**
1. RC opens http://localhost:4200/ → Google Sign-In overlay appears.
2. Frontend posts the ID token to `POST /api/auth/google` → backend verifies via `google-auth`, looks up email in `ALLOWED_USERS`, returns `{ name, email, role }`.
3. Frontend stores user identity in `AppStateService` signals (`userName`, `userEmail`, `userRole`); `ChatHistoryService` rehydrates conversations from `localStorage` keyed on `userName`.

**Conversation start**
4. `ChatEngineService.initChat()` checks `ChatHistoryService.activeConversation()`. If a prior conversation exists with messages, it's restored verbatim. Otherwise a new conversation is created and the welcome card is emitted with the six starter buttons (Send invites / Schedule / Study progress / Invites remaining / Today's summary / My studies).

**Per-message processing**
5. RC types a prompt or clicks an action button. `chat-input-bar.component` emits the trimmed text to `chat-screen.component` which calls `chatEngine.processCommand(text)`.
6. **Guardrails first.** `GuardrailsService.check(prompt)` runs an ordered regex pass over 20 rules (template edits, assignment, ownership change, bulk override, deletion, eligibility override, study lifecycle, PII export, study creation, incentive change, candidate reply, schedule reassignment, slot availability, attendance override, daily-update template, external recipient, credentials, out-of-scope query, forecasting, escalation). On a match, the canonical refusal text renders with the **Query Agent** badge, audit logs the refusal, and processing returns. **No backend call is ever made for refused prompts.**
7. **Stateful command handlers.** Confirm/cancel during `awaiting_confirm`, picker triggers (`open_study_picker`, `open_study_progress_picker`, `open_schedule_picker`), schedule regex (`tomorrow at 9am`-style), picker-output formats (`Send invites: N for study X, …`, `Study progress: <id>`), multi-study compound, single invite + filters, status lookup, daily summary, pending studies, failure report, invites remaining, scheduled query, my studies, help, greeting.
8. **Agent routing.** Anything not handled above goes through `determineAgent(prompt)` (in `models/agent-type.ts`) which classifies into `invite | query | scheduler | unknown` based on an ordered keyword ruleset.
9. **Query Agent dispatcher.** `dispatchQueryAgent(lower, original, intent)` routes the six query intents:
   - `progress` → `handleStudyProgressQuery(studyId)` → `api.getStudyProgress()` with retry → cache → **local synthesis from `StudyService.synthesizeProgress()`** → fallback to text Q&A.
   - `responses | bookings | icf | reminders | confirmed` → `handleQueryAgentChat(refinedPrompt, studyId, intent)` → `api.sendMessage()` with retry → cache → friendly error with Retry button.
   - Free-text fallback → `api.sendMessage(rawPrompt)`.

**Invite Agent flow**
10. `handleInviteFlow(studyId, count)` validates the study exists and is owned by the current RC (`ownerRC === userName`). If not, the Cross-RC gate fires — refuses outright if `allowCrossRcSend` is false, or shows a confirmation card otherwise.
11. `showSendConfirmation()` renders the **Invite Agent**-badged card with study, researcher, sending count, already-sent / required, after-batch remaining.
12. On Send, `SendingService.startSending()` calls `POST /api/send/start`. On success, polls `GET /api/send/progress/{sessionId}` once per second; on failure, falls back to a local 500ms-per-candidate simulation that updates the same UI.
13. On completion, `studyService.updateStudySent()` writes the count locally, `auditService.addRun()` records the run, `appState.bumpStudyListVersion()` triggers picker refresh, the progress message is marked complete, and a summary card renders. Multi-study queues iterate to the next study automatically.

**Daily Update Agent flow**
14. `handleStudyProgressQuery(studyId)` calls `GET /api/studies/{id}/progress` with `retry({ count: 1, delay: 2000 })`. On success, the funnel renders inline via `<app-study-progress>` with five tone-coded stages (Invited blue → Responded cyan → Booked violet → ICF Signed amber → Confirmed green) plus an optional "needs attention" footer. The structured payload is cached in `AppState.queryCache` keyed on `studyId:intent`.
15. On failure, the cache is consulted; if a prior snapshot exists, it renders with a **"Last updated HH:mm — live status unavailable"** amber banner.
16. If no cache exists, `StudyService.synthesizeProgress(id)` derives a plausible funnel from `alreadySent` using fixed ratios (60% / 45% / 32% / 25%) and renders it with a **"Backend unavailable — synthesized funnel from local study state"** banner. Demo never blocks.

**Persistence**
17. Every push to `messages` triggers a debounced (300 ms) write through `ChatHistoryService.persistNow()` into localStorage. Transient fields (`isTyping`, in-flight `sendingProgress`) are stripped before serialization. Conversation auto-titles from the first user prompt (≤40 chars, word-boundary cut).

**Audit + observability**
18. Every send produces an `AuditRun` row (id, studyId, studyName, date, RC, sent, failed, duration, SLA bool). Every refusal produces a `RefusalEntry` (id, timestamp, category, ruleId, prompt, userName). Both are signal-backed and surfaced on the Audit screen.

Input Data segregation:

**Study ownership routing (RC scope)**
- `ownerRC === appState.userName()` → study is visible in pickers, dashboards, and queries.
- `ownerRC !== appState.userName()` → study is hidden from `getStudiesForRC` / `getActiveStudiesForRC` / `getAllStudies` (see `study.service.ts` `visibleStudies()`).
- Direct `getStudy(id)` returns `undefined` for cross-RC studies; the Cross-RC confirmation flow is the only path that surfaces them, gated by `allowCrossRcSend` in `AppStateService`.

**Active vs. all studies**
- Invite Picker uses `getActiveStudiesForRC()` (only studies with `totalRequired - alreadySent > 0`).
- Study Progress Picker uses `getStudiesForRC()` (all studies the RC owns, regardless of remaining count) so RCs can review fully-completed studies too.

**P0 routing (per Apr-2026 policy)**
- Invite Agent processes only the **first 20 newly-shortlisted P0 candidates per run**. Larger requests trigger the Bulk-Override guardrail with the canonical refusal "I can only process the first 20 newly shortlisted P0 candidates per run — please contact your team lead to override".
- `study.p0Ready` and `study.p0NewlyMarked` are read-only display fields on the dashboard; they are not user-editable.

**Filter parsing**
- `studyService.parseFilters(text)` extracts `countries[]` and `customerTypes[]` from a freeform suffix using `COUNTRY_ALIASES` and `CUSTOMER_TYPE_ALIASES` maps. Example: `"send 5 invites for study 1234567 from India, large enterprise"` → `{ countries: ['India'], customerTypes: ['Large Enterprise'] }`.
- Aliases are sorted longest-first to avoid prefix collisions.
- If filters yield zero candidates, the Filtered Send flow renders a "no matches — what's available" breakdown chart instead of failing silently.

**Logic for identifying SMB / Field cases**
- Mirroring the VoS pattern, the Salesforce study record carries `ownerRC`, `researcher`, `totalRequired`, `alreadySent`, `lastRun`, `newResponses`, `p0Ready`, `p0NewlyMarked`.
- Salesforce is the source of truth; `studies.data.ts` is the offline fallback set used when `GET /api/studies` errors.

Note: Important links

Salesforce study & case object: Link removed
Backend API: http://localhost:8000/docs (interactive)
Frontend dev server: http://localhost:4200/
Refusal matrix (20 scenarios): Agent-Capabilities-Full-List.md
Repo: https://github.com/AakashRaj-AidenAi/UX-reach (branch `latest_poc`)
Active OpenSpec proposals: openspec/changes/
Shipped OpenSpec proposals: openspec/changes/archive/

Data Storage:

**Salesforce (system of record).**
All study records, case records, and per-candidate invite history are written to Salesforce. UXReach has read + write access only — **no delete**. The Candidate-Deletion guardrail enforces this client-side; the backend has no delete endpoints.

**localStorage (per-user, per-browser).**
Chat conversations persist under `uxreach.chat.history.v1.<userName>` with a 200-conversation cap (oldest evicted on overflow). Transient UI state (typing indicators, in-flight progress bars) is stripped before persistence. Query Agent responses are cached in `AppState.queryCache` keyed by `studyId:intent` for offline fallback. Auth identity (`userName`, `userEmail`, `userRole`) and feature flags (`allowCrossRcSend`) live in signal-backed in-memory state, **not persisted**.

**FastAPI in-memory state.**
The backend keeps active send sessions and the user allowlist in memory (`mock_data.py`). Restarting uvicorn drops the allowlist — production will move this to a managed store (TBD: GCP Datastore or Cloud SQL).

**Audit log.**
`AuditService.runs` (sends) and `AuditService.refusals` are signal-backed in-memory lists with the last 200 entries each. They survive page navigation but reset on full reload — production target is to persist into Salesforce custom objects on each event.

**No PII export.**
The PII-Export guardrail blocks any "export candidate emails / give me list of emails" prompt with the canonical refusal. There is no UI surface to download candidate lists.

**Refresh / overwrite cadence.**
- Studies refresh on app load via `GET /api/studies` (with `studies.data.ts` fallback).
- Audit runs refresh on Audit screen mount.
- Chat conversations are append-only until the user explicitly deletes via the Chat Switcher → trash icon, or **Clear all**.

Frontend Guardrails (defense-in-depth)

A separate, deterministic refusal layer sits in front of both agents. The 20 rules are encoded as a static `GUARDRAIL_RULES: GuardrailRule[]` array in `services/guardrails.service.ts` with first-match-wins semantics. Each rule carries:

- `id` (e.g. `email-template`, `bulk-override`, `pii-export`).
- `category` — one of 20 `GuardrailCategory` literals.
- `pattern` — case-insensitive regex tuned against the canonical prompts.
- `refusal` — the verbatim text from `Agent-Capabilities-Full-List.md`.

**Self-check at startup.** In `isDevMode()`, the constructor runs `devSelfCheck()` against 20 canonical prompts and asserts each routes to its expected rule id. Mismatches are printed as `console.warn`; success prints `[guardrails] Self-check passed — all 20 canonical prompts match their expected rules`.

**Audit on refusal.** Every blocked prompt is recorded via `AuditService.recordRefusal(category, ruleId, prompt, userName)` so SMEs can spot-check refusal hit-rate over time.

**Backend independence.** Guardrails fire identically whether `:8000` is up or not. This is the **single biggest reason** stakeholders should trust the demo offline.

**Defense-in-depth, not replacement.** The backend Gemini system prompt also enforces refusals as a second layer. Frontend guardrails catch the easy 20; the LLM catches the long tail.

Feedback for Continuous Improvement

**Weekly SME spot-check.** Each week the team samples ~25 chat transcripts from the audit log and reviews:
- Were any refusals miscategorized? (rule precision)
- Did any unsafe prompt slip through? (rule recall)
- Were funnel numbers in the user's mental model? (Query Agent accuracy)
- Did the agent badges feel right? (Invite vs. Query vs. Scheduler attribution)

Findings are converted into rule tweaks, prompt refinements, or new OpenSpec proposals under `openspec/changes/`.

**OpenSpec change-management.** Every behavior change is gated by a proposal in `openspec/changes/<change-id>/` containing `proposal.md`, `tasks.md`, and capability `specs/`. Shipped changes archive into `openspec/changes/archive/`. This gives SMEs and Legal a written before/after trail per rollout.

**Quarterly Gemini refresh.** Every quarter we re-evaluate `GEMINI_MODEL` against a fixed eval set (50 representative RC prompts). The current default is `gemini-2.5-flash`; the upgrade target per the Apr-2026 Dev Sync is **Gemini 3.1 Pro on Vertex AI**.

**Demo-day metrics.** Each stakeholder demo records:
- Number of refusal scenarios exercised.
- Number of "Could not reach the server" errors (target: 0).
- Number of synthesized-funnel banners shown (informs whether the offline fallback is firing too often → backend reliability work).
- Time-to-send for a representative 10-candidate batch.

**Glossary**

| Term | Meaning |
|---|---|
| RC | Recruiter Coordinator — the primary user persona |
| UXR | UX Researcher — the study owner |
| ICF | Informed Consent Form — required signature before research session |
| P0 | Highest-priority candidate tier marked by UXR |
| Step 07 | The "Invitations & Scheduling" step of the UXR study lifecycle |
| Cross-RC | Sending invites for a study owned by a different RC |
| EOD | End-of-Day daily summary update for the UXR team |
| Funnel | Five-stage participant tracking: Invited → Responded → Booked → ICF Signed → Confirmed |
