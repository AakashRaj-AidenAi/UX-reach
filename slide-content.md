# UXReach — Invite Email Agent | Slide Content for PPTX

---

## Slide 1: Title Slide

**Title:** UX Reach — Delivery Update
**Subtitle:** Email Agent | Resource Allocation | QBR Status

| Field | Value |
|-------|-------|
| CTS POD | Google UX Ads |
| Period | Feb 15, 2025 – Jun 30, 2026 |
| Status | Onboarding Complete |
| Date | April 2025 |

---

## Slide 2: Executive Summary

**Title:** Executive Summary
**Subtitle:** UX Reach — Google POD-3 Overview
**Badge:** SOW Approved | PO Pending

### Key Metrics (Top Strip)

| 600+ | 7.5h | 3.0h | 2.9x | 60% |
|------|------|------|------|-----|
| Studies / Year | Current AHT / Study | Target AHT / Study | Estimated ROI | Effort Reduction |

### Left Column — Project Scope

- AI-powered Email Agent to automate candidate invitation workflow (Step 07)
- Automated Salesforce case updates, multi-type email dispatch (invite, confirmation, ICF reminder, day-before), and status tracking
- Chatbot interface for Recruiter Coordinators with typed command interaction
- Integration with Shortlisting App, Google Sheets trackers, and Salesforce
- Looker Studio dashboards for KPI tracking and client-facing reporting
- Future scope: Daily Update Agent (may be bundled)

### Right Column — Engagement Details

| Field | Status |
|-------|--------|
| Engagement | Feb 15, 2025 – Jun 30, 2026 |
| SOW Status | Approved |
| PO Status | Pending |
| Onboarding | Complete |
| POC Phase | In Progress |
| Core Dev | Awaiting Access |

---

## Slide 3: Resource Allocation

**Title:** Resource Allocation
**Subtitle:** Dedicated team — 100% allocated to UX Reach
**Badge:** 3 Resources | All Onboarded

### Team Cards

**Card 1 — Aakash R** | Development Lead | 100% Allocated
- Full-stack developer with ML foundations
- Python, Java, React, Angular
- Backend architecture & AI integration
- UX tools: Figma, Adobe Illustrator
- Team leadership & technical decisions

**Card 2 — Vinothkumar D** | Developer | 100% Allocated
- Python backend development
- Salesforce connector development
- API integration specialist
- UI development support
- Testing & quality assurance

**Card 3 — Shubham Kapadia** | Developer | 100% Allocated
- UI / Frontend development
- Chatbot interface build
- Dashboard & reporting views
- React / Angular implementation
- User experience & accessibility

### Key Stakeholders Table

| Name | Role | Responsibility |
|------|------|---------------|
| Brandy Fowler / Savannah Boyer | Google Sponsor(s) | Executive oversight & sign-off |
| Ankush Jagia (xWF) | Project Manager (Ops, EMEA) | UX Ads + automation expertise, process clarification |
| Michelle De Jesus (xWF) | Operations Manager | Process alignment & UAT coordination |
| Barakath Ahmed S. (xWF) | Process Excellence | BRD ownership, requirements & access coordination |
| Pilla Kumar (xWF) | Team Lead | Access coordination & team onboarding |
| Pravin Kumar Gupta (xWF) | Stakeholder | Reports to Barakath, joining Dev Sync for status visibility |

---

## Slide 4: Problem Statement

**Title:** Problem Statement
**Subtitle:** UXR Lifecycle — Step 07: Invitations & Scheduling
**Badge:** Manual Process | 7.5h AHT

### Left Column — Current Pain Points

- **Manual Filtering** — RC manually checks P0/P1 status in Shortlisting App for each participant
- **Repetitive Drafting** — Same email structure rewritten per participant with minor variations
- **Dual Case Updates** — Child case created AND parent case notes updated manually in Salesforce
- **No Tracking** — No centralized view of which invites were sent, pending, or failed
- **Inconsistent Quality** — Email tone, structure, and completeness varies across RCs

### Right Column — Time Breakdown

