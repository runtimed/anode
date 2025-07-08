# Anode UI Design System

This document captures the design principles, patterns, and decisions that shape
Anode's user interface as a next-generation Jupyter notebook replacement.

## Design Philosophy

### Core Principles

- **Clean & Minimal**: Remove visual clutter and focus on content creation. Every UI element should serve a clear purpose.
- **Notebook-First**: Design patterns that feel natural for data science and coding workflows, not generic app patterns.
- **Local-First**: UI that works seamlessly offline and provides immediate feedback without network dependencies.
- **Collaboration-Ready**: Visual design that supports real-time collaboration without interfering with individual focus.

## Visual Design Language

### Color System

- **Grayscale Foundation**: Primary interface uses sophisticated grayscale palette with subtle accent colors only when needed.
  - `bg-background` - Main page background
  - `bg-card` - Content area backgrounds
  - `bg-muted/20` - Subtle section backgrounds
  - `border-border/50` - Soft borders and dividers
  - `text-foreground` - Primary text
  - `text-muted-foreground` - Secondary text and hints

- **Accent Colors**: Used sparingly for state indication and cell type differentiation:
  - **Blue** (`border-blue-500/60`) - SQL cells, code execution
  - **Purple** (`border-purple-500/60`) - AI cells, AI responses
  - **Green** (`text-green-500`) - Success states, active connections
  - **Red** (`text-red-500`) - Error states, disconnected
  - **Amber** (`text-amber-500`) - Warning/starting states

### Typography

- **Monospace for Code**: All code input and output uses `font-mono` for proper alignment and readability.
- **Sans-serif for UI**: Clean sans-serif for all interface elements, labels, and documentation.

- **Size Hierarchy**:
  - `text-lg font-semibold` - Notebook titles
  - `text-sm` - Standard UI elements
  - `text-xs` - Metadata, hints, secondary info

### Spacing & Layout

- **Consistent Padding**:
  - `px-4 py-3` - Standard cell content areas
  - `px-6` - Cell headers and controls alignment
  - `pl-2` - Execution controls fine-tuning
  - `gap-3` - Standard element spacing

- **Max Width**: `max-w-4xl mx-auto` for notebook content to maintain readability.

## Component Design Patterns

### Runtime Selection & Status

- **One Runtime Agent Per Notebook**: The UI should clearly communicate that each notebook has exactly one active runtime agent at a time.

- **Runtime States**:
  - **No Runtime** - Show "No runtime selected" with prominent "Start Runtime" button
  - **Single Active Runtime** - Show runtime type and status (ready/busy/starting)
  - **Transition State** - Show "Switching Runtime..." during handoffs
  - **Error State** - Show "Runtime dead" with restart options

- **UI Behavior**:
  - Starting a new runtime while one exists should prompt: "Replace current runtime?"
  - Runtime selection should show current runtime + available types, not multiple active runtimes
  - Status indicator should be prominent: green dot (ready), amber (busy), red (error)
  - Avoid showing multiple "active" runtimes simultaneously in the UI

- **Not Yet Implemented**: Automatic runtime orchestration means users may see brief multi-runtime states during manual startup. Future versions will enforce single-runtime constraints.

### Navigation Header

- **Structure**:
  ```
  [Logo] [Anode] [+ New Notebook] ————————————————— [Store ID]
  ```
- **Unified Top Bar**: Single navigation bar contains app-level actions. No separate breadcrumbs or back buttons.

### Notebook Controls

- **Integrated Control Ribbon**:
  ```
  [Notebook Title] ——————————————— [>_ Python ●] [2 cells]
  ```
- **Features**:
  - Editable title (click to edit inline)
  - Runtime status with visual indicator
  - Cell count display
  - Runtime info expansion panel

### Cell Design

#### Visual Hierarchy

- **Left Border Focus System**:
  - Transparent border when unfocused
  - Colored left border (`border-l-2`) when focused
  - Background tint when focused (`bg-primary/5`)
  - Color varies by cell type (blue=SQL, purple=AI, default=code)

#### Cell Header

- **Alignment**: `pl-6 pr-4` to align with text content

- **Elements**:
  - **Cell Type Badge**: Clickable dropdown (Code, Markdown, SQL, AI)
  - **Status Badges**: AI model info, execution state
  - **Hover Controls**: Move up/down, add cell, delete (right-aligned)

#### Cell Content

