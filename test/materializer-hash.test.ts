import { describe, test, expect } from "vitest";
import {
  makeSchema,
  Events,
  State,
  Schema,
  createStorePromise,
} from "@livestore/livestore";
import { makeAdapter } from "@livestore/adapter-node";

describe("Materializer Determinism Issue", () => {
  test("demonstrates materializer non-determinism with ctx.query", async () => {
    // This test shows the core problem: materializers that use ctx.query()
    // can produce different results depending on timing/ordering

    const events = {
      outputCreated: Events.synced({
        name: "v1.OutputCreated",
        schema: Schema.Struct({
          outputId: Schema.String,
          initialData: Schema.String,
        }),
      }),
      outputAppended: Events.synced({
        name: "v1.OutputAppended",
        schema: Schema.Struct({
          outputId: Schema.String,
          content: Schema.String,
        }),
      }),
      outputCleared: Events.synced({
        name: "v1.OutputCleared",
        schema: Schema.Struct({
          outputId: Schema.String,
        }),
      }),
    };

    const tables = {
      outputs: State.SQLite.table({
        name: "outputs",
        columns: {
          id: State.SQLite.text({ primaryKey: true }),
          data: State.SQLite.text(),
        },
      }),
    };

    const materializers = State.SQLite.materializers(events, {
      "v1.OutputCreated": ({ outputId, initialData }) =>
        tables.outputs.insert({ id: outputId, data: initialData }),

      "v1.OutputCleared": ({ outputId }) =>
        tables.outputs.update({ data: "" }).where({ id: outputId }),

      // ❌ This materializer is problematic because it uses ctx.query()
      // which makes it non-deterministic
      "v1.OutputAppended": ({ outputId, content }, ctx) => {
        const existing = ctx.query(
          tables.outputs.select().where({ id: outputId }).limit(1)
        )[0];

        if (!existing) {
          // This can happen if events are processed out of order
          throw new Error(`Output ${outputId} not found during append`);
        }

        return tables.outputs
          .update({ data: existing.data + content })
          .where({ id: outputId });
      },
    });

    const state = State.SQLite.makeState({ tables, materializers });
    const schema = makeSchema({ events, state });

    const store = await createStorePromise({
      schema,
      adapter: makeAdapter({ storage: { type: "in-memory" } }),
      storeId: "test-store",
    });

    // Normal case works fine
    await store.commit(
      events.outputCreated({
        outputId: "output-1",
        initialData: "initial",
      })
    );

    await store.commit(
      events.outputAppended({
        outputId: "output-1",
        content: " first",
      })
    );

    // Clear the output
    await store.commit(events.outputCleared({ outputId: "output-1" }));

    // Now try to append to the cleared output
    // This should fail because the materializer tries to append to empty string
    // but the failure depends on the exact state when materializer runs
    try {
      await store.commit(
        events.outputAppended({
          outputId: "output-1",
          content: " after clear",
        })
      );

      // If we get here, check the result
      const result = store.query(
        tables.outputs.select().where({ id: "output-1" }).limit(1)
      )[0];

      // The result should be " after clear" (empty string + content)
      expect(result.data).toBe(" after clear");
    } catch (error) {
      // This is the expected failure case
      console.log("Expected failure:", error.message);
      expect(error.message).toMatch(/Output .* not found during append/);
    }

    await store.shutdown();
  });

  test("shows correct deterministic approach with event payload", async () => {
    // This test shows the correct approach: include all needed data in event payload

    const events = {
      outputSet: Events.synced({
        name: "v1.OutputSet",
        schema: Schema.Struct({
          outputId: Schema.String,
          data: Schema.String,
        }),
      }),
      outputAppended: Events.synced({
        name: "v1.OutputAppended",
        schema: Schema.Struct({
          outputId: Schema.String,
          previousData: Schema.String, // ✅ Include previous data in event
          appendedContent: Schema.String,
        }),
      }),
    };

    const tables = {
      outputs: State.SQLite.table({
        name: "outputs",
        columns: {
          id: State.SQLite.text({ primaryKey: true }),
          data: State.SQLite.text(),
        },
      }),
    };

    const materializers = State.SQLite.materializers(events, {
      "v1.OutputSet": ({ outputId, data }) =>
        tables.outputs.insert({ id: outputId, data }),

      // ✅ This materializer is deterministic because it doesn't use ctx.query()
      "v1.OutputAppended": ({ outputId, previousData, appendedContent }) => {
        const newData = previousData + appendedContent;
        return tables.outputs.update({ data: newData }).where({ id: outputId });
      },
    });

    const state = State.SQLite.makeState({ tables, materializers });
    const schema = makeSchema({ events, state });

    const store = await createStorePromise({
      schema,
      adapter: makeAdapter({ storage: { type: "in-memory" } }),
      storeId: "test-store",
    });

    // Set initial data
    await store.commit(
      events.outputSet({
        outputId: "output-1",
        data: "initial",
      })
    );

    // Append content - note we need to pass the current data
    await store.commit(
      events.outputAppended({
        outputId: "output-1",
        previousData: "initial",
        appendedContent: " appended",
      })
    );

    const result = store.query(
      tables.outputs.select().where({ id: "output-1" }).limit(1)
    )[0];

    expect(result.data).toBe("initial appended");

    await store.shutdown();
  });

  test("demonstrates why column expressions would solve the problem", async () => {
    // This test shows what we want: a way to safely reference columns
    // without making materializers non-deterministic

    const events = {
      outputCreated: Events.synced({
        name: "v1.OutputCreated",
        schema: Schema.Struct({
          outputId: Schema.String,
          initialData: Schema.String,
        }),
      }),
      outputAppended: Events.synced({
        name: "v1.OutputAppended",
        schema: Schema.Struct({
          outputId: Schema.String,
          content: Schema.String,
        }),
      }),
    };

    const tables = {
      outputs: State.SQLite.table({
        name: "outputs",
        columns: {
          id: State.SQLite.text({ primaryKey: true }),
          data: State.SQLite.text(),
        },
      }),
    };

    const materializers = State.SQLite.materializers(events, {
      "v1.OutputCreated": ({ outputId, initialData }) =>
        tables.outputs.insert({ id: outputId, data: initialData }),

      // This shows what the API should look like with column expressions:
      "v1.OutputAppended": ({ outputId, content }) => {
        // TODO: This syntax doesn't exist yet but shows the desired API
        // return tables.outputs.update({
        //   data: Column.concat(Column.ref('data'), content)
        // }).where({ id: outputId })

        // For now, demonstrate the problem exists by showing what we can't do safely
        return tables.outputs
          .update({
            data: content, // This overwrites instead of appending - not what we want
          })
          .where({ id: outputId });
      },
    });

    const state = State.SQLite.makeState({ tables, materializers });
    const schema = makeSchema({ events, state });

    const store = await createStorePromise({
      schema,
      adapter: makeAdapter({ storage: { type: "in-memory" } }),
      storeId: "test-store",
    });

    await store.commit(
      events.outputCreated({
        outputId: "output-1",
        initialData: "initial",
      })
    );

    await store.commit(
      events.outputAppended({
        outputId: "output-1",
        content: " appended",
      })
    );

    const result = store.query(
      tables.outputs.select().where({ id: "output-1" }).limit(1)
    )[0];

    // This demonstrates the problem - we overwrote instead of appended
    expect(result.data).toBe(" appended"); // Not "initial appended"

    await store.shutdown();
  });
});
