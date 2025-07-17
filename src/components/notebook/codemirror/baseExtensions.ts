import {
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
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
  // Reset cursor animation on focus for better visibility
  "&.cm-focused .cm-cursor": {
    animation: "steps(1) cm-blink 1.2s infinite",
    animationDelay: "0s !important",
  },
  // Ensure cursor is visible immediately on focus
  "&.cm-focused .cm-cursor-primary": {
    opacity: 1,
  },
  // Define the blink animation
  "@keyframes cm-blink": {
    "0%, 50%": { opacity: 1 },
    "51%, 100%": { opacity: 0 },
  },
});

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
    ...completionKeymap,
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
