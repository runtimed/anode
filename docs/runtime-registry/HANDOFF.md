# Runtime Registry Handoff Document

**Date**: January 2025  
**Status**: Analysis Complete, Ready for Implementation  
**Next Owner**: TBD

## Executive Summary

The current runtime registry system (`src/runtime/registry/`) reimplements runtime management instead of leveraging the mature `@agent-core` package. This creates duplicate abstractions, missing features, and architectural inconsistencies. A complete redesign is needed to build on the proven `RuntimeAgent` foundation.

## Current State Analysis

### What Exists Now

- **Location**: `anode/src/runtime/registry/`
- **Implementation**: Custom `BaseRuntime` class with inheritance hierarchy
- **Status**: Functional but architecturally problematic
- **Features**: Basic HTML runtime, placeholder Python/external runtimes

### Key Problems Identified

1. **Duplicate Abstractions**
   - Custom `BaseRuntime` vs proven `RuntimeAgent` from `@agent-core`
   - Custom `RuntimeConfiguration` vs validated `RuntimeConfig`
   - Manual state tracking vs event-sourcing patterns

2. **Poor LiveStore Integration**
   - Basic `commit()` and `query()` usage
   - Missing reactive materialized state
   - No proper event-sourcing patterns

3. **Missing Advanced Features**
   - No artifact upload system for large outputs
   - No streaming terminal/markdown outputs
   - No AI tool calling framework
   - No OpenTelemetry logging/monitoring

4. **Maintenance Burden**
   - Custom configuration validation
   - Manual resource cleanup
   - Inheritance-heavy design

## Proposed Solution

### Core Design Principle
**Use `RuntimeAgent` as foundation with runtime types as configuration + execution handlers**

### Architecture Overview
```
RuntimeAgentRegistry
├── Manages RuntimeAgent instances per notebook
├── Runtime types as ExecutionHandler + capabilities config
├── Proper LiveStore event sourcing integration
└── Clean React hooks for UI components
```

### Key Benefits
- Artifact uploads automatically handled
- Streaming outputs with real-time updates
- AI tool calling framework built-in
- Proper event sourcing through LiveStore
- OpenTelemetry monitoring
- Validated configuration and error handling

## Artifacts Created

### Documentation
- `docs/runtime-registry/IMPROVED_DESIGN.md` - Complete architectural design
- `docs/runtime-registry/example-implementation.ts` - Practical implementation example
- `docs/runtime-registry/HANDOFF.md` - This document

### Key Files to Review
1. **Current Implementation**
   - `src/runtime/registry/types.ts` - Current type definitions
   - `src/runtime/registry/BaseRuntime.ts` - Inheritance-based approach
   - `src/runtime/registry/RuntimeFactory.ts` - Current factory pattern

2. **Agent Core Foundation**
   - `packages/agent-core/src/runtime-agent.ts` - Mature RuntimeAgent implementation
   - `packages/agent-core/src/config.ts` - Validated configuration system
   - `packages/agent-core/src/types.ts` - Rich ExecutionContext interface

## Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Create new `src/runtime/agent-registry/` directory
- [ ] Implement `RuntimeAgentRegistry` class
- [ ] Create basic type definitions
- [ ] Set up singleton management

### Phase 2: Execution Handlers (Week 2)
- [ ] Implement `HtmlExecutionHandler` using ExecutionContext
- [ ] Create `JavaScriptExecutionHandler` for browser JS
- [ ] Implement `PythonExecutionHandler` (pass-through for external agents)
- [ ] Add execution handler testing

### Phase 3: React Integration (Week 3)
- [ ] Create `useRuntimeAgent` hook
- [ ] Implement `RuntimeAgentProvider` context
- [ ] Build registry initialization utilities
- [ ] Add component integration examples

### Phase 4: Migration Strategy (Week 4)
- [ ] Create feature flag for new vs old system
- [ ] Implement backwards compatibility layer
- [ ] Update existing components to use new hooks
- [ ] Comprehensive testing

### Phase 5: Production Deployment (Week 5-6)
- [ ] Performance testing and optimization
- [ ] Error handling and edge case testing
- [ ] Documentation updates
- [ ] Production rollout with monitoring

## Technical Dependencies

### Required Packages
- `@runtimed/agent-core` - Core RuntimeAgent functionality
- `@runtimed/schema` - LiveStore events and tables
- `@livestore/react` - Store integration

### Environment Requirements
- Node.js 23+
- TypeScript 5.8+
- React 18+ for hook integration

### Integration Points
- **LiveStore**: Must use store adapter for proper event sourcing
- **Authentication**: Requires authToken and userId for RuntimeConfig
- **UI Components**: Existing RuntimeHelper and RuntimePanel components

## Migration Considerations

### Backwards Compatibility
- Current `HtmlRuntimeManager` usage must continue working
- Gradual migration via feature flags
- Maintain existing API surface during transition

### Data Migration
- No data migration required (event-sourced state)
- Runtime sessions will naturally transition

### Risk Mitigation
- Parallel implementation alongside current system
- Comprehensive testing before switching
- Rollback plan via feature flags

## Key Decisions Made

1. **Composition over Inheritance**: Runtime types are configurations, not subclasses
2. **RuntimeAgent Foundation**: Build on proven agent-core patterns
3. **Event Sourcing**: Full LiveStore integration with materialized state
4. **Singleton Registry**: Single registry instance to prevent conflicts
5. **React Hooks**: Clean component integration via custom hooks

## Open Questions

1. **Performance Impact**: How will additional LiveStore subscriptions affect performance?
2. **Error Recovery**: What happens when RuntimeAgent crashes vs registry errors?
3. **Resource Limits**: Should registry enforce limits on concurrent agents?
4. **Monitoring**: What metrics should be tracked for runtime health?

## Next Steps for New Owner

### Immediate Actions
1. Review `IMPROVED_DESIGN.md` for complete architecture
2. Study `example-implementation.ts` for practical patterns
3. Examine current registry implementation to understand existing patterns
4. Set up development branch for new implementation

### Discovery Tasks
1. Run existing tests to understand current behavior
2. Review how `RuntimeHelper` component currently works
3. Check integration points with notebook execution flow
4. Understand artifact service integration requirements

### Implementation Approach
1. Start with Phase 1 (Foundation) - small, focused changes
2. Use feature flag from day 1 to enable safe development
3. Write tests for each ExecutionHandler as pure functions
4. Build React integration incrementally

## Contact Information

- **Original Analysis**: AI Assistant (Claude)
- **Codebase Owner**: Kyle Kelley (@kylekelley)
- **Documentation Location**: `anode/docs/runtime-registry/`

## References

- **Current Registry**: `anode/src/runtime/registry/`
- **Agent Core Package**: `anode/packages/agent-core/`
- **Schema Package**: `@runtimed/schema` (external JSR package)
- **LiveStore Docs**: See `docs/technologies/livestore.md`

---

**Note**: This handoff represents a complete architectural redesign, not incremental improvements. The existing system should be replaced, not patched. The investment in proper architecture will pay dividends in maintainability, features, and reliability.