# AI Context Visibility Feature ✅ FULLY IMPLEMENTED

This document describes the AI context visibility toggle feature that allows
users to control which cells are included in AI model context.

## Overview

The AI context visibility feature provides granular control over which notebook
cells are included when sending context to AI models. **This feature is now
fully functional** - AI models only receive cells that are marked as visible.
This is important for:

- **Token efficiency**: Exclude irrelevant cells to stay within token limits
- **Privacy**: Hide sensitive data from AI models
- **Focus**: Help AI focus on relevant context for better responses
- **Performance**: Reduce processing time by limiting context size

## User Interface

### Cell-Level Controls

Each cell now has an **Eye icon** in its hover controls that toggles AI context
visibility:

- **👁️ Eye open**: Cell is included in AI context (default)
- **👁️‍🗨️ Eye closed**: Cell is excluded from AI context

The toggle appears in the cell header hover controls alongside other visibility
and management buttons.

### Visual Indicators

- **Included cells**: Normal appearance (no visual change)
- **Excluded cells**: Reduced opacity (`opacity-60`) to clearly indicate
  exclusion
- **Hover feedback**: Icon appearance changes based on current state
- **Tooltip guidance**: Clear tooltips explain current state and action

### Supported Cell Types

The feature works consistently across all cell types:

- **Code cells**: Standard implementation
- **Markdown cells**: Standard implementation
- **SQL cells**: Integrated with SQL-specific styling
- **AI cells**: Integrated with AI-specific styling (purple theme)

## Technical Implementation

### Schema Changes

Added to `jsr:@runt/schema`:

```typescript
// In cells table
aiContextVisible: State.SQLite.boolean({ default: true })

// New event
cellAiContextVisibilityToggled: Events.synced({
  name: "v1.CellAiContextVisibilityToggled",
  schema: Schema.Struct({
    id: Schema.String,
    aiContextVisible: Schema.Boolean,
  }),
})

// New materializer
"v1.CellAiContextVisibilityToggled": ({ id, aiContextVisible }) =>
  tables.cells.update({ aiContextVisible }).where({ id })
```

### Component Implementation

Each cell component (`Cell.tsx`, `SqlCell.tsx`, `AiCell.tsx`) includes:

1. **Toggle function**:

```typescript
const toggleAiContextVisibility = useCallback(() => {
  store.commit(
    events.cellAiContextVisibilityToggled({
      id: cell.id,
      aiContextVisible: !cell.aiContextVisible,
    })
  );
}, [cell.id, cell.aiContextVisible, store]);
```

2. **UI control**:

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={toggleAiContextVisibility}
  className={`h-7 w-7 p-0 hover:bg-muted/80 ${
    cell.aiContextVisible ? "" : "text-muted-foreground/60"
  }`}
  title={cell.aiContextVisible ? "Hide from AI context" : "Show in AI context"}
>
  {cell.aiContextVisible
    ? <Eye className="h-3 w-3" />
    : <EyeOff className="h-3 w-3" />}
</Button>;
```

3. **Visual styling**:

```typescript
<div className={`... ${!cell.aiContextVisible ? 'opacity-60' : ''}`}>
```

## Default Behavior

- **New cells**: Included in AI context by default (`aiContextVisible: true`)
- **All cell types**: Same default behavior for consistency
- **Existing notebooks**: Cells created before this feature are included by
  default
- **No migration needed**: New field defaults to `true` for backward
  compatibility
- **Actual filtering**: AI models only receive cells where
  `aiContextVisible: true`

## Usage Patterns

### Common Use Cases

1. **Hide sensitive data**: Exclude cells containing API keys, passwords, or
   personal information
2. **Focus on relevant code**: Include only the cells related to current problem
3. **Manage token limits**: Exclude verbose output or large datasets
4. **Context optimization**: Hide debugging or experimental cells

### Workflow Examples

**Data Analysis Workflow**:

- Include: Data loading, cleaning, and analysis cells
- Exclude: Raw data inspection, debug prints, experimental attempts

**Code Development Workflow**:

- Include: Current function/class being worked on
- Exclude: Old implementations, test outputs, documentation cells

**AI Collaboration Workflow**:

- Include: Problem description, current approach, specific questions
- Exclude: Unrelated experiments, personal notes, sensitive configurations

## Implementation Status: COMPLETE ✅

The AI context visibility feature is now **fully functional**:

1. **UI Controls**: Eye icons in all cell types (Cell, SqlCell, AiCell) ✅
2. **Visual Feedback**: Opacity changes for excluded cells ✅
3. **Database Schema**: `aiContextVisible` field with proper events ✅
4. **Runtime Integration**: Context filtering in `gatherNotebookContext()` ✅
5. **AI Model Integration**: Only visible cells sent to OpenAI/Anthropic ✅
6. **System Prompt**: AI models informed about context filtering ✅

## Implementation Notes

### Architecture Decisions

- **LiveStore events**: Uses standard event-sourcing pattern for state changes
- **Component consistency**: Same implementation pattern across all cell types
- **Visual hierarchy**: Follows existing UI design patterns and spacing
- **Accessibility**: Proper tooltips and keyboard navigation support

### Performance Considerations

- **Minimal overhead**: Toggle state stored in database, no additional queries
  needed
- **Reactive updates**: Changes propagate immediately via LiveStore reactivity
- **Efficient rendering**: Visual changes use CSS opacity for smooth transitions

### Testing Strategy

- **Unit tests**: Test toggle functionality for each cell type
- **Integration tests**: Verify AI context filtering works end-to-end
- **Visual tests**: Ensure consistent styling across cell types
- **Accessibility tests**: Verify keyboard navigation and screen reader support

---

_This feature represents a significant step toward giving users fine-grained
control over AI collaboration in notebook environments._
