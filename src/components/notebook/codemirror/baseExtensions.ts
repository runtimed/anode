import {
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  autocompletion,
  CompletionSource,
  acceptCompletion,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { lintKeymap } from "@codemirror/lint";
import { EditorState, Extension } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  keymap,
  rectangularSelection,
} from "@codemirror/view";
import { githubLight } from "@uiw/codemirror-theme-github";

const customStyles = EditorView.theme({
  // Remove focus dotted outline
  "&.cm-focused": {
    outline: "none",
  },
  // Only apply padding at smaller sizes (max-width: 640px, i.e., Tailwind's sm breakpoint)
  "@media (max-width: 640px)": {
    ".cm-content": {
      padding: "0.75rem 0.5rem",
    },
  },
  // Slightly thicker cursor for better visibility in the notebook
  ".cm-cursor": {
    borderLeftWidth: "2px",
  },
});

// Custom keymap for completion with Tab key support
const completionKeyMap = [
  {
    key: "Tab",
    run: acceptCompletion,
    preventDefault: true,
  },
  ...completionKeymap,
];

export const basicSetup: Extension = (() => [
  history(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  rectangularSelection(),
  crosshairCursor(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    ...completionKeyMap,
    ...lintKeymap,
  ]),
  customStyles,
])();

export const aiBasicSetup: Extension = (() => [
  history(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  // Note: autocompletion() is excluded for AI cells
  rectangularSelection(),
  crosshairCursor(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
    // Note: completionKeymap is excluded for AI cells
    ...lintKeymap,
  ]),
  customStyles,
])();

export const baseExtensions = [basicSetup, githubLight];
export const aiBaseExtensions = [aiBasicSetup, githubLight];

/**
 * Create Python-specific extensions with optional completion source
 */
export function createPythonExtensions(completionSource?: CompletionSource) {
  const extensions = [...baseExtensions];

  if (completionSource) {
    extensions.push(
      autocompletion({
        override: [completionSource],
        closeOnBlur: true,
        maxRenderedOptions: 10,
        activateOnTyping: true,
        selectOnOpen: false,
      }),
      // Add custom completion keymap with Tab support
      keymap.of(completionKeyMap)
    );
  }

  return extensions;
}
