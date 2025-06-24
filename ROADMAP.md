# Anode Development Roadmap

**Vision**: A real-time collaborative notebook system enabling seamless AI ↔ Python ↔ User interactions through local-first architecture.

## Foundation Complete ✅

### Core Architecture
- **LiveStore event-sourcing** - Real-time collaborative state management
- **Cell management** - Create, edit, move, delete with proper state sync
- **"Python" execution** - Rich outputs: matplotlib SVG, pandas HTML, IPython.display
- **Pseudo-Production deployment** - Cloudflare Pages + Workers with Google OAuth authentication

### What Users Can Do Today
- Create and edit notebooks collaboratively in real-time at https://anode.pages.dev
- Execute Python code with rich outputs (matplotlib SVG plots, pandas HTML tables, colored terminal)
- Use AI cells with full notebook context awareness (sees previous cells and their outputs)
- Control what context AI sees with visibility toggles
- Have AI create new cells using OpenAI function calling
- Navigate cells with keyboard shortcuts and mobile-optimized interface
- Work offline and sync when connected through local-first architecture
- Package caching for faster Python startup (numpy, pandas, matplotlib pre-loaded)

## Immediate Priorities (Next 2-3 Weeks)

### 1. Enhanced AI Tool Calling
**Goal**: Expand AI capabilities beyond just creating cells

**Current State**: AI can only create cells via `create_cell` function
**Target**: AI can modify existing cells and execute code

**Implementation Tasks**:
- [x] **Function calling infrastructure** - OpenAI function calling working
- [x] **Cell creation tools** - AI can create new cells with `create_cell` tool
- [x] **Cell modification tools** - Add `modify_cell(cellId, content)` function to NOTEBOOK_TOOLS
- [x] **Code execution tools** - Add `execute_cell(cellId)` function to NOTEBOOK_TOOLS
- [ ] **Parameter validation** - Add comprehensive JSDoc and parameter validation

**Acceptance Criteria**:
- AI can modify existing cell content when requested
- AI can execute cells and see results
- All tool calls work reliably with proper error handling

### 2. User Confirmation Flows
**Goal**: Safe execution of AI-initiated actions

**Current State**: No user confirmation for AI actions
**Target**: UI dialogs for confirming destructive operations

**Implementation Tasks**:
- [ ] **Confirmation dialog UI** - Design and implement confirmation dialog component
- [ ] **Risk categorization** - Implement risk-based confirmation (safe vs destructive operations)
- [ ] **LiveStore events** - Add confirmation events to schema
- [ ] **Web client integration** - Wire up confirmation flows in web client
- [ ] **Bypass for safe operations** - Allow safe operations to skip confirmation

**Acceptance Criteria**:
- Users can approve/reject AI tool calls before execution
- Clear indication of what the AI wants to do
- Safe operations (create_cell) can bypass confirmation
- Destructive operations (modify_cell, execute_cell) require confirmation

### 3. User-Attributed Kernels ("Bring Your Own Compute")
**Goal**: Enable users to run standalone runtime agents with API tokens

**Current State**: All kernels use shared authentication
**Target**: Users can run kernels with their own API tokens

**Implementation Tasks**:
- [ ] **API token system** - Generate user-specific tokens for kernel authentication
- [ ] **Token management UI** - Users can create, view, revoke tokens
- [ ] **Standalone runtime agents** - Kernels authenticate with user tokens instead of shared auth
- [ ] **Kernel attribution** - Show which user's compute is running the kernel
- [ ] **Documentation** - Clear instructions for running user-owned kernels

**Benefits**:
- Removes shared authentication dependency
- Enables production scaling with user-owned compute
- Clear attribution of resource usage

### 4. Automated Runtime Management
**Goal**: Remove manual `NOTEBOOK_ID=xyz pnpm dev:runtime` friction

**Technical Challenges**:
- Kernel spawning in browser environment
- Cross-platform compatibility (Windows, macOS, Linux)
- Security considerations for kernel execution
- Resource management and cleanup