- **No Visual Borders**: Content flows naturally without boxes or strong borders

- **Text Area**:
  - `px-2 py-2` internal padding for natural text positioning
  - `bg-card/30` subtle background
  - `focus-within:bg-card/60` enhanced focus state
  - Transparent borders, focus indicated by container

- **Execution Controls**: `pl-2` alignment with content, subtle top border

#### Output Areas

- **Alignment**: `pl-6` to match text content alignment

- **Visual Treatment**:
  - No background colors (maintains notebook aesthetic)
  - Error outputs: `border-l-2 border-red-200` with minimal left padding
  - Loading states: Matching border treatment with color coding

## Interaction Patterns

### Focus Management

- **Keyboard Navigation**:
  - `↑↓` - Navigate between cells
  - `⇧↵` - Run cell and move to next
  - `⌘↵` - Run cell and stay

- **Visual Focus**:
  - Left border color change
  - Background tint
  - No heavy borders or outlines

### Clickable Elements

- **Consistent Pattern**: Elements that show current state are clickable to change that state.
  - **Cell Type Badge** → Cell type dropdown
  - **AI Model Badge** → Model selection dropdown
  - **Runtime Status** → Runtime info panel

### State Indication

- **Execution States**:
  - **Idle**: No indicator
  - **Queued**: `Badge` with "Queued"
  - **Running**: Animated spinner + "Running"/"Generating"
  - **Completed**: Green checkmark `✓`
  - **Error**: Red "Error" badge

- **Connection States**:
  - **Connected**: Green circle `●`
  - **Starting**: Amber circle
  - **Disconnected**: Red circle

## Cell Types

### Code Cells

- **Visual**: Default styling with code execution controls.
- **Execution**: "Run" button with play icon, shortcuts displayed.

### AI Cells

- **Visual**: Purple left border when focused, purple accent elements.
- **Model Selection**: Clickable model badge (e.g., "OPENAI • gpt-4").
- **Execution**: "Send" button with AI-specific styling.

### SQL Cells

- **Visual**: Blue left border when focused, blue accent elements.
- **Connection**: Connection status in header, dropdown for changing connections.
- **Execution**: "Run Query" button with database-specific styling.

### Markdown Cells

- **Visual**: Standard styling, renders markdown on execution.
- **No Special Controls**: Simple text editing interface.

## Responsive Design

### Desktop First

Primary design targets desktop/laptop usage for development workflows.

### Mobile Considerations

- **Touch Targets**: Minimum 28px (`h-7 w-7`) for all interactive elements.
- **Responsive Text**: Keyboard shortcuts hidden on small screens (`hidden sm:inline`).
- **Layout**: Single-column, full-width on mobile.

## Removed Elements

- **Eliminated Complexity**:
  - ❌ Raw cell types (backwards compatibility only)
  - ❌ Separate welcome/overview pages
  - ❌ Back buttons and complex navigation
  - ❌ Heavy borders and card containers
  - ❌ Output type labels ("Output", "Result")
  - ❌ Background colors in output areas
  - ❌ Redundant controls and buttons.

## Implementation Notes

### CSS Framework

- **Tailwind CSS**: All styling uses Tailwind utility classes.
- **shadcn/ui**: Component library for consistent interactive elements.

### Key Classes

- **Container Structure**:

  ```css
  .cell-container {
    @apply group relative mb-3 border-l-2 transition-all duration-200;
  }

  .cell-header {
    @apply mb-3 flex items-center justify-between py-1 pr-4 pl-6;
  }

  .cell-content {
    @apply px-4 py-3 transition-colors;
  }

  .cell-textarea {
    @apply min-h-[60px] resize-none border-0 bg-transparent px-2 py-2 font-mono focus-visible:ring-0;
  }
  ```

### Focus States

```css
/* Unfocused */
.cell-unfocused {
  @apply hover:border-border/50 border-transparent;
}

/* Focused - varies by cell type */
.cell-focused-code {
  @apply border-primary/60 bg-primary/5;
}

/* Focused - varies by cell type */
.cell-focused-ai {
  @apply border-purple-500/60 bg-purple-50/30;
}

/* Focused - varies by cell type */
.cell-focused-sql {
  @apply border-blue-500/60 bg-blue-50/30;
}
```

---

_This design document reflects the current state as of the UI cleanup
initiative. It should be updated as the interface evolves._
