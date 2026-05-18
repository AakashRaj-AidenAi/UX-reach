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
10. [Automated Background Tasks](#10-automated-background-tasks)
11. [Reliability & Fallback Management](#11-reliability--fallback-management)
12. [Guardrails (Blocked Actions)](#12-guardrails-blocked-actions)
13. [Key User Workflows](#13-key-user-workflows)

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
| `send_invite` (region filter) | "send 5 invites for study XYZ for participants in Canada" *(not yet implemented)* | Applies region/type filter before selecting P0s; shows available-vs-invited breakdown; aborts with a message if the filter returns 0 candidates |
| `send_invite` (multi-region) | "send 5 invites: 2 from Canada, 2 from USA, 1 from India" *(not yet implemented)* | Applies multiple region quotas in a single command |
| `send_invite` (segment) | "send 5 invites for study XYZ to Media Agency" *(not yet implemented)* | Filters by customer segment before selecting candidates |
| `send_invite` (multi-study) | "send 5 invites for study XYZ and 3 for study ABC" | Queues studies; processes sequentially; shows "Study 1 of 2" progress; skips invalid studies and continues; combined summary at end |
| `send_invite` (per-study bulk) | "send 5 invites for each of my studies" *(not yet implemented)* | Iterates all RC's active studies, sending the specified count each |
| `send_all_p0s` (single study) | "send invites for all P0s ready to schedule for study XYZ" *(not yet implemented)* | Sends to every "Ready to Schedule" P0 on that study |
| `send_all_p0s` (all studies) | "send invites for all P0s ready to schedule for all my studies" *(not yet implemented)* | Sends to every "Ready to Schedule" P0 across all RC's studies |
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
| `failure_report` | "any failed sends today?" | Detailed failure list: study, participant, error reason, retry count, resolution status; one-click "Retry failed" action |

### Participant Tracking

| Intent | Example Phrase | What It Does |
|---|---|---|
| `responses` | "who responded?" | Lists participants with Responded status |
| `bookings` | "who has a booking?" | Participants with scheduled appointments |
| `icf_status` | "ICF status for study XYZ" | Signed vs. unsigned ICF counts and participant list |
| `reminders_needed` | "who needs a reminder?" | Invited >24h with no response; booked with unsigned ICF |
| `confirmed_count` | "how many are confirmed?" | Count of participants in Completed status |
| `candidate_reply` | "draft a reply to [name]" | Generates a draft email for an individual participant; supported topics: resending ICF or calendar links, appointment rescheduling or requesting more calendar slots, incentive questions, in-person study location/logistics, study conduct and expectations, product-related study questions |

### Reporting

| Intent | Example Phrase | What It Does |
|---|---|---|
| `daily_summary` | "daily summary" | Today's sends, responses, and appointments aggregated |
| `eod_update` | "EOD update" | Drafts a formatted end-of-day summary for Salesforce |
| `edit_eod_note` | "edit EOD" | Opens the EOD draft in an editable form |
| `post_eod_note` | "post EOD" | Posts the confirmed EOD summary to Salesforce case notes; *(not yet implemented)* also pings UXRs and pod leads in Google Chat and emails them with the summary |
| `multi_study_progress` | "progress for all my studies" *(not yet implemented)* | Fetches all active RC studies; returns a summary table sorted by urgency (fewest confirmed first); click any row to drill into full study progress |
| `weekly_metrics` | "weekly metrics" *(not yet implemented)* | Week-over-week rollup: studies processed, total invites, send success rate, confirmation rate — suitable for QBR; exportable as PDF/CSV |
| `compliance_export` | "export audit log from July 1 to July 31" *(not yet implemented)* | Queries audit log for date range; generates a PII-free CSV (Study IDs, anonymized RC identifier, action types, counts, outcomes); presents download link in chat; logs retained up to 45 days |

### Utility

| Intent | Example Phrase | What It Does |
|---|---|---|
| `help` | "help" or "what can you do?" | Lists available commands and usage; context-aware — uses RC's actual study IDs in examples |
| `smart_id_suggestion` | "send 10 invites for study 9999999" (invalid ID) | Returns "I couldn't find a study with that ID" + lists RC's active studies as clickable buttons; does NOT auto-suggest a specific study to prevent typo mistakes |

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

## 10. Automated Background Tasks
These tasks run on a schedule without any RC prompt.

| Task | Trigger | What It Does |
|---|---|---|
| Hourly P0 shortlisting ping | Every hour | Monitors SF/Shortlisting App for newly marked "Ready to Schedule" P0s; sends a Google Chat ping to the RC with a per-study breakdown; RC can reply to trigger an immediate send for one or all studies |
| Booking confirmation email | On new calendar booking detected | Scans RC's appointment calendar; sends a confirmation email to the participant with join link and interview details; count reflected in the daily update and dashboard |
| 24h before-interview reminder | Daily scan | Identifies upcoming interviews ≤24h away; sends reminder email with join link and details; also sends an ICF reminder if ICF is not yet signed; does NOT re-remind participants who already received a reminder |
| ICF reminder | Daily scan | Finds participants with status "Scheduling In Progress" but `ICF_Signed = false`; sends reminder email; escalates to RC after 3 ignored reminders; blocks interview confirmation if ICF unsigned on the day |
| SLA breach alert | During active send run | Warns at 10 min and alerts at 15 min if a send run exceeds the SLA window; notifies pod lead automatically; logs the incident; only active during a running send — not triggered by participant response delays |
| ICF status sync via macro *(not yet implemented)* | Scheduled | Leverages the Google Sheets macro script to pull signed ICF counts for scheduled participants and surfaces the count in the dashboard alongside booking data |

---

## 11. Reliability & Fallback Management
| Mechanism | When It Triggers | Behavior |
|---|---|---|
| Pre-send health check | Before every send run | Pings Salesforce, Gemini, and the Shortlisting App; if any are unreachable, blocks the workflow and notifies the RC and pod lead with a specific alert message; send does not proceed until all systems are healthy |
| AI service fallback | Gemini unavailable | Notifies RC and pod lead; offers a static email template as fallback so sends can continue without generative content |
| Per-email retry with backoff | Individual email send failure | Retries each failed email 3× with exponential backoff (1 s → 2 s → 4 s); after 3 failures, moves the email to a Dead Letter Queue and notifies the RC; successful sends are not rolled back — partial success is acceptable and logged |

---

## 12. Guardrails (Blocked Actions)

The `GuardrailsService` enforces policy rules client-side before any message reaches the backend. The following are **not supported**:

- Email template customization
- Study ownership or assignment changes (e.g., changing the UXR on a study, assigning a case to yourself)
- Sending invites for a study not assigned to the RC — agent refuses and directs RC to their team lead
- Deleting candidates
- Creating new studies
- Exporting PII or CSV data containing candidate details
- Changing incentive amounts
- Sending emails to anyone outside the Google UX Ads research team (e.g., personal Gmail)
- Rescheduling a candidate's interview slot
- Any other destructive data operations

Blocked messages receive an immediate refusal response without calling the backend.

---

## 13. Key User Workflows

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