| Step | Time per Participant |
|------|---------------------|
| Check P0 status in Shortlisting App | ~2 min |
| Draft personalized email | ~4 min |
| Send via Salesforce | ~2 min |
| Create child case | ~3 min |
| Update parent case notes | ~2 min |
| Verify & log | ~2 min |
| **Total per participant** | **~15 min** |

**Calculation:** ~15 min x 2 invites x 15 participants = **7.5 hours per study**

### Highlight Box
> **Why This Matters:** With 600+ studies/year, the team spends approximately 4,500 hours annually on a task that follows a repeatable, rule-based pattern — ideal for AI-assisted automation.

---

## Slide 5: Solution Architecture (High Level)

**Title:** Solution Architecture
**Subtitle:** Hybrid approach — External orchestration + Salesforce as System of Record
**Badge:** Option C (Recommended) | Hybrid

### Architecture Layers (Top to Bottom)

**Layer 1 — User Interface**
- React/Angular + Material UI (TBD)
- Chatbot with typed commands
- Tags: RC-Facing, WebSocket

**Layer 2 — Chatbot & Intent Router**
- Gemini 3.1 Pro (Intent) + FastAPI WebSocket
- Intent classification, auth, rate limiting
- Tags: NLU, OAuth

**Layer 3 — Multi-Agent System (Master + Sub-Agents)**
- Master Agent (Orchestrator): shared context, candidate-level locks, SLA timer, circuit breakers, audit logging
- Sub-Agent 1: Invite Agent (ACTION) — 15-step workflow, executes as delegated by Master
- Sub-Agent 2: Status Agent (QUERY) — 9 query capabilities, reports results to Master
- Master coordinates sequential handoffs (Agent 1 → Agent 2), parallel health checks, error escalation
- Future: Agent 3 (Daily Update) plugs into same Master
- Tags: Orchestrator Pattern, Stateless Sub-Agents

**Layer 4 — Backend Services**
- Python FastAPI + Cloud Run + Cloud SQL
- Workflow engine, email builder, dispatch queue, notifications
- Tags: Serverless, Pub/Sub

**Layer 5 — External Integrations**
- Salesforce, Vertex AI, Shortlisting App, Cloud SQL, Sheets, Drive, Pub/Sub, Looker
- Tags: REST API, Read+Write Only

**Security Layer**
- Zero PII Storage | GDPR Compliant | Stateless Agent

### Highlight Box
> **Key Decision (Apr 8):** Hybrid architecture chosen over Salesforce-native (limited AI) and full microservice (high ops overhead). Gemini 3.1 Pro confirmed — Google products only.

---

## Slide 6: Multi-Agent Workflow Detail

**Title:** Multi-Agent Workflow Detail
**Subtitle:** Master Agent orchestrates Sub-Agent 1 (Action) and Sub-Agent 2 (Query)
**Badge:** Master + Sub-Agent Pattern

### Top Section — Master Agent (Orchestrator)

| Responsibility | Detail |
|---------------|--------|
| Shared Context | Maintains session state: Study ID, Case ID (7-digit, 500-prefix), RC identity |
| Candidate-Level Locks | Dedup registry preventing duplicate sends across multi-RC access |
| SLA Timer | Owns 15-min countdown; warning at 10, escalation at 15 |
| Agent Coordination | Sequential: Agent 1 → Agent 2 handoff; Parallel: health checks |
| Circuit Breakers | Decides fallback (static template) or abort (dependency down) |
| Audit Trail | Logs every sub-agent action centrally |
| Future Extensibility | Agent 3 (Daily Update) plugs in without rearchitecting |

### Left Column — Sub-Agent 1: Invite Agent (ACTION)

| Step | Action |
|------|--------|
| 1 | Validate Study ID in Salesforce (7-digit case numbers) |
| 2 | Check cross-RC ownership (warn if study owned by different RC) |
| 3 | Fetch candidates from Shortlisting App |
| 4 | Filter P0s: exact count per RC request (new since last run) |
| 5 | Read Google Sheets trackers |
| 6 | Read specified folder contents |
| 7 | Generate email content (Gemini 3.1 Pro) |
| 8 | Confirm send with RC |
| 9 | Schedule for future send (if requested) |
| 10 | Batch send via Salesforce Email API |
| 11 | Update child cases: status → 'Scheduling In Progress' |
| 12 | Update ICF link per child case (region-specific) |
| 13 | Bulk update child cases: language, incentive type, incentive amount |
| 14 | Update parent case notes |
| 15 | Report results back to Master Agent |

