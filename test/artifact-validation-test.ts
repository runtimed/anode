import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  fetchArtifact,
  uploadArtifact,
  getArtifactUrl,
} from "../src/util/artifacts.js";

describe("Artifact System Validation", () => {
  const TEST_NOTEBOOK_ID = "test-notebook-validation";
  const TEST_AUTH_TOKEN = "insecure-token-change-me";
  const SYNC_URL = "http://localhost:8787";

  beforeAll(() => {
    console.log("🧪 Starting artifact system validation tests");
    console.log("📋 Prerequisites:");
    console.log("   - Backend sync server running on port 8787");
    console.log("   - ARTIFACT_STORAGE configured in .dev.vars");
    console.log("   - Valid authentication token");
  });

  afterAll(() => {
    console.log("✅ Artifact validation tests completed");
  });

  describe("Phase 1 Implementation Status", () => {
    it("should have artifact upload endpoint available", async () => {
      const response = await fetch(`${SYNC_URL}/api/artifacts`, {
        method: "OPTIONS",
      });

      expect(response.status).toBeLessThan(500);
      console.log("✅ Upload endpoint accessible");
    });

    it("should upload and retrieve small binary data correctly", async () => {
      // Create small PNG-like binary data (under 16KB threshold)
      const pngHeader = new Uint8Array([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d, // IHDR chunk length
        0x49,
        0x48,
        0x44,
        0x52, // IHDR
        0x00,
        0x00,
        0x00,
        0x01, // Width: 1
        0x00,
        0x00,
        0x00,
        0x01, // Height: 1
        0x08,
        0x02,
        0x00,
        0x00,
        0x00, // Bit depth, color type, etc.
      ]);

      const blob = new Blob([pngHeader], { type: "image/png" });

      const uploadResult = await uploadArtifact(blob, TEST_NOTEBOOK_ID, {
        authToken: TEST_AUTH_TOKEN,
        syncUrl: SYNC_URL,
      });

      expect(uploadResult.artifactId).toMatch(
        /^test-notebook-validation\/[a-f0-9]{64}$/
      );
      expect(uploadResult.mimeType).toBe("image/png");
      expect(uploadResult.byteLength).toBe(pngHeader.length);

      console.log(
        `✅ Small binary upload successful: ${uploadResult.artifactId}`
      );

      // Verify retrieval
      const retrievedBlob = await fetchArtifact(uploadResult.artifactId, {
        authToken: TEST_AUTH_TOKEN,
        syncUrl: SYNC_URL,
      });

      expect(retrievedBlob.size).toBe(pngHeader.length);
      expect(retrievedBlob.type).toBe("image/png");

      // Verify binary content integrity
      const retrievedBytes = new Uint8Array(await retrievedBlob.arrayBuffer());
      expect(retrievedBytes).toEqual(pngHeader);

      console.log("✅ Binary data integrity verified");
    });

    it("should demonstrate the double conversion issue with base64 data", async () => {
      // Simulate what currently happens: matplotlib generates binary,
      // IPython converts to base64, runtime uploads base64 as text
      const originalBinary = new Uint8Array([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        ...new Array(16000).fill(0x42), // Large enough to trigger artifact upload
      ]);

      // Convert to base64 (what IPython does)
      const base64Data = btoa(String.fromCharCode(...originalBinary));

      // Upload the base64 STRING as if it were the artifact content
      const base64Blob = new Blob([base64Data], { type: "image/png" });

      const uploadResult = await uploadArtifact(base64Blob, TEST_NOTEBOOK_ID, {
        authToken: TEST_AUTH_TOKEN,
        syncUrl: SYNC_URL,
      });

      console.log(`📝 Base64 upload result: ${uploadResult.artifactId}`);
      console.log(`📊 Original binary size: ${originalBinary.length} bytes`);
      console.log(`📊 Base64 text size: ${base64Data.length} bytes`);
      console.log(
        `📊 Size overhead: ${(((base64Data.length - originalBinary.length) / originalBinary.length) * 100).toFixed(1)}%`
      );

      // Retrieve and check what we actually get
      const retrievedBlob = await fetchArtifact(uploadResult.artifactId, {
        authToken: TEST_AUTH_TOKEN,
        syncUrl: SYNC_URL,
      });

      const retrievedText = await retrievedBlob.text();

      // This demonstrates the issue: we get base64 TEXT instead of binary data
      expect(retrievedText.startsWith("iVBORw0KGgo")).toBe(true); // Base64 PNG signature
      expect(retrievedText).toBe(base64Data);

      console.log(
        "🚨 Issue demonstrated: Artifact contains base64 text, not binary data"
      );
      console.log(`   First 50 chars: ${retrievedText.substring(0, 50)}...`);

      // Try to decode and verify we can get back the original
      const decodedBytes = Uint8Array.from(atob(retrievedText), (c) =>
        c.charCodeAt(0)
      );
      expect(decodedBytes).toEqual(originalBinary);

      console.log("✅ Base64 can be decoded back to original binary");
      console.log(
        "🎯 Phase 2 goal: Upload binary directly, eliminate base64 step"
      );
    });

    it("should generate correct artifact URLs", () => {
      const testArtifactId = "test-notebook/abc123def456";
      const artifactUrl = getArtifactUrl(testArtifactId, {
        authToken: TEST_AUTH_TOKEN,
        syncUrl: SYNC_URL,
      });

      expect(artifactUrl).toBe(
        `${SYNC_URL}/api/artifacts/${testArtifactId}?token=${TEST_AUTH_TOKEN}`
      );

      console.log(`✅ Artifact URL generation: ${artifactUrl}`);
    });
  });

  describe("Performance Characteristics", () => {
    it("should handle concurrent uploads", async () => {
      const uploadPromises = Array.from({ length: 5 }, async (_, i) => {
        const testData = new TextEncoder().encode(`Test data ${i}`);
        const blob = new Blob([testData], { type: "text/plain" });

        return uploadArtifact(blob, `${TEST_NOTEBOOK_ID}-concurrent`, {
          authToken: TEST_AUTH_TOKEN,
          syncUrl: SYNC_URL,
        });
      });

      const results = await Promise.all(uploadPromises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.artifactId).toMatch(
          /^test-notebook-validation-concurrent\/[a-f0-9]{64}$/
        );
        console.log(`✅ Concurrent upload ${i + 1}: ${result.artifactId}`);
      });
    });

    it("should measure upload performance", async () => {
      const sizes = [1024, 16384, 65536, 262144]; // 1KB, 16KB, 64KB, 256KB

      for (const size of sizes) {
        const testData = new Uint8Array(size).fill(0x42);
        const blob = new Blob([testData], { type: "application/octet-stream" });

        const startTime = performance.now();
        const result = await uploadArtifact(blob, `${TEST_NOTEBOOK_ID}-perf`, {
          authToken: TEST_AUTH_TOKEN,
          syncUrl: SYNC_URL,
        });
        const endTime = performance.now();

        const uploadTime = endTime - startTime;
        const throughput = size / 1024 / (uploadTime / 1000); // KB/s

        console.log(
          `📊 Upload ${size} bytes: ${uploadTime.toFixed(2)}ms (${throughput.toFixed(2)} KB/s)`
        );
        expect(result.byteLength).toBe(size);
        expect(uploadTime).toBeLessThan(5000); // Should complete within 5 seconds
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid authentication", async () => {
      const testData = new TextEncoder().encode("Test data");
      const blob = new Blob([testData], { type: "text/plain" });

      await expect(
        uploadArtifact(blob, TEST_NOTEBOOK_ID, {
          authToken: "invalid-token",
          syncUrl: SYNC_URL,
        })
      ).rejects.toThrow(/authentication/i);

      console.log("✅ Invalid auth properly rejected");
    });

    it("should handle missing artifacts gracefully", async () => {
      const nonexistentId = "test-notebook/nonexistent123";

      await expect(
        fetchArtifact(nonexistentId, {
          authToken: TEST_AUTH_TOKEN,
          syncUrl: SYNC_URL,
        })
      ).rejects.toThrow(/not found/i);

      console.log("✅ Missing artifact properly handled");
    });

    it("should handle network failures gracefully", async () => {
      const testData = new TextEncoder().encode("Test data");
      const blob = new Blob([testData], { type: "text/plain" });

      await expect(
        uploadArtifact(blob, TEST_NOTEBOOK_ID, {
          authToken: TEST_AUTH_TOKEN,
          syncUrl: "http://localhost:9999", // Non-existent server
        })
      ).rejects.toThrow();

      console.log("✅ Network failure properly handled");
    });
  });

  describe("Phase 2 Readiness Check", () => {
    it("should document current limitations", () => {
      console.log("\n🎯 Phase 2 Implementation Targets:");
      console.log(
        "   1. ❌ Direct binary upload API (ExecutionContext.uploadBinary)"
      );
      console.log("   2. ❌ JavaScript bridge in Pyodide worker");
      console.log("   3. ❌ Python artifact.upload_binary() method");
      console.log("   4. ❌ Enhanced matplotlib integration");
      console.log("   5. ✅ Backend storage infrastructure");
      console.log("   6. ✅ Frontend artifact rendering");
      console.log("   7. ✅ Authentication and access control");

      console.log("\n🚨 Current Issues:");
      console.log("   - Binary data converted to base64 text during upload");
      console.log("   - 33% size overhead from base64 encoding");
      console.log("   - Potential display issues with complex binary formats");

      console.log("\n✅ Phase 1 Foundation Complete:");
      console.log("   - Upload/download endpoints functional");
      console.log("   - R2/local storage working");
      console.log("   - Frontend components render artifacts");
      console.log("   - Authentication integrated");
      console.log("   - Error handling implemented");

      expect(true).toBe(true); // Always pass - this is documentation
    });
  });
});
