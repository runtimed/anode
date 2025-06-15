# Notebook UX Improvements Specification

## Overview

This document outlines specific UX improvements to make Anode's notebook interface more fluid and Jupyter-like, while preserving the real-time collaborative advantages of LiveStore.

## Current Problems

### 1. Cell Interaction Model Issues
- **Click-to-edit pattern** breaks notebook flow
- **No keyboard navigation** between cells
- **Heavy card UI** feels cluttered compared to clean notebook interfaces
- **Hover-only controls** are hard to discover and use

### 2. Execution Flow Problems
- **Separate run button** requires extra clicks
- **No standard keyboard shortcuts** (Shift+Enter, Ctrl+Enter)
- **Minimal execution feedback** with inconsistent status display
- **No execution count display** in familiar format

### 3. Visual Hierarchy Issues
- **Heavy card styling** creates visual noise
- **No clear focus states** for active cell
- **Inconsistent spacing** between cells
- **Controls appear/disappear** making interface feel unstable

## Proposed Improvements

### Phase 1: Fluid Navigation (HIGH Priority)

#### 1.1 Keyboard Navigation Between Cells
**Goal**: Arrow keys move between cells naturally

**Implementation**:
- **Down arrow** at bottom of textarea moves to next cell
- **Up arrow** at top of textarea moves to previous cell
- Focus moves to same cursor position in target cell
- Smooth transitions without jarring jumps

**Technical Notes**:
- Detect cursor position in textarea
- Only trigger navigation when at first/last line
- Preserve cursor column position when possible

#### 1.2 Standard Execution Shortcuts
**Goal**: Match Jupyter keyboard behavior

**Implementation**:
- **Shift+Enter**: Run cell and move to next (create new cell if at end)
- **Ctrl/Cmd+Enter**: Run cell and stay in current cell
- **Escape**: Blur current cell (exit to document level)

**Current vs Proposed**:
```tsx
// Current: Already partially implemented
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && e.shiftKey) {
    // Shift+Enter: Run cell and move to next ✅
  } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    // Ctrl/Cmd+Enter: Run cell but stay ✅
  }
}, [])

// Need to add: Arrow key navigation
```

#### 1.3 Simple Execution Count Display
**Goal**: Show execution order without confusing `In[1]:` format

**Design**:
- Small execution count below code area
- Format: `Executed #3` or just `#3`
- Only show after cell has been executed
- Subtle styling, not prominent

### Phase 2: Streamlined Interface (HIGH Priority)

#### 2.1 Reduce Card Weight
**Goal**: Lighter, cleaner notebook appearance

**Changes**:
- Remove heavy card borders and shadows
- Use subtle left border for cell boundaries
- Minimize padding and margins
- Focus on content, not containers

**Before/After**:
```tsx
// Current: Heavy card styling
<Card className="mb-4 relative group">
  <CardHeader className="pb-2">
  <CardContent>

// Proposed: Minimal container
<div className="mb-2 relative group border-l-2 border-transparent hover:border-slate-200 pl-4">
```

#### 2.2 Better Focus States
**Goal**: Clear visual feedback for active cell

**Design**:
- **Editing cell**: Green left border, subtle background tint
- **Selected cell**: Blue left border (for future selection mode)
- **Idle cell**: Transparent border, minimal styling
- Smooth transitions between states

#### 2.3 Context-Sensitive Controls
**Goal**: Show controls when needed, hide when not

**Implementation**:
- **Always visible**: Cell type badge, execution status
- **On cell focus**: Move up/down, add/delete controls
- **On hover**: Secondary actions
- **Never hidden**: Run button for code cells

### Phase 3: Execution Improvements (MEDIUM Priority)

#### 3.1 Better Execution Feedback
**Goal**: Clear status during execution

**Features**:
- **Queued**: Subtle "Queued..." indicator
- **Running**: Progress spinner with "Running..." text
- **Completed**: Execution count appears
- **Error**: Red indicator with "Error" text

#### 3.2 Improved Run Controls
**Goal**: More accessible execution

**Changes**:
- **Run button**: Always visible for code cells, better styling
- **Keyboard shortcuts**: Prominently displayed in tooltips
- **Status integration**: Button shows current execution state

### Phase 4: Polish & Refinements (LOW Priority)

#### 4.1 Cell Type Switching
**Goal**: Easier cell type changes

**Improvements**:
- Larger click target for cell type badge
- Better visual hierarchy in dropdown
- Keyboard shortcuts for common types (future)

#### 4.2 Mobile Responsiveness
**Goal**: Works well on touch devices

**Features**:
- Larger touch targets
- Swipe gestures for navigation (future)
- Mobile-friendly control placement

## Implementation Plan

### Week 1: Navigation Foundation
1. **Implement arrow key navigation** between cells
2. **Add cursor position detection** for smart navigation
3. **Test navigation flow** with multiple cells

### Week 2: Visual Polish
1. **Redesign cell container styling** (remove heavy cards)
2. **Implement focus states** with subtle borders
3. **Update control visibility** patterns

### Week 3: Execution UX
1. **Improve execution count display** below code
2. **Enhance run button** styling and feedback
3. **Polish execution status** indicators

### Week 4: Testing & Refinement
1. **Cross-browser testing** of navigation
2. **Mobile interaction testing**
3. **Performance optimization** of focus changes
4. **User testing** of overall flow

## Design Principles

### Do:
- **Keep it simple**: Avoid complex mode switching
- **Follow conventions**: Match Jupyter patterns where helpful
- **Stay fluid**: Minimize friction in common workflows
- **Show state clearly**: Users should know what's happening

### Don't:
- **Over-engineer**: No complex command/edit modes initially
- **Break collaboration**: Maintain LiveStore sync advantages
- **Clutter interface**: Keep visual noise minimal
- **Confuse users**: Avoid non-standard interaction patterns

## Success Metrics

### Qualitative:
- **Feels like Jupyter**: Familiar interaction patterns
- **Flows smoothly**: No jarring transitions or clicks
- **Stays focused**: Keyboard-driven workflow
- **Looks clean**: Minimal visual noise

### Quantitative:
- **Reduced clicks**: Fewer mouse interactions needed
- **Faster execution**: Quicker cell-to-cell workflow
- **Better discoverability**: Controls are findable
- **Mobile usability**: Works on touch devices

## Technical Considerations

### React Implementation:
- Use refs for textarea cursor position detection
- Implement smooth focus management between cells
- Maintain cell state during navigation
- Handle edge cases (empty notebook, single cell)

### LiveStore Integration:
- Preserve real-time sync during UX improvements
- Maintain event sourcing for all user actions
- Don't break collaborative editing features
- Keep kernel execution flow intact

### Performance:
- Minimize re-renders during navigation
- Optimize focus change animations
- Ensure responsive interaction on slower devices
- Test with large notebooks (100+ cells)

## Future Considerations

### Phase 5 (Future):
- **Cell selection mode**: Click outside content to select cell
- **Multiple cell selection**: Shift+click for bulk operations
- **Undo/redo**: For cell operations
- **Advanced shortcuts**: Full Jupyter keyboard compatibility

### Integration Points:
- **AI assistance**: UX should support AI cell interactions
- **Code completion**: Interface should accommodate LSP features
- **Rich outputs**: Design should handle complex output types
- **Collaboration**: Visual indicators for other users' actions

This specification provides a clear path from the current "form-like" interface to a fluid, notebook-native experience while preserving Anode's unique collaborative advantages.