# Chat Guardrails — Capability Spec

## ADDED Requirements

### Requirement: Frontend SHALL enforce documented refusal scenarios deterministically
A `GuardrailsService` SHALL classify each user prompt against a static ruleset before any agent handler runs. Blocked prompts SHALL render the canonical refusal text and SHALL NOT reach the Query Agent backend.

#### Scenario: Template modification refused
- **WHEN** the user sends "Modify the invite email template to be more modern"
- **THEN** the chat renders the exact refusal "Sorry, I am not allowed to modify the template"
- **AND** no backend call is made

#### Scenario: Case assignment refused
- **WHEN** the user sends "Assign me case 3334445"
- **THEN** the chat renders "Please contact your team lead for this"
- **AND** no backend call is made

#### Scenario: Ownership change refused
- **WHEN** the user sends "Change the UXR on study 1234567 to Sean X"
- **THEN** the chat renders "Please contact your team lead for this"

#### Scenario: Candidate deletion refused
- **WHEN** the user sends "Remove candidate 998877 from study 1234567"
- **THEN** the chat renders "Sorry, I cannot delete records from Salesforce"

#### Scenario: Bulk override refused
- **WHEN** the user sends "Send invites to all 200 shortlisted candidates right now"
- **THEN** the chat renders the P0-first-20 refusal with a contact-team-lead suggestion

### Requirement: Refusals SHALL be badged as Query Agent responses
A refused prompt SHALL produce a bot message tagged `agent: 'query'` so users see a consistent "Query Agent" badge regardless of which rule fired.

#### Scenario: Badge on refusal
- **WHEN** any guardrail refuses a prompt
- **THEN** the rendered message displays the "Query Agent" badge above its content

### Requirement: Refusals SHALL be audit-logged
Every refusal SHALL be recorded via `AuditService.recordRefusal(category, prompt)` so stakeholders can inspect the refusal history.

#### Scenario: Audit log entry
- **GIVEN** a user issues a refused prompt
- **THEN** an entry appears in the audit surface indicating category, timestamp, and the (sanitized) prompt text

### Requirement: Guardrails SHALL run before stateful command handlers
The guardrail check SHALL execute as the first step in `processCommand`, before picker-open, awaiting-confirm, or any agent dispatch, so unsafe phrases do not accidentally fall through via a state transition.

#### Scenario: Refusal during awaiting_confirm
- **GIVEN** the chat is in `awaiting_confirm` state for an invite send
- **WHEN** the user sends "Modify the template"
- **THEN** the guardrail refusal renders
- **AND** the chat state remains `awaiting_confirm` (so the user can still type "send" afterward)

### Requirement: Guardrails SHALL be independent of backend availability
Refusals SHALL render identically whether the backend at `localhost:8000` is reachable or not.

#### Scenario: Offline refusal
- **GIVEN** the backend is unreachable
- **WHEN** a refused prompt is sent
- **THEN** the documented refusal text renders (NOT the generic connection error)

### Requirement: Guardrail rules SHALL be testable as pure data
The ruleset SHALL be exported as a plain array of `GuardrailRule` records so each canonical prompt from the stakeholder sheet can be asserted against it. In development mode, these assertions SHALL run at service instantiation and log mismatches to the console.

#### Scenario: Ruleset self-check in dev
- **GIVEN** the app is running in development
- **WHEN** `GuardrailsService` initializes
- **THEN** each of the 20 canonical prompts is matched against its expected rule id, and any mismatch is logged as a console warning

#### Scenario: Ruleset opaque in production
- **GIVEN** the app is running in production
- **THEN** the self-check SHALL NOT run (no console output or performance cost)
