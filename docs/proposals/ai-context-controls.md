# AI Context Controls Architecture Proposal

**Status**: Draft Proposal  
**Author**: Development Team  
**Date**: December 2024

## Overview

This document proposes an architecture for giving users granular control over which notebook cells are included in AI context, enabling better token management, privacy control, and focused AI interactions.

## Background

Currently, AI cells in Anode have access to the entire notebook context without user control. This creates several challenges:

- **Token Limits**: Large notebooks may exceed AI model token limits
- **Privacy Concerns**: Users may want to exclude sensitive cells from AI
- **Focused Interactions**: AI responses may be better when limited to relevant context
- **Performance**: Reducing context size improves response speed and cost

## Goals

- **User Control**: Simple UI for including/excluding cells from AI context
- **Token Management**: Automatic handling of token limits with user feedback
- **Privacy**: Secure exclusion of sensitive content from AI requests
- **Performance**: Optimize AI response speed and cost through context control
- **Collaboration**: Context controls work seamlessly in multi-user environments

## Proposed Architecture

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

Cell-level context controls will be implemented as:
- Toggle button in cell header (eye icon for visibility)
- Visual indicator of inclusion/exclusion state
- Tooltip feedback for user understanding
- Integration with existing cell UI components

Specific UI implementation and styling to be determined during development.

#### Bulk Operations Toolbar

Notebook-level context controls will provide:
- Bulk operations for selected cells (include/exclude)
- Preset filters (code-only, recent cells, etc.)
- Integration with LiveStore events for persistence
- Clear visual feedback for bulk operations

Specific UI layout and interaction patterns to be designed during implementation.

### Context Building Logic

Context building logic will handle:
- Filtering cells based on inclusion preferences
- Formatting cells with source code and recent outputs
- Token estimation and limit management
- Auto-exclusion strategies when approaching limits
- Context truncation and user notification

Implementation details for context formatting, token estimation, and limit handling to be determined during development.

### Smart Context Suggestions

Smart context suggestions will implement:
- Relevance scoring based on keyword matching
- Cell type preferences for different prompt types
- Recency bonuses for recently executed cells
- Configurable relevance thresholds and limits
- Integration with user context preferences

Specific relevance algorithms and scoring mechanisms to be designed during implementation.

### Token Usage Feedback

Token usage feedback will provide:
- Visual progress indicator showing context usage
- Color-coded status (good/warning/danger)
- Numerical token counts for transparency
- Warning indicators when approaching limits
- Integration with AI cell interface

Specific UI design and warning thresholds to be determined during implementation.

## Default Behavior

### Initial State
- **All cells included by default** - Maintains current behavior
- **User can opt-out** rather than opt-in for ease of use
- **Smart suggestions** offered when approaching token limits

### Auto-Exclusion Rules
Auto-exclusion rules will be configurable and include:
- Large cell detection and automatic exclusion
- Age-based exclusion for old, less relevant cells
- Marker-based exclusion for user-tagged private content
- Token budget enforcement with smart prioritization

Specific rules, thresholds, and configuration mechanisms to be designed during implementation.

## Collaborative Behavior

### Multi-User Context
- **Personal context preferences** - Each user can have different inclusion settings
- **Shared notebook state** - But context controls are per-user, not global
- **Conflict resolution** - Not needed since context is per-user

### Implementation
User-specific context preferences will be stored separately from global notebook state, allowing each user to have personalized context settings without affecting others.

Implementation approach for user preference storage and synchronization to be determined.

## Implementation Plan

### Phase 1: Basic Cell Controls (1 week)
- [ ] Add context inclusion state to cell schema
- [ ] Implement cell-level toggle UI
- [ ] Create context building logic
- [ ] Add token usage indicator

### Phase 2: Bulk Operations (1 week)
- [ ] Implement notebook-level context controls
- [ ] Add bulk include/exclude operations
- [ ] Create preset filters (code-only, recent, etc.)
- [ ] Handle token limit auto-exclusions

### Phase 3: Smart Suggestions (1 week)
- [ ] Implement relevance calculation engine
- [ ] Add context suggestion UI
- [ ] Create auto-exclusion rules
- [ ] Performance optimization for large notebooks

### Phase 4: Multi-User Support (1 week)
- [ ] Implement per-user context preferences
- [ ] Add user preference persistence
- [ ] Handle collaborative scenarios
- [ ] Add sharing/importing of context settings

## Open Questions

### User Experience
- **Q**: Should context controls be visible by default or hidden in a menu?
- **Q**: How to handle context controls in read-only notebooks?
- **Q**: Should there be keyboard shortcuts for context operations?

### Token Management
- **Q**: How aggressive should auto-exclusion be when approaching limits?
- **Q**: Should users be warned before auto-exclusion happens?
- **Q**: How to handle different AI models with different token limits?

### Performance
- **Q**: How to efficiently calculate relevance for large notebooks?
- **Q**: Should context building be cached or computed fresh each time?
- **Q**: How to handle real-time context updates as cells change?

### Collaboration
- **Q**: Should there be an option to share context preferences between users?
- **Q**: How to handle notebooks with hundreds of collaborators?
- **Q**: Should admins be able to set default context policies?

## Success Metrics

- **User Adoption**: % of users who modify default context settings
- **Token Efficiency**: Reduction in context tokens while maintaining AI quality
- **User Satisfaction**: Positive feedback on AI response relevance
- **Performance**: Context building completes in < 500ms
- **Accuracy**: Smart suggestions match user selections 70%+ of time

## Related Features

This proposal enables several advanced AI features:
- **Focused AI Assistance**: AI responses tailored to specific code sections
- **Privacy-Aware AI**: Sensitive data automatically excluded
- **Cost Optimization**: Reduced token usage through smart context management
- **Multi-Model Support**: Different context strategies for different AI models

---

**Next Steps**: Begin Phase 1 implementation with basic cell-level context controls, focusing on simplicity and user control.