### Right Column — Sub-Agent 2: Status Agent (QUERY)

| Step | Query |
|------|-------|
| 1 | Study invite status lookup |
| 2 | Email delivery tracking |
| 3 | Pending studies report |
| 4 | Daily activity summary |
| 5 | Failure & error reporting |
| 6 | Weekly metrics rollup |
| 7 | Bounce & open rate tracking |
| 8 | SLA compliance checks |
| 9 | Report results back to Master Agent |

---

## Slide 7: Tech Stack

**Title:** Recommended Tech Stack
**Subtitle:** Google-first ecosystem with Salesforce as System of Record
**Badge:** All Google Cloud | Gemini Only

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React or Angular + Material UI | Chatbot UI with typed commands |
| Backend | Python FastAPI | API server, workflow orchestration |
| Hosting | Google Cloud Run | Serverless container hosting |
| AI | Vertex AI — Gemini 3.1 Pro | Email generation + intent classification |
| Database | Cloud SQL (PostgreSQL) | Workflow state only — no PII |
| Queue | Google Cloud Pub/Sub | Async email dispatch + retry |
| CRM/Email | Salesforce REST API | System of record + email sending |
| Dashboards | Looker Studio | KPI reporting (linked, not agent UI) |
| Storage | Cloud SQL + ICF Repository | ICF link-to-region mapping, admin-updatable |
| Monitoring | Cloud Logging + Cloud Monitoring | Observability & alerting |
| Auth | Google SSO | Authenticated access via Google SSO |
| CI/CD | Cloud Build / GitHub Actions | Automated build & deploy |

---

## Slide 8: External Integrations

**Title:** External Integrations
**Subtitle:** 8 integration points — all validated in architecture
**Badge:** Read + Write Only | No Delete

### Integration Cards (2x4 Grid)

**1. Salesforce** — System of Record & Email Sending
- Study & Case data (SOQL)
- Contact/Participant records
- SingleEmailMessage API
- Update child cases (auto-created by SF on response)
- Case ID (7-digit, prefix '500') = common key to Shortlisting App
- Update Participant_Status to 'Scheduling In Progress'
- Update case notes (REST)
- Read + Write only (NO delete)

**2. Vertex AI (Gemini 3.1 Pro)** — Email Content Generation & Intent
- Gemini 3.1 Pro for email body
- Intent classification for chatbot
- Template-constrained prompts
- Content safety filters

**3. Shortlisting App** — Candidate Source
- Fetch shortlisted candidates
- P0/P1/Reject status retrieval
- P0 candidates since last run (RC-specified count)
- API access (type TBD)
- Linked to Salesforce via Case ID (7-digit, prefix '500')

**4. Cloud SQL** — Workflow State (No PII)
- Study workflow state
- Send status per batch
- Audit timestamps
- Metrics aggregation

**5. Google Sheets** — Manual Tracker Spreadsheets
- Sheets API v4
- Read recruiter tracking data
- Candidate info & study notes
- On-demand sync at trigger

**6. Folder / Drive Access** — File Reading (NEW)
- Google Drive API v3 (likely)
- Read specific folder contents
- Exact folder location TBD
- Requirement pending BRD update

**7. Cloud Pub/Sub** — Async Message Queue
- Email dispatch topic
- Notification topic
- Dead-letter queue for retries
- At-least-once delivery

**8. Looker Studio** — Dashboards & KPI Reporting
- Adoption & accuracy metrics
- SLA compliance dashboards
- Weekly/quarterly reporting
- Client-facing analytics

---

## Slide 9: Implementation Timeline

**Title:** Implementation Timeline
**Subtitle:** 10-week phased delivery — POC to Full Go-Live
**Badge:** 4 Phases | 10 Weeks

