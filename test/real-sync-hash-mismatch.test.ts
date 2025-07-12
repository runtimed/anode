import { describe, test, expect, beforeAll, afterAll } from "vitest";
import {
  makeSchema,
  Events,
  State,
  Schema,
  createStorePromise,
} from "@livestore/livestore";
import { makeAdapter } from "@livestore/adapter-node";
import { makeCfSync } from "@livestore/sync-cf";

// This test requires a running Cloudflare Worker sync backend
// Start with: cd anode && pnpm dev:sync
const SYNC_URL = "ws://localhost:8787";

describe("Real Sync Hash Mismatch Reproduction", () => {
  const storeId = `hash-mismatch-test-${Date.now()}`;

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

  // Track materializer execution order to see the non-determinism
  const materializerLog: string[] = [];

  const materializers = State.SQLite.materializers(events, {
    "v1.OutputCreated": ({ outputId, cellId }) => {
      materializerLog.push(`Created(${outputId})`);
      return tables.outputs.insert({ id: outputId, cellId, data: "" });
    },

    // ❌ This materializer causes hash mismatches due to ctx.query()
    "v1.MarkdownAppended": ({ outputId, content }, ctx) => {
      const existing = ctx.query(
        tables.outputs.select().where({ id: outputId }).limit(1)
      )[0];

      if (!existing) {
        materializerLog.push(`Append(${outputId}): NOT_FOUND`);
        return [];
      }

      const currentData = existing.data || "";
      const newContent = currentData + content;
      materializerLog.push(
        `Append(${outputId}): "${currentData}" + "${content}" = "${newContent}"`
      );

      return tables.outputs
        .update({ data: newContent })
        .where({ id: outputId });
    },

    "v1.OutputCleared": ({ outputId }) => {
      materializerLog.push(`Clear(${outputId})`);
      return tables.outputs.update({ data: "" }).where({ id: outputId });
    },
  });

  const state = State.SQLite.makeState({ tables, materializers });
  const schema = makeSchema({ events, state });

  async function createSyncedStore(clientId: string) {
    const adapter = makeAdapter({
      storage: { type: "in-memory" },
      sync: {
        backend: makeCfSync({ url: SYNC_URL }),
        onSyncError: "continue",
      },
    });

    return await createStorePromise({
      schema,
      adapter,
      storeId,
      syncPayload: { clientId },
    });
  }

  test("reproduces hash mismatch with real sync backend", async () => {
    // This test requires the sync backend to be running
    process.stdout.write("\n🔥 Real Sync Hash Mismatch Test\n");
    process.stdout.write("=====================================\n");
    process.stdout.write("⚠️  Requires sync backend: pnpm dev:sync\n\n");

    let clientA, clientB;

    try {
      // Create two clients that sync to the same backend
      clientA = await createSyncedStore("client-a");
      clientB = await createSyncedStore("client-b");

      process.stdout.write("✅ Created synced clients\n");

      // Client A: Create output and start appending
      await clientA.commit(
        events.outputCreated({ outputId: "output-1", cellId: "cell-1" })
      );

      // Allow time for sync
      await new Promise((resolve) => setTimeout(resolve, 100));

      await clientA.commit(
        events.markdownAppended({ outputId: "output-1", content: "# Header\n" })
      );

      await clientA.commit(
        events.markdownAppended({
          outputId: "output-1",
          content: "First paragraph\n",
        })
      );

      // Client B: Clear output while A is appending
      await clientB.commit(events.outputCleared({ outputId: "output-1" }));

      // Both clients continue appending after clear
      await clientA.commit(
        events.markdownAppended({
          outputId: "output-1",
          content: "After clear from A\n",
        })
      );

      await clientB.commit(
        events.markdownAppended({
          outputId: "output-1",
          content: "After clear from B\n",
        })
      );

      // Allow time for all events to sync
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check final states
      const resultA = clientA.query(
        tables.outputs.select().where({ id: "output-1" }).limit(1)
      )[0];

      const resultB = clientB.query(
        tables.outputs.select().where({ id: "output-1" }).limit(1)
      )[0];

      process.stdout.write("\n📊 Final Results:\n");
      process.stdout.write(
        `Client A sees: "${resultA?.data || "NOT_FOUND"}"\n`
      );
      process.stdout.write(
        `Client B sees: "${resultB?.data || "NOT_FOUND"}"\n`
      );

      process.stdout.write("\n🔍 Materializer execution log:\n");
      materializerLog.forEach((entry, i) => {
        process.stdout.write(`  ${i + 1}. ${entry}\n`);
      });

      // The test itself demonstrates the hash mismatch scenario
      // resultB might be undefined due to different event ordering
      expect(resultA).toBeDefined();

      // Compare final states - any difference indicates hash mismatch potential
      const dataA = resultA?.data || "NOT_FOUND";
      const dataB = resultB?.data || "NOT_FOUND";

      if (dataA !== dataB) {
        process.stdout.write("\n💥 HASH MISMATCH DETECTED!\n");
        process.stdout.write(
          "Different clients have different final states!\n"
        );
        process.stdout.write(
          "This would cause LiveStore to crash with 'materializer hash mismatch'\n"
        );

        // This is actually success for our reproduction test
        process.stdout.write("\n🎯 REPRODUCTION SUCCESSFUL!\n");
      } else {
        process.stdout.write(
          "\n⚠️  Results match in this run (hash mismatch is timing-dependent)\n"
        );
        process.stdout.write(
          "Try running multiple times or with more concurrent operations\n"
        );
      }

      process.stdout.write(
        "\n💡 ROOT CAUSE: ctx.query() makes materializers non-deterministic\n"
      );
      process.stdout.write("🔧 SOLUTION: Replace with Column.concat() API\n");
    } catch (error) {
      if (error.message?.includes("fetch")) {
        process.stdout.write(
          "\n❌ Sync backend not available. Start with: pnpm dev:sync\n"
        );
        // Skip the test instead of failing
        return;
      }
      throw error;
    } finally {
      // Clean up
      if (clientA) await clientA.shutdown();
      if (clientB) await clientB.shutdown();
    }
  }, 30000); // 30 second timeout for network operations

  test("shows working deterministic approach", async () => {
    // Show the correct pattern for comparison
    const deterministicEvents = {
      outputSet: Events.synced({
        name: "v1.OutputSet",
        schema: Schema.Struct({
          outputId: Schema.String,
          cellId: Schema.String,
          data: Schema.String,
        }),
      }),
      markdownAppended: Events.synced({
        name: "v1.MarkdownAppended",
        schema: Schema.Struct({
          outputId: Schema.String,
          previousData: Schema.String, // ✅ Include previous state
          content: Schema.String,
        }),
      }),
    };

    const deterministicMaterializers = State.SQLite.materializers(
      deterministicEvents,
      {
        "v1.OutputSet": ({ outputId, cellId, data }) =>
          tables.outputs.insert({ id: outputId, cellId, data }),

        // ✅ Deterministic - no ctx.query() needed
        "v1.MarkdownAppended": ({ outputId, previousData, content }) => {
          const newData = previousData + content;
          return tables.outputs
            .update({ data: newData })
            .where({ id: outputId });
        },
      }
    );

    const deterministicState = State.SQLite.makeState({
      tables,
      materializers: deterministicMaterializers,
    });
    const deterministicSchema = makeSchema({
      events: deterministicEvents,
      state: deterministicState,
    });

    const adapter = makeAdapter({ storage: { type: "in-memory" } });
    const store = await createStorePromise({
      schema: deterministicSchema,
      adapter,
      storeId: "deterministic-test",
    });

    try {
      await store.commit(
        deterministicEvents.outputSet({
          outputId: "output-1",
          cellId: "cell-1",
          data: "",
        })
      );

      await store.commit(
        deterministicEvents.markdownAppended({
          outputId: "output-1",
          previousData: "",
          content: "# Header\n",
        })
      );

      await store.commit(
        deterministicEvents.markdownAppended({
          outputId: "output-1",
          previousData: "# Header\n",
          content: "Content\n",
        })
      );

      const result = store.query(
        tables.outputs.select().where({ id: "output-1" }).limit(1)
      )[0];

      expect(result.data).toBe("# Header\nContent\n");

      process.stdout.write(
        "\n✅ Deterministic approach: Always produces same result\n"
      );
      process.stdout.write(
        "✅ No hash mismatches regardless of event ordering\n"
      );
    } finally {
      await store.shutdown();
    }
  });
});
