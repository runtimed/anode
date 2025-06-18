# Anode Development Roadmap

**Vision**: A real-time collaborative notebook system enabling seamless AI ↔ Python ↔ User interactions through local-first architecture.

**Current Status**: Core prototype with collaborative editing, basic Python execution, and AI integration with context awareness working. Major runtime restart bug (#34) resolved by fixing materializer side effects. AI tool calling and rich outputs in active development.

## Foundation Complete ✅

### Core Architecture
- **LiveStore event-sourcing** - Real-time collaborative state management
- **Direct TypeScript schema** - No build complexity, full type safety
- **Reactive execution queue** - Kernel work detection without polling
- **Reliable kernel sessions** - Fixed materializer side effects, stable multi-session operation
- **Cell management** - Create, edit, move, delete with proper state sync
- **Basic Python execution** - Code cells run via Pyodide (manual kernel startup)

### What Users Can Do Today
- Create and edit notebooks collaboratively in real-time
- Execute Python code with text output and error handling
- Use AI cells with context awareness of previous cells
- Navigate cells with keyboard shortcuts
- Work offline and sync when connected

## Immediate Priorities (Next 1-2 Weeks)

### 1. AI Tool Calling System
**Goal**: Enable AI to actively participate in notebook development

- [ ] **Function calling infrastructure** - OpenAI function calling support in AI client
- [ ] **Cell creation tools** - AI can create new cells with `create_cell` tool
- [ ] **Cell modification tools** - AI can edit existing cells with `modify_cell` tool
- [ ] **Tool execution framework** - Reactive system handles AI tool calls
- [ ] **User confirmation flows** - Safe execution of AI-initiated actions

### 2. Context Control System
**Goal**: Users control what context AI sees

- [ ] **Context inclusion flags** - Mark cells as included/excluded from AI context
- [ ] **Context gathering enhancement** - Respect inclusion flags when building AI context
- [ ] **UI controls** - Toggle buttons and indicators for context inclusion
- [ ] **Context size management** - Handle large notebooks efficiently
- [ ] **Visual feedback** - Clear indication of what AI can see

### 3. Integration Testing & Verification
**Goal**: Prove the system works as claimed

- [ ] **Real Pyodide integration tests** - Verify Python execution end-to-end
- [ ] **AI tool calling tests** - Verify AI can create/modify cells successfully
- [ ] **Rich output testing** - Matplotlib, pandas, IPython.display verification
- [ ] **Performance validation** - Measure actual execution speeds vs claims
- [ ] **Error scenario testing** - Kernel failures, network issues, edge cases

## Short-term Goals (Next 1-2 Months)

### Automated Kernel Management
**Goal**: Remove manual `NOTEBOOK_ID=xyz pnpm dev:kernel` friction

- [x] **Kernel session reliability** - Fixed materializer side effects causing restart failures (#34)
- [ ] **Auto-spawning kernels** - One-click notebook startup
- [ ] **Kernel health monitoring** - Detect failures and restart
- [ ] **Better status UI** - Clear feedback on kernel state
- [ ] **Error recovery** - Graceful handling of kernel disconnections

### Rich Output System Completion
**Goal**: Deliver on Jupyter-quality visualizations

- [ ] **Matplotlib SVG rendering** - Verify plots display correctly
- [ ] **Pandas DataFrame HTML** - Rich table formatting
- [ ] **IPython.display functions** - HTML(), Markdown(), JSON() support
- [ ] **Stream output consolidation** - Clean text block handling

### Enhanced Python Experience
- [ ] **Package management** - Pre-install scientific stack (numpy, pandas, matplotlib)
- [ ] **Code completion** - LSP integration for intelligent suggestions
- [ ] **Variable inspection** - Runtime introspection and debugging
- [ ] **Execution improvements** - Better progress indicators and cancellation

### Enhanced AI Integration
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
- [ ] **Authentication system** - Google OAuth, user management
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
- [ ] **Comprehensive testing** - Move beyond smoke tests to real integration tests
- [ ] **Error handling** - Robust recovery from all failure scenarios
- [ ] **Performance profiling** - Identify and fix bottlenecks
- [ ] **Documentation** - API docs, architecture guides, contribution guidelines

### Infrastructure
- [ ] **CI/CD pipeline** - Automated testing and deployment
- [ ] **Security audit** - Code execution sandboxing, input validation
- [ ] **Monitoring setup** - Application metrics and alerting
- [ ] **Backup strategies** - Data protection and recovery procedures

## Success Metrics

### User Experience
- Notebook startup time: < 5 seconds (including kernel)
- Python execution latency: < 1 second for simple operations
- AI tool execution time: < 3 seconds for cell creation/modification
- Collaboration sync delay: < 100ms
- Rich output rendering: < 2 seconds for complex plots

### Developer Experience  
- Setup time for new contributors: < 10 minutes
- Test suite execution: < 30 seconds
- Hot reload time: < 1 second
- TypeScript compilation: No errors, strict mode

### Reliability
- Kernel uptime: > 99% during active use
- Data loss incidents: Zero tolerance
- Recovery time from failures: < 30 seconds
- Cross-browser compatibility: Chrome, Firefox, Safari

## Architecture Principles

### Preserve Core Strengths
- **Event-sourcing foundation** - Never lose user work, perfect audit trails
- **Local-first operation** - Work offline, sync when connected
- **Real-time collaboration** - Multiple users, zero conflicts
- **Type safety** - End-to-end TypeScript with Effect

### Guide Development Decisions
- **AI as development partner** - AI actively participates in notebook creation and editing
- **User workflow first** - Optimize for data science and literate computing
- **Zero-latency interactions** - Immediate feedback for all operations
- **Minimal friction** - Remove setup complexity and manual steps
- **Progressive enhancement** - Core functionality works, advanced features optional
- **Extensible tooling** - MCP integration enables unlimited AI capabilities

---

This roadmap balances honest assessment of current capabilities with ambitious goals for the future. The immediate focus is on proving core functionality works reliably before building advanced features.

**Next Update**: This roadmap will be updated monthly based on progress and user feedback.