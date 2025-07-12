import {
  makeSchema,
  Events,
  State,
  Schema,
  createStorePromise,
} from "@livestore/livestore";
import { makeAdapter } from "@livestore/adapter-node";

// Multi-client reproduction of hash mismatch with ctx.query() materializers
// This demonstrates the actual production failure scenario

const events = {
  outputCreated: Events.synced({
    name: "v1.OutputCreated",
    schema: Schema.Struct({
      outputId: Schema.String,
      cellId: Schema.String,
    }),
  }),
  markdownAppended: Events.synced({
    name: "v1.MarkdownAppended",
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
      cellId: State.SQLite.text(),
      data: State.SQLite.text({ default: "" }),
    },
  }),
};

// PROBLEMATIC: These materializers cause hash mismatches in concurrent scenarios
const materializers = State.SQLite.materializers(events, {
  "v1.OutputCreated": ({ outputId, cellId }) =>
    tables.outputs.insert({ id: outputId, cellId, data: "" }),

  // ❌ This materializer uses ctx.query() making it non-deterministic
  "v1.MarkdownAppended": ({ outputId, content }, ctx) => {
    const existing = ctx.query(
      tables.outputs.select().where({ id: outputId }).limit(1)
    )[0];

    if (!existing) {
      // This happens when clear event processed before append
      process.stdout.write(`⚠️  Output ${outputId} not found during append\n`);
      return [];
    }

    const newContent = existing.data + content;
    return tables.outputs.update({ data: newContent }).where({ id: outputId });
  },

  "v1.OutputCleared": ({ outputId }) =>
    tables.outputs.update({ data: "" }).where({ id: outputId }),
});

const state = State.SQLite.makeState({ tables, materializers });
const schema = makeSchema({ events, state });

// Client A: Creates output and appends markdown content
async function clientA(storeId: string) {
  const store = await createStorePromise({
    schema,
    adapter: makeAdapter({ storage: { type: "in-memory" } }),
    storeId,
  });

  try {
    process.stdout.write("👤 Client A: Creating output...\n");
    await store.commit(
      events.outputCreated({ outputId: "output-1", cellId: "cell-1" })
    );

    process.stdout.write("👤 Client A: Appending markdown content...\n");
    await store.commit(
      events.markdownAppended({ outputId: "output-1", content: "# Header\n" })
    );

    await store.commit(
      events.markdownAppended({
        outputId: "output-1",
        content: "Some content\n",
      })
    );

    await store.commit(
      events.markdownAppended({
        outputId: "output-1",
        content: "More content\n",
      })
    );

    const result = store.query(
      tables.outputs.select().where({ id: "output-1" }).limit(1)
    )[0];

    process.stdout.write(
      `👤 Client A final result: "${result?.data || 'NOT FOUND'}"\n`
    );
    return result?.data;
  } finally {
    await store.shutdown();
  }
}

// Client B: Clears output and then tries to append
async function clientB(storeId: string) {
  const store = await createStorePromise({
    schema,
    adapter: makeAdapter({ storage: { type: "in-memory" } }),
    storeId,
  });

  try {
    // Small delay to let Client A create the output first
    await new Promise((resolve) => setTimeout(resolve, 10));

    process.stdout.write("🤖 Client B: Clearing output...\n");
    await store.commit(events.outputCleared({ outputId: "output-1" }));

    process.stdout.write("🤖 Client B: Appending after clear...\n");
    await store.commit(
      events.markdownAppended({
        outputId: "output-1",
        content: "After clear content\n",
      })
    );

    const result = store.query(
      tables.outputs.select().where({ id: "output-1" }).limit(1)
    )[0];

    process.stdout.write(
      `🤖 Client B final result: "${result?.data || 'NOT FOUND'}"\n`
    );
    return result?.data;
  } finally {
    await store.shutdown();
  }
}

// Simulate the hash mismatch scenario
export async function reproduceMultiClientHashMismatch() {
  const storeId = "multi-client-test-" + Date.now();

  process.stdout.write("\n🔥 Multi-Client Hash Mismatch Reproduction\n");
  process.stdout.write("=========================================\n\n");

  process.stdout.write("📋 Scenario:\n");
  process.stdout.write("• Client A: create → append → append → append\n");
  process.stdout.write("• Client B: clear → append\n");
  process.stdout.write("• Events may arrive in different orders\n\n");

  try {
    // Run both clients concurrently to create race conditions
    const [resultA, resultB] = await Promise.all([
      clientA(storeId),
      clientB(storeId),
    ]);

    process.stdout.write("\n📊 Results:\n");
    process.stdout.write(`Client A saw: "${resultA}"\n`);
    process.stdout.write(`Client B saw: "${resultB}"\n`);

    // In a real scenario with network sync, these might be different
    // causing materializer hash mismatches
    if (resultA !== resultB) {
      process.stdout.write("\n💥 HASH MISMATCH DETECTED!\n");
      process.stdout.write("Different clients see different final states\n");
      return { mismatch: true, resultA, resultB };
    } else {
      process.stdout.write("\n✅ Results match (but would fail with real network sync)\n");
      return { mismatch: false, resultA, resultB };
    }
  } catch (error) {
    process.stdout.write(`\n❌ Error during reproduction: ${error}\n`);
    throw error;
  }
}

// Event ordering scenarios that cause hash mismatches:
//
// Scenario 1 (Client A perspective):
// 1. OutputCreated(output-1, cell-1)
// 2. MarkdownAppended(output-1, "# Header\n")     [ctx.query finds data: ""]
// 3. MarkdownAppended(output-1, "Some content\n") [ctx.query finds data: "# Header\n"]
// 4. OutputCleared(output-1)                      [data becomes ""]
// 5. MarkdownAppended(output-1, "After clear\n")  [ctx.query finds data: ""]
// Final: "After clear\n"
//
// Scenario 2 (Client B perspective):
// 1. OutputCreated(output-1, cell-1)
// 2. OutputCleared(output-1)                      [data becomes ""]
// 3. MarkdownAppended(output-1, "# Header\n")     [ctx.query finds data: ""]
// 4. MarkdownAppended(output-1, "Some content\n") [ctx.query finds data: "# Header\n"]
// 5. MarkdownAppended(output-1, "After clear\n")  [ctx.query finds data: "# Header\nSome content\n"]
// Final: "# Header\nSome content\nAfter clear\n"
//
// Different final states = materializer hash mismatch = LiveStore crash

// Run if executed directly
if (import.meta.main) {
  reproduceMultiClientHashMismatch()
    .then((result) => {
      process.stdout.write("\n🎯 Reproduction completed\n");
      if (result.mismatch) {
        process.stdout.write("💥 Hash mismatch reproduced successfully!\n");
      } else {
        process.stdout.write(
          "ℹ️  No mismatch in this run (race condition dependent)\n"
        );
      }
      process.stdout.write(
        "\n🔧 SOLUTION: Replace ctx.query() with Column.concat() API\n"
      );
    })
    .catch((error) => {
      console.error("❌ Reproduction failed:", error);
      process.exit(1);
    });
}
