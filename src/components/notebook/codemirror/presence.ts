import { StateEffect, StateField } from "@codemirror/state";

export type OtherUserRanges = {
  from: number;
  to: number;
};

export type OtherUserPresence = {
  userId: string;
  ranges: OtherUserRanges[];
};

export const otherUserPresenceStateField = StateField.define<OtherUserPresence>(
  {
    create() {
      return {
        userId: "",
        ranges: [],
      };
    },
    update(currentValue, transaction) {
      return currentValue;
    },
  }
);

export const updatePresenceStateEffect =
  StateEffect.define<OtherUserPresence>();
