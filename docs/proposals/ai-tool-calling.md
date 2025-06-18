# AI Tool Calling Architecture Proposal

**Status**: Draft Proposal  
**Author**: Development Team  
**Date**: June 2025

## Overview

This document proposes an architecture for enabling AI to actively participate in notebook development through OpenAI function calling, allowing AI to create cells, modify content, execute code, and access user-extensible functions within the kernel space.

## Background

Currently, Anode's AI integration is read-only - AI can analyze notebook content and provide responses, but cannot modify the notebook or execute actions. This limits AI's usefulness as an active development partner.

## Goals

- **Active AI Partnership**: Enable AI to create, modify, and execute notebook cells
- **User Extensibility**: Allow users to define custom functions that AI can discover and use
- **Security & Control**: Provide user confirmation workflows for destructive operations
- **Collaborative Awareness**: AI actions work seamlessly in multi-user environments

## Proposed Architecture

### Core Approach: OpenAI Function Calling

Use OpenAI's native function calling rather than manual parsing:

Functions for notebook manipulation will include:
- Cell creation, modification, and deletion
- Cell execution and movement
- Context analysis and variable inspection
- File operations and data access

Specific function signatures and parameters to be determined during implementation.

### User-Extensible Functions

Enable users to define custom functions within kernel space that AI can discover and use:

Users will be able to register custom functions that AI can discover and call through a decorator-based API. The exact registration mechanism and function discovery protocol to be designed during implementation.

### Function Discovery Mechanism

The kernel will implement a function registry that can discover both built-in notebook functions and user-registered custom functions. Implementation details for function discovery and invocation to be determined.

## Event Flow Architecture

### 1. AI Function Call Request
```typescript
// AI initiates function call
aiToolCallRequested: Events.synced({
  name: "v1.AiToolCallRequested",
  schema: Schema.Struct({
    callId: Schema.String,
    cellId: Schema.String, // Originating AI cell
    functionName: Schema.String,
    arguments: Schema.Any,
    requestedBy: Schema.String,
    requiresConfirmation: Schema.Boolean,
  }),
})
```

### 2. User Confirmation (Optional)
```typescript
// For destructive operations
aiToolCallConfirmed: Events.synced({
  name: "v1.AiToolCallConfirmed", 
  schema: Schema.Struct({
    callId: Schema.String,
    approved: Schema.Boolean,
    confirmedBy: Schema.String,
  }),
})
```

### 3. Function Execution
```typescript
// Kernel executes the function
aiToolCallExecuted: Events.synced({
  name: "v1.AiToolCallExecuted",
  schema: Schema.Struct({
    callId: Schema.String,
    result: Schema.Any,
    status: Schema.Literal("success", "error"),
    error: Schema.optional(Schema.String),
  }),
})
```

## Built-in Function Categories

### Notebook Manipulation
- `create_cell(type, content, position?)` 
- `modify_cell(cellId, content)`
- `delete_cell(cellId)` ⚠️ Requires confirmation
- `move_cell(cellId, newPosition)`
- `execute_cell(cellId)`

### Code Analysis  
- `get_notebook_context()` - Get current notebook state
- `get_cell_outputs(cellId)` - Get specific cell results
- `get_variables()` - List available variables
- `inspect_variable(varName)` - Get variable details

### Data Operations
- `read_file(path)` - Read file content
- `list_files(directory?)` - List directory contents  
- `save_data(data, filename)` - Save data to file

## Security & Confirmation Model

### Risk-Based Confirmation

Functions will be categorized by risk level:
- **Destructive operations** - Always require user confirmation
- **Modify operations** - May require confirmation based on context
- **Safe operations** - No confirmation needed

Specific categorization and confirmation workflows to be defined during implementation.

### User Confirmation UI

User confirmation will be implemented through dialog UI that shows:
- Function being called and its arguments
- Risk assessment and description
- Clear confirm/cancel options

Specific UI design to be determined during implementation.

## Implementation Plan

### Phase 1: Core Function Calling (2 weeks)
- [ ] Implement basic notebook manipulation functions
- [ ] Add OpenAI function calling to AI cells
- [ ] Create confirmation dialog UI
- [ ] Wire up LiveStore events for tool calls

### Phase 2: User-Extensible Functions (2 weeks)  
- [ ] Create `anode_ai` Python module for function registration
- [ ] Implement function discovery mechanism in kernel
- [ ] Add function documentation and parameter validation
- [ ] Test custom function calling end-to-end

### Phase 3: Advanced Features (1 week)
- [ ] Add undo/redo for AI actions
- [ ] Implement batch operations
- [ ] Add function call history and debugging
- [ ] Performance optimization and caching

## Open Questions

### Function Registry Management
- **Q**: How to handle function versioning and updates?
- **Q**: Should functions persist across kernel restarts?
- **Q**: How to handle function naming conflicts?

### Collaborative Scenarios  
- **Q**: What happens when AI tries to modify cells being edited by others?
- **Q**: Should AI actions be attributed to the user who requested them?
- **Q**: How to handle conflicting AI tool calls from multiple users?

### Error Handling
- **Q**: How to gracefully handle function execution failures?
- **Q**: Should AI be notified of function call errors for retry?
- **Q**: How to debug custom user functions?

### Performance Considerations
- **Q**: How to handle long-running function calls?
- **Q**: Should there be timeouts or cancellation mechanisms?
- **Q**: How to prevent AI from overwhelming the system with calls?

## Success Metrics

- **Function Coverage**: AI can perform 90% of common notebook operations
- **User Adoption**: Users create and use custom functions regularly  
- **Error Rate**: < 5% of function calls result in errors
- **User Satisfaction**: Positive feedback on AI collaboration experience

## Related Work

This proposal builds on:
- **OpenAI Function Calling**: Standard approach for tool use
- **Jupyter Kernel Protocol**: Message-based execution model
- **LiveStore Events**: Collaborative event sourcing
- **User Extensibility**: Plugin architecture patterns

## Next Steps

1. **Review & Approve**: Get team consensus on architecture approach
2. **Prototype**: Build minimal viable function calling system
3. **User Testing**: Validate with real development workflows
4. **Iterate**: Refine based on user feedback and usage patterns

---

**Note**: This proposal focuses on OpenAI function calling as the primary mechanism. Alternative approaches (manual parsing, other AI providers) can be added later using the same architectural foundation.