### Timeline

**Phase 1: Foundation (Weeks 1–3)**
- GCP/Vertex AI project setup
- Salesforce connected app + OAuth
- Data model mapping & discovery
- CI/CD pipeline setup
- Email template definition with Ops

**Phase 2: Core Agent Logic (Weeks 4–6)**
- Gemini 3.1 Pro integration
- Email generation + content validation
- Batch dispatch via Salesforce
- Case creation & parent note updates
- SLA monitoring + retry logic

**Phase 3: UI & Observability (Weeks 7–8)**
- Recruiter chatbot interface
- Status dashboard
- Notification system
- Cloud Monitoring + alerting
- Audit trail views

**Phase 4: Testing & Hardening (Weeks 9–10)**
- UAT with dummy test cases
- Security review
- Soft go-live (1 study at a time, RC validates)
- Full go-live decision

---

## Slide 10: Success Metrics

**Title:** Success Metrics & KPIs
**Subtitle:** Post go-live targets — measured within 2 months of launch
**Badge:** 5 KPIs | 2-Month Window

### Metric Strip

| 95% | 98% | 99% | 98% | <15m |
|-----|-----|-----|-----|------|
| Study Adoption | Email Coverage | Agent Uptime | Email Accuracy | Send SLA |

### Definitions

| KPI | Definition | Target |
|-----|-----------|--------|
| Study-Level Adoption | % of eligible studies using the agent | 95% |
| Email-Level Adoption | % of P0 invites sent via agent (not manual) | 98% |
| Uptime | Agent availability excluding dependency outages | 99% |
| Accuracy | Correct email content + correct recipient | 98% |
| Time Adherence | All P0 invites sent within 15 min of trigger | TBD% |

---

## Slide 11: Access & Onboarding Status

**Title:** Access & Onboarding Status
**Subtitle:** Current blockers and access request tracking
**Badge:** As of April 8, 2025

### Access Requests Table

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| UX Ads LDAP/JFG | Pending | Pilla Kumar | Determines SSO access |
| Google laptop SSO | In Progress | Team | Shubham collecting security key, joining Apr 9 |
| Salesforce API access | Not Started | Barakath | API access level, licensing, rate limits TBD |
| Shortlisting App API | Not Started | Barakath | API access types TBD |
| Pantheon access | Not Raised | Team | Needed for pod-level access |
| GCP Project / Vertex AI | Not Started | Dev Lead | Project ID and quota needed |
| LDAP list submission | Pending | Barakath | To send LDAP IDs to Cognizant team |

### Dev Sync Key Decisions (April 8, 2025)

| Decision | Confirmed Value |
|----------|----------------|
| AI Model | Gemini 3.1 Pro (Google products only) |
| P0 Logic | RC specifies exact count per conversation (newly shortlisted since last run) |
| Salesforce Ops | Read + Write Only (NO delete operations) |
| Dashboards | Looker Studio (reporting only, not agent UI) |
| UI Input | Typed Commands (no speech/NLP) |
| Frontend | React or Angular (TBD) |
| Testing | Dummy Test Cases (SF sandbox availability TBD) |
| Child Cases | Auto-created by Salesforce on candidate response; agent updates only |
| ICF Links | Region-specific, agent maintains ICF repository, admin-updatable |
| Email Types | Invite, confirmation, ICF reminder, day-before reminder |
| Bulk Updates | Preferred language, incentive type, incentive amount (per study) |
| Multi-RC Access | Case not limited to one RC; candidate-level locking for dedup |
| Case ID Linkage | Salesforce Case ID (7-digit, prefix '500') = common key to Shortlisting App |

---

## Slide 12: Immediate Next Steps

**Title:** Immediate Next Steps
**Subtitle:** Action items from Dev Sync (April 8, 2025)
**Badge:** 12 Action Items

### This Week