**Implementation Tasks**:
- [x] **Kernel session reliability** - Fixed materializer side effects causing restart failures (#34)
- [ ] **Kernel orchestration architecture** - Design kernel spawning mechanism
- [ ] **One-click kernel startup** - Create "Start Kernel" button in notebook UI
- [ ] **Kernel health monitoring** - Detect failures and restart automatically
- [ ] **Better status indicators** - Clear feedback on kernel state
- [ ] **Error recovery** - Graceful handling of kernel disconnections

## Short-term Goals (Next 1-2 Months)

### Automated Kernel Management
**Goal**: Remove manual `NOTEBOOK_ID=xyz pnpm dev:runtime` friction

- [x] **Kernel session reliability** - Fixed materializer side effects causing restart failures (#34)
- [ ] **Auto-spawning kernels** - One-click notebook startup
- [ ] **Kernel health monitoring** - Detect failures and restart
- [ ] **Better status UI** - Clear feedback on kernel state
- [ ] **Error recovery** - Graceful handling of kernel disconnections

### Rich Output System Enhancement
**Goal**: Polish the already working rich output system

- [x] **Matplotlib SVG rendering** - Plots display correctly
- [x] **Pandas DataFrame HTML** - Rich table formatting working
- [x] **IPython.display functions** - HTML(), Markdown(), JSON() support working
- [x] **Stream output consolidation** - Clean colored text block handling
- [ ] **Output performance optimization** - Faster rendering of large outputs
- [ ] **Output management** - Clear outputs, output collapsing, copy functionality

### Enhanced Python Experience
- [ ] **Package management** - Pre-install scientific stack (numpy, pandas, matplotlib)
- [ ] **Code completion** - LSP integration for intelligent suggestions
- [ ] **Variable inspection** - Runtime introspection and debugging
- [ ] **Execution improvements** - Better progress indicators and cancellation

### Enhanced AI Integration
- [x] **Full context awareness** - AI sees previous cells and their outputs
- [x] **Context controls** - Users can hide cells from AI context
- [ ] **Streaming responses** - Word-by-word AI output for better UX
- [ ] **Multi-turn conversations** - Context-aware AI conversations
- [ ] **Smart code generation** - AI suggests code based on notebook state
- [ ] **Execution tools** - AI can run code cells and see results

## Medium-term Vision (3-6 Months)

### Model Context Protocol (MCP) Integration
**Goal**: Extensible AI tooling through Python ecosystem

- [ ] **MCP Registry Architecture** - Discover and manage MCP providers
- [ ] **Python Kernel Integration** - Use Python introspection to find MCP modules
- [ ] **Tool Routing System** - Seamlessly route between notebook and MCP tools
- [ ] **Provider Lifecycle Management** - Connect, disconnect, monitor MCP providers
- [ ] **Unified Tool Interface** - Single AI interface for all available tools

### SQL Cell Implementation
- [ ] **DuckDB integration** - SQL execution via Python kernel
- [ ] **Database connections** - Connect to external databases
- [ ] **Result visualization** - Rich display of query results
- [ ] **Python interop** - Share data between SQL and Python cells

### Advanced Collaboration
- [ ] **User presence** - See who's actively editing
- [ ] **Collaborative cursors** - Real-time editing indicators
- [ ] **Comment system** - Discuss code and results inline
- [ ] **Version control** - Leverage event-sourcing for notebook history

### Interactive Widgets
- [ ] **IPython widgets support** - Interactive UI components
- [ ] **Real-time streaming outputs** - Progress bars, live updates
- [ ] **Collaborative widgets** - Shared interactive components
- [ ] **Custom widget framework** - Build domain-specific tools

## Long-term Aspirations (6+ Months)

### Production Readiness
- [x] **Authentication system** - Google OAuth working in production
- [x] **Production deployment** - Cloudflare Pages + Workers deployment working
- [ ] **Multi-tenant deployment** - Isolated environments per organization
- [ ] **Performance optimization** - Handle large notebooks and datasets
- [ ] **Monitoring and analytics** - Usage tracking and performance metrics

### Advanced Features
- [ ] **Jupyter compatibility** - Import/export .ipynb files seamlessly
- [ ] **Custom cell types** - Extensible framework for specialized cells
- [ ] **Advanced visualizations** - 3D plots, interactive charts
- [ ] **External integrations** - Connect to data sources, APIs, services
- [ ] **MCP Marketplace** - Discover and install MCP providers
- [ ] **AI Agent Workflows** - Multi-step AI-driven notebook automation

### User Experience Polish
- [ ] **Keyboard navigation improvements** - Jupyter-like arrow key behavior
- [ ] **Better error messages** - Clear feedback for all failure modes
- [ ] **Execution indicators** - Visual feedback during code execution
- [ ] **Cell output management** - Clear outputs, output collapsing

### Developer Ecosystem
- [ ] **Extension API** - Third-party cell types and integrations
- [ ] **Template system** - Reusable notebook templates
- [ ] **Package marketplace** - Share and discover notebook components
- [ ] **Self-hosted deployments** - Enterprise on-premises installations

## Technical Debt & Infrastructure

### Code Quality
- [x] **Comprehensive testing** - 107 passing tests with good integration coverage
- [ ] **Re-enable skipped tests** - Some Pyodide integration tests disabled due to import issues
- [ ] **Browser automation testing** - Add Playwright/Cypress for E2E testing
- [ ] **Error handling** - Robust recovery from all failure scenarios
- [ ] **Performance profiling** - Identify and fix bottlenecks for large notebooks
- [ ] **Documentation** - API docs, architecture guides, contribution guidelines

### Infrastructure
- [ ] **CI/CD pipeline** - Automated testing and deployment
- [ ] **Security audit** - Code execution sandboxing, input validation
- [ ] **Monitoring setup** - Application metrics and alerting
- [ ] **Backup strategies** - Data protection and recovery procedures

## Implementation Strategy

### Phase-Gate Approach
1. **Phase 1 Complete**: Before moving to Phase 2, validate all enhanced AI tool calling works
2. **Phase 2 Complete**: Before Phase 3, ensure user-attributed kernels work reliably
3. **Continuous**: Infrastructure improvements happen alongside feature development

### Risk Mitigation
- **Backward Compatibility**: All changes maintain existing functionality
- **Feature Flags**: New features can be disabled if issues arise
- **Comprehensive Testing**: Each phase includes thorough testing
- **User Feedback**: Regular validation with real users

### Resource Allocation
- **60% Feature Development**: Enhanced AI, user kernels, automation
- **30% Infrastructure**: Testing, documentation, performance
- **10% Maintenance**: Bug fixes, dependency updates

## Success Metrics

### User Experience
- Kernel startup time: < 10 seconds (currently ~30s with manual process)
- Python execution latency: < 1 second for simple operations
- AI tool execution time: < 3 seconds for cell creation/modification
- Collaboration sync delay: < 100ms
- Rich output rendering: < 2 seconds for complex plots
- Mobile usability: Full editing capability on phone/tablet
- Error recovery: Clear feedback and resolution paths

### Technical Performance
- Test suite execution: < 30 seconds (currently ~2s)
- Zero-latency execution: < 100ms for kernel work detection
- Memory efficiency: Handle 100+ cell notebooks without issues
- Collaboration latency: < 100ms for real-time updates

### Developer Experience
- Setup time for new contributors: < 5 minutes
- Hot reload time: < 1 second
- TypeScript compilation: Zero errors, strict mode
- Documentation coverage: All APIs documented

### Reliability
- Kernel uptime: > 99% during active use
- Data loss incidents: Zero tolerance
- Recovery time from failures: < 30 seconds
- Cross-browser compatibility: Chrome, Firefox, Safari

## Architecture Principles

### Preserve Core Strengths
- **Event-sourcing foundation** - Never lose user work, perfect audit trails
- **Local-first operation** - Work offline, sync when connected
- **Real-time collaboration** - Multiple users, zero conflicts (proven in production)
- **Type safety** - End-to-end TypeScript with Effect (zero type errors)
- **Reactive architecture** - Zero-latency execution detection via subscriptions
- **Production reliability** - Fixed critical materializer side effects bug (#34)

### Guide Development Decisions
- **AI as development partner** - AI actively participates in notebook creation and editing
- **User workflow first** - Optimize for data science and literate computing
- **Zero-latency interactions** - Immediate feedback for all operations
- **Minimal friction** - Remove setup complexity and manual steps
- **Progressive enhancement** - Core functionality works, advanced features optional
- **Extensible tooling** - MCP integration enables unlimited AI capabilities

---

This roadmap reflects the reality that Anode is already a working production system. The focus is on expansion and enhancement rather than proving basic functionality works. Core collaborative editing, Python execution with rich outputs, and AI integration are all validated and deployed.

**Key Insight**: The foundation is solid - LiveStore event-sourcing, reactive architecture, and comprehensive testing provide a reliable base for building advanced features.

**Next Update**: This roadmap will be updated monthly based on progress and user feedback.
