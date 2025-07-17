import { makeSchema, State, Store as LiveStore } from "@livestore/livestore";
import { events, tables, materializers } from "@runt/schema";

// Create the schema using the factory pattern
const state = State.SQLite.makeState({ tables, materializers });
export const schema = makeSchema({ events, state });
export type Store = LiveStore<typeof schema>;

// Export the schema components for use in the app
export { events, tables, materializers };
