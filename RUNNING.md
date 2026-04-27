# Running UXReach

Complete setup + run guide for the UXReach AI Invite Email Agent — an Angular frontend + FastAPI backend POC for the Google UX Ads team at Cognizant.

---

## 1. What's in the repo

| Path | Purpose |
|---|---|
| `uxreach-app/` | Angular 21 frontend (chat UI, dashboard, audit, admin, settings) |
| `backend/` | FastAPI backend (Gemini LLM + mock Salesforce + auth allowlist) |
| `openspec/` | Spec-driven change proposals (`changes/` active, `changes/archive/` shipped) |
| `Agent-Capabilities-Full-List.md` | Refusal matrix — the 20 documented scenarios the agent MUST refuse |
| `TDD-Technical-Design-Document.md` | Technical design |
| `POC Screenshots/`, `*.pptx`, `*.html` | Stakeholder demos |

---

## 2. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 20.x or 22.x (LTS recommended) | `node --version` |
| npm | ≥ 10.x (bundled) | `npm --version` |
| Python | ≥ 3.10 | `python --version` |
| pip | bundled with Python | `pip --version` |
| Git | any recent | `git --version` |

> **Note on Node 24:** Angular 21 is officially tested against Node 20/22. Node 24 may work, but if `npm install` or `npm start` throws `primordials is not defined`, downgrade via `nvm-windows` to Node 22 LTS.

---

## 3. First-time setup

### 3a. Clone & checkout

```
git clone https://github.com/AakashRaj-AidenAi/UX-reach.git
cd UX-reach
git checkout latest_poc
```

> **Known gotcha on Windows:** the remote has two branches that differ only in case (`V1.0_auth1` / `v1.0_auth1`). `git pull` prints a warning — non-blocking, doesn't affect your branch. See §8.

### 3b. Backend `.env`

Create `backend/.env` (do not commit). Three values needed:

```
GEMINI_API_KEY=<your Gemini API key>
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_CLIENT_ID=<your Google OAuth web client ID>
```

- `GEMINI_API_KEY` — required for free-text Q&A and Gemini-backed query intents (responses, bookings, ICF, reminders, confirmed). Without it, the backend runs but `chat/message` returns `not_configured`.
- `GEMINI_MODEL` — defaults to `gemini-2.5-flash` if omitted.
- `GOOGLE_CLIENT_ID` — required for Google Sign-In on the login overlay; allowlist lives in `backend/app/services/mock_data.py` (`ALLOWED_USERS`).

### 3c. Backend deps

```
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
```

### 3d. Frontend deps

```
cd ../uxreach-app
npm install
```

### 3e. Dev proxy (so the frontend can reach the backend)

The frontend uses a **relative** `/api` base URL (`uxreach-app/src/app/services/api.service.ts`). For local dev with `ng serve` and `uvicorn` on different ports, create `uxreach-app/proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:8000",
    "secure": false,
    "changeOrigin": true
  }
}
```

Then start the frontend with `npm start -- --proxy-config proxy.conf.json` (or commit the proxy file and update the `start` script in `package.json`).

> Cloud Shell / hosted demos serve frontend + backend behind one origin, so the relative path works as-is — no proxy needed.

---

## 4. Run the two servers

Open **two terminals** from the repo root.

### Terminal 1 — backend (port 8000)

```
cd backend
.venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Health: http://localhost:8000/api/health  ·  Docs: http://localhost:8000/docs

### Terminal 2 — frontend (port 4200)

```
cd uxreach-app
npm start -- --proxy-config proxy.conf.json
```

App: http://localhost:4200/

---

## 5. Offline / backend-down mode (demo-safe)

The frontend is built to stay useful when the backend is unreachable:

| Feature | Offline behavior |
|---|---|
| Login | Google Sign-In requires backend; without it, you can't enter the app unless auth is bypassed in dev mode |
| Study list | Falls back to mock data in `uxreach-app/src/app/mock-data/studies.data.ts` |
| `study progress <id>` | Synthesizes a plausible funnel from `alreadySent` (60% responded / 45% booked / 32% ICF / 25% confirmed) with an amber "Backend unavailable — synthesized funnel" banner |
| Other Query Agent intents (responses / bookings / ICF / reminders / confirmed) | Retry once with 2s backoff, then serve cached snapshot with timestamp banner; empty cache → friendly error + Retry button |
| Refusal scenarios | 100% client-side via `GuardrailsService` — all 20 documented refusals fire offline with the canonical text from `Agent-Capabilities-Full-List.md` |
| Invite send | Falls back to a local simulation (one-per-500ms) if `POST /api/send/start` fails |
| Chat history | Persists in `localStorage` keyed by `uxreach.chat.history.v1.<userName>`; survives reloads |
| Chat switcher | Header pill + popover with Today / Yesterday / Earlier buckets, New chat, per-row delete, Clear all — works fully offline |
| Study notes editor (EOD) | Renders inline editable notes when the bot returns `studyNotes` payload; "Post one" / "Post all" actions hit the backend when reachable |

---

## 6. Common commands

### Frontend

```
cd uxreach-app
npm start                                       # dev server on :4200
npm start -- --proxy-config proxy.conf.json     # with backend proxy
npm run build                                   # prod bundle to dist/
npm test                                        # ng test (no harness yet — no-op)
```

### Backend

```
cd backend
uvicorn main:app --reload --port 8000
uvicorn main:app --reload --port 8000 --host 0.0.0.0    # expose on LAN
pytest tests/                                          # if tests exist
```

### OpenSpec

```
openspec/
├── changes/
│   ├── add-chat-history-and-guardrails/    # active
│   └── archive/
│       └── enhance-query-agent-ui/          # shipped
└── specs/
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

