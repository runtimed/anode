# Pyodide Autocomplete Implementation Plan

## Overview

This document outlines the implementation plan for adding Python autocomplete functionality to the Pyodide runtime agent in Anode. The goal is to provide context-aware Python code completions that work seamlessly within the collaborative notebook environment.

## Objectives

- **Primary**: Implement basic Python autocomplete using IPython's built-in completer
- **Secondary**: Establish patterns for runtime-specific IDE features
- **Tertiary**: Maintain multi-user collaboration without interference

## Current State Analysis

### ✅ Available Infrastructure
- CodeMirror 6 with `@codemirror/autocomplete` dependency installed
- `completionKeymap` and basic completion infrastructure in editor
- Pyodide worker with IPython shell setup (`shell = InteractiveShell.instance()`)
- Message passing communication between agent and worker via `sendWorkerMessage()`
- Python runtime with full IPython environment and rich display capabilities

### ❌ Missing Components
- Completion message type in worker communication protocol
- Python-side completion logic using IPython's completion system
- CodeMirror completion source connected to runtime agent
- Integration between editor cursor position and Python execution context

## Architecture Decisions

### Communication Pattern: Direct Worker Messages (Not LiveStore Events)

**Rationale:**
- **Multi-user safety**: Completion requests are user-specific and ephemeral
- **Performance**: High-frequency completion requests would pollute the event log
- **Privacy**: User typing shouldn't be broadcast to other collaborators
- **Existing pattern**: Reuses established `sendWorkerMessage()` infrastructure

### Completion Engine: IPython's Built-in Completer

**Rationale:**
- **Already available**: No additional dependencies required
- **Context-aware**: Understands current execution state and imported modules
- **Rich completions**: Supports module attributes, function signatures, variable names
- **Proven system**: Battle-tested completion logic from IPython ecosystem

## Implementation Phases

### Phase 1: Python Runtime Completion Support

**File**: `packages/pyodide-runtime/src/runt_runtime_shell.py`

Add completion function that leverages IPython's built-in completer:

```python
def get_completions(code: str, cursor_pos: int) -> dict:
    """Get code completions using IPython's built-in completer"""
    try:
        # Parse cursor position to find current line and position within line
        lines = code.split('\n')
        current_pos = 0
        line_number = 0
        
        for i, line in enumerate(lines):
            if current_pos + len(line) >= cursor_pos:
                line_number = i
                cursor_in_line = cursor_pos - current_pos
                break
            current_pos += len(line) + 1  # +1 for newline
        else:
            line_number = len(lines) - 1
            cursor_in_line = len(lines[-1]) if lines else 0
        
        current_line = lines[line_number] if line_number < len(lines) else ""
        
        # Use IPython's completer
        completions = shell.Completer.completions(current_line, cursor_in_line)
        
        return {
            'matches': [c.text for c in completions],
            'cursor_start': current_pos + (completions[0].start if completions else cursor_in_line),
            'cursor_end': current_pos + (completions[0].end if completions else cursor_in_line),
        }
    except Exception as e:
        return {'matches': [], 'cursor_start': cursor_pos, 'cursor_end': cursor_pos}
```

### Phase 2: Worker Message Protocol Extension

**File**: `packages/pyodide-runtime/src/pyodide-worker.ts`

Add `get_completions` message handler:

```typescript
case "get_completions": {
  try {
    const result = await pyodide!.runPythonAsync(`
      get_completions(${JSON.stringify(data.code)}, ${data.cursor_pos})
    `);
    const parsed = JSON.parse(result);
    self.postMessage({ id, type: "response", data: parsed });
  } catch (error) {
    self.postMessage({ 
      id, 
      type: "response", 
      data: { matches: [], cursor_start: data.cursor_pos, cursor_end: data.cursor_pos } 
    });
  }
  break;
}
```

### Phase 3: Agent API Extension

**File**: `packages/pyodide-runtime/src/index.ts`

Add completion method to `PyodideRuntimeAgent`:

```typescript
async getCompletions(code: string, cursorPos: number): Promise<{
  matches: string[];
  cursor_start: number;
  cursor_end: number;
}> {
  if (!this.worker) {
    return { matches: [], cursor_start: cursorPos, cursor_end: cursorPos };
  }
  
  try {
    return await this.sendWorkerMessage("get_completions", {
      code,
      cursor_pos: cursorPos,
    }) as any;
  } catch (error) {
    console.warn("Python completion failed:", error);
    return { matches: [], cursor_start: cursorPos, cursor_end: cursorPos };
  }
}
```

### Phase 4: Frontend Completion Source

**File**: `src/components/notebook/codemirror/pythonCompletion.ts`

Create CodeMirror completion source:

