import { StateEffect, StateField } from "@codemirror/state";
import { PanelConstructor, showPanel } from "@codemirror/view";

/**
 * For presence tracking, we send each user's presence to React, which then updates the state in LiveStore.
 * The current user's presence is never synced back from CodeMirror into React for the current user because we don't
 * want to handle complex state state coordination.
 *
 * So, current user sends up their state to LiveStore, other users consume that state, which travels through LiveStore, down to React, and finally to CodeMirror.
 */

export type OtherUserRanges = {
  from: number;
  to: number;
};

export type OtherUserPresence = {
  userId: string;
  ranges: OtherUserRanges[];
};

function createPresencePanel(value: OtherUserPresence[]): PanelConstructor {
  return () => {
    const dom = document.createElement("div");
    dom.textContent = `Current presence is ${value.map((v) => v.userId).join(", ")}`;

    return { dom };
  };
}

// NOTE: Only use this state inside CodeMirror code, not in React.
// Otherwise, we'll run into issues with conflicts about who owns the state.
export const otherUserPresenceStateField = StateField.define<
  OtherUserPresence[]
>({
  create() {
    return [];
  },
  update(currentValue, transaction) {
    let newValue = currentValue;
    for (const effect of transaction.effects) {
      if (effect.is(updatePresenceStateEffect)) {
        newValue = effect.value;
      }
    }
    return newValue;
  },
  provide: (value) => showPanel.from(value, createPresencePanel),
});

export const updatePresenceStateEffect =
  StateEffect.define<OtherUserPresence[]>();
