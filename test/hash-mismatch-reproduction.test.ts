import { describe, test, expect } from "vitest";
import {
  makeSchema,
  Events,
  State,
  Schema,
  createStorePromise,
} from "@livestore/livestore";
import { makeAdapter } from "@livestore/adapter-node";

describe("LiveStore Hash Mismatch Reproduction", () => {
  test("demonstrates hash mismatch with ctx.query() append operations", async () => {
    // Define events for message creation and content appending
    const events = {
      messageCreated: Events.synced({
        name: "v1.MessageCreated",
        schema: Schema.Struct({
          id: Schema.String,
        }),
      }),
      contentAppended: Events.synced({
        name: "v1.ContentAppended",
        schema: Schema.Struct({
          id: Schema.String,
          appendText: Schema.String,
        }),
      }),
    };

    // Define table schema
    const tables = {
      messages: State.SQLite.table({
        name: "messages",
        columns: {
          id: State.SQLite.text({ primaryKey: true }),
          content: State.SQLite.text({ default: "" }),
        },
      }),
    };

    // PROBLEMATIC materializers using ctx.query()
    const materializers = State.SQLite.materializers(events, {
      "v1.MessageCreated": ({ id }) =>
        tables.messages.insert({ id, content: "" }),

      // ❌ This materializer is non-deterministic due to ctx.query()
      "v1.ContentAppended": ({ id, appendText }, ctx) => {
        const existing = ctx.query(
          tables.messages.select().where({ id }).limit(1)
        )[0];

        if (!existing) {
          console.warn(`Message ${id} not found during append`);
          return [];
        }

        const newContent = existing.content + appendText;
        return tables.messages
          .update({ content: newContent })
          .where({ id });
      },
    });

    const state = State.SQLite.makeState({ tables, materializers });
    const schema = makeSchema({ events, state });

    const store = await createStorePromise({
      schema,
      adapter: makeAdapter({ storage: { type: "in-memory" } }),
      storeId: "hash-mismatch-test",
    });

    try {
      // Create initial message
      await store.commit(events.messageCreated({ id: "test-msg" }));

      // Verify initial state
      let result = store.query(
        tables.messages.select().where({ id: "test-msg" }).limit(1)
      )[0];
      expect(result.content).toBe("");

      // First append
      await store.commit(
        events.contentAppended({ id: "test-msg", appendText: "hello" })
      );

      result = store.query(
        tables.messages.select().where({ id: "test-msg" }).limit(1)
      )[0];
      expect(result.content).toBe("hello");

      // Second append
      await store.commit(
        events.contentAppended({ id: "test-msg", appendText: "world" })
      );

      result = store.query(
        tables.messages.select().where({ id: "test-msg" }).limit(1)
      )[0];
      expect(result.content).toBe("helloworld");

      // This test passes in isolation, but would fail if events
      // arrived in different order on different clients:
      //
      // Scenario causing hash mismatch:
      // Client A: create -> append("hello") -> append("world") = "helloworld"
      // Client B: create -> append("world") -> append("hello") = "worldhello"
      //
      // The materializers produce different results = hash mismatch = crash

    } finally {
      await store.shutdown();
    }
  });

  test("shows working approach without ctx.query()", async () => {
    // This demonstrates the correct, deterministic approach
    const events = {
      messageSet: Events.synced({
        name: "v1.MessageSet",
        schema: Schema.Struct({
          id: Schema.String,
          content: Schema.String,
        }),
      }),
      contentAppended: Events.synced({
        name: "v1.ContentAppended",
        schema: Schema.Struct({
          id: Schema.String,
          previousContent: Schema.String, // Include previous state in event
          appendText: Schema.String,
        }),
      }),
    };

    const tables = {
      messages: State.SQLite.table({
        name: "messages",
        columns: {
          id: State.SQLite.text({ primaryKey: true }),
          content: State.SQLite.text(),
        },
      }),
    };

    // ✅ Deterministic materializers - no ctx.query() needed
    const materializers = State.SQLite.materializers(events, {
      "v1.MessageSet": ({ id, content }) =>
        tables.messages.insert({ id, content }),

      "v1.ContentAppended": ({ id, previousContent, appendText }) => {
        const newContent = previousContent + appendText;
        return tables.messages
          .update({ content: newContent })
          .where({ id });
      },
    });

    const state = State.SQLite.makeState({ tables, materializers });
    const schema = makeSchema({ events, state });

    const store = await createStorePromise({
      schema,
      adapter: makeAdapter({ storage: { type: "in-memory" } }),
      storeId: "deterministic-test",
    });

    try {
      // Set initial message
      await store.commit(events.messageSet({ id: "test-msg", content: "" }));

      // Append with explicit previous content
      await store.commit(
        events.contentAppended({
          id: "test-msg",
          previousContent: "",
          appendText: "hello",
        })
      );

      // Second append with updated previous content
      await store.commit(
        events.contentAppended({
          id: "test-msg",
          previousContent: "hello",
          appendText: "world",
        })
      );

      const result = store.query(
        tables.messages.select().where({ id: "test-msg" }).limit(1)
      )[0];

      expect(result.content).toBe("helloworld");

      // This approach is deterministic regardless of event ordering
      // because all needed data is in the event payload

    } finally {
      await store.shutdown();
    }
  });

  test("shows desired column expression API", async () => {
    // This test shows what the solution should look like
    const events = {
      messageCreated: Events.synced({
        name: "v1.MessageCreated",
        schema: Schema.Struct({
          id: Schema.String,
        }),
      }),
      contentAppended: Events.synced({
        name: "v1.ContentAppended",
        schema: Schema.Struct({
          id: Schema.String,
          appendText: Schema.String,
        }),
      }),
    };

    const tables = {
      messages: State.SQLite.table({
        name: "messages",
        columns: {
          id: State.SQLite.text({ primaryKey: true }),
          content: State.SQLite.text({ default: "" }),
        },
      }),
    };

    const materializers = State.SQLite.materializers(events, {
      "v1.MessageCreated": ({ id }) =>
        tables.messages.insert({ id, content: "" }),

      // TODO: This is what we want but doesn't exist yet
      "v1.ContentAppended": ({ id, appendText }) => {
        // DESIRED API:
        // return tables.messages.update({
        //   content: Column.concat(Column.ref('content'), appendText)
        // }).where({ id });

        // For now, this just overwrites (demonstrating the limitation)
        return tables.messages
          .update({ content: appendText })
          .where({ id });
      },
    });

    const state = State.SQLite.makeState({ tables, materializers });
    const schema = makeSchema({ events, state });

    const store = await createStorePromise({
      schema,
      adapter: makeAdapter({ storage: { type: "in-memory" } }),
      storeId: "column-expression-demo",
    });

    try {
      await store.commit(events.messageCreated({ id: "test-msg" }));

      await store.commit(
        events.contentAppended({ id: "test-msg", appendText: "hello" })
      );

      await store.commit(
        events.contentAppended({ id: "test-msg", appendText: "world" })
      );

      const result = store.query(
        tables.messages.select().where({ id: "test-msg" }).limit(1)
      )[0];

      // This demonstrates the problem - we get "world" instead of "helloworld"
      expect(result.content).toBe("world");

      // With Column.concat(), we would get "helloworld" deterministically

    } finally {
      await store.shutdown();
    }
  });
});
