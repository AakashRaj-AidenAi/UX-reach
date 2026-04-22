# Chat History — Capability Spec

## ADDED Requirements

### Requirement: Chat history SHALL persist across page reloads
Conversation messages SHALL be stored in `localStorage` keyed by the current `userName` and a versioned root key, and SHALL be restored on app load so the user sees their most recent conversation.

#### Scenario: Reload restores last conversation
- **GIVEN** a user has sent messages and received bot replies
- **WHEN** the user reloads the app
- **THEN** the chat screen renders the previously displayed messages in order
- **AND** a fresh welcome card is NOT re-emitted when a prior conversation exists

#### Scenario: Transient state is not persisted
- **GIVEN** a message with `isTyping: true` exists in memory
- **WHEN** persistence runs
- **THEN** the typing placeholder is omitted from the stored payload

### Requirement: Users SHALL be able to manage multiple conversations
The chat surface SHALL support multiple named conversations per user, with explicit "New chat" creation and selection of past conversations.

#### Scenario: New chat creates a fresh thread
- **WHEN** the user clicks "New chat"
- **THEN** a new `Conversation` is created with a unique id and empty message list
- **AND** subsequent messages land in the new conversation
- **AND** the previous conversation is still retrievable from the sidebar

#### Scenario: Auto-derived title
- **GIVEN** a new conversation has received its first user message "who responded to study 1234567"
- **THEN** the conversation's title becomes "who responded to study 1234567" (truncated to ≤40 chars on a word boundary)

#### Scenario: Selecting a past conversation
- **WHEN** the user clicks a prior conversation in the sidebar
- **THEN** the chat surface renders that conversation's messages
- **AND** further user prompts are appended to that selected conversation

### Requirement: Sidebar SHALL bucket conversations by recency
The chat history sidebar SHALL group conversations by `updatedAt` into Today / Yesterday / Earlier buckets, most recent first within each bucket.

#### Scenario: Bucketing
- **GIVEN** three conversations updated at 09:05 today, 16:30 yesterday, and five days ago
- **THEN** the sidebar renders "Today → (09:05 conversation)", "Yesterday → (16:30)", "Earlier → (5 days ago)"

### Requirement: Users SHALL be able to delete history
A single-conversation delete action and a "Clear all" action SHALL both be available, each gated by a confirmation step.

#### Scenario: Per-conversation delete
- **WHEN** the user clicks the trash icon on a conversation and confirms
- **THEN** that conversation is removed from storage and the sidebar
- **AND** the active message surface reverts to the most recent remaining conversation (or a fresh welcome card if none remain)

#### Scenario: Clear all
- **WHEN** the user confirms "Clear all"
- **THEN** all conversations for the current user are deleted from storage
- **AND** the chat surface resets with a fresh welcome card

### Requirement: Storage SHALL be versioned and bounded
History storage SHALL include a version prefix in the localStorage key, and SHALL evict the oldest conversations when the user accumulates more than 200.

#### Scenario: Unknown version on read
- **GIVEN** localStorage contains a key with a version prefix the app does not recognize
- **THEN** the app treats history as empty and does not crash

#### Scenario: Eviction cap
- **GIVEN** the user has 200 conversations already stored
- **WHEN** a new conversation is created
- **THEN** the oldest conversation is removed so the total stays at 200
