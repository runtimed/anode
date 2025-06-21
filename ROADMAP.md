# Anode Development Roadmap

**Vision**: A real-time collaborative notebook system enabling seamless AI ↔ Python ↔ User interactions through local-first architecture.

**Current Status**: Working system deployed to production with collaborative editing, full Python execution with rich outputs, and AI integration with notebook context awareness. Major runtime restart bug (#34) resolved. Main gap is automated runtime management.

## Foundation Complete ✅

### Core Architecture
- **LiveStore event-sourcing** - Real-time collaborative state management
- **Direct TypeScript schema** - No build complexity, full type safety
- **Reactive execution queue** - Kernel work detection without polling
- **Reliable kernel sessions** - Fixed materializer side effects, stable multi-session operation
- **Cell management** - Create, edit, move, delete with proper state sync
- **Full Python execution** - Rich outputs: matplotlib SVG, pandas HTML, IPython.display
- **Production deployment** - Cloudflare Pages + Workers with authentication

### What Users Can Do Today
- Create and edit notebooks collaboratively in real-time at https://anode.pages.dev
- Execute Python code with rich outputs (matplotlib, pandas, colored terminal)
- Use AI cells with full notebook context awareness (sees previous cells and outputs)
- Control what context AI sees with visibility toggles
- Have AI create new cells using function calling
- Navigate cells with keyboard shortcuts and mobile support
- Work offline and sync when connected

## Immediate Priorities (Next 1-2 Weeks)

### 1. Enhanced AI Tool Calling
**Goal**: Expand AI capabilities beyond just creating cells

- [x] **Function calling infrastructure** - OpenAI function calling working
- [x] **Cell creation tools** - AI can create new cells with `create_cell` tool
- [ ] **Cell modification tools** - AI can edit existing cells with `modify_cell` tool
- [ ] **Code execution tools** - AI can execute cells and see results
- [ ] **User confirmation flows** - Safe execution of AI-initiated actions

### 2. User-Attributed Kernels ("Bring Your Own Compute")
**Goal**: Enable users to run standalone runtime agents with API tokens

- [ ] **API token system** - Generate user-specific tokens for kernel authentication
- [ ] **Token management UI** - Users can create, view, revoke tokens
- [ ] **Standalone runtime agents** - Kernels authenticate with user tokens instead of shared auth
- [ ] **Kernel attribution** - Show which user's compute is running the kernel
- [ ] **Documentation** - Clear instructions for running user-owned kernels

### 3. Automated Runtime Management
**Goal**: Remove manual `NOTEBOOK_ID=xyz pnpm dev:runtime` friction

- [x] **Kernel session reliability** - Fixed materializer side effects causing restart failures (#34)
- [ ] **One-click kernel startup** - Start kernels directly from UI
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