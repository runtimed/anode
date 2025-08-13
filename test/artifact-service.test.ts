import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { Hono } from "hono";
import apiRoutes from "../backend/routes";
import { type Env } from "../backend/types";

// Mock the auth middleware
vi.mock("../backend/middleware", () => ({
  authMiddleware: vi.fn((c, next) => {
    // Mock successful auth
    c.set("passport", { user: { id: "test-user" } });
    c.set("userId", "test-user");
    c.set("isRuntime", false);
    return next();
  }),
}));

// Mock auth validation
vi.mock("../backend/auth", () => ({
  validateAuthPayload: vi.fn().mockResolvedValue({ user: { id: "test-user" } }),
}));

// Mock all extension-related imports to avoid module issues
vi.mock("@runtimed/extensions", () => ({
  RuntError: class MockRuntError extends Error {
    constructor(
      public type: string,
      options?: { message?: string }
    ) {
      super(options?.message || "Mock error");
      this.name = "MockRuntError";
    }
    statusCode = 400;
  },
}));

vi.mock("../backend/local_extension/api_key_provider", () => ({
  default: {
    createApiKey: vi.fn(),
    listApiKeys: vi.fn(),
    getApiKey: vi.fn(),
    deleteApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
    capabilities: new Set(),
  },
}));

describe("Artifact Service (Hono Implementation)", () => {
  let mockEnv: Env;
  let mockR2Bucket: {
    put: Mock;
    get: Mock;
  };
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();

    mockR2Bucket = {
      put: vi.fn(),
      get: vi.fn(),
    };

    mockEnv = {
      DEPLOYMENT_ENV: "development",
      AUTH_TOKEN: "test-token",
      ARTIFACT_BUCKET: mockR2Bucket as any,
    } as Env;

    // Create a test app with our routes
    app = new Hono();
    app.route("/api", apiRoutes);
  });

  it("should upload artifact successfully", async () => {
    mockR2Bucket.put.mockResolvedValue(undefined);

    const res = await app.request(
      "/api/artifacts",
      {
        method: "POST",
        body: "test-data",
        headers: {
          "x-notebook-id": "test-notebook",
          "content-type": "image/png",
        },
      },
      mockEnv
    );

    const result = await res.json();
    expect(res.status).toBe(200);
    expect(result.artifactId).toMatch(/^test-notebook\/[a-f0-9-]+$/);
    expect(mockR2Bucket.put).toHaveBeenCalledWith(
      result.artifactId,
      expect.any(ArrayBuffer),
      { httpMetadata: { contentType: "image/png" } }
    );
  });

  it("should retrieve artifact successfully", async () => {
    const mockArtifact = {
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      httpMetadata: { contentType: "image/png" },
    };
    mockR2Bucket.get.mockResolvedValue(mockArtifact);

    const res = await app.request(
      "/api/artifacts/test-notebook/uuid-123",
      {},
      mockEnv
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(mockR2Bucket.get).toHaveBeenCalledWith("test-notebook/uuid-123");
  });
});
