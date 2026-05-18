# UXReach — Feature Reference

UXReach is an AI-powered invite email agent for Google UX Research. Research Coordinators (RCs) chat with the agent to send, schedule, and track email invitations to study participants. Salesforce is the system of record; the app orchestrates participant status updates that trigger SF Record-Triggered Flows to send the actual emails.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Chat Interface](#2-chat-interface)
3. [Chat Commands (Intents)](#3-chat-commands-intents)
4. [Invite Sending](#4-invite-sending)
5. [Invite Scheduling](#5-invite-scheduling)
6. [Dashboard](#6-dashboard)
7. [Audit Screen](#7-audit-screen)
8. [Scheduled Jobs](#8-scheduled-jobs)
9. [Admin Panel](#9-admin-panel)
10. [Guardrails (Blocked Actions)](#10-guardrails-blocked-actions)
11. [Key User Workflows](#11-key-user-workflows)

---

## 1. Authentication

- **Google OAuth 2.0** sign-in via Google Identity Services (GIS).
- Backend verifies the Google ID token and checks the user's email against the `ALLOWED_USERS` allowlist in `mock_data.py`.
- Returns user profile with role (`rc` or `admin`).
- All routes are protected by an Angular auth guard; unauthenticated users see only the login overlay.

---

## 2. Chat Interface

The chat screen (`/chat`) is the primary interface.

| Feature | Description |
|---|---|
| Conversational AI | Natural language input processed by Gemini (Vertex AI) with regex fallback |
| Multi-conversation | Create and switch between separate conversation threads (Cmd/Ctrl+Shift+O) |
| Message search | Search across chat history with match counter and navigation |
| Rich message rendering | Bot responses include formatted HTML, data tables, and inline action buttons |
| Suggestion chips | Context-aware quick-reply chips appear after certain responses |
| Chat health strip | Live indicator showing Salesforce + backend connectivity status |
| Conversation persistence | Chat history is preserved across page reloads per session |
| Typing indicator | Animated "bot is typing" state while awaiting backend response |
| Copy button | One-click copy for bot message content |

---

## 3. Chat Commands (Intents)

All commands can be entered as natural language. The backend's AI parser maps them to one of the following intents.

### Invite Management

| Intent | Example Phrase | What It Does |
|---|---|---|
| `send_invite` | "send 10 invites for study XYZ" | Opens study picker, shows summary, confirms then sends |
| `send_all_p0s` | "send to all P0 candidates" | Bulk-sends to all shortlisted/priority participants |
| `invites_remaining` | "how many invites left for XYZ?" | Shows `total_required − already_sent` |

### Scheduling

| Intent | Example Phrase | What It Does |
|---|---|---|
| `schedule` | "schedule 5 invites for tomorrow at 2pm" | Opens date/time picker, creates a scheduled job |
| `scheduled_query` | "show upcoming scheduled sends" | Lists all pending scheduled jobs |

### Status & Progress

| Intent | Example Phrase | What It Does |
|---|---|---|
| `status_query` | "status of study XYZ" | Sent/required counts, remaining, last run date + history |
| `pending_studies` | "what studies are pending?" | Lists RC's studies with P0-ready counts |
| `my_studies` | "show my studies" | All studies assigned to the RC with sent/required/remaining |
| `study_progress` | "progress for study XYZ" | Full participant funnel with "Needs Attention" alerts |
| `failure_report` | "any failed sends today?" | Lists failed send attempts with counts |

### Participant Tracking

| Intent | Example Phrase | What It Does |
|---|---|---|
| `responses` | "who responded?" | Lists participants with Responded status |
| `bookings` | "who has a booking?" | Participants with scheduled appointments |
| `icf_status` | "ICF status for study XYZ" | Signed vs. unsigned ICF counts and participant list |
| `reminders_needed` | "who needs a reminder?" | Invited >24h with no response; booked with unsigned ICF |
| `confirmed_count` | "how many are confirmed?" | Count of participants in Completed status |
| `candidate_reply` | "draft a reply to [name]" | Generates email template for individual participant |

### Reporting

| Intent | Example Phrase | What It Does |
|---|---|---|
| `daily_summary` | "daily summary" | Today's sends, responses, and appointments aggregated |
| `eod_update` | "EOD update" | Drafts a formatted end-of-day summary for Salesforce |
| `edit_eod_note` | "edit EOD" | Opens the EOD draft in an editable form |
| `post_eod_note` | "post EOD" | Posts the confirmed EOD summary to Salesforce case notes |

### Utility

| Intent | Example Phrase | What It Does |
|---|---|---|
| `help` | "help" or "what can you do?" | Lists available commands and usage |

---

## 4. Invite Sending

**Flow:** User confirms send → `POST /api/send/start` → backend fetches `Shortlisted` participants from SF → updates each to `Invited` (500 ms apart) → SF Record-Triggered Flow sends email per record → frontend polls `GET /api/send/progress/{sessionId}`.

| Feature | Detail |
|---|---|
| Study Picker modal | Select study + participant count before confirming |
| Real-time progress | Per-email tick updates with a progress bar |
| Queue management | Multiple studies can be queued and sent sequentially |
| Stop in-flight | User can cancel a running send session |
| Send confirmation | Summary card (study name, researcher, sent/required, remaining) before commit |
| Audit logging | Every completed run is recorded as an `AuditRun` entry |

---

## 5. Invite Scheduling

| Feature | Detail |
|---|---|
| Schedule Picker modal | Date + time picker; captures local time, converts to UTC for storage |
| Natural language scheduling | "tomorrow at 2pm", "May 20 at 3pm" parsed by the AI |
| APScheduler execution | Backend fires the job at the stored UTC time |
| Status tracking | Jobs transition: `scheduled → running → completed / failed / cancelled` |
| Cancel scheduled job | Available from the Scheduled screen or via chat |

---

## 6. Dashboard

Route: `/dashboard`

| Feature | Detail |
|---|---|
| Pending studies list | Studies where `p0_ready > 0` — live count from SF |
| Summary metrics | Total pending invites, new responses, P0-ready candidates |
| Per-study detail | Sent/required, remaining, failed runs, participant stage breakdown |
| Quick actions | "Send Now" and "Schedule" buttons per study row |
| Active send progress | Inline progress bar when a send is running |
| Auto-refresh | Participant progress fetched fresh from SF on each load |

---

## 7. Audit Screen

Route: `/audit`

| Feature | Detail |
|---|---|
| Run history table | All send runs: Run ID, Study, Date, RC, Sent, Failed, Status, Duration, SLA |
| Column sorting | Click any header to sort ascending/descending |
| Search | Filter by Run ID, Study ID/name, or RC name |
| Advanced filters | Status (completed/sending/failed), SLA compliance (yes/no), Date range, RC name |
| Filter modal | Toggleable panel with "Clear all filters" action |
| SLA compliance | Boolean flag — whether the run completed within the defined time window |

---

## 8. Scheduled Jobs

Route: `/scheduled`

| Feature | Detail |
|---|---|
| Jobs list | Study ID, Study Name, Count, Scheduled Time, Created At, Status |
| Cancel job | Remove a pending scheduled job |
| Status badges | `scheduled`, `running`, `completed`, `failed`, `cancelled` |

---

## 9. Admin Panel

Route: `/admin` — visible to users with role `admin` only.

| Feature | Detail |
|---|---|
| User list | Displays all allowed users with email, name, and role |
| Add user | Form to add email + name + role (RC or admin) to the allowlist |
| Remove user | Delete a user from the allowlist |
| Real-time validation | Inline form errors + toast notifications on success/failure |

---

## 10. Guardrails (Blocked Actions)

The `GuardrailsService` enforces 20 policy rules client-side before any message reaches the backend. The following are **not supported**:

- Email template customisation
- Study ownership or assignment changes
- Deleting candidates
- Creating new studies
- Exporting PII or CSV data
- Changing incentive amounts
- Sending emails to anyone outside the research team
- Rescheduling interviews
- Any destructive data operations

Blocked messages receive an immediate refusal response without calling the backend.

---

## 11. Key User Workflows

### Send Invites
1. Type "send 10 invites for [study]" or click **Send Now** on the Dashboard.
2. Study Picker opens (if study not specified).
3. Review the study summary card → click **Send**.
4. Watch real-time progress; each email ticks up the counter.
5. Completion message shows total sent and duration.
6. Run is recorded in the Audit log.

### Schedule a Future Send
1. Type "schedule 5 invites for [study] tomorrow at 2pm".
2. Schedule Picker opens for date/time confirmation.
3. Job saved with `scheduled` status.
4. Backend APScheduler fires at the UTC-converted time.
5. Progress and completion notifications appear in chat.

### Check Study Progress
1. Type "progress for [study]".
2. Chat returns full participant funnel: invited → responded → booked → ICF signed → confirmed.
3. "Needs Attention" alerts highlight non-responders >48h, unsigned ICF, etc.

### End-of-Day Update
1. Type "EOD update".
2. Chat generates a draft summary (sends, confirmations, cancellations, pending studies).
3. Edit if needed ("edit EOD").
4. Confirm with "post EOD" → summary posted to Salesforce case notes.

### Audit a Send Run
1. Navigate to `/audit`.
2. Search or filter by study, date, or RC.
3. Sort by Sent count or SLA compliance to spot underperformance.

### Manage Allowed Users (Admin)
1. Navigate to `/admin`.
2. Add or remove users by email; changes take effect immediately (no redeploy needed).
