#!/usr/bin/env tsx
import { v1 } from "@authzed/authzed-node";

const SPICEDB_SCHEMA = `
definition user {}

definition store {
    relation owner: user
    permission access = owner
}
`;

async function initSchema() {
  const endpoint = process.env.SPICEDB_ENDPOINT || "localhost:50051";
  const token = process.env.SPICEDB_TOKEN || "somerandomkeyhere";
  const insecure = process.env.SPICEDB_INSECURE === "true";

  console.log(`🔧 Connecting to SpiceDB at ${endpoint}...`);

  const client = v1.NewClient(
    token,
    endpoint,
    insecure ? v1.ClientSecurity.INSECURE_PLAINTEXT : v1.ClientSecurity.SECURE
  );

  try {
    // Write the schema
    await client.writeSchema({
      schema: SPICEDB_SCHEMA.trim(),
    });

    console.log("✅ SpiceDB schema initialized successfully!");
    console.log("\n📋 Schema written:");
    console.log(SPICEDB_SCHEMA);

    // Optionally verify by reading it back
    const readResponse = await client.readSchema({});
    if (readResponse.schemaText) {
      console.log("\n✅ Verified schema is active");
    }
  } catch (error) {
    console.error("❌ Failed to initialize SpiceDB schema:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initSchema().catch(console.error);
}

export { initSchema, SPICEDB_SCHEMA };
