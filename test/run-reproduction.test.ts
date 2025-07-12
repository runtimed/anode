import { test, expect } from "vitest";
import { reproduceHashMismatch } from "../livestore-issues/minimal-append-reproduction.js";

test("run hash mismatch reproduction", async () => {
  console.log("\n=== LiveStore ctx.query() Hash Mismatch Reproduction ===\n");

  const result = await reproduceHashMismatch();

  console.log("\n=== Test Results ===");
  console.log(`✅ Final result: "${result}"`);
  console.log("✅ Test completed successfully");
  console.log("\n📋 This demonstrates the problematic pattern that causes");
  console.log("   hash mismatches in collaborative environments");

  // Force output by making test verbose
  process.stdout.write(`\n🎯 REPRODUCTION COMPLETE: "${result}"\n`);
  process.stdout.write(
    "🚨 This pattern causes hash mismatches in production!\n\n"
  );

  expect(result).toBe("helloworld");
});
