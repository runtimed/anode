# Development Handoff

## Today's Priority Tasks (Current Session)

**Focus**: Async Python execution, AI context integration, and visibility controls

✅ **Documentation fixes completed**: Updated all file references (mod-reactive.ts → kernel-adapter.ts, OPENAI_INTEGRATION.md → ai-features.md, etc.)
✅ **Task 4 completed**: Source/Output Display Toggles implemented and ready for review

### Task 1: Switch to Async Python Code Execution ⏳
**Goal**: Make Python code execution truly asynchronous in the kernel
**Current Issue**: Python execution may block during long-running operations
**Solution**: Enhance PyodideKernel with better async patterns and execution queuing

**Files to modify**:
- `packages/dev-server-kernel-ls-client/src/pyodide-kernel.ts` - Enhance async execution with proper yielding
- `packages/dev-server-kernel-ls-client/src/kernel-adapter.ts` - Update execution flow for better async handling
- Consider setTimeout/setImmediate patterns to yield control during execution

### Task 2: Show Outputs to AI Model Context Window 🤖 ✅
**Goal**: Include cell outputs (not just source code) in AI context
**Status**: ✅ **COMPLETED** - AI now sees both cell source and outputs in context
**Solution**: Extended context gathering to include cell outputs from the outputs table

**What Was Implemented**:
- Enhanced `NotebookContext` interface to include outputs array for each cell
- Updated `gatherNotebookContext()` to query and include outputs from outputs table
- Added output filtering to include `text/plain` and `text/markdown` outputs for AI context
- Enhanced `buildSystemPromptWithContext()` to format outputs in system prompt
- Added support for stream outputs (stdout/stderr), error outputs, and rich outputs
- Comprehensive test coverage for context gathering functionality

**Technical Details**:
- AI context now includes outputs from `execute_result`, `display_data`, `stream`, and `error` output types
- Rich outputs are filtered to include only `text/plain` and `text/markdown` for token efficiency
- Error outputs include exception name, value, and traceback information
- Stream outputs preserve stdout/stderr distinction for debugging context

### Task 3: AI Context Visibility Toggles 👁️
**Goal**: Allow users to control what the AI model can see
**Solution**: Add per-cell toggles for AI context inclusion

**Features needed**:
- Toggle to hide/show cell source from AI context
- Toggle to hide/show cell outputs from AI context  
- Visual indicators showing what AI can see
- Default: all cells visible to AI

**Files to modify**:
- `shared/schema.ts` - Add `aiContextVisible` and `aiOutputsVisible` boolean fields to cells table
- `packages/web-client/src/components/notebook/CodeCell.tsx` - Add context visibility toggle buttons
- `packages/web-client/src/components/notebook/AiCell.tsx` - Add visibility indicators
- `packages/dev-server-kernel-ls-client/src/kernel-adapter.ts` - Filter cells in `gatherNotebookContext()` based on visibility settings

### Task 4: Source/Output Display Toggles ✅ COMPLETED
**Goal**: Allow users to collapse/expand source code and outputs
**Solution**: Add UI toggles for cell content visibility

**Completed features**:
- ✅ Toggle to collapse/expand source code display (chevron icons in cell controls)
- ✅ Toggle to collapse/expand output display (chevron icons in execution summary bar)
- ✅ Persistent state via LiveStore events (`sourceVisible`/`outputVisible` fields)
- ✅ Real-time synchronization across collaborative sessions
- ✅ Consistent implementation across Code, SQL, and AI cell types
- ✅ Smart play button repositioning when source is collapsed
- ✅ Hover-based visibility for reduced UI clutter

**Files modified**:
- ✅ `shared/schema.ts` - Added `sourceVisible`/`outputVisible` fields with events and materializers
- ✅ `packages/web-client/src/components/notebook/Cell.tsx` - Source/output visibility toggles
- ✅ `packages/web-client/src/components/notebook/SqlCell.tsx` - SQL-specific toggles
- ✅ `packages/web-client/src/components/notebook/AiCell.tsx` - AI-specific toggles
- ✅ Icon improvements: ChevronUp/Down for show/hide, ArrowUp/Down for cell movement

**Branch**: `feature/cell-visibility-toggles` (ready for review)

## Current Work State

