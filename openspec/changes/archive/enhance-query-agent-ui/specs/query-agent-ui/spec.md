# Query Agent UI — Capability Spec

## ADDED Requirements

### Requirement: Study Progress Flow SHALL open the study picker in single-select mode
When the user's prompt matches a study-progress intent (keywords: `progress`, `status`, `funnel`, `how is study`), the chat engine SHALL open the study picker configured for **single study selection with no count entry**, then forward the selected study id to the Query Agent.

#### Scenario: Single-select progress prompt
- **WHEN** the user sends `study progress 1234567` or `how is study 1234567 doing`
- **THEN** the picker opens with the matching study preselected and the count row hidden
- **AND** on submit the chat engine sends `Study progress: 1234567` to the Query Agent endpoint

#### Scenario: Progress prompt without a study id
- **WHEN** the user sends `study progress` with no id
- **THEN** the picker opens listing all active studies for the RC in single-select mode
- **AND** the submit button stays disabled until exactly one study is selected

### Requirement: Agent routing SHALL be explicit and testable
The chat engine SHALL route each user prompt to exactly one agent via a named `determineAgent(prompt)` function returning `AgentType` (`'invite' | 'query' | 'scheduler'`). Regex matching SHALL NOT live inline in `processCommand()`.

#### Scenario: Invite intent routes to Invite Agent
- **WHEN** `determineAgent('send invites to 10 candidates in study 1234567')` is called
- **THEN** it returns `'invite'`

#### Scenario: Query intent routes to Query Agent
- **WHEN** `determineAgent('how many booked in 1234567')` is called
- **THEN** it returns `'query'`

#### Scenario: Ambiguous prompt defaults to Query Agent
- **WHEN** the prompt matches no keyword set
- **THEN** `determineAgent` returns `'query'` (free-text Q&A fallback)

### Requirement: Study picker SHALL validate counts before submit
The study picker SHALL disable its submit button whenever any selected study row has a count of `0`, except in single-select progress mode where no count is required.

#### Scenario: Zero count blocks submit
- **GIVEN** a user selects study 1234567 and leaves count at `0`
- **THEN** the submit button is disabled
- **AND** a helper hint shows "Enter a count > 0"

#### Scenario: Progress mode bypasses count check
- **GIVEN** the picker is in progress mode and a study is selected
- **THEN** the submit button is enabled regardless of count

### Requirement: Study picker SHALL refresh when study state changes
The study picker SHALL re-fetch active studies whenever `AppState.studyListVersion` changes, so users see up-to-date remaining counts after a send completes.

#### Scenario: Refresh after send
- **GIVEN** the user completes a send through the Invite Agent
- **WHEN** they reopen the study picker
- **THEN** the picker reflects the updated `remaining` counts for each study

### Requirement: Query Agent SHALL degrade gracefully on backend failure
When the Query Agent backend is unreachable, the chat engine SHALL serve the last-known cached response for the requested study with a timestamp banner, rather than showing only an error toast.

#### Scenario: Backend offline, cache available
- **GIVEN** a prior Query Agent response for study 1234567 is in `AppState.queryCache`
- **WHEN** the backend call fails
- **THEN** the chat shows the cached funnel with banner "Last updated: {timestamp} — live status unavailable"

#### Scenario: Backend offline, no cache
- **WHEN** no cached response exists for that study
- **THEN** the chat shows a friendly message and a retry button

### Requirement: Unified Study Progress component SHALL render the full funnel
A `study-progress` component SHALL render the funnel stages: Invited, Responded, Booked, ICF Signed, Confirmed — with counts and percentages. It SHALL be used by both the Query Agent chat response and the dashboard progress tile.

#### Scenario: Funnel renders with data
- **GIVEN** a `StudyProgress` object with counts for all five stages
- **THEN** the component renders five stage rows with count + percent-of-invited
- **AND** the dashboard tile and chat message use the same component instance type

### Requirement: Assistant messages SHALL indicate which agent replied
Assistant chat bubbles SHALL display a small badge identifying the responding agent (`Invite Agent` or `Query Agent`) when the `agent` field is set on the message.

#### Scenario: Query Agent reply shows badge
- **WHEN** the Query Agent returns a response to `study progress 1234567`
- **THEN** the rendered assistant message displays a "Query Agent" badge above the content