```typescript
import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import type { PyodideRuntimeAgent } from "@runtimed/pyodide-runtime";

export function createPythonCompletionSource(
  getRuntimeAgent: () => PyodideRuntimeAgent | null
) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    const agent = getRuntimeAgent();
    if (!agent || !agent.isRunning()) {
      return null;
    }
    
    const code = context.state.doc.toString();
    const pos = context.pos;
    
    try {
      const result = await agent.getCompletions(code, pos);
      
      if (result.matches.length === 0) {
        return null;
      }
      
      return {
        from: result.cursor_start,
        to: result.cursor_end,
        options: result.matches.map(match => ({
          label: match,
          type: "variable", // TODO: Enhance with proper type detection
        })),
      };
    } catch (error) {
      console.debug("Python completion failed:", error);
      return null;
    }
  };
}
```

### Phase 5: Editor Integration

**Files**: 
- `src/components/notebook/codemirror/baseExtensions.ts`
- `src/components/notebook/codemirror/CodeMirrorEditor.tsx`

Extend editor with completion support:

```typescript
// baseExtensions.ts
import { autocompletion, CompletionSource } from "@codemirror/autocomplete";

export function createPythonExtensions(completionSource?: CompletionSource) {
  const extensions = [...baseExtensions];
  
  if (completionSource) {
    extensions.push(
      autocompletion({ 
        override: [completionSource],
        closeOnBlur: true,
        maxRenderedOptions: 10,
      })
    );
  }
  
  return extensions;
}
```

### Phase 6: Cell Editor Integration

**File**: `src/components/notebook/cell/ExecutableCell.tsx`

Wire completion source to runtime agent:

```typescript
const pythonCompletionSource = useMemo(() => {
  if (cell.cellType === 'python' && runtimeAgent) {
    return createPythonCompletionSource(() => runtimeAgent);
  }
  return undefined;
}, [cell.cellType, runtimeAgent]);
```

## Technical Considerations

### Performance Optimizations
- **Debouncing**: Implement request debouncing to avoid overwhelming the worker
- **Caching**: Cache recent completions for repeated partial matches
- **Timeouts**: Implement reasonable timeouts for completion requests
- **Throttling**: Limit concurrent completion requests

### Error Handling
- **Graceful degradation**: Fall back gracefully when runtime unavailable
- **Clear messaging**: Provide user feedback for completion failures
- **Logging**: Add appropriate debug logging for troubleshooting

### User Experience
- **Loading states**: Show visual feedback during completion requests
- **Runtime awareness**: Only enable completion when Python runtime is active
- **Performance**: Ensure completion doesn't impact typing responsiveness

## Testing Strategy

### Unit Tests
- Python completion function with various code samples
- Message passing between agent and worker
- CodeMirror completion source integration
- Error handling scenarios

### Integration Tests
- Full completion workflow from editor to Python runtime
- Runtime lifecycle integration (startup/shutdown)
- Multi-user collaboration scenarios

### Manual Test Cases
1. **Basic completions**: `pri|` → `print`, `len|` → `length`
2. **Module attributes**: `numpy.|` → `numpy.array`, `numpy.zeros`
3. **Variable completions**: User-defined variables in different scopes
4. **Import completions**: `from numpy import |`
5. **Method completions**: `"hello".upp|` → `"hello".upper`
6. **Runtime states**: Completion behavior during code execution
7. **Error scenarios**: Completion when runtime crashed/unavailable

## Success Metrics

### Primary Success Criteria
- [ ] Python cells show relevant completions for built-in functions
- [ ] Imported module attributes are completed correctly
- [ ] User-defined variables appear in completions
- [ ] Completion works without interfering with multi-user editing
- [ ] Performance remains smooth during typing

### Secondary Success Criteria
- [ ] Completion works across different Python constructs (classes, functions, etc.)
- [ ] Error handling provides clear feedback
- [ ] Completion gracefully handles runtime restart scenarios

## Future Enhancements

### Phase 2 Features (Future)
- **Type annotations**: Enhanced completion with type information
- **Signature help**: Function parameter hints during typing
- **Documentation**: Hover documentation for completed items
- **Jedi integration**: More sophisticated completion engine
- **Cross-cell awareness**: Completions aware of variables from other cells

### Performance Improvements
- **Incremental parsing**: Only reparse changed portions of code
- **Background pre-loading**: Pre-compute completions for common patterns
- **Server-side caching**: Cache completion results on runtime side

## Dependencies

### Required Dependencies
- No new dependencies required (leverages existing IPython and CodeMirror)

### Optional Future Dependencies
- `jedi` (for enhanced Python completion)
- Additional CodeMirror completion extensions

## Risk Mitigation

### Potential Risks
1. **Performance impact**: Completion requests might slow down typing
2. **Worker crashes**: Completion requests might destabilize Pyodide worker
3. **Multi-user conflicts**: Completion state might interfere with collaboration

### Mitigation Strategies
1. **Debouncing and timeouts**: Prevent excessive worker load
2. **Error isolation**: Ensure completion failures don't crash execution
3. **Separate communication channel**: Keep completion requests isolated from execution

## Conclusion

This implementation provides a solid foundation for Python autocomplete in Anode while maintaining the collaborative nature of the platform. The approach leverages existing infrastructure and follows established patterns, making it both maintainable and extensible for future enhancements.