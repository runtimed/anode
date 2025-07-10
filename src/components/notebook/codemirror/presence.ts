import { StateEffect, StateField } from "@codemirror/state";
import { PanelConstructor, showPanel } from "@codemirror/view";

export type OtherUserRanges = {
  from: number;
  to: number;
};

export type OtherUserPresence = {
  userId: string;
  ranges: OtherUserRanges[];
};

function createPresencePanel(value: OtherUserPresence): PanelConstructor {
  return () => {
    const dom = document.createElement("div");
    dom.textContent = `Current presence is ${value.userId} ${value.ranges.map((range) => `${range.from} - ${range.to}`).join(", ")}`;

    return { dom };
  };
}

export const otherUserPresenceStateField = StateField.define<OtherUserPresence>(
  {
    create() {
      return {
        userId: "",
        ranges: [],
      };
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
  }
);

export const updatePresenceStateEffect =
  StateEffect.define<OtherUserPresence>();
