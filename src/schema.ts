import { makeSchema } from "@livestore/livestore";
import { State } from "@livestore/livestore";
import { events, tables, materializers } from "@runt/schema";

// Create the schema using the factory pattern
const state = State.SQLite.makeState({ tables, materializers });
export const schema = makeSchema({ events, state });

// Export the schema components for use in the app
export { events, tables, materializers };
