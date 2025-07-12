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
    process.stdout.write("🧪 Testing ctx.query() materializer issue...\n");

    // Step 1: Create message
    await store.commit(events.messageCreated({ id: "test" }));
    process.stdout.write("✅ Created message\n");

    // Step 2: Append "hello"
    await store.commit(
      events.contentAppended({ id: "test", appendText: "hello" })
    );

    let result = store.query(
      tables.messages.select().where({ id: "test" }).limit(1)
    )[0];
    process.stdout.write(`✅ After append "hello": "${result.content}"\n`);

    // Step 3: Append "world"
    await store.commit(
      events.contentAppended({ id: "test", appendText: "world" })
    );

    result = store.query(
      tables.messages.select().where({ id: "test" }).limit(1)
    )[0];
    process.stdout.write(`✅ After append "world": "${result.content}"\n`);

    process.stdout.write("\n🚨 ISSUE EXPLANATION:\n");
    process.stdout.write(
      "This test passes in isolation, but creates a hash mismatch when:\n"
    );
    process.stdout.write("• Events arrive in different order across clients\n");
    process.stdout.write(
      "• Client A: create → append('hello') → append('world') = 'helloworld'\n"
    );
    process.stdout.write(
      "• Client B: create → append('world') → append('hello') = 'worldhello'\n"
    );
    process.stdout.write(
      "• Different materializer results = hash mismatch = crash\n"
    );
    process.stdout.write(
      "\n💡 ROOT CAUSE: ctx.query() makes materializers non-deterministic\n"
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
      process.stdout.write(`\n🎯 Final result: "${result}"\n`);
      process.stdout.write(
        "\n🔧 SOLUTION NEEDED: Column expression API for safe concatenation\n"
      );
      process.stdout.write(
        "Example: Column.concat(Column.ref('content'), appendText)\n"
      );
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
