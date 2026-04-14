# UXReach Invite Email Agent — Technical Design Document

> **Project**: UXReach — Invite Email Agent
> **Version**: v2.1
> **Date**: April 14, 2026
> **Prepared by**: Aakash R (Dev Lead)
> **For**: Barakath Ahmed S. (Process Excellence) → Google UX Ads Client

---

## 1. Executive Summary

The Invite Email Agent is an AI-powered conversational tool that automates the candidate invitation workflow (Step 07) in the UXR study lifecycle. It reduces manual email invitation effort from ~7.5 hours per study to under 15 minutes through intelligent automation.

**Architecture**: Hybrid — External UI + Master Agent orchestration + Salesforce as System of Record + Gemini 3.1 Pro for AI capabilities.

---

## 2. Where AI Is Used

This section identifies every point in the system where AI (Gemini 3.1 Pro / Gemini Flash) is used, and why.

### 2.1 Conversational Interface (Intent Classification)

| Aspect | Detail |
|--------|--------|
| **AI Model** | Gemini Flash (lightweight, <200ms response) |
| **What it does** | Classifies RC's typed commands into action types |
| **How it works** | RC types natural language like "send 10 invites for study 1234567". Gemini Flash classifies the intent as SEND, STATUS, SCHEDULE, or UNCLEAR |
| **Why AI** | RCs don't use rigid command syntax. AI understands variations like "send invites", "fire off 10 emails", "start study 1234567" |
| **Fallback** | Keyword-based regex matching as backup — always functional even if Gemini is unavailable |
| **Autonomous decision** | The agent decides which sub-agent to route to (Invite Agent vs Status Agent) without human intervention |

### 2.2 Email Content Generation (Personalization)

| Aspect | Detail |
|--------|--------|
| **AI Model** | Gemini 3.1 Pro |
| **What it does** | Generates personalized invite emails per participant using study context |
| **How it works** | Takes the Salesforce email template (pre-configured), study details (name, researcher), and participant information. Gemini personalizes the content while maintaining template structure |
| **Why AI** | Each email needs unique personalization — manually writing 15-25 emails per study takes 60+ minutes. AI reduces this to seconds |
| **Fallback** | Pre-approved static template when Gemini is unavailable — workflow continues without AI personalization |
| **Autonomous decision** | Gemini decides how to personalize within template constraints. No human approval needed per-email |

### 2.3 Content Validation (Quality Gate)

| Aspect | Detail |
|--------|--------|
| **AI Model** | Gemini 3.1 Pro |
| **What it does** | Validates generated email content before sending |
| **How it works** | Checks template structure, variable substitution completeness, tone consistency, and brand compliance |
| **Why AI** | Rule-based validation misses nuance — AI catches malformed sentences, missing variables, off-brand tone that regex cannot detect |
| **Fallback** | If validation fails for a specific email, that email falls back to the static template. RC is notified |
| **Autonomous decision** | Agent decides pass/fail for each email without RC intervention |

### 2.4 Scheduled Task Execution (Agentic Autonomy)

| Aspect | Detail |
|--------|--------|
| **AI Model** | Gemini 3.1 Pro (task planning) |
| **What it does** | Interprets scheduling instructions and creates timed execution tasks |
| **How it works** | RC says "tomorrow at 11 AM, check shortlisting tool and send 5 invites for study 1234567." Agent parses the time, creates a scheduled task, and at the specified time: checks the shortlisting tool for newly shortlisted candidates, selects P0 candidates, generates emails, and sends — all autonomously |
| **Why AI** | Natural language time parsing ("tomorrow morning", "next Monday at 2 PM", "in 3 hours"). Agent plans and executes a multi-step task without human presence |
| **Fallback** | If scheduling fails, the task is not created and RC is notified immediately |
| **Autonomous decision** | At scheduled time, the agent independently checks shortlisting tool, selects candidates, generates content, and sends emails — fully autonomous execution |