| # | Action | Owner | Target | Status |
|---|--------|-------|--------|--------|
| 1 | Send LDAP IDs to internal Cognizant team | Barakath | Apr 8 | Today |
| 2 | Confirm UX Ads access request decision | Pilla Kumar | Apr 9 | Pending |
| 3 | Update BRD: folder-reading + Sheets requirements | Barakath | Apr 10 | Pending |
| 4 | Check SF API access & Shortlisting App connectivity | Barakath | Apr 10 | Pending |
| 5 | Share UX Ads process doc with dev team | Barakath | Apr 10 | Pending |
| 6 | Research SF integration precedent (PEX team) | Barakath | Apr 10 | Pending |

### Next Week

| # | Action | Owner | Target | Status |
|---|--------|-------|--------|--------|
| 7 | Shadow session — live/recorded manual email demo | Barakath | Apr 11–14 | Scheduled |
| 8 | Research SF connectivity (other AI teams) | Dev Team | Apr 14 | Pending |
| 9 | Confirm Salesforce sandbox availability | Barakath | Apr 14 | Pending |
| 10 | Internal discussion & timeline estimation | Dev Team | Apr 14–18 | Post Shadow |

### Apr 10 Dev Sync Action Items

| # | Action | Owner | Target | Status |
|---|--------|-------|--------|--------|
| 11 | Add Pravin Kumar Gupta to meeting invitations | Barakath | Apr 13 | Pending |
| 12 | Share API details, access lists with team | Barakath | Apr 14 | Pending |
| 13 | Schedule shadow session for daily update tasks | Barakath | Apr 14 | Pending |
| 14 | Share 10-12 step manual process screenshots | Barakath | Apr 14 | Pending |
| 15 | Review 40-min screen recording (PII-restricted, view-only) | Dev Team | Apr 14 | Pending |

### Highlight Box
> **Key Ask from Client:** We need confirmation on **Salesforce API access level**, **Connected App creation**, and **GCP Project provisioning** to unblock core development. The team is actively working on POC and architecture in parallel, but these are hard blockers for the production build.

---

## Slide 13: UI Elements & Screens

**Title:** UI Elements & Screens
**Subtitle:** Invite Email Agent — Recruiter-facing interface components
**Badge:** 8 Screens | RC Views

### Row 1 (3 Cards)

**Card 1 — Chatbot Interface**
Primary interaction screen for RCs
- Scrollable conversation history
- Typed command input + send button
- Agent response bubbles with timestamps
- Typing/loading indicator
- Session info bar (RC name, date/time)
- Dependency health strip

