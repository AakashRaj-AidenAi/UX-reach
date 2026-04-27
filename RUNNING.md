# Running UXReach

Complete setup + run guide for the UXReach AI Invite Email Agent — an Angular frontend + FastAPI backend POC for the Google UX Ads team at Cognizant.

---

## 1. What's in the repo

| Path | Purpose |
|---|---|
| `uxreach-app/` | Angular 21 frontend (chat UI, dashboard, audit, settings) |
| `backend/` | FastAPI backend (Gemini LLM + mock Salesforce) |
| `openspec/` | Spec-driven change proposals (`changes/` active, `changes/archive/` shipped) |
| `Agent-Capabilities-Full-List.md` | Refusal matrix — the 20 documented scenarios the agent MUST refuse |
| `TDD-Technical-Design-Document.md` | Technical design |
| `POC Screenshots/`, `*.pptx`, `*.html` | Stakeholder demos |

---

## 2. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | ≥ 20.x | `node --version` |
| npm | ≥ 10.x (bundled) | `npm --version` |
| Python | ≥ 3.10 | `python --version` |
| pip | bundled with Python | `pip --version` |
| Git | any recent | `git --version` |

Platform: tested on Windows 11. All paths in this guide use forward slashes; Windows PowerShell/cmd accept them too.

---

## 3. First-time setup

### 3a. Clone & pull

```
git clone https://github.com/AakashRaj-AidenAi/UX-reach.git
cd UX-reach
git checkout V1.0
```

> **Known gotcha on Windows:** the remote has two branches that differ only in case (`V1.0_auth1` / `v1.0_auth1`). Git prints a warning during `git pull` — it's non-blocking and doesn't affect `V1.0`. See §8 troubleshooting.

### 3b. Backend environment (`.env`)

Create `backend/.env` with three values. Copy from the team's password vault or from another dev — do not commit this file.

```
GEMINI_API_KEY=<your Gemini API key>
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_CLIENT_ID=<your Google OAuth web client ID>
```

- `GEMINI_API_KEY` — required for the Query Agent (participant Q&A endpoint). Without it the backend runs but `chat/message` returns a "not_configured" health status.
- `GEMINI_MODEL` — defaults to `gemini-2.5-flash` if omitted.
- `GOOGLE_CLIENT_ID` — required for Google Sign-In on the login overlay.

### 3c. Install backend dependencies

```
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

### 3d. Install frontend dependencies

```
cd ../uxreach-app
npm install
```

---

## 4. Run the two servers

Open **two terminals** from the repo root.

### Terminal 1 — backend (port 8000)

```
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Health check: http://localhost:8000/api/health

Interactive API docs: http://localhost:8000/docs

### Terminal 2 — frontend (port 4200)

```
cd uxreach-app
npm start
```

App: http://localhost:4200/

The frontend auto-proxies HTTP calls to `http://localhost:8000/api` (hardcoded in `src/app/services/api.service.ts`). If you run the backend on a different port, edit `baseUrl` there.

---

## 5. Offline / backend-down mode (demo-safe)

The frontend is designed to stay useful even when the backend is unreachable:

| Feature | Offline behavior |
|---|---|
| Study list | Falls back to mock data in `uxreach-app/src/app/mock-data/studies.data.ts` |
| `study progress <id>` | Synthesizes a plausible funnel from local `alreadySent` using deterministic ratios (60% responded / 45% booked / 32% ICF / 25% confirmed) with an amber "Backend unavailable — synthesized funnel" banner |
| Query Agent responses | Retries once with 2s backoff, then serves the cached snapshot with a "Last updated HH:mm" banner; empty cache shows a Retry button |
| Refusal scenarios | 100% enforced client-side by `GuardrailsService` — the 20 documented refusals fire offline with the canonical text (see `Agent-Capabilities-Full-List.md`) |
| Invite send | Falls back to a local simulation (candidate-per-500ms ticker) if `POST /api/send/start` fails |
| Chat history | Persists to `localStorage` (key: `uxreach.chat.history.v1.<userName>`); survives reloads |

---

## 6. Common commands

### Frontend

```
cd uxreach-app
npm start                # dev server on :4200 (watch mode)
npm run build            # production build to dist/
npm test                 # ng test (no test harness configured yet — will no-op)
```

### Backend

```
cd backend
uvicorn main:app --reload --port 8000
uvicorn main:app --reload --port 8000 --host 0.0.0.0    # expose on LAN
pytest tests/                                          # if any tests exist
```

### OpenSpec (change management)

Proposals live in `openspec/changes/`; shipped changes get moved into `openspec/changes/archive/<change-id>/`.

