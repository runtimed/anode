# Anode Development Roadmap

**Current Status**: Fully operational reactive architecture with zero-latency Python execution ✅

This roadmap outlines the next phases of development for Anode, building on the working reactive architecture to achieve Jupyter parity while maintaining the real-time collaborative advantages of LiveStore.

## Phase 1: Production Foundation

### 1.1 Authentication & Authorization 🔐
**Priority: HIGH** - Critical for multi-user deployment and kernel-document isolation

**Current State**: Hardcoded `'insecure-token-change-me'` tokens
**Target**: JWT-based auth with kernel session isolation

- [ ] **Google OAuth Integration**
  - Replace hardcoded auth with Google OAuth flow
  - Token exchange service: Google token → Anode JWT
  - Basic user management (profile, preferences)

- [ ] **Kernel Security Model**
  - Kernels get session-specific JWTs
  - Document worker validates kernel permissions
  - Kernel isolation (can only access assigned notebook)

### 1.2 Kernel Lifecycle Management 🐍
**Priority: HIGH** - Manual kernel management creates friction

**Current State**: Manual `NOTEBOOK_ID=x pnpm dev:kernel` startup
**Target**: Automatic kernel lifecycle with session management

- [ ] **Kernel Session Service**
  - `/api/kernels/ensure-session` endpoint
  - Session state tracking
  - Kernel status: `claiming` → `provisioning` → `starting` → `ready` → `busy` → `shutdown`

- [ ] **Enhanced Document Worker**
  - Kernel session validation in sync hooks
  - Integration with kernel service APIs

### 1.3 Demo Deployment 🚀
**Priority: MEDIUM** - Showcases capabilities

- [ ] **CloudFlare Pages Deployment**
  - Web client static hosting
  - Demo environment configuration
  - Basic rate limiting

- [ ] **Demo Kernel Strategy**
  - Session-isolated kernel instances
  - Consider browser-based Pyodide as fallback

## Phase 2: Jupyter Parity

### 2.1 Enhanced Python Kernel 🐍
**Priority: HIGH** - Core execution improvements

- [ ] **Package Management**
  - Pre-installed scientific stack (numpy, pandas, matplotlib)
  - Dynamic package installation
  - Environment isolation between notebooks

- [ ] **Rich Output Support**
  - Plot rendering (matplotlib, plotly)
  - DataFrame HTML display
  - Image and media handling

- [ ] **Code Completions & IntelliSense**
  - LSP integration for Python (Pylsp/Pyright)
  - Kernel-based completions (runtime introspection)
  - Context-aware suggestions from notebook variables
  - Auto-imports and documentation on hover
  - Error highlighting and diagnostics

### 2.2 Notebook UX Improvements 📝
**Priority: HIGH** - Fluid notebook interaction experience

**Current Issues**: Click-to-edit model, no keyboard navigation, heavy card UI breaks notebook flow
**Target**: Jupyter-like fluid interaction without complex mode switching

- [ ] **Fluid Cell Navigation**
  - Down arrow at bottom of cell moves to next cell
  - Up arrow at top of cell moves to previous cell
  - Smooth focus transitions between cells
  - No separate command/edit modes

- [ ] **Execution Flow Improvements**
  - Shift+Enter: Run cell and move to next
  - Ctrl+Enter: Run cell and stay in current
  - Simple execution count display (below code, not `In[]` format)
  - Clear execution status feedback

- [ ] **Streamlined Cell Interface**
  - Reduce heavy card styling for cleaner notebook feel
  - Better visual focus states (subtle borders, not heavy cards)
  - Context-sensitive controls (appear when cell selected)
  - Simplified cell type switching

- [ ] **Responsive Cell Controls**
  - Always-visible minimal controls (not hover-only)
  - Better mobile interaction support
  - Cleaner visual hierarchy between cells

### 2.3 AI Cell Architecture 🤖
**Priority: HIGH** - Enable AI <> Python <> User interactions

**Design Vision**: AI cells function like kernel adapters
- Input: User prompt + notebook context
- Output: AI response (markdown, code, suggestions)
- Execution flow: `aiExecutionRequested` → `aiExecutionStarted` → `aiExecutionCompleted`

- [ ] **AI Kernel Adapter**
  - Similar to Python kernel but calls LLM APIs
  - Notebook context extraction (previous cells, outputs)
  - Response streaming

- [ ] **Context Management**
  - Intelligent context window management
  - Cell dependency tracking

### 2.4 SQL Cell Integration 🗄️
**Priority: MEDIUM** - SQL analysis on Python data

**Design Vision**: SQL cells work in tandem with Python kernel
- SQL source gets translated to Python pandas/DuckDB execution
- Results flow back through Python kernel execution queue
- Shared data context between SQL and Python cells

- [ ] **SQL → Python Translation**
  - DuckDB integration
  - Database connection management through Python
  - Result set handling and display

## Phase 3: Collaboration & Polish

### 3.1 Performance & Scale 📈
**Priority: MEDIUM** - Handle larger notebooks

- [ ] **Large Output Handling**
  - Offload images/media (avoid base64 in notebook)
  - Efficient binary data storage
  - Output compression

- [ ] **Memory Management**
  - Kernel resource limits
  - Garbage collection strategies

### 3.2 Real-Time Collaboration 👥
**Priority: LOW** - Build on LiveStore's existing sync

**Current State**: Basic LiveStore sync working
**Target**: Enhanced collaborative features

- [ ] **Basic Presence**
  - Active user list per notebook
  - Simple "User X is editing" indicators

- [ ] **Conflict Resolution**
  - Leverage LiveStore's event sourcing
  - Execution queue ordering (already working)

## Phase 4: Developer Experience

### 4.1 Import/Export 📁
- [ ] **Jupyter Compatibility**
  - Import/export .ipynb files
  - Maintain notebook format compatibility

### 4.2 API & Extensions 🛠️
- [ ] **REST API**
  - Notebook management
  - Execution control
  - Output retrieval

- [ ] **Custom Cell Types**
  - Framework for new cell types (GraphQL, etc.)
  - Cell type registry

## Current Strengths to Preserve

- ✅ **Reactive Architecture**: Zero-latency execution via LiveStore `queryDb`
- ✅ **Event Sourcing**: Clean audit trail and state management
- ✅ **Local-First**: Offline capability and fast interactions
- ✅ **Type Safety**: End-to-end TypeScript with Effect

## Technical Debt to Address

- [ ] Manual kernel lifecycle management
- [ ] Hardcoded authentication
- [ ] Limited error handling and recovery
- [ ] Missing production monitoring

---

*This roadmap focuses on achieving Jupyter parity while leveraging Anode's unique real-time collaborative architecture. Priorities will evolve based on user feedback and adoption.*