**Card 2 — Study ID Input**
Validation + trigger panel
- Study ID field with SF validation (7-digit case numbers)
- "Send Invites" CTA button
- Exact invite count (RC-specified)
- Smart suggestions on invalid ID (RC's recent active studies)
- Confirmation prompt before send
- Cancel button

### Row 2 (3 Cards)

**Card 3 — Status Dashboard**
Simple active studies view
- Active studies list
- Sent vs required per study
- Simple progress bars
- Cancel/Stop button (mid-send)

**Card 4 — Notifications**
Alerts & dependency health
- Toast pop-ups (success/warn/error)
- In-chat alert messages
- Dependency health indicators
- SLA breach banner (amber/red)

**Card 5 — Audit Trail**
Activity log & history
- Past runs table (Study ID, date, RC)
- Email count & status per run
- Time taken per run
- Anonymized — no participant PII

### Row 3 (3 Cards)

**Card 6 — Settings Panel**
Authenticated RC access
- Notification preferences
- Default P0 count & lock timeout
- Email template viewer (read-only)
- Fallback template toggle
- ICF link management (per region)
- Cross-RC sending permission

**Card 7 — Login / Auth**
Google SSO via LDAP/JFG
- "Sign in with Google" button
- Session timeout warning
- Unauthorized access screen

**Card 8 — Looker Dashboard**
KPI reporting (linked, not embedded)
- Daily summary & quarterly KPIs
- AHT & volume trend charts
- SLA compliance rate graph
- Recent activity feed

---

## Slide 14: Rules & Error Scenarios

**Title:** Rules & Error Scenarios
**Subtitle:** Agent behavior rules, edge cases, and graceful degradation
**Badge:** 15 Scenarios | Circuit Breaker Pattern

### Input & Validation Scenarios

| # | Scenario | Agent Response | Severity |
|---|----------|---------------|----------|
| 1.2 | Invalid / non-existent Study ID | Block workflow. Show RC's recent active studies as clickable suggestions. Inline error: "Study ID [XXXX] not found in Salesforce. Did you mean one of these?" Log failed attempt. | BLOCKER |
| 1.3 | Concurrent RC triggers same Study | Multiple RCs can share case access. Candidate-level locking prevents duplicate sends. Coordinated deduplication across RCs. | INFO |
| 1.5 | Cross-RC ownership conflict | Agent warns: "This study is worked on by [Name]. Are you sure?" RC can proceed or cancel. Configurable setting. | WARNING |
| 1.4 | Repeat trigger (invites already sent) | Warn RC with last run details. Offer: send to newly shortlisted P0s only, or review previous run. | WARNING |
| 2.4 | P0 already invited in prior run | Auto-exclude. Show: "3 P0s excluded — already invited on [Date]." Only new P0s proceed. | INFO |
| 2.5 | P1 invite request | Out of scope. "P1 invitations not supported. Handle manually or wait for future version." | INFO |
| 2.6 | No new P0 candidates found | Abort gracefully: "No new P0 candidates for Study [ID] since last run on [Date]." | WARNING |

### System & Dependency Failures

| # | Scenario | Agent Response | Severity |
|---|----------|---------------|----------|
| 3.2 | Gemini generates bad content | Content validation catches errors. Hold email, fallback to static template. RC notified per email. | WARNING |
| 3.3 | Gemini API completely down | Circuit breaker triggers. Switch to approved static fallback. RC confirms: "Proceed without AI?" Team notified. | CRITICAL |
| 3.4 | Partial email send failure | Per-email tracking. Auto-retry 3x (exponential backoff). "12/15 sent. 3 failed — [names]. Resend manually." | CRITICAL |
| 3.6 | RC cancels mid-send | Stop remaining. Already-sent emails NOT recalled. Summary: "8/15 sent. 7 not sent. Cases updated for sent only." | WARNING |
| 4.3 | Parent case update fails | Retry 3x. If all fail: "Child cases created. Parent [Case No.] update failed — update manually." No rollback. | WARNING |
| 5.1 | SLA breach (>15 min) | Warning toast at 10 min. Escalation at 15 min. RC notified. Incident logged in audit trail. | CRITICAL |
| 6.2 | Shortlisting App down | Hard blocker. "Shortlisting App unavailable. Cannot retrieve candidates. Try later." Workflow aborted. | BLOCKER |
| 6.4 | Google Sheets unreadable | Soft dependency. "Could not read Sheets for Study [ID]. Proceeding with SF + Shortlisting data only." | INFO |

### Additional Scenario — Session Timeout / Interrupted Run
If RC session drops mid-send (browser close, timeout), agent detects interrupted session via state machine and offers **Partial Resume** — picks up from where it left off. Already-sent emails preserved. RC sees: "Previous run for Study [ID] was interrupted. 8/15 sent. Resume remaining 7?"

---

## Slide 15: Agent Capability Matrix

**Title:** Agent Capability Matrix
**Subtitle:** Full capability list — validated against architecture & BRD
**Badge:** 29 Capabilities | 13 Added from Review

### Core Workflow Capabilities

| Capability | Details | Status |
|-----------|---------|--------|
| Study Fetch | Pull study details + participants from SF by Study ID | Confirmed |
| P0 Filtering | RC-specified count of P0 candidates, newly shortlisted since last run | Confirmed |
| Duplicate Guard | Audit log check — never emails same person twice per study | Confirmed |
| Gemini Email Gen | Personalized emails via Gemini 3.1 Pro with study context | Confirmed |
| Content Validation | Post-generation check: template structure, variable substitution | **Added** |
| Fallback Templates | Pre-approved static template when Gemini is unavailable | Confirmed |
| Smart ID Suggestions | On invalid Study ID, show RC's recent active studies as clickable suggestions | **Added** |
| Cross-RC Warning | Warn RC if study is owned by a different RC; configurable | **Added** |
| Scheduled Sends | RC can schedule invite sends for a future time; agent autonomously executes | **Added** |
| Log TTL/Purging | Operational logs retained ~45 days; summary record kept after purge | **Added** |
| Batch Send | Sequential dispatch via SF API, batches of 5, per-email tracking, multi-type support | Confirmed |
| Case Updates | Update child cases (auto-created by SF) + parent case notes; set status to 'Scheduling In Progress' | Confirmed |
| Sheets Read | Read recruiter tracking spreadsheets via Sheets API v4 | **Added** |
| ICF Link Update | Set region-specific ICF link per child case from ICF repository | **Added** |
| ICF Repository | Region-to-ICF-URL mapping, admin-updatable when content changes | **Added** |
| Bulk Case Update | Preferred language, incentive type, incentive amount across child cases | **Added** |
| Multi-Email Types | Invite, confirmation, ICF reminder, day-before reminder | **Added** |
| Folder / Drive Read | Read specific folder contents (Drive API v3, details TBD) | **Added** |

### System & Safety Capabilities

| Capability | Details | Status |
|-----------|---------|--------|
| Intent Classification | Route commands: SEND > Agent 1, STATUS > Agent 2 | **Added** |
| Session Locking | Candidate-level lock, supports multi-RC concurrent access | Confirmed |
| Conflict Detection | Coordinate multi-RC access, candidate-level dedup | Confirmed |
| Partial Resume | Detect interrupted sessions, resume from last checkpoint | Confirmed |
| Rate Limiting | Per-user throttle, cooldown between requests | **Added** |
| Retry Logic | Per-email retry up to 3x with exponential backoff | Confirmed |
| SLA Monitor | 15-min countdown, warning at 10, escalation at 15 | Confirmed |
| Dep. Health Check | Ping SF + Shortlisting + Gemini before starting; fail fast | Confirmed |
| Audit Trail | Immutable log: who, when, which candidates, outcomes | Confirmed |
| PII Protection | No PII in logs/memory — only IDs. SF-only PII storage | Confirmed |
| Notification Push | Toasts/alerts: completion, failure, SLA breach, lock release | Confirmed |

### Review Summary
**13 Capabilities Added, 2 Updated (Post Client Meeting Feedback Apr 14)**
**Added:** Content Validation, Google Sheets Read, Folder/Drive Read, Intent Classification, Rate Limiting, ICF Link Update, ICF Repository, Bulk Case Update, Multi-Email Types, Smart ID Suggestions, Cross-RC Warning, Scheduled Sends, Log TTL/Purging. **Removed:** Email Preview (no longer required), P1 Escalation (removed entirely). Session Locking and Conflict Detection updated for multi-RC/candidate-level semantics.

---

## Slide 16: Technical Design Document Reference

**Title:** Technical Design Document
**Subtitle:** TDD prepared and shared with stakeholders
**Badge:** Shared with Barakath | Apr 14, 2026

### Key Notes

- A comprehensive Technical Design Document (TDD) has been prepared covering architecture, data flows, API contracts, and deployment strategy
- TDD has been shared with Barakath for review and client distribution
- The TDD supplements this presentation with deeper technical detail on all integration points
- All case numbers in the system are 7 digits

### Study Examples Referenced in TDD

| Study ID | Study Name |
|----------|-----------|
| 5001234 | Global Ads Experience Survey |
| 5005678 | YouTube Premium UX Research |
| 5009012 | Google Maps Navigation Study |
| 5003456 | Chrome Browser Accessibility |
| 5007890 | Cloud Console UX Evaluation |
| 5002345 | Assistant Voice Interface Study |

---

## Slide 17: Thank You

**Title:** Thank You
**Subtitle:** UX Reach — Email Agent | QBR Delivery Update

| Field | Value |
|-------|-------|
| Team | Aakash R, Vinothkumar D, Shubham Kapadia |
| Lead | Aakash R (Dev Lead) |
| POC | Barakath Ahmed S. |

**Tech Tags:** Gemini 3.1 Pro | GCP Cloud Run | Salesforce API | Looker Studio | Zero PII Storage
