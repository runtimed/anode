import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import artifactWorker from "../backend/artifact";
import { workerGlobals, type Env, type WorkerResponse } from "../backend/types";

describe("Artifact Service", () => {
  let mockEnv: Env;
  let mockR2Bucket: {
    put: Mock;
    get: Mock;
  };

  beforeEach(() => {
    mockR2Bucket = {
      put: vi.fn(),
      get: vi.fn(),
    };

    mockEnv = {
      DEPLOYMENT_ENV: "development",
      AUTH_TOKEN: "test-token",
      ARTIFACT_BUCKET: mockR2Bucket as any,
    } as Env;
  });

  it("should upload artifact successfully", async () => {
    mockR2Bucket.put.mockResolvedValue(undefined);

    const request = new workerGlobals.Request(
      "http://localhost/api/artifacts",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-token",
          "x-notebook-id": "test-notebook",
          "content-type": "image/png",
        },
        body: "test-data",
      }
    );

    const response: WorkerResponse = await artifactWorker.fetch(
      request,
      mockEnv,
      {} as any
    );
    const result: any = await response.json();

    expect(response.status).toBe(200);
    expect(result.artifactId).toMatch(/^test-notebook\/[a-f0-9-]+$/);
    expect(mockR2Bucket.put).toHaveBeenCalledWith(
      result.artifactId,
      expect.any(ArrayBuffer),
      { httpMetadata: { contentType: "image/png" } }
    );
  });

  it("should retrieve artifact successfully", async () => {
    const mockArtifact = {
      body: new ReadableStream(),
      httpMetadata: { contentType: "image/png" },
    };
    mockR2Bucket.get.mockResolvedValue(mockArtifact);

    const request = new workerGlobals.Request(
      "http://localhost/api/artifacts/test-notebook/uuid-123"
    );

    const response = await artifactWorker.fetch(request, mockEnv, {} as any);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(mockR2Bucket.get).toHaveBeenCalledWith("test-notebook/uuid-123");
  });
});
