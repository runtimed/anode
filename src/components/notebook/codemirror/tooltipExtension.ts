import { EditorView, Tooltip, showTooltip } from "@codemirror/view";
import { StateField, Transaction } from "@codemirror/state";
import {
  otherUserPresenceStateField,
  updatePresenceStateEffect,
} from "./presence";

export const cursorTooltipField = StateField.define<readonly Tooltip[]>({
  create: () => [],

  update(tooltips, tr) {
    console.log("update tooltips", tooltips, tr);
    return getCursorTooltips(tr);
  },

  provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
});

function getCursorTooltips(tr: Transaction): readonly Tooltip[] {
  const state = tr.state;
  let otherUserPresenceTooltips: Tooltip[] = [];

  for (const effect of tr.effects) {
    if (effect.is(updatePresenceStateEffect)) {
      console.log("updatePresenceStateEffect", effect);
      const otherUserPresence = state.field(otherUserPresenceStateField);

      otherUserPresenceTooltips = otherUserPresence.map((user) => {
        return {
          pos: user.ranges[0].from,
          above: true,
          strictSide: true,
          arrow: true,
          create: () => {
            let dom = document.createElement("div");
            dom.className = "cm-tooltip-cursor";
            dom.textContent = user.userId;
            return { dom };
          },
        };
      });
    }
  }

  return otherUserPresenceTooltips;
}

// Theme

export const cursorTooltipBaseTheme = EditorView.baseTheme({
  ".cm-tooltip.cm-tooltip-cursor": {
    backgroundColor: "#66b",
    color: "white",
    border: "none",
    padding: "2px 7px",
    borderRadius: "4px",
    "& .cm-tooltip-arrow:before": {
      borderTopColor: "#66b",
    },
    "& .cm-tooltip-arrow:after": {
      borderTopColor: "transparent",
    },
  },
});