### 2.5 Smart Error Recovery (Contextual Suggestions)

| Aspect | Detail |
|--------|--------|
| **AI Model** | Gemini Flash |
| **What it does** | When an RC enters an invalid study ID, instead of just showing an error, the agent suggests the RC's recent active studies |
| **How it works** | Queries the RC's active studies from Salesforce and presents them as options |
| **Why AI** | AI understands context — the RC likely made a typo. Showing relevant alternatives is more helpful than a blank error |
| **Fallback** | Simple error message if study list cannot be retrieved |
| **Autonomous decision** | Agent decides to show suggestions proactively |

---

## 3. Where AI Is NOT Used (By Design)

These operations use deterministic logic for reliability and auditability:

| Operation | Approach | Reason |
|-----------|----------|--------|
| **Email Dispatch** | Salesforce SingleEmailMessage API | Sending is a critical action — must be 100% reliable, no AI unpredictability |
| **Case Updates** | Salesforce REST API (structured writes) | Status transitions follow fixed rules — no interpretation needed |
| **Candidate Filtering** | SOQL query + rule-based filter | P0 selection is rule-based (status = P0, not already invited, ordered by date). No AI judgment in who gets invited |
| **Audit Logging** | Cloud SQL direct writes | Numbers must be exact — no approximation. Immutable records |
| **Email Signature** | Template injection (sending RC's name) | Deterministic — whoever triggers the send, their name appears in the signature |
| **Cross-RC Validation** | Lookup against study owner field | Simple field comparison — no AI needed |

---

## 4. System Architecture Overview

### 4.1 Layered Architecture

```
Layer 1 — User Interface (React + Material UI)
    ├── Chatbot Interface (typed commands)
    ├── Study Input (ID validation)
    ├── Dashboard (active studies, progress)
    ├── Settings (delegation, scheduling)
    └── Audit Trail (run history)

Layer 2 — Chatbot & Intent Router (FastAPI + WebSocket)
    ├── Chat Interface (real-time messaging)
    ├── Intent Classifier (Gemini Flash → SEND/STATUS/SCHEDULE)
    ├── Auth Middleware (Google SSO)
    └── Rate Limiter (candidate-level locks)

Layer 3 — Multi-Agent System (Master + Sub-Agents)
    ├── Master Agent (Orchestrator)
    │   ├── Shared Context (Study ID, RC identity)
    │   ├── Candidate-level Locks & Dedup
    │   ├── Timer & Monitoring
    │   ├── Circuit Breaker Decisions
    │   └── Audit Trail Logging
    ├── Sub-Agent 1: Invite Agent (ACTION)
    │   └── 12-step invite workflow
    └── Sub-Agent 2: Status Agent (QUERY)
        └── 6 query capabilities

Layer 4 — Backend Services (Python FastAPI + Cloud Run)
    ├── Workflow Engine (state machine, idempotency)
    ├── Email Builder (template + AI generation)
    ├── Dispatch Queue (Cloud Pub/Sub, batch of 5)
    └── Notification Service (Email / Google Chat)

Layer 5 — External Integrations
    ├── Salesforce (System of Record, Email API, Cases)
    ├── Vertex AI / Gemini 3.1 Pro (Email gen, Intent, Validation)
    ├── Shortlisting App (P0/P1 candidates, Case ID linkage)
    ├── Cloud SQL (workflow state, audit — no PII)
    ├── Google Sheets (RC tracker spreadsheets)
    ├── Google Drive (folder reading per study)
    ├── Cloud Pub/Sub (async dispatch, retry, DLQ)
    └── Looker Studio (KPI reporting)
```

### 4.2 Invite Agent Workflow (12 Steps)

| Step | Action | AI Used? |
|------|--------|----------|
| 1 | Validate Study ID in Salesforce | No — SOQL query |
| 2 | Check cross-RC ownership | No — field comparison |
| 3 | Fetch candidates from Shortlisting App | No — API call |
| 4 | Filter P0 candidates (RC-specified count) | No — rule-based filter |
| 5 | Read Google Sheets trackers | No — Sheets API |
| 6 | Read Google Drive folder contents | No — Drive API |
| 7 | Generate email content | **Yes — Gemini 3.1 Pro** |
| 8 | Validate email content | **Yes — Gemini 3.1 Pro** |
| 9 | Confirm with RC (or schedule for later) | **Yes — NLP parsing for scheduling** |
| 10 | Batch send via Salesforce Email API | No — direct API call |
| 11 | Update child cases + parent case notes | No — Salesforce REST |
| 12 | Log audit trail, report to Master Agent | No — direct DB write |

### 4.3 Status Agent Capabilities (6 Queries)

| Query | Description | AI Used? |
|-------|-------------|----------|
| Study invite status | Lookup sent/required/remaining for a study | No |
| Email delivery tracking | Per-email sent/failed status | No |
| Pending studies | Studies needing invites | No |
| Daily activity summary | Today's sends and failures | No |
| Failure reports | Details on failed emails | No |
| Report to Master | Return results for RC display | No |

---

## 5. Data Flow

### 5.1 Invite Email Flow

```
RC types "send 10 invites for study 1234567"
    │
    ▼
[Gemini Flash] — Intent Classification → SEND
    │
    ▼
Master Agent receives intent
    │
    ├── Health Check: Ping SF ✅ + Gemini ✅ + Shortlisting ✅
    │
    ├── Validate Study ID in Salesforce
    │   └── Check ownership → warn if different RC
    │
    ├── Fetch P0 candidates from Shortlisting App
    │   └── via Case ID (500-prefix) linkage
    │
    ├── Filter: RC requested 10, exclude already-invited → 10 new P0s
    │
    ├── [Gemini 3.1 Pro] — Generate personalized email for each candidate
    │   └── Template-constrained prompt → personalized body
    │
    ├── [Gemini 3.1 Pro] — Validate each email
    │   ├── Pass → queue for sending
    │   └── Fail → use static template fallback
    │
    ├── RC confirms → Send (or schedule for later)
    │
    ├── Batch send via Salesforce Email API (batches of 5)
    │   ├── Per-email status tracking
    │   ├── Retry on failure (3x, exponential backoff)
    │   └── Dead-letter queue for persistent failures
    │
    ├── Update Salesforce:
    │   ├── Child case status → "Scheduling In Progress"
    │   ├── ICF link (region-specific, auto-resolved)
    │   ├── Incentive/language fields (bulk update)
    │   ├── Parent case notes
    │   └── Email signature = sending RC's name
    │
    └── Log audit trail (Study ID, RC, count, recipients, timestamp)
```

### 5.2 Scheduled Send Flow

```
RC types "tomorrow at 11 AM send 5 invites for study 1234567"
    │
    ▼
[Gemini 3.1 Pro] — Parse scheduling intent
    │
    ├── Extract: count=5, study=1234567, time=tomorrow 11:00 AM
    │
    ├── Create scheduled task in Cloud SQL
    │
    ├── Confirm to RC: "Scheduled: 5 invites for Apr 15 at 11:00 AM"
    │
    └── At scheduled time (autonomous):
        ├── Check Shortlisting Tool for current P0 list
        ├── Select 5 newly shortlisted candidates
        ├── Generate emails (Gemini)
        ├── Send via Salesforce
        ├── Update cases
        └── Notify RC of completion
```

---

## 6. Cross-System Key Mapping

```
Salesforce                          Shortlisting App
─────────                          ────────────────
CaseNumber: 1234567          →     URL: adsux-er.corp.google.com/study/
Case Id:    500Kf00000qU5TclAK     500Kf00000qU5TclAK/short-listing
                ↕
        COMMON KEY (500-prefix)
```

The Salesforce Case `Id` (alphanumeric, starts with '500') is the join key between Salesforce case records and the Shortlisting Tool's candidate data.

---

## 7. Security & Compliance

| Aspect | Implementation |
|--------|---------------|
| **Authentication** | Google SSO via LDAP/JFG mapping |
| **PII Storage** | Salesforce only — agent stores zero PII |
| **Logs** | Anonymized — Study ID + RC + count + timestamp only |
| **Log Retention** | ~45 days (configurable), summary retained post-purge |
| **Encryption** | HTTPS / TLS 1.2+ for all connections |
| **Data Access** | Read + Write only — NO delete operations in Salesforce |
| **Email Signature** | Uses sending RC's name (not study owner) |
| **Cross-RC Access** | Configurable — warning shown when accessing another RC's study |
| **GDPR** | Stateless agent, no persistent PII, no agent-side retention |

---

## 8. Error Handling

| Scenario | Detection | Response | AI Involved? |
|----------|-----------|----------|-------------|
| Invalid Study ID | SF returns 404 | Show RC's recent studies as suggestions | Yes (contextual) |
| Different RC's study | Owner field mismatch | Warning: "This study is worked on by [Name]" | No |
| Gemini API down | Timeout / 5xx | Circuit breaker → fallback to static template | N/A (AI is down) |
| Partial email failure | Per-email tracking | Auto-retry 3x (exponential backoff) → flag failed | No |
| Shortlisting App down | Connection failure | Block workflow, notify RC | No |
| Google Sheets unreadable | API error | Log warning, proceed without Sheets data | No |
| Scheduled task fails | Execution error | Notify RC, log failure | No |

---

## 9. AI Summary Matrix

| AI Capability | Model | Where Used | Autonomous? | Fallback |
|--------------|-------|------------|-------------|----------|
| Intent Classification | Gemini Flash | Chat input → agent routing | Yes | Keyword regex |
| Email Personalization | Gemini 3.1 Pro | Per-participant email body | Yes | Static template |
| Content Validation | Gemini 3.1 Pro | Post-generation quality check | Yes | Static template |
| Schedule Parsing | Gemini 3.1 Pro | Time/date extraction from text | Yes | Error + manual retry |
| Smart Suggestions | Gemini Flash | Invalid ID → show alternatives | Yes | Plain error message |
| Task Execution | Gemini 3.1 Pro | Autonomous scheduled sends | Yes | Notification of failure |

**Total AI decision points**: 6
**Total autonomous actions**: 6 (all with deterministic fallbacks)

---

## 10. Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React + Material UI | Chatbot, Dashboard, Settings |
| Backend | Python FastAPI | API server, workflow orchestration |
| Hosting | Google Cloud Run | Serverless container hosting |
| AI | Vertex AI — Gemini 3.1 Pro + Flash | Email gen, intent, validation, scheduling |
| Database | Cloud SQL (PostgreSQL) | Workflow state, audit (no PII) |
| Queue | Google Cloud Pub/Sub | Async email dispatch, retry, DLQ |
| CRM/Email | Salesforce REST API | System of Record, email sending |
| Dashboards | Looker Studio | KPI reporting (linked) |
| Monitoring | Cloud Logging + Cloud Monitoring | Observability, alerting |
| Auth | Google OAuth / Corporate SSO | LDAP/JFG-based authentication |
| CI/CD | Cloud Build / GitHub Actions | Automated build & deploy |

---

## 11. Open Items (Pending from Client)

| Item | Status | Owner |
|------|--------|-------|
| Multi-language support for global studies | Barakath checking | Barakath |
| Parent case flag for language indication | Pending | Barakath |
| Daily Update Agent format and screenshots | Expected Apr 15-16 | Barakath |
| Log retention TTL (exact duration) | Pending confirmation | Barakath |
| Salesforce API access credentials | Not started | Barakath |
| Shortlisting App API access | Not started | Barakath |
| GCP / Vertex AI project provisioning | Not started | Dev Team |

---

*This document should be shared with Barakath Ahmed S. for review and forwarding to the Google UX Ads client. Comments and feedback welcome.*