```
openspec/
├── changes/
│   ├── add-chat-history-and-guardrails/    # active
│   └── archive/
│       └── enhance-query-agent-ui/          # shipped
└── specs/                                    # (empty today)
```

---

## 7. Keyboard shortcuts

| Keys | Action |
|---|---|
| `Enter` | Send message |
| `Shift + Enter` | Newline in input |
| `↑` (empty input) | Recall last user message for editing |
| `Ctrl/Cmd + K` | Focus chat input from anywhere |
| `Ctrl/Cmd + Shift + O` | Open the chat switcher popover |
| `Esc` | Close open popover / picker |

---

## 8. Troubleshooting

### "Could not reach the server. Please check the backend is running on localhost:8000."

The backend is down or on a different port. Options:
- Start it: `cd backend && uvicorn main:app --reload --port 8000`
- Or ignore — the frontend will synthesize funnels / serve cached responses. Refusals still work.

### `git pull` complains about case-insensitive filesystem

The remote has duplicate-cased branches (`V1.0_auth1` vs `v1.0_auth1`). Git can't track both locally on Windows. Options:
- **Ignore** — doesn't affect your branch. Safest.
- Fast-forward your current branch manually: `git merge --ff-only origin/V1.0`
- Delete the duplicate: `git push origin --delete v1.0_auth1` (only if you're sure it's a typo)

### "Component update failed" in the browser console after editing

Angular's HMR occasionally fails when new class fields are added. Full-refresh the tab (Ctrl+Shift+R) and it clears.

### `ng serve` port 4200 already in use

Something else is on :4200. Either stop it or use `npm start -- --port 4201`.

### Backend health says `gemini: not_configured`

`.env` missing or `GEMINI_API_KEY` is the placeholder. Fix in `backend/.env`, then restart uvicorn.

### Gemini API errors

If the model name changed: update `GEMINI_MODEL` in `.env`. Current default is `gemini-2.5-flash`.

### Chat history not restoring after reload

localStorage is per-origin + per-userName. If you sign in as a different user, you see that user's history. Clear via the chat switcher → **Clear all**, or via devtools → Application → Local Storage → `uxreach.chat.history.v1.*`.

---

## 9. Directory layout (essentials)

```
UXReach/
├── uxreach-app/
│   └── src/app/
│       ├── features/
│       │   ├── chat/                     # chat screen + components
│       │   ├── dashboard/
│       │   ├── audit/
│       │   └── settings/
│       ├── layout/                       # top-level sidebar, login overlay, toast
│       ├── models/                       # types: chat, study, agent-type, guardrail-rule, conversation, study-progress
│       ├── services/                     # chat-engine, chat-history, guardrails, study, sending, scheduler, audit, auth, api
│       └── mock-data/                    # fallback data when backend is offline
├── backend/
│   ├── main.py                           # FastAPI entry
│   ├── .env                              # secrets (gitignored)
│   ├── requirements.txt
│   └── app/
│       ├── routers/                      # auth, studies, chat, sending, audit, settings, participants, health
│       └── services/                     # auth, chat (Gemini), sending, study, mock_data
└── openspec/
    ├── changes/                          # active proposals
    └── changes/archive/                  # shipped proposals
```

---

## 10. Smoke test checklist (quick verification after setup)

1. Open http://localhost:4200/ → login overlay appears.
2. Sign in with a Google account registered in `backend/app/services/auth_service.py` allowlist.
3. Welcome card renders with "Send invites / Schedule / Study progress" buttons.
4. Click **Study progress** → picker opens in single-select radio mode → pick a study → funnel renders with 5 stages.
5. Type `send 10 invites for study 1234567` → confirmation card with **Invite Agent** badge.
6. Type `modify the email template` → refusal "Sorry, I am not allowed to modify the template" — verify this works even if you stop the backend.
7. Header **chat switcher** pill → click → past conversations listed with Today / Yesterday buckets.
8. `Ctrl+Shift+O` → popover opens from anywhere.
9. Reload page → last conversation restores; welcome card does not re-emit.
10. Devtools console on load: `[guardrails] Self-check passed — all 20 canonical prompts match their expected rules`.

---

## 11. Where to ask

- Refusal matrix / agent boundaries → `Agent-Capabilities-Full-List.md`
- Technical design → `TDD-Technical-Design-Document.md`
- Active/shipped changes → `openspec/changes/` and `openspec/changes/archive/`
- Team: Aakash R (Dev Lead), Vinothkumar D (Python/UI), Shubham Kapadia (UI/Frontend)
