# Anode Development Roadmap

**Vision**: A real-time collaborative notebook system enabling seamless AI ↔ Python ↔ User interactions through local-first architecture.

**Current Status**: Production system deployed at https://app.runt.run with real-time collaboration, AI integration, and Python execution. Focus is on alpha release preparation with improved runtime management.

## Production Foundation Complete ✅

### What's Working Today

- **Real-time collaborative notebooks** at https://app.runt.run
- **Python execution** via Pyodide with rich outputs (matplotlib SVG, pandas HTML, IPython.display)
- **AI integration** with full notebook context awareness and tool calling
- **Event-sourced architecture** with LiveStore providing reliable state management
- **Artifact service** for large outputs with R2 storage
- **Authentication system** with OIDC OAuth
- **Mobile support** with responsive design and keyboard optimizations
- **Offline-first operation** that syncs when connected

### Core Capabilities

Users can create notebooks, execute Python code, collaborate in real-time, use AI assistants that see code and outputs, and work offline. The system is stable and handles production workloads.

## Alpha Release Priorities (Q4 2025)

### 1. Browser-Based Runtime Agent (🔥 Critical)

**Goal**: Eliminate manual runtime setup friction for alpha users

**Current State**: Users must manually run `NOTEBOOK_ID=xyz pnpm dev:runtime`
**Target**: One-click runtime startup directly in browser

**Implementation** (#447):

- Browser-based Pyodide runtime agent
- Embedded runtime management in web client
- Auto-connect when opening notebooks
- Owner-only runtime launch permissions

**Benefits**:

- Zero-friction notebook experience
- Scalable for alpha user onboarding
- No infrastructure management needed

### 2. Runtime Management Improvements

**Stale Runtime Cleanup** (#465):

- Button to evict disappeared runtimes
- Runtime health monitoring
- Automatic cleanup of stale connections

**RuntHQ Integration** (#335):

- Autoconnect runtime on notebook open
- Seamless runtime orchestration
- Owner permission controls

### 3. Product Naming & Alpha Preparation

**Finalize Branding** (#448):

- Decide between runtimed/anode/runt/rabbit naming
- Domain strategy for alpha launch

### 4. Critical Bug Fixes

**LiveStore Output Reactivity** (#415 - Critical):

- Fix UI becoming unresponsive when outputs update
- React Compiler compatibility issues
- Ensure reliable real-time collaboration

## Short-term Goals (Next 3-6 Months)

### Runtime Ecosystem Expansion

**Local CPython Support** (#87, #99):

- Connect to external Python environments
- Ephemeral and persistent environment options

### Enhanced User Experience

**Improved Code Editing** (#154):

- Tab completion (Jupyter-style)
- Better autocomplete behavior
- LSP integration foundations

**Output Management** (#173):

- Granular output collapsing

## Medium-term Vision (6+ Months)

### Advanced Runtime Capabilities

**Multi-Runtime Support**:

- ZeroMQ integration for external kernels (#61)
- Jupyter kernel protocol compatibility
- Container and remote runtime management

**Enhanced Python Experience**:

- Package management system (#63)
- Variable inspection and debugging (#175)
- SQL cell implementation with DuckDB (#62)

### Rich Media Support

**Enhanced Outputs**:

- Vega/Vega-Lite visualization (#267)
- GeoJSON mapping support (#266)
- Interactive widgets (#183)
- Advanced 3D visualizations

**Content Management**:

- Jupyter notebook compatibility (#184)
- Import/export capabilities

## Success Metrics

### Alpha Release Goals

- **Runtime startup**: < 10 seconds (one-click browser launch)
- **User onboarding**: < 2 minutes from signup to first execution
- **System reliability**: > 99% uptime for production notebooks
- **Collaboration latency**: < 100ms for real-time updates

### Technical Performance

- **Test suite**: < 30 seconds execution time
- **Build time**: < 5 minutes for full deployment
- **Memory efficiency**: Support 100+ cell notebooks
- **Cross-browser support**: Chrome, Firefox, Safari compatibility
