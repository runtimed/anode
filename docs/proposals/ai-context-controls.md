# AI Context Controls Architecture

**Status**: Implemented
**Author**: Development Team
**Date**: June 2025

## Overview

This document outlines the implemented architecture for giving users granular
control over which notebook cells are included in AI context, enabling better
token management, privacy control, and focused AI interactions.

## Achieved Goals

Anode now provides full user control over AI context. Users can include/exclude
any cell from AI context using visibility toggles. This addresses:

- **User Control**: Simple UI for including/excluding cells from AI context.
- **Token Management**: Automatic handling of token limits with user feedback (partially implemented).
- **Privacy**: Secure exclusion of sensitive content from AI requests.
- **Performance**: Optimize AI response speed and cost through context control.
- **Collaboration**: Context controls work seamlessly in multi-user environments.

## Current Architecture

### Cell-Level Context Controls

Each cell gets an inclusion state for AI context:

```typescript
interface CellContextState {
  cellId: string;
  includeInAiContext: boolean;
  contextReason?: string; // "user-excluded", "auto-excluded", "token-limit"
  lastModified: number;
  modifiedBy: string;
}
```

### LiveStore Schema Extensions

```typescript
// New events for context control
cellAiContextChanged: Events.synced({
  name: "v1.CellAiContextChanged",
  schema: Schema.Struct({
    cellId: Schema.String,
    includeInAiContext: Schema.Boolean,
    reason: Schema.optional(Schema.String),
    changedBy: Schema.String,
  }),
}),

// Bulk context operations
cellsAiContextBulkChanged: Events.synced({
  name: "v1.CellsAiContextBulkChanged",
  schema: Schema.Struct({
    cellIds: Schema.Array(Schema.String),
    includeInAiContext: Schema.Boolean,
    reason: Schema.String,
    changedBy: Schema.String,
  }),
}),
```

### UI Implementation

#### Cell-Level Controls

Cell-level context controls are implemented as:

- Toggle button in cell header (eye icon for visibility)
- Visual indicator of inclusion/exclusion state
- Tooltip feedback for user understanding
- Integration with existing cell UI components

#### Bulk Operations Toolbar

Notebook-level context controls provide:

- Bulk operations for selected cells (include/exclude)
- Preset filters (code-only, recent cells, etc.)
- Integration with LiveStore events for persistence
- Clear visual feedback for bulk operations

### Context Building Logic

Context building logic handles:

- Filtering cells based on inclusion preferences
- Formatting cells with source code and recent outputs
- Token estimation and limit management
- Auto-exclusion strategies when approaching limits
- Context truncation and user notification

### Smart Context Suggestions

Smart context suggestions implement:

- Relevance scoring based on keyword matching
- Cell type preferences for different prompt types
- Recency bonuses for recently executed cells
- Configurable relevance thresholds and limits
- Integration with user context preferences

### Token Usage Feedback

Token usage feedback provides:

- Visual progress indicator showing context usage
- Color-coded status (good/warning/danger)
- Numerical token counts for transparency
- Warning indicators when approaching limits
- Integration with AI cell interface

## Default Behavior

### Initial State

- **All cells included by default** - Maintains current behavior
- **User can opt-out** rather than opt-in for ease of use
- **Smart suggestions** offered when approaching token limits

### Auto-Exclusion Rules

Auto-exclusion rules are configurable and include:

- Large cell detection and automatic exclusion
- Age-based exclusion for old, less relevant cells
- Marker-based exclusion for user-tagged private content
- Token budget enforcement with smart prioritization

## Collaborative Behavior

### Multi-User Context

- **Personal context preferences** - Each user can have different inclusion settings
- **Shared notebook state** - But context controls are per-user, not global
- **Conflict resolution** - Not needed since context is per-user

### Implementation

User-specific context preferences are stored separately from global notebook
state, allowing each user to have personalized context settings without
affecting others.

## Outcomes

- **User Adoption**: % of users who modify default context settings
- **Token Efficiency**: Reduction in context tokens while maintaining AI quality
- **User Satisfaction**: Positive feedback on AI response relevance
- **Performance**: Context building completes in < 500ms
- **Accuracy**: Smart suggestions match user selections 70%+ of time

## Benefits

This feature enables several advanced AI capabilities:

- **Focused AI Assistance**: AI responses tailored to specific code sections
- **Privacy-Aware AI**: Sensitive data automatically excluded
- **Cost Optimization**: Reduced token usage through smart context management
- **Multi-Model Support**: Different context strategies for different AI models

---

_This design document reflects the current state as of the UI cleanup
initiative. It should be updated as the interface evolves._
