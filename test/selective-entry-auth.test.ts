// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as jose from "jose";
import selectiveEntry from "../backend/selective-entry";
import { type Env } from "../backend/types";

// Mock the environment with minimal bindings needed for auth testing
const createMockEnv = (): Env =>
  ({
    DEPLOYMENT_ENV: "test",
    ALLOW_LOCAL_AUTH: "true",
    AUTH_ISSUER: "http://localhost:8787/local_oidc",
    SERVICE_PROVIDER: "local",
    ARTIFACT_STORAGE: "r2",
    ARTIFACT_THRESHOLD: "16384",
    // Mock bindings
    DB: {} as any,
    ARTIFACT_BUCKET: {
      put: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
        httpMetadata: { contentType: "text/plain" },
      }),
    } as any,
    WEBSOCKET_SERVER: {} as any,
    AUTH_TOKEN: "mock-auth-token",
    ADMIN_SECRET: "mock-admin-secret",
  }) as Env;

describe("Selective Entry Authentication Integration", () => {
  let mockEnv: Env;
  let validAccessToken: string;

  beforeEach(async () => {
    mockEnv = createMockEnv();
    validAccessToken = await generateLocalOidcToken();
  });

  describe("Artifacts Endpoint Authentication", () => {
    describe("POST /api/artifacts (Upload - Requires Auth)", () => {
      it("should reject upload without auth token", async () => {
        const response = await selectiveEntry.fetch(
          new Request("http://localhost:8787/api/artifacts", {
            method: "POST",
            headers: {
              "x-notebook-id": "test-notebook",
              "Content-Type": "text/plain",
            },
            body: "test-data",
          }),
          mockEnv,
          {} as any
        );

        expect(response.status).toBe(401);
        const error = await response.json();
        expect(error.error).toBe("Authentication failed");
      });

      it("should reject upload with invalid token", async () => {
        const response = await selectiveEntry.fetch(
          new Request("http://localhost:8787/api/artifacts", {
            method: "POST",
            headers: {
              Authorization: "Bearer invalid-token",
              "x-notebook-id": "test-notebook",
              "Content-Type": "text/plain",
            },
            body: "test-data",
          }),
          mockEnv,
          {} as any
        );

        expect(response.status).toBe(401);
        const error = await response.json();
        expect(error.error).toBe("Authentication failed");
      });

      it("should accept upload with valid Authorization header", async () => {
        const response = await selectiveEntry.fetch(
          new Request("http://localhost:8787/api/artifacts", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${validAccessToken}`,
              "x-notebook-id": "test-notebook",
              "Content-Type": "text/plain",
            },
            body: "test-data",
          }),
          mockEnv,
          {} as any
        );

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result).toHaveProperty("artifactId");
        expect(mockEnv.ARTIFACT_BUCKET.put).toHaveBeenCalled();
      });

      it("should accept upload with X-Auth-Token header", async () => {
        const response = await selectiveEntry.fetch(
          new Request("http://localhost:8787/api/artifacts", {
            method: "POST",
            headers: {
              "X-Auth-Token": validAccessToken,
              "x-notebook-id": "test-notebook",
              "Content-Type": "text/plain",
            },
            body: "test-data",
          }),
          mockEnv,
          {} as any
        );

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result).toHaveProperty("artifactId");
      });
    });

    describe("GET /api/artifacts/* (Download - Public)", () => {
      it("should allow download without authentication", async () => {
        const response = await selectiveEntry.fetch(
          new Request(
            "http://localhost:8787/api/artifacts/test-notebook/test-id"
          ),
          mockEnv,
          {} as any
        );

        expect(response.status).toBe(200);
        expect(mockEnv.ARTIFACT_BUCKET.get).toHaveBeenCalledWith(
          "test-notebook/test-id"
        );
      });

      it("should return 404 for non-existent artifact", async () => {
        (mockEnv.ARTIFACT_BUCKET.get as any).mockResolvedValueOnce(null);

        const response = await selectiveEntry.fetch(
          new Request("http://localhost:8787/api/artifacts/non-existent"),
          mockEnv,
          {} as any
        );

        expect(response.status).toBe(404);
        const error = await response.json();
        expect(error.message).toBe("Artifact not found");
      });
    });
  });

  describe("GraphQL Endpoint Authentication", () => {
    it("should allow introspection query without authentication", async () => {
      const response = await selectiveEntry.fetch(
        new Request("http://localhost:8787/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "{ __schema { queryType { name } } }",
          }),
        }),
        mockEnv,
        {} as any
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.__schema.queryType.name).toBe("Query");
    });

    it("should return user info with valid token", async () => {
      const response = await selectiveEntry.fetch(
        new Request("http://localhost:8787/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${validAccessToken}`,
          },
          body: JSON.stringify({ query: "{ me { id email } }" }),
        }),
        mockEnv,
        {} as any
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.me.id).toBe("local-dev-user");
      expect(result.data.me.email).toBe("test@example.com");
    });

    it("should reject authenticated queries without token", async () => {
      const response = await selectiveEntry.fetch(
        new Request("http://localhost:8787/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "{ me { id email } }" }),
        }),
        mockEnv,
        {} as any
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("Authentication required");
      expect(result.errors[0].extensions.code).toBe("UNAUTHENTICATED");
      expect(result.errors[0].extensions).toHaveProperty("timestamp");
    });
  });

  describe("Health Endpoint (Public)", () => {
    it("should allow access without authentication", async () => {
      const response = await selectiveEntry.fetch(
        new Request("http://localhost:8787/api/health"),
        mockEnv,
        {} as any
      );

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.status).toBe("healthy");
    });
  });

  describe("CORS Handling", () => {
    it("should handle OPTIONS preflight", async () => {
      const response = await selectiveEntry.fetch(
        new Request("http://localhost:8787/api/artifacts", {
          method: "OPTIONS",
        }),
        mockEnv,
        {} as any
      );

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });
});

/**
 * Generate a real local OIDC access token for testing
 */
async function generateLocalOidcToken(): Promise<string> {
  const keyPair = await jose.generateKeyPair("RS256");

  const payload = {
    sub: "local-dev-user",
    email: "test@example.com",
    given_name: "Test",
    family_name: "User",
    iss: "http://localhost:8787/local_oidc",
    aud: "test-client",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  };

  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .sign(keyPair.privateKey);
}