**Status**: 🚧 **Working Prototype** - Core collaborative editing, Python execution, and basic AI integration functional, rich outputs need verification. Major kernel restart bug (#34) resolved.

### What's Actually Working ✅

#### Core Collaborative System
- **LiveStore integration** - Event-sourcing with real-time collaboration working reliably
- **Schema architecture** - Direct TypeScript imports across all packages with full type safety
- **Reactive subscriptions** - Kernel work detection without polling delays
- **Cell management** - Create, edit, move, delete cells with proper state sync

#### Python Execution
- **Basic Python execution** - Code cells run Python via Pyodide (manual kernel startup)
- **Kernel session reliability** - Fixed materializer side effects causing restart failures (#34) ✅
- **Error handling** - Python exceptions properly captured and displayed
- **Text output** - print() statements and basic stdout/stderr capture
- **Execution queue** - Proper job queuing and status tracking

#### AI Integration (New! ✅)
- **OpenAI API integration** - Real AI responses when OPENAI_API_KEY is set
- **Error handling** - Graceful fallback for API failures, rate limits, invalid keys
- **Rich output** - AI responses rendered as markdown with metadata (tokens, model)
- **Development mode** - Automatic fallback to mock responses without API key
- **Notebook context awareness** - AI sees previous cells and outputs for context
- **Current limitations**: No tools for AI to modify notebook, no cell context control

#### User Interface
- **Real-time collaboration** - Multiple users can edit simultaneously
- **Keyboard navigation** - Cell focus, arrow keys, execution shortcuts
- **Cell types** - Code, markdown, AI (with real API), SQL (planned) cells supported
- **Basic output display** - Text results and error messages shown

### What Needs Verification 🚧

#### Rich Output System
- **Display hooks** - IPython integration code exists but needs integration testing
- **Rich representations** - _repr_html_(), matplotlib, pandas support partially implemented
- **Stream consolidation** - Output buffering and formatting logic present but unverified
- **Performance claims** - "Zero-latency" and rich output rendering need real testing

## After Today's Tasks - Next Development Priorities

### Priority 1: Integration Testing (Critical)
**Current gap**: Core functionality exists but lacks verification

**Goal**: Prove Python execution and rich outputs actually work end-to-end

**Key Tests Needed**:
- Python execution with real Pyodide startup
- Matplotlib plot generation and display
- Pandas DataFrame rendering
- IPython.display functions (HTML, Markdown, etc.)
- Error handling and recovery

**Files to create/modify**:
- `packages/dev-server-kernel-ls-client/test/pyodide-integration.test.ts` - Real execution tests
- Update mocked tests to include real functionality verification
- Add test utilities for kernel lifecycle management

**Estimated effort**: 4-6 hours
**Impact**: Verifies core value proposition and identifies real gaps

### Priority 2: Enhanced AI Integration ✅ WORKING + Needs Enhancement
**Status**: ✅ **Basic OpenAI API integration implemented**

**What's working**:
- Real OpenAI API calls replace mock responses when `OPENAI_API_KEY` is set
- Comprehensive error handling for API failures, rate limits, and authentication
- Rich markdown output with metadata tracking (token usage, model info)
- Automatic fallback to mock responses for development without API key
- Full test coverage with 11 passing tests
- Documentation at `docs/ai-features.md`

**Current limitations**:
- **No AI tools**: AI can't create cells, modify cells, or execute code
- **No context control**: Users can't exclude cells from AI context  
- **No streaming**: Responses appear all at once, not word-by-word
- **No AI tool calling**: AI can't create/modify cells or execute code
- **Basic prompting**: Simple user prompt → AI response, no multi-turn conversation

**Next enhancements needed**:
- **AI tool calling**: Let AI create/modify cells using OpenAI function calling
- **Context inclusion controls**: Allow users to mark cells as included/excluded from AI context
- **MCP integration** (long-term): Connect to Model Context Protocol providers via Python kernel
- Streaming responses for better UX
- Multi-turn conversation support

### Priority 4: MCP Integration Foundation 🔮 LONG-TERM
**Status**: 🎯 **Architecture planning**

**Goal**: Connect to Model Context Protocol providers for extensible AI tooling

**Key Concepts**:
- **Local MCP Registry**: Discover and manage MCP providers via Python kernel
- **Tool Routing**: Seamlessly route AI tool calls between built-in notebook tools and MCP providers
- **Python Integration**: Use Python introspection to discover MCP-compatible modules
- **Unified Interface**: Single AI interface that can access both notebook and external tools

**Implementation Strategy**:
1. Start with built-in notebook tools (`create_cell`, `modify_cell`)
2. Design MCP registry architecture for future extension
3. Add Python kernel discovery of MCP-compatible modules
4. Implement tool routing between notebook and MCP providers

**Files to create/modify**:
- `packages/dev-server-kernel-ls-client/src/mcp-registry.ts` - MCP provider management
- `packages/dev-server-kernel-ls-client/src/pyodide-kernel.ts` - Python MCP discovery
- Enhanced tool routing in reactive system

**Estimated effort**: 1-2 months (after tool calling foundation)
**Impact**: Enables unlimited AI tool extensibility through Python ecosystem

### Priority 3: Auto Kernel Management (High Impact) 🚀 UPGRADED
**Current friction**: Manual `NOTEBOOK_ID=xyz pnpm dev:kernel` per notebook

**Goal**: One-click notebook startup with automatic kernel lifecycle

**Foundation now solid**: With kernel restart bug (#34) fixed, automated management is much more viable

**Next actions**:
- Modify `pnpm dev` to auto-spawn kernels per notebook
- Add kernel health monitoring and restart capability
- Better error messages when kernels fail or disconnect
- Leverage fixed kernel session reliability for robust auto-restart

**Files to modify**:
- Root `package.json` - Update dev script
- `packages/web-client/src/components/notebook/NotebookViewer.tsx` - Status display
- Add kernel process management utilities

**Estimated effort**: 2-3 hours (reduced due to fixed foundation)
**Impact**: Removes major user friction + leverages recent reliability improvements

### Priority 5: Rich Output Verification (Medium)
**Current state**: Code exists but integration unclear

**Goal**: Verify and fix matplotlib, pandas, IPython.display integration

**Next actions**:
- Test actual matplotlib SVG generation
- Verify pandas DataFrame HTML rendering
- Fix any display hook integration issues
- Document what rich outputs are supported

**Files to modify**:
- `packages/dev-server-kernel-ls-client/src/pyodide-kernel.ts` - Display system
- Add rich output examples and tests
- Document supported output types

**Estimated effort**: 3-4 hours
**Impact**: Delivers on rich output promises

### Priority 6: Error Handling & UX (Low)
**Current state**: Basic error display, could be much better

**Goal**: Professional error handling and user feedback

**Next actions**:
- Better kernel failure messages
- Execution timeout handling
- Clear status indicators for all operations
- Graceful degradation when kernel unavailable

**Impact**: Better user experience and debugging

## Display System Architecture

### Current Implementation
The display system integrates **jupyterlite-pyodide-kernel** patterns with **Anode's LiveStore** collaborative system:

- **LiteDisplayPublisher**: Framework for `IPython.display.display()` calls
- **LiteDisplayHook**: Execution result capture with formatting
- **Stream consolidation**: Output buffering and formatting logic
- **Event-driven outputs**: Rich outputs flow through LiveStore events

### Current Testing Status
```bash
# Existing test suite (mostly smoke tests)
pnpm test:kernel         # Basic kernel lifecycle tests (mocked Pyodide)
pnpm test               # Full test suite (27 passing, 13 skipped)
```

**Testing Gaps**:
- No real Pyodide integration tests
- Rich output generation unverified
- Display hook integration not tested end-to-end
- Performance claims unsubstantiated

### Features Status
- 🚧 **Pandas DataFrames**: Code exists, integration testing needed
- 🚧 **Matplotlib**: SVG generation logic present, unverified
- 🚧 **IPython ecosystem**: Display functions partially implemented
- ✅ **Stream handling**: Basic text output working
- ✅ **Error handling**: Python exceptions properly displayed
- ✅ **Real-time collaboration**: Text outputs sync across users

### Known Issues & Limitations

### Current Limitations
- **Manual kernel startup**: Each notebook requires copying command from UI
- **Rich outputs unverified**: Matplotlib, pandas integration needs testing
- **Limited error recovery**: Kernel failures require manual restart
- **No streaming outputs**: All output appears at execution completion
- **No AI tools**: AI cannot create cells, modify content, or execute code
- **No context control**: Users cannot exclude cells from AI context
- **Performance claims unverified**: Need integration tests to validate speed/output claims

### Known Critical Issues
- **None currently identified** - Major kernel restart bug (#34) resolved by cleaning up side effects in materializers

### Recent Fixes ✅
- **Kernel restart bug (#34)** - Fixed materializer side effects that caused 3rd+ kernel sessions to fail work assignments
- **LiveStore web client shutdowns** - Resolved accumulation of terminated sessions causing kernel communication failures

### Schema & Architecture Notes
- All packages use direct TypeScript imports: `../../../shared/schema.js`
- No build step needed - changes are immediate across all packages
- Must restart all services after schema changes to avoid version mismatches
- Event deferral with `setTimeout(..., 0)` prevents LiveStore execution conflicts

### Development Guidelines
- **Test changes carefully**: Rich output system integration is complex
- **Verify with real data**: Don't rely on mocked tests for core functionality
- **Maintain kernel isolation**: Python execution should not block UI
- **Preserve event sourcing**: All state changes must flow through LiveStore

## Files Currently Working

### Core Enhanced Display System
- `packages/dev-server-kernel-ls-client/src/pyodide-kernel.ts` - **Main implementation**
- `packages/web-client/src/components/notebook/RichOutput.tsx` - Output rendering
- `shared/schema.ts` - Output type definitions

### AI Integration Complete (Basic)
- `packages/dev-server-kernel-ls-client/src/openai-client.ts` - OpenAI API client
- `packages/dev-server-kernel-ls-client/src/kernel-adapter.ts` - AI integration point
- `packages/web-client/src/components/notebook/AiCell.tsx` - AI UI components
- `packages/dev-server-kernel-ls-client/test/openai-client.test.ts` - Comprehensive tests
- `docs/ai-features.md` - Setup and usage documentation

## Development Commands

**Development Commands:**
```bash
# Setup
cp .env.example .env                     # Configure environment (optional: uncomment OPENAI_API_KEY)

# Current workflow
pnpm dev                                 # Web + sync
# Get kernel command from notebook UI, then:
NOTEBOOK_ID=notebook-id-from-ui pnpm dev:kernel

# Testing and utilities
pnpm test                                # Current test suite
pnpm reset-storage                       # Clear all local data
```

## Documentation Structure

```
docs/
├── README.md                 # Documentation index and overview
├── display-system.md         # Complete technical guide (Phase 1)
├── display-examples.md       # Practical usage examples  
├── TESTING.md               # Comprehensive testing guide
└── ui-design.md             # Interface design guidelines
```

## Development Phases

**✅ Phase 1: Core Prototype** - **CURRENT**
- LiveStore integration and collaborative editing
- Basic Python execution via Pyodide
- Cell management and keyboard navigation
- Text output and error handling

**🎯 Phase 2: AI Tool Calling & Context Controls** - **NEXT PRIORITY**  
- AI function calling for cell creation and modification
- Context inclusion/exclusion controls for cells
- Tool execution infrastructure and error handling
- Enhanced AI-notebook interaction patterns

**Phase 3: Rich Outputs & Infrastructure** - **FOLLOWING PRIORITY**
- Integration testing for Python execution
- Matplotlib and pandas display verification
- IPython.display function support
- Automated kernel management
- Streaming AI responses

**Phase 3: Advanced Features**
- Interactive widgets and collaborative components
- SQL cells with database connections
- Performance optimization for large notebooks

**Phase 4: MCP Integration & Advanced Features**
- Model Context Protocol integration via Python kernel
- SQL cells with database connections
- Interactive widgets and collaborative components
- Performance optimization for large notebooks
- Production deployment readiness

## Critical Issues to Resolve

1. **🔥 Kernel Restart Bug** - Multiple kernel restarts break execution (see https://github.com/rgbkrk/anode/issues/34 and branch `annoying-multiples-bug`)
   - **Impact**: Blocks production deployment, breaks user workflow
   - **Workaround**: Full page refresh required after 2 kernel restarts
   - **Investigation needed**: LiveStore multiple store conflicts

## Quick Wins Available

1. **Integration tests** - Verify Python execution actually works (2-3 hours)
2. **Auto-kernel startup** - Remove manual NOTEBOOK_ID friction (1-2 hours)
3. **Better error messaging** - Clear status when kernels fail (1 hour)
4. **Rich output verification** - Test matplotlib/pandas claims (2-3 hours)

## What's Working Well

- ✅ **LiveStore event sourcing** - Robust collaborative state management
- ✅ **Execution queue architecture** - Clean job processing system
- ✅ **Reactive subscriptions** - No polling delays for work detection
- ✅ **Schema architecture** - Direct TypeScript imports work cleanly
- ✅ **Cell management** - Create, edit, move operations solid
- ✅ **Basic Python execution** - Code runs, text output displays

## Next Developer Success Path

**Current State**: Core collaborative notebook system working with basic Python execution and basic AI integration. Rich output system architecture in place but needs verification.

**Immediate Focus**: Implement AI tool calling and context controls to make AI an active development partner, then prove system works through integration testing.

**Key Insight**: The LiveStore foundation is solid. AI integration is working with context awareness but needs tool calling capabilities. Python execution works but needs verification. Rich outputs need real testing.

Priority: **Today's Tasks (Async + Context + Toggles) → AI Tool Calling & Context Controls → Integration Testing → Auto Kernels → Rich Output Verification → MCP Integration**
