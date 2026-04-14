# Invite Email Agent — Methodology & Approach

> **Project**: Lead Sourcing AI Agent — Email Invitations  
> **Author**: Barakath Ahmed Servarayar Shahul (xWF)  
> **Last Updated**: April 14, 2026 (Post Client Meeting Feedback)  
> **Status**: Planning — POC Phase

---

## Team

| Name | Role | Allocation |
|------|------|------------|
| Brandy Fowler / Savannah Boyer | Google Sponsor(s) | — |
| Ankush Jagia (xWF) | Project Manager (Ops Team, EMEA) | UX Ads + Automation expertise, EMEA timezone |
| Michelle De Jesus (xWF) | Operations Manager | — |
| Barakath Ahmed Servarayar Shahul (xWF) | Process Excellence / BRD Owner | — |
| Pilla Kumar (xWF) | Team Lead / Access Coordinator | — |
| Aakash R (xWF) | Dev Lead — Full-stack, ML, Python, Java, React/Angular | 100% |
| Vinothkumar D (xWF) | Developer — Python, UI | 100% |
| Shubham Kapadia (xWF) | Developer — UI/Frontend | 100% |
| Pravin Kumar Gupta (xWF) | Stakeholder (reports to Barakath) | Joining Dev Sync calls for status visibility |

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [1.1 Project Context](#11-project-context)
- [2. Problem Analysis](#2-problem-analysis)
- [3. Architecture Options](#3-architecture-options)
- [4. Recommended Approach — Hybrid Architecture](#4-recommended-approach--hybrid-architecture)
- [5. Workflow Decomposition](#5-workflow-decomposition)
- [6. Implementation Phases](#6-implementation-phases)
- [7. Technical Decisions](#7-technical-decisions)
- [8. Recommended Tech Stack](#8-recommended-tech-stack)
- [9. Data Flow & Integration Points](#9-data-flow--integration-points)
- [10. Security & Compliance](#10-security--compliance)
- [11. Error Handling Strategy](#11-error-handling-strategy)
- [12. Risk Mitigation](#12-risk-mitigation)
- [13. Success Metrics & Instrumentation](#13-success-metrics--instrumentation)
- [14. UAT & Quality Assurance Plan](#14-uat--quality-assurance-plan)
- [15. Dev Sync Decisions (April 8, 2025 & April 10, 2026)](#15-dev-sync-decisions-april-8-2025--april-10-2026)
- [16. Additional Data Sources](#16-additional-data-sources)
- [17. Future Scope — Daily Update Agent](#17-future-scope--daily-update-agent)
- [18. Access & Onboarding Status](#18-access--onboarding-status)
- [19. Next Steps](#19-next-steps)

---

## 1. Executive Summary

The UX Ads Cognizant Team facilitates **600+ research studies per year** across diverse product areas. Each study requires recruiting suitable participants and managing the full invitation and scheduling lifecycle.

The **Invite Email Agent** is an AI-driven automation designed to streamline the "Invitations & Scheduling" stage (Step 07) of the UXR study lifecycle. By automating candidate extraction and invitation distribution via Salesforce, the agent targets:

| Metric | Current | Target |
|--------|---------|--------|
| Average Handling Time (AHT) per study | 7.5 hours | 3.0 hours |
| Manual effort per participant | 15 min × 2 invites | Automated |
| Estimated ROI | — | **2.9x** |

---

## 1.1 Project Context

The UX Ads team conducts User Experience (UX) research for Google products (Google Ads, Gemini, etc.) through surveys and studies. The process involves:

1. **Finding participants** through outreach and sourcing
2. **Screening and shortlisting** via the Shortlisting App
3. **Sending invitation emails** for 60-minute research interviews
4. **Conducting interviews** — participants receive a **$75 gift code** upon completion

The Email Agent automates Step 3. A second agent (**Daily Update Agent**) is also planned and may be bundled into this project scope.

---

## 2. Problem Analysis

### Current State (Manual Process)

```
Step 06: UXR Shortlists Candidates (P0 / P1 / Reject)
                        │
                        ▼
Step 07: Recruiter Manually Processes Invitations
         ├── Opens Salesforce
         ├── Identifies P0 candidates from shortlist
         ├── Drafts invitation email for each candidate
         ├── Sends emails individually via Salesforce
         ├── Updates child case notes
         └── Updates parent case notes
                        │
                        ▼
         ~15 min/participant × 2 invites × 15 participants = 7.5 hrs/study
```

### Pain Points

| # | Pain Point | Impact |
|---|-----------|--------|
| 1 | Manual candidate filtering from shortlist | Time-consuming, error-prone |
| 2 | Individual email drafting and sending | Repetitive, high AHT |
| 3 | Dual case note updates (child + parent) | Administrative overhead |
| 4 | No automated tracking of send status | Lack of real-time visibility |
| 5 | Inconsistent email quality across recruiters | Brand/quality risk |

### Desired State (Automated Process)

```
Step 06: UXR Shortlists Candidates (P0 / P1 / Reject)
                        │
                        ▼
Step 07: Recruiter enters Study ID → Clicks "Send Invites"
                        │
                        ▼
         AI Agent Automatically:
         ├── Fetches participant list from Salesforce
         ├── Filters P0 candidates
         ├── Generates personalized invitation emails (Gemini)
         ├── Sends emails via Salesforce API
         ├── Updates child + parent case notes
         └── Logs all activity with audit trail
                        │
                        ▼
         Completion within 15 minutes of trigger
```

---

## 3. Architecture Options

### Option A: Event-Driven Microservice

| Aspect | Detail |
|--------|--------|
| **Description** | Standalone frontend + backend API + event queue |
| **Pros** | Full control, scalable, clean separation of concerns |
| **Cons** | More infrastructure to manage, additional hosting costs |
| **Best For** | Teams with strong DevOps capabilities |

### Option B: Salesforce-Native (Flow + Apex)

| Aspect | Detail |
|--------|--------|
| **Description** | Built entirely within Salesforce using Flows, Apex, and Einstein AI |
| **Pros** | No external infrastructure, native audit trail |
| **Cons** | Limited AI capability, harder to customize, Einstein constraints |
| **Best For** | Orgs with deep Salesforce expertise and minimal AI needs |

### Option C: Hybrid (Recommended)

| Aspect | Detail |
|--------|--------|
| **Description** | External UI + orchestration layer; Salesforce for data, email, and logging; Gemini for AI |
| **Pros** | Flexibility + Salesforce as system of record + full AI capabilities |
| **Cons** | Moderate complexity, requires Salesforce API access |
| **Best For** | This project — balances all requirements optimally |

**Decision: Option C (Hybrid)** is recommended. It keeps Salesforce as the single source of truth while enabling full control over AI content generation and workflow orchestration.

---

## 4. Recommended Approach — Hybrid Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    RECRUITER (RC)                        │
│         Enters Study ID → Typed Commands in Chatbot     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│            LAYER 1 — FRONTEND (React/Angular UI)         │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐               │
│  │ Study ID │ │ Status   │ │ Notifs &  │               │
│  │ Input    │ │ Dashboard│ │ Health    │               │
│  └──────────┘ └──────────┘ └───────────┘               │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API / WebSocket
                       ▼
┌──────────────────────────────────────────────────────────┐
│        LAYER 2 — CHATBOT & INTENT ROUTER                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Chat     │ │ Intent   │ │ Auth     │ │ Rate      │  │
│  │ Interface│ │ Classifier│ │ Middleware│ │ Limiter   │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ Intent Routed
                       ▼
┌──────────────────────────────────────────────────────────┐
│       LAYER 3 — MASTER AGENT (ORCHESTRATOR)              │
│                                                          │
│  ┌──────────────────────────────────────────────┐        │
│  │  • Shared context (Study ID, Case ID, RC)    │        │
│  │  • Candidate-level locks & dedup registry    │        │
│  │  • SLA timer ownership (15-min countdown)    │        │
│  │  • Circuit breaker decisions                 │        │
│  │  • Audit trail logging                       │        │
│  └────────────────┬─────────────────────────────┘        │
│                   │                                      │
│       ┌───────────┴───────────┐                          │
│       ▼                       ▼                          │
│  ┌──────────────┐     ┌──────────────┐                   │
│  │ SUB-AGENT 1  │     │ SUB-AGENT 2  │                   │
│  │ Invite Agent │     │ Status Agent │                   │
│  │ (ACTION)     │     │ (QUERY)      │                   │
│  │              │     │              │                   │
│  │ 14 workflow  │     │ 9 query      │                   │
│  │ steps        │     │ capabilities │                   │
│  └──────┬───────┘     └──────┬───────┘                   │
│         │ Results            │ Results                   │
│         └────────┬───────────┘                           │
│                  ▼                                       │
│         Master aggregates, responds to RC                │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  SALESFORCE  │ │ VERTEX AI│ │ GOOGLE CLOUD │
│              │ │ (GEMINI) │ │ PUB/SUB      │
│ - Study Data │ │          │ │              │
│ - Contacts   │ │ - Email  │ │ - Async      │
│ - Cases      │ │   Content│ │   Processing │
│ - Email API  │ │   Gen    │ │ - Retry      │
│ - Case ID    │ │ - Intent │ │   Queue      │
│   (500-key)  │ │          │ │              │
└──────────────┘ └──────────┘ └──────────────┘
```

---

## 5. Workflow Decomposition

Mapping each BRD requirement to technical implementation:

### REQ-01: Trigger Mechanism & Input UI

| Aspect | Detail |
|--------|--------|
| **Requirement** | UI with Study ID input and "Send Invites" button |
| **Implementation** | React frontend with form validation |
| **Validation** | Study ID must exist in Salesforce before proceeding. Case numbers are 7 digits. |
| **Auth** | Authenticated access via Google SSO |

### REQ-02: Candidate Filtering

| Aspect | Detail |
|--------|--------|
| **Requirement** | Retrieve participant list, filter P0 only |
| **Implementation** | Fetch from Shortlisting App → filter by `Status = 'P0'` → RC specifies exact invite count per conversation. Agent sends exactly that many invites from newly shortlisted P0 candidates since last run. |
| **Data Source** | Shortlisting App (primary), Salesforce (case data), Google Sheets (manual trackers) |
| **Edge Cases** | No P0 candidates found → notify RC, zero participants → abort |
| **P0 Selection Logic** | RC specifies exact invite count per conversation. Agent sends exactly that many invites from newly shortlisted P0 candidates since last run. |
| **Cross-System Key** | The agent uses the Salesforce Case ID (alphanumeric, 7-digit, prefix '500') as the common key to join Salesforce case data with Shortlisting Tool candidate records. |

### Cross-RC Ownership Warning

If the study is owned by a different RC, the agent warns: "This study is worked on by [Name]. Are you sure?" This is configurable. The RC can proceed or cancel. This prevents accidental interference with another RC's active studies while still allowing cross-RC collaboration when needed.

### REQ-03: Email Execution

| Aspect | Detail |
|--------|--------|
| **Requirement** | Send invitation emails within 15 minutes of trigger |
| **Implementation** | Gemini generates personalized email body from template + study context |
| **Sending** | Salesforce `SingleEmailMessage` API (batch) |
| **Email Types** | The agent supports four email types: (1) Invite email — initial outreach to selected P0 candidates, (2) Confirmation email — sent after participant books a time slot, (3) ICF reminder — sent if Informed Consent Form remains unsigned, (4) Day-before reminder — sent one day before scheduled interview. |
| **Email Signature** | The email signature must use the name of the RC who triggers the send, regardless of study owner. |
| **Language** | For the initial release, all emails are in English. Multi-language support for global studies is a future consideration pending input from the client. |
| **SLA Monitoring** | Timer starts at trigger; alert at 10-min mark if incomplete |

### REQ-04: System of Record Updates

| Aspect | Detail |
|--------|--------|
| **Requirement** | Update child cases (auto-created by Salesforce on candidate response) and update notes/status on child + parent cases |
| **Implementation** | Salesforce REST API: `Case.update()` for child cases and notes, `Task.create()` for activity |
| **Access Level** | Read + Write only — **NO delete operations** on Salesforce |
| **Audit Trail** | Timestamp, agent ID, email count, Study ID logged per action |
| **Status Update** | After sending an invite, the agent updates Participant_Status__c to 'Scheduling In Progress' on the corresponding child case. |
| **ICF Link** | The agent updates the region-specific ICF (Informed Consent Form) link on each child case. |
| **Bulk Updates** | The agent supports bulk updates across all child cases for a study: preferred language, incentive type, and incentive amount. |

### REQ-05: Security & Privacy

| Aspect | Detail |
|--------|--------|
| **Requirement** | No PII stored outside Salesforce, GDPR compliance |
| **Implementation** | Agent is stateless; participant data is fetched, used, and discarded |
| **Logging** | Anonymized IDs only (Study ID + participant count, no names/emails in logs) |

### REQ-06: Error Handling & Fallbacks

| Aspect | Detail |
|--------|--------|
| **Requirement** | Notify RC on dependency failures |
| **Implementation** | Circuit breaker pattern per dependency; notification via email/Chat |
| **Dependencies Monitored** | Salesforce, Shortlisting Tool, Gemini (Vertex AI) |

---

## 6. Implementation Phases

### Phase 1 — Foundation (Weeks 1–3)

```
Week 1:
  ├── Set up GCP project and Vertex AI access
  ├── Create Salesforce connected app + OAuth credentials
  ├── Initialize project repository and CI/CD pipeline
  └── Define Salesforce data model mapping

Week 2:
  ├── Build API scaffold (FastAPI or Express)
  ├── Implement Salesforce authentication module
  ├── Develop Study ID validation endpoint
  └── Create SOQL queries for participant retrieval

Week 3:
  ├── Build candidate filtering logic (P0 extraction)
  ├── Define email templates with variable placeholders
  ├── Set up Cloud Pub/Sub for async processing
  └── Unit tests for all foundation components
```

**Deliverables:**
- Working Salesforce integration (read participants, validate Study IDs)
- API skeleton with health checks
- Email template definitions

### Phase 2 — Core Agent Logic (Weeks 4–6)

```
Week 4:
  ├── Integrate Gemini (Vertex AI) for email content generation
  ├── Build prompt engineering for invitation emails
  ├── Implement template-constrained generation
  └── Email content validation layer

Week 5:
  ├── Build email dispatch via Salesforce API (batch processing)
  ├── Implement 15-minute SLA timer with alerting
  ├── Develop case note update automation (child + parent)
  └── Build notification system for delays/failures

Week 6:
  ├── End-to-end workflow orchestration
  ├── Retry logic and dead-letter queue
  ├── Integration tests with Salesforce sandbox
  └── Performance testing (batch send throughput)
```

**Deliverables:**
- Functional email generation + sending pipeline
- Automated case updates
- SLA monitoring and alerting

### Phase 3 — UI & Observability (Weeks 7–8)

```
Week 7:
  ├── Build recruiter-facing UI (Study ID input, trigger button)
  ├── Status dashboard (in-progress, completed, failed)
  ├── Cross-RC ownership warning configuration
  └── Authenticated access via Google SSO

Week 8:
  ├── Logging and monitoring setup (Cloud Logging + Monitoring)
  ├── Audit trail dashboard
  ├── Error handling: circuit breakers for all dependencies
  ├── Alert routing (RC notifications)
  └── End-to-end smoke tests
```

**Deliverables:**
- Complete recruiter UI with status tracking
- Monitoring dashboards
- Full error handling and notification system

### Phase 4 — Testing & Hardening (Weeks 9–10)

```
Week 9:
  ├── UAT with test studies (dummy recipients)
  ├── Security review: PII handling audit
  ├── GDPR compliance verification
  ├── Load testing (concurrent study triggers)
  └── Edge case testing (0 participants, all rejects, SF outage)

Week 10:
  ├── Soft go-live: 1 recipient at a time
  ├── 5 studies × 5 recipients validation
  ├── Document UAT findings with screenshots
  ├── Present UAT findings to client
  └── Go/No-Go decision for full go-live
```

**Deliverables:**
- UAT report with evidence
- Security audit sign-off
- Go-live readiness assessment

---

## 7. Technical Decisions

| # | Decision | Options | Recommendation | Rationale |
|---|----------|---------|----------------|-----------|
| 1 | Email Sending | Salesforce API vs. External SMTP | **Salesforce API** | Maintains native audit trail, single system of record |
| 2 | AI Model | Gemini (Vertex AI) vs. Others | **Gemini 3.1 Pro** | Confirmed in Dev Sync — all AI must be Google products |
| 3 | Async Queue | Cloud Tasks / Pub/Sub / Inline | **Pub/Sub** | Handles retries, scales for batch sends, decouples components |
| 4 | Frontend | Standalone app vs. Embedded | **Embedded in existing tooling** | Reduces context switching for recruiters |
| 5 | State Management | Stateless vs. Workflow DB | **Lightweight state in Cloud SQL** | Track send status per study without storing PII |
| 6 | Email Send Mode | Auto-send after validation | **Auto-send post-validation** | Speed at scale, no manual preview bottleneck |

---

## 8. Recommended Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React or Angular (TBD) + Material UI | Recruiter-facing chatbot UI (typed commands, no speech) |
| **Backend API** | Python FastAPI (or Node.js Express) | Workflow orchestration |
| **AI / LLM** | Vertex AI — Gemini 3.1 Pro | Email content generation + intent classification |
| **Message Queue** | Google Cloud Pub/Sub | Async email dispatch + retries |
| **Database** | Cloud SQL (PostgreSQL) | Workflow state (no PII) |
| **CRM / Email** | Salesforce REST API | Data source, email sending, case updates |
| **Dashboards** | Looker Studio | Metrics reporting and KPI dashboards |
| **Monitoring** | Cloud Logging + Cloud Monitoring | Observability and alerting |
| **Data Sources** | Google Sheets API | Reading manual tracker spreadsheets |
| **Auth** | Google SSO | Authenticated access via Google SSO |
| **CI/CD** | Cloud Build / GitHub Actions | Automated deployment |

---

## 9. Data Flow & Integration Points

### Salesforce Integration

```
┌─────────────────────────────────────────┐
│            SALESFORCE OBJECTS            │
├─────────────────────────────────────────┤
│                                         │
│  Study (Custom Object)                  │
│  ├── Study_ID__c                        │
│  ├── Study_Name__c                      │
│  ├── UXR_Name__c                        │
│  └── Study_Type__c                      │
│                                         │
│  Case (Parent)                          │
│  ├── CaseNumber                         │
│  ├── Study_ID__c (lookup)               │
│  ├── Status                             │
│  └── Case_Notes__c                      │
│                                         │
│  Case (Child)                           │
│  ├── ParentId (lookup → Parent Case)    │
│  ├── Participant_Status__c (P0/P1/Rej/  │
│  │    Scheduling In Progress)           │
│  ├── Contact__c (lookup → Contact)      │
│  ├── Case_Notes__c                      │
│  ├── ICF_Link__c (URL, region-specific) │
│  ├── Preferred_Language__c              │
│  ├── Incentive_Type__c                  │
│  └── Incentive_Amount__c               │
│                                         │
│  Contact                                │
│  ├── Name                               │
│  ├── Email                              │
│  └── [Other participant details]        │
│                                         │
└─────────────────────────────────────────┘
```

> **Note**: Exact Salesforce object names and field mappings must be confirmed with the Salesforce admin team during Phase 1.

### Cross-System Key Mapping

The Salesforce Case `Id` (alphanumeric, 7-digit, starts with '500') is the common key between Salesforce and the Shortlisting Tool. The human-readable `CaseNumber` (also 7 digits) maps to this unique `Id`. All agent queries use the Case ID to correlate data across both systems.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check (includes dependency status) |
| `GET` | `/api/v1/studies/{study_id}/validate` | Validate Study ID exists in Salesforce |
| `GET` | `/api/v1/studies/{study_id}/candidates` | Fetch and filter P0 candidates |
| `POST` | `/api/v1/studies/{study_id}/send-invites` | Trigger invite workflow |
| `GET` | `/api/v1/studies/{study_id}/status` | Check workflow progress |
| `PUT` | `/api/v1/studies/{study_id}/bulk-update` | Bulk update preferred language, incentive type, incentive amount across all child cases |
| `POST` | `/api/v1/studies/{study_id}/schedule-send` | Schedule invite send for a future time |

### ICF Repository

The agent maintains an ICF form link repository, keyed by region. UXRs or admins can update links when form content changes. The agent reads the appropriate regional ICF link during the invite workflow and writes it to each child case.

---

## 10. Security & Compliance

### PII Handling Policy

| Principle | Implementation |
|-----------|---------------|
| **Data Minimization** | Agent fetches only required fields (name, email) at runtime |
| **No Persistence** | PII is never written to agent database, logs, or cache |
| **In-Transit Encryption** | All API calls over HTTPS/TLS 1.2+ |
| **At-Rest** | PII remains only in Salesforce (existing controls apply) |
| **Access Control** | Authenticated access via Google SSO; only authorized RCs can trigger |
| **Audit Logging** | Study ID + action + timestamp + anonymized counts only |

### Log Retention & TTL

Operational logs are retained for approximately 45 days (configurable). After TTL, a summary record is retained (study ID, RC, date, email count) while detailed logs are purged. This balances operational debugging needs with data minimization principles.

### GDPR Compliance Checklist

- [ ] No PII stored outside Salesforce
- [ ] Right to erasure: no agent-side data to delete
- [ ] Data processing agreement with Vertex AI (Gemini) — confirm PII is not used for model training
- [ ] Consent: participants have already consented to study communication via existing UXR enrollment
- [ ] Retention: no agent-side retention; Salesforce retention policies apply

---

## 10.5 Scheduled Sends

RC can instruct the agent to send invites at a future time (e.g., "tomorrow at 11 AM, check shortlisting tool and send 5 invites"). The agent creates a task, and at the scheduled time autonomously checks for candidates and sends. Key behaviors:

- RC specifies the time and the number of invites
- The agent validates the study ID and confirms the schedule with the RC
- At the scheduled time, the agent checks the shortlisting tool for available P0 candidates
- If sufficient candidates are available, the agent proceeds with the send workflow
- If insufficient candidates are found, the agent notifies the RC
- Scheduled tasks are visible in the dashboard and can be cancelled before execution

---

## 11. Error Handling Strategy

### Circuit Breaker Pattern

```
For each dependency (Salesforce, Gemini, Shortlisting Tool):

  CLOSED (Normal) ──[Failure threshold exceeded]──► OPEN (Failing)
       ▲                                                │
       │                                          [Timeout]
       │                                                │
       └────────────[Success]─── HALF-OPEN ◄────────────┘
                                (Test request)
```

### Error Scenarios & Responses

| Scenario | Detection | Response | Notification |
|----------|-----------|----------|-------------|
| Salesforce API down | Connection timeout / 5xx | Abort workflow, queue for retry | RC via email/Chat |
| Gemini API down | API error / timeout | Fallback to static template (no AI personalization) | RC informed of degraded mode |
| Invalid Study ID | 404 from Salesforce | Block workflow, show error in UI. On invalid Study ID, show the RC's recent active studies as clickable suggestions. | RC via UI message |
| No P0 candidates found | Empty filtered list | Abort gracefully, inform RC | RC via UI message |
| Partial email send failure | Per-email error tracking | Retry failed emails, report partial success | RC via dashboard + notification |
| SLA breach (>15 min) | Timer check | Alert at 10-min mark, escalate at 15 min | RC notified |
| Rate limit exceeded | 429 from Salesforce | Exponential backoff + retry | Logged, RC notified if SLA at risk |
| Concurrent RC on same case | Multiple RCs trigger for same study | Multiple RCs can work the same case. Candidate-level locking prevents duplicate sends. RCs share access with coordinated deduplication. | Both RCs see live status |
| No new P0 candidates | All P0 candidates already invited | Abort gracefully with message to RC | RC via UI message |

---

## 12. Risk Mitigation

| # | Risk | Likelihood | Impact | Mitigation Strategy |
|---|------|-----------|--------|-------------------|
| 1 | Salesforce API rate limits | Medium | High | Batch sends with throttling; use Bulk API for studies with >50 participants |
| 2 | Gemini generates incorrect email content | Medium | High | Template-constrained generation + content validation layer |
| 3 | 15-minute SLA breach | Low | Medium | Async parallel pipeline; pre-generate all emails before batch send |
| 4 | PII leakage in logs/cache | Low | Critical | Agent is stateless; automated PII scanning in CI/CD; security audit |
| 5 | Dependency outage (SF/Gemini) | Medium | High | Circuit breakers + graceful degradation + immediate notification |
| 6 | Approval delays (security, API access) | High | Medium | Start approval process in Week 1; parallel-track development on sandbox |
| 7 | Incorrect Salesforce field mappings | Medium | Medium | Dedicated discovery session with SF admin in Week 1 |
| 8 | Recruiter adoption resistance | Low | Medium | Simple UI (single input + single button); training session before go-live |
| 9 | Multiple RCs working same case simultaneously | Medium | High | Candidate-level locking (not study-level), per-candidate dedup check before send |

---

## 13. Success Metrics & Instrumentation

### KPI Targets (Post Go-Live, within 2 months)

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| **Study-Level Adoption** | 95% of studies use the agent | `(studies_using_agent / total_studies) × 100` per quarter |
| **Email-Level Adoption** | 98% of invite emails sent via agent | `(agent_emails / total_invite_emails) × 100` per quarter |
| **Uptime** | 99% (excluding dependency outages) | Health check monitoring; exclude tagged SF/Gemini/GWS outage windows |
| **Accuracy** | 98% email content + recipient accuracy | Sample audit: `(correct_emails / total_audited) × 100` |
| **Time Adherence** | TBD% within 1 hour of RC trigger | `(on_time_studies / total_studies) × 100` |

### Dashboard — Simple Active Studies View

The dashboard provides a simple active studies view showing:
- Study ID and study name
- Emails sent vs. required per study
- Simple progress bars per study

---

## 14. UAT & Quality Assurance Plan

### Phase 1: Dummy Test Cases (No Sandbox)

> **Note**: Per Dev Sync (Apr 8), the team will use dummy test cases instead of a dedicated Salesforce sandbox environment.

| Test | Description | Pass Criteria |
|------|-------------|---------------|
| Template accuracy | Generate emails for 10 test studies | 100% correct variable substitution |
| P0 filtering | Studies with mixed P0/P1/Reject | Only P0 candidates receive emails |
| Case updates | Verify child case updates (auto-created by Salesforce when candidates respond to outreach) + parent case updates | Cases updated with correct status, ICF link, and notes |
| Case updates | Verify child + parent case notes | Notes match expected format and content |
| Error handling | Simulate SF outage | RC notified within 2 minutes |
| SLA compliance | Send invites for 15-participant study | Completed within 15 minutes |
| Google Sheets read | Verify agent reads manual tracker data | Correct data extraction from sheets |
| Folder read | Verify agent reads specified folder contents | Correct file listing and data extraction |

### Phase 2: Soft Go-Live (Controlled)

| Step | Action | Validation |
|------|--------|-----------|
| 1 | Select 5 live studies | Diverse study types and participant counts |
| 2 | Send to 1 recipient per study | RC manually verifies email content, format, recipient |
| 3 | Expand to 5 recipients per study | Document results with screenshots |
| 4 | Review all 25 emails | Check content accuracy, formatting, case updates |
| 5 | Present findings to client | Go/No-Go decision |

### Phase 3: Full Go-Live

- Monitor dashboards (Looker Studio) for first 2 weeks
- Weekly accuracy audits for first month
- Gradual ramp: 25% → 50% → 75% → 100% of studies

---

## 15. Dev Sync Decisions (April 8, 2025 & April 10, 2026)

Key decisions and clarifications from the first Dev Sync meeting:

### Confirmed Tech Stack

| Component | Decision | Notes |
|-----------|----------|-------|
| AI Model | **Gemini 3.1 Pro** on Vertex AI | Confirmed — all AI must be Google products |
| Cloud | **GCP** | All infrastructure on Google Cloud |
| Dashboards | **Looker Studio** | For metrics and reporting only (not for agent UI) |
| Frontend | **React or Angular** (TBD) | Chatbot-style UI with typed commands (no speech/NLP) |
| Backend | **Python FastAPI** | Team strength in Python |

### Confirmed Workflow Clarifications

| Clarification | Detail |
|---------------|--------|
| P0 Selection | RC specifies exact invite count. Agent sends that many invites from newly shortlisted P0 candidates since last email run. |
| Child Cases | Child cases are **auto-created by Salesforce** when candidates respond. Agent **updates** child cases (status, ICF link, notes). |
| Delete Access | Agent has **NO delete operations** — read + write only |
| Data Sources | Shortlisting App + Salesforce + Google Sheets (manual trackers) + Specific folder |
| Sandbox | **No dedicated sandbox** — will use dummy test cases for testing |
| RC Interaction | Typed commands via chatbot interface — no natural speech recognition |
| Second Agent | Daily Update Agent may be bundled into same project (to be discussed) |
| ICF Link Management | Agent updates region-specific ICF link per child case, sourced from ICF repository (confirmed Apr 10) |
| Multi-Email Types | Invite, confirmation, ICF reminder, day-before reminder (scope expanded Apr 10) |
| Bulk Updates | Preferred language, incentive type, incentive amount — common across all child cases per study (confirmed Apr 10) |
| Multi-RC Access | Case not limited to one RC. Candidate-level locking replaces study-level locking (confirmed Apr 10) |
| Case ID Linkage | Salesforce Case ID (prefix '500') is common key to Shortlisting Tool (confirmed Apr 10) |

### Confirmed Data Sources

The agent must be able to read from:

1. **Salesforce** — Study data, case data, contact/participant data, outreach records
2. **Shortlisting App** — P0/P1/Reject candidate statuses
3. **Google Sheets** — Manual tracker spreadsheets used by recruiters
4. **Specific Folder** — File/folder reading capability (to be added to BRD)

---

## 16. Additional Data Sources

### Google Sheets Integration (NEW)

The agent must read manual Google Sheets trackers maintained by recruiters. This requires:

| Requirement | Implementation |
|-------------|---------------|
| Read tracker sheets | Google Sheets API v4 |
| Authentication | Service account with domain-wide delegation, or OAuth |
| Data extraction | Parse candidate info, study notes, manual tracking data |
| Sync frequency | On-demand (when agent is triggered) |

### Folder Reading (NEW)

The agent must read contents of a specific folder. Details TBD — to be added to BRD by Barakath.

| Requirement | Implementation Options |
|-------------|----------------------|
| Google Drive folder | Google Drive API v3 |
| GCS bucket | Cloud Storage client library |
| Shared network folder | Depends on infrastructure (TBD) |

---

## 17. Future Scope — Daily Update Agent

The Daily Update Agent is a separate, self-driven agent. It generates one summary per study (not mixed). Format to be provided by Barakath. Screenshots and recordings expected by Apr 15-16.

| Aspect | Detail |
|--------|--------|
| **Name** | Daily Update Agent |
| **Purpose** | Automate daily status updates for ongoing studies — one summary per study |
| **Type** | Self-driven agent (operates autonomously, not triggered by RC) |
| **Format** | To be provided by Barakath |
| **Status** | Screenshots and recordings expected by Apr 15-16 |
| **Dependency** | May share infrastructure, backend, and Salesforce connector with Email Agent |
| **Decision** | Whether to build as one package or separate — TBD |

If bundled, the shared components would be:
- Salesforce connector / API client
- Authentication layer (Google SSO)
- GCP infrastructure (Cloud Run, Pub/Sub)
- Monitoring & logging pipeline
- Looker Studio dashboards

---

## 18. Access & Onboarding Status

### Access Requests (as of April 8, 2025)

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| UX Ads LDAP / JFG mapping | Pending | Pilla Kumar | Determines SSO access to tools (Salesforce, Lucid, Asana, etc.) |
| Google laptop SSO | In progress | Team | Shubham collecting security key; joining from Apr 9 |
| Salesforce API access | Not started | Barakath | Need to confirm API access level, licensing, rate limits |
| Shortlisting App API | Not started | Barakath | Need to confirm API access types |
| Pantheon access | Not raised | Team | Needed for pod-level access |
| GCP Project / Vertex AI | Not started | Dev Lead | Requires project ID and quota |
| LDAP list submission | Pending | Barakath | To send LDAP IDs to internal Cognizant team |

### SSO & Tool Access Model

```
Google Laptop → SSO Login → LDAP Mapped to JFG (Job Function Group)
                                    │
                                    ▼
                    Auto-access to: Salesforce, Lucid App, Asana, etc.
```

---

## 19. Next Steps

### Immediate Actions (from Dev Sync Apr 8)

| # | Action Item | Owner | Target Date |
|---|------------|-------|-------------|
| 1 | Confirm whether to raise UX Ads access request | Pilla Kumar | Apr 9, 2025 |
| 2 | Include Pilla Kumar in access request list | Barakath | Apr 9, 2025 |
| 3 | Send LDAP IDs to internal Cognizant team | Barakath | Apr 8, 2025 |
| 4 | Update BRD with folder-reading requirement | Barakath | Apr 10, 2025 |
| 5 | Share UX Ads steps + email agent process doc with team | Barakath | Apr 10, 2025 |
| 6 | Arrange shadow session (manual email sending demo) | Barakath | Apr 11-14, 2025 |
| 7 | Check Shortlisting App + Salesforce API access types | Barakath | Apr 10, 2025 |
| 8 | Research Salesforce integrations by PEX team | Barakath | Apr 10, 2025 |
| 9 | Research how other AI teams handle SF connectivity | Dev Team | Apr 14, 2025 |
| 10 | Check Salesforce sandbox availability | Barakath | Apr 10, 2025 |
| 11 | Confirm SF API access level, licensing, rate limits | Barakath | Apr 10, 2025 |
| 12 | After shadow session — discuss and provide timeline estimation | Dev Team | Apr 14-18, 2025 |

### Actions from Dev Sync Apr 10

| # | Action Item | Owner | Target Date |
|---|------------|-------|-------------|
| 13 | Add Pravin Kumar Gupta to meeting invitations starting Monday | Barakath | Apr 13, 2026 |
| 14 | Share necessary access details, API details, and relevant lists with team | Barakath | Apr 13, 2026 |
| 15 | Schedule shadow session for daily update tasks workflow | Barakath | Apr 13, 2026 |
| 16 | Prepare and share 10-12 step manual process screenshots | Barakath | Apr 13, 2026 |
| 17 | Review 40-min screen recording of manual process (viewer access only — PII restricted) | Dev Team | Apr 13, 2026 |

### Development Kickoff Actions

| # | Action Item | Owner | Target Date |
|---|------------|-------|-------------|
| 13 | Initiate GCP project setup + Vertex AI access request | Dev Lead | Week 1 |
| 14 | Request Salesforce connected app + OAuth credentials | Dev Lead + SF Admin | Week 1 |
| 15 | Map Salesforce data model (Study → Case → Contact) | Dev Lead + SF Admin | Week 1 |
| 16 | Define email templates with operations team | PM + Ops Manager | Week 1-2 |
| 17 | Security & compliance review kickoff | PM + Security Team | Week 1 |
| 18 | Prototype: SF query + Gemini 3.1 Pro email generation | Dev Team | Week 2 |
| 19 | Decide on React vs Angular for frontend | Dev Team | Week 1 |

### Open Questions

| # | Question | Decision Needed By | Status |
|---|----------|--------------------|--------|
| 1 | Exact Salesforce object/field names for Study, Case, Contact? | SF Admin | Open |
| 3 | What is the acceptable time adherence % target? | PM + Ops | Open |
| 4 | Should P1 candidates get a separate (delayed) invitation wave? | UXR + Ops | Open |
| 5 | Fallback email template if Gemini is unavailable — who approves? | Ops + Sponsor | Open |
| 6 | React or Angular for frontend? | Dev Team | Open |
| 7 | What specific folder must the agent read? (format, location) | Barakath (BRD update) | Open |
| 8 | Which Google Sheets trackers must the agent read? | Barakath | Open |
| 9 | Can Daily Update Agent share infra with Email Agent? | PM + Dev Lead | Open |
| 10 | Has any PEX team member done Salesforce integration before? | Barakath | Investigating |
| 11 | What triggers the confirmation email — calendar booking event or manual RC action? | PM + Dev Lead | Open |
| 12 | Should reminder emails (ICF + day-before) be fully automated or require RC approval? | PM + Ops | Open |

---

## Appendix

### A. Glossary

| Term | Definition |
|------|-----------|
| **AHT** | Average Handling Time — total manual effort per study |
| **P0** | Primary candidate — highest priority for invitation |
| **P1** | Secondary candidate — backup if P0 declines |
| **RC** | Recruiter Coordinator |
| **UXR** | User Experience Researcher |
| **Study ID** | Unique identifier for a research study in Salesforce |

### B. Reference Documents

| Document | Location |
|----------|----------|
| Original BRD | Internal documentation system |
| Salesforce API Documentation | Salesforce Developer Docs |
| Vertex AI / Gemini API | Google Cloud Documentation |
| GDPR Compliance Guidelines | Internal compliance portal |

---

*This document is a living artifact and will be updated as technical discovery progresses and decisions are finalized.*
