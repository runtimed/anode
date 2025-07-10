import {
  autocompletion,
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
import { EditorState, Extension, Facet, StateField } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  keymap,
  PanelConstructor,
  rectangularSelection,
  showPanel,
} from "@codemirror/view";
import { githubLight } from "@uiw/codemirror-theme-github";
import { otherUserPresenceStateField } from "./presence.js";
import {
  cursorTooltipBaseTheme,
  cursorTooltipField,
} from "./tooltipExtension.js";
import { underlineSelection } from "./underlineExtension.js";

const nameFacet = Facet.define<string>();

const customStyles = EditorView.theme({
  // Remove focus dotted outline
  "&.cm-focused": {
    outline: "none",
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
  nameFacet.of("ANODE"),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
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

// ---

const panel = showPanel.of((view) => {
  const dom = document.createElement("div");
  const name = view.state.facet(nameFacet);
  dom.textContent = `This is my bottom panel. name is ${name}.`;

  return { dom };
});

function createCounterPanel(value: number): PanelConstructor {
  return () => {
    const dom = document.createElement("div");
    dom.textContent = `Current count is ${value}`;

    return { dom };
  };
}

const changeCounterStateField = StateField.define<number>({
  create: (_state) => {
    return 0;
  },
  update: (currentValue, transaction) => {
    let newValue = currentValue;

    if (transaction.docChanged) {
      newValue += 1;
    }

    return newValue;
  },

  provide: (value) => showPanel.from(value, createCounterPanel),
});

// ---

export const underlineKeymap = keymap.of([
  {
    key: "Mod-h",
    preventDefault: true,
    run: underlineSelection,
  },
]);

export const baseExtensions = [
  // panel,
  // countPanel,
  // updateCounterStateEffect.of(0),
  otherUserPresenceStateField,
  // changeCounterStateField,
  basicSetup,
  githubLight,
  cursorTooltipBaseTheme,
  cursorTooltipField,
  underlineKeymap,
];
export const aiBaseExtensions = [
  aiBasicSetup,
  githubLight,
  cursorTooltipBaseTheme,
  cursorTooltipField,
];
