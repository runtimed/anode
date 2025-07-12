import { test } from "vitest";
import { reproduceHashMismatch } from "../livestore-issues/minimal-append-reproduction.js";

test("run hash mismatch reproduction", async () => {
  const result = await reproduceHashMismatch();
  console.log(`Final result: "${result}"`);
});
