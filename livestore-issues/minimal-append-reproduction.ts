import {
  makeSchema,
  Events,
  State,
  Schema,
  createStorePromise,
} from "@livestore/livestore";
import { makeAdapter } from "@livestore/adapter-node";

// Minimal reproduction of materializer hash mismatch with ctx.query() append operations

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

// PROBLEMATIC: This materializer causes hash mismatches
const materializers = State.SQLite.materializers(events, {
  "v1.MessageCreated": ({ id }) => tables.messages.insert({ id, content: "" }),

  // ❌ This causes "UnexpectedError materializer hash mismatch"
  "v1.ContentAppended": ({ id, appendText }, ctx) => {
    const existing = ctx.query(
      tables.messages.select().where({ id }).limit(1)
    )[0];

    if (!existing) return [];

    return tables.messages
      .update({ content: existing.content + appendText })
      .where({ id });
  },
});

const state = State.SQLite.makeState({ tables, materializers });
const schema = makeSchema({ events, state });

// Reproduction function that demonstrates the issue
export async function reproduceHashMismatch() {
  const store = await createStorePromise({
    schema,
    adapter: makeAdapter({ storage: { type: "in-memory" } }),
    storeId: "test-store",
  });

  try {
    console.log("🧪 Testing ctx.query() materializer issue...");

    // Step 1: Create message
    await store.commit(events.messageCreated({ id: "test" }));
    console.log("✅ Created message");

    // Step 2: Append "hello"
    await store.commit(
      events.contentAppended({ id: "test", appendText: "hello" })
    );

    let result = store.query(
      tables.messages.select().where({ id: "test" }).limit(1)
    )[0];
    console.log(`✅ After append "hello": "${result.content}"`);

    // Step 3: Append "world"
    await store.commit(
      events.contentAppended({ id: "test", appendText: "world" })
    );

    result = store.query(
      tables.messages.select().where({ id: "test" }).limit(1)
    )[0];
    console.log(`✅ After append "world": "${result.content}"`);

    console.log("\n🚨 ISSUE EXPLANATION:");
    console.log(
      "This test passes in isolation, but creates a hash mismatch when:"
    );
    console.log("• Events arrive in different order across clients");
    console.log(
      "• Client A: create → append('hello') → append('world') = 'helloworld'"
    );
    console.log(
      "• Client B: create → append('world') → append('hello') = 'worldhello'"
    );
    console.log("• Different materializer results = hash mismatch = crash");
    console.log(
      "\n💡 ROOT CAUSE: ctx.query() makes materializers non-deterministic"
    );

    return result.content;
  } finally {
    await store.shutdown();
  }
}

// Run reproduction if this file is executed directly
if (import.meta.main) {
  reproduceHashMismatch()
    .then((result) => {
      console.log(`\n🎯 Final result: "${result}"`);
      console.log(
        "\n🔧 SOLUTION NEEDED: Column expression API for safe concatenation"
      );
      console.log("Example: Column.concat(Column.ref('content'), appendText)");
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

// Example of what the fix should look like:
/*
"v1.ContentAppended": ({ id, appendText }) =>
  tables.messages.update({
    content: Column.concat(Column.ref('content'), appendText)
  }).where({ id })
*/