### `Could not reach the server. Please check the backend is running on localhost:8000.`

The backend is down or the proxy isn't wired up. Either start uvicorn (§4) or set up `proxy.conf.json` (§3e). Most features (study progress, refusals, send simulation, history) keep working without the backend.

### `primordials is not defined`

Stale `node_modules` against your current Node version. Fix:

```
cd uxreach-app
rmdir /s /q node_modules
del package-lock.json
npm install
```

If it still fails on Node 24, downgrade to Node 22 LTS via [nvm-windows](https://github.com/coreybutler/nvm-windows/releases).

### `git pull` warns about case-insensitive filesystem

Remote has duplicate-cased branches (`V1.0_auth1` vs `v1.0_auth1`). Windows can't store both as separate refs in the default `files` backend. Doesn't affect your branch — ignore. If you want it gone: `git push origin --delete v1.0_auth1` (only if confirmed it's a typo).

### Component update failed in the browser console

Angular HMR occasionally chokes on new fields. Hard-refresh (Ctrl+Shift+R).

### Port 4200 already in use

Stop the other process or use `npm start -- --port 4201`.

### Backend health: `gemini: not_configured`

`backend/.env` missing or `GEMINI_API_KEY` is the placeholder. Fix and restart uvicorn.

### Chat history not restoring after reload

localStorage is per-origin + per-userName. Different signed-in user → different history. Clear via the chat switcher → **Clear all**, or in devtools → Application → Local Storage → `uxreach.chat.history.v1.*`.

---

## 9. Directory layout (essentials)

```
UXReach/
├── uxreach-app/
│   └── src/app/
│       ├── features/
│       │   ├── chat/                     # chat screen, switcher popover, message, pickers, funnel, notes editor
│       │   ├── dashboard/
│       │   ├── audit/
│       │   ├── admin/                    # user allowlist management
│       │   └── settings/
│       ├── layout/                       # main sidebar, login overlay, toast
│       ├── models/                       # chat, study, agent-type, guardrail-rule, conversation, study-progress, user
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

## 10. Smoke-test checklist (after setup)

1. Open http://localhost:4200/ → login overlay appears.
2. Sign in with a Google account in `backend/app/services/auth_service.py` allowlist (or use the admin screen to add yours).
3. Welcome card renders with Send invites / Schedule / Study progress buttons.
4. Click **Study progress** → picker opens in single-select radio mode → pick a study → funnel renders with 5 stages.
5. Type `send 10 invites for study 1234567` → confirmation card with **Invite Agent** badge.
6. Type `modify the email template` → refusal "Sorry, I am not allowed to modify the template" — works even with backend stopped.
7. Header **chat switcher pill** → click → past conversations grouped by Today / Yesterday / Earlier.
8. `Ctrl+Shift+O` → popover opens from anywhere.
9. Reload page → last conversation restores; welcome card does not re-emit.
10. Devtools console on load: `[guardrails] Self-check passed — all 20 canonical prompts match their expected rules`.

---

## 11. Where to ask

- Refusal matrix / agent boundaries → `Agent-Capabilities-Full-List.md`
- Technical design → `TDD-Technical-Design-Document.md`
- Active/shipped changes → `openspec/changes/` and `openspec/changes/archive/`
- Team: Aakash R (Dev Lead), Vinothkumar D (Python/UI), Shubham Kapadia (UI/Frontend)
