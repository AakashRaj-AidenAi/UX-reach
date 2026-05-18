# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UXReach is an AI-powered invite email agent for Google UX Research. An RC (Research Coordinator) chats with the agent to send/schedule email invitations to study participants. Salesforce is the system of record; the app orchestrates participant status updates that trigger SF Record-Triggered Flows to send the actual emails.

## Local Development

**Backend (FastAPI, port 8080):**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

**Frontend (Angular 21, port 4200):**
```bash
cd uxreach-app
npm install
ng serve                       # proxy.conf.json auto-proxies /api → localhost:8080
```

The `proxy.conf.json` forwards all `/api/*` requests to `http://127.0.0.1:8080`, so no URL changes are needed between local and deployed environments.

## Deployment (GCP Cloud Run)

Both services run on Cloud Run. Deploy from Cloud Shell using `gcloud builds submit` (Docker push is blocked from Cloud Shell):

```bash
# Backend
gcloud builds submit ./backend \
  --tag us-central1-docker.pkg.dev/tough-zoo-475011-s6/uxreach/backend:latest
gcloud run deploy uxreach-backend \
  --image us-central1-docker.pkg.dev/tough-zoo-475011-s6/uxreach/backend:latest \
  --region us-central1 --platform managed \
  --min-instances=1 --no-cpu-throttling \
  --set-secrets="SF_CONSUMER_KEY=SF_CONSUMER_KEY:latest,SF_CONSUMER_SECRET=SF_CONSUMER_SECRET:latest,SF_INSTANCE_URL=SF_INSTANCE_URL:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest"

# Frontend
gcloud builds submit ./uxreach-app \
  --tag us-central1-docker.pkg.dev/tough-zoo-475011-s6/uxreach/frontend:latest
gcloud run deploy uxreach-frontend \
  --image us-central1-docker.pkg.dev/tough-zoo-475011-s6/uxreach/frontend:latest \
  --region us-central1 --platform managed --allow-unauthenticated
```

`--min-instances=1 --no-cpu-throttling` is required for the backend so APScheduler's background thread keeps running between requests.

Secrets (SF credentials, Google Client ID) live in GCP Secret Manager — not in `.env` for production. Local `.env` is only used for `seed_sf.py` and local development.

## Architecture

```
Angular 21 (SPA)  ──/api/──►  FastAPI backend  ──►  Salesforce REST API
                                     │
                                     └──►  Gemini (Vertex AI) — intent parsing
```

**Authentication flow:** Google Sign-In (frontend) → ID token sent to `POST /api/auth/google` → backend verifies via Google Auth library → checks `ALLOWED_USERS` in `mock_data.py` → returns user profile.

**Chat flow:** User types → `ChatEngineService` runs client-side guardrails (20 refusal rules in `guardrails.service.ts`) → if not refused, sends to `POST /api/chat/message` → backend parses intent (Gemini or regex fallback) → returns HTML response with action buttons → frontend renders and handles button actions.

**Invite send flow:** User picks study + count → frontend calls `POST /api/send/start` → backend fetches `Shortlisted` participants from SF → updates each one to `Invited` (500ms apart) → SF Record-Triggered Flow sends email per record → frontend polls `GET /api/send/progress/{sessionId}` for status.

**Scheduler flow:** Schedule picker emits UTC ISO string → chat engine stores UTC command, pre-fills input bar with IST display text → user clicks Send → `POST /api/send/schedule` → APScheduler fires at UTC time → same send flow as above.

## Key Architectural Decisions

**Dual data layer:** `study_service._merged_studies()` merges mock data (`mock_data.py`) with live SF data; SF always wins on conflict. `p0_ready` is overridden at fetch time with a live aggregate SOQL query counting uninvited Shortlisted participants (`get_uninvited_shortlisted_counts()`).

**In-memory state:** `SCHEDULED_JOBS`, `SEND_STATE`, `ALLOWED_USERS`, `AUDIT_RUNS`, `DAILY_ACTIVITY` all live in `mock_data.py` as module-level dicts/lists. They reset on every backend restart — this is intentional for the demo. Production would replace these with a database.

**Email is SF-owned:** The backend never sends email directly (except the legacy `send_invite_email` function which is unused in the send flow). Patching `Invite_Sent__c = True` on a participant triggers SF's Record-Triggered Flow, which sends the email. This means email delivery depends on SF org's deliverability setting being set to **"All Email"** (Setup → Email → Deliverability).

**`p0_ready` semantics:** This field means "uninvited Shortlisted participants available right now." The frontend uses it exclusively for picker counts and dashboard "Invites needed" — not `totalRequired - alreadySent`. It's computed fresh from SF on every study fetch.

**Timezone handling:** The schedule picker captures local time and converts to UTC ISO string before emitting. The backend always stores/processes UTC. Display in the UI converts back to IST using `Asia/Kolkata` timezone.

## Salesforce Custom Objects

- `UXR_Study__c` — Research study (fields: `Study_ID__c`, `RC_Name__c`, `Total_Required__c`, `Already_Sent__c`, `P0_Ready__c`)
- `UXR_Participant__c` — Participant (fields: `Email__c`, `Status__c`, `Invite_Sent__c`, lookup `Study__c`)
- `UXR_Audit_Run__c` — Invite run history
- `UXR_Scheduled_Job__c` — Scheduled jobs

SF auth uses the **client_credentials OAuth2 flow** (`SF_CONSUMER_KEY` + `SF_CONSUMER_SECRET`) — not username/password. `SF_PASSWORD` and `SF_SECURITY_TOKEN` in `.env` are only for `seed_sf.py` scripts.

## Allowed Users

The `ALLOWED_USERS` list in `backend/app/services/mock_data.py` is the login allowlist. Add entries there and redeploy the backend to grant access. There is no persistent user store — the list is code.

## Seed Script

`backend/seed_sf.py` — Creates studies and participants in SF, then updates all participant emails per RC (so test emails go to the RC's own inbox). Run locally with the `.env` credentials. The `continue` guard in Job 1 prevents duplicate participant creation if run multiple times.

RC → test email mapping:
- Lohithaksh → rotates `lohitl57@gmail.com`, `lohitvk18@gmail.com`, `lohithakshvasa@gmail.com`
- Aakash → `aakash.aidenai@gmail.com`
- Manaswitha → `manaswitha111@gmail.com`
- Shubham → `shubhamkapadia0@gmail.com`
- Vinoth → `vinothdkumar7@gmail.com`
- Bharath → `Pillak@google.com`

## Querying Salesforce Directly

Use the credentials from `backend/.env` with the client_credentials flow:

```python
import requests, os
from dotenv import load_dotenv
load_dotenv()
r = requests.post(f"{os.getenv('SF_INSTANCE_URL')}/services/oauth2/token", data={
    "grant_type": "client_credentials",
    "client_id": os.getenv("SF_CONSUMER_KEY"),
    "client_secret": os.getenv("SF_CONSUMER_SECRET"),
})
token = r.json()["access_token"]
base = f"{r.json()['instance_url']}/services/data/v59.0"
h = {"Authorization": f"Bearer {token}"}
# Then: requests.get(f"{base}/query/", params={"q": "SELECT ..."}, headers=h)
```

## Branch Strategy

- `V1.0` — main/production branch (CI/CD deploys from here)
- `V1.0_sf_objects` — active development branch
- `V1.0_deployment` — deployment config branch
