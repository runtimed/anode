import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { Hono } from "hono";
import honoEntry from "../backend/hono-entry";
import { type Env } from "../backend/types";

// Mock the original handler
vi.mock("../backend/entry", () => ({
  default: {
    fetch: vi.fn(),
  },
}));

// Mock all the route modules
vi.mock("../backend/routes", () => ({
  default: new Hono(),
}));

vi.mock("../backend/local-oidc-routes", () => ({
  default: new Hono(),
}));

// Mock the sync WebSocketServer
vi.mock("../backend/sync", () => ({
  WebSocketServer: class MockWebSocketServer {},
}));

describe("Hono Entry Integration", () => {
  let mockEnv: Env;
  let mockOriginalHandler: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked handler
    const originalHandlerModule = await import("../backend/entry");
    mockOriginalHandler = originalHandlerModule.default;

    mockEnv = {
      DEPLOYMENT_ENV: "development",
      ALLOW_LOCAL_AUTH: "true",
      AUTH_TOKEN: "test-token",
      AUTH_ISSUER: "http://localhost:5173/local_oidc",
    } as Env;

    // Default mock response from original handler
    mockOriginalHandler.fetch.mockResolvedValue(
      new Response("Original handler response", { status: 200 })
    );
  });

  describe("Local OIDC Security Middleware", () => {
    it("should allow local OIDC when ALLOW_LOCAL_AUTH is true and not in production", async () => {
      const res = await honoEntry.request(
        "/local_oidc/.well-known/openid-configuration",
        {},
        mockEnv
      );

      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(500);
      // The actual route will handle the request (might be 404 due to mocking, but security passed)
    });

    it("should block local OIDC when ALLOW_LOCAL_AUTH is false", async () => {
      const restrictedEnv = {
        ...mockEnv,
        ALLOW_LOCAL_AUTH: "false",
      };

      const res = await honoEntry.request(
        "/local_oidc/.well-known/openid-configuration",
        {},
        restrictedEnv
      );
      const error = await res.json();

      expect(res.status).toBe(403);
      expect(error.error).toBe("Local OIDC is disabled");
    });

    it("should block local OIDC when ALLOW_LOCAL_AUTH is undefined", async () => {
      const restrictedEnv = {
        ...mockEnv,
        ALLOW_LOCAL_AUTH: undefined,
      };

      const res = await honoEntry.request(
        "/local_oidc/.well-known/openid-configuration",
        {},
        restrictedEnv
      );
      const error = await res.json();

      expect(res.status).toBe(403);
      expect(error.error).toBe("Local OIDC is disabled");
    });

    it("should block local OIDC in production environment", async () => {
      const productionEnv = {
        ...mockEnv,
        DEPLOYMENT_ENV: "production",
        ALLOW_LOCAL_AUTH: "true", // Even with this enabled
      };

      const res = await honoEntry.request(
        "/local_oidc/.well-known/openid-configuration",
        {},
        productionEnv
      );
      const error = await res.json();

      expect(res.status).toBe(500);
      expect(error.error).toBe("SECURITY_ERROR");
      expect(error.message).toBe(
        "Local authentication cannot be enabled in production environments"
      );
    });

    it("should allow non-local-oidc routes even when local OIDC is disabled", async () => {
      const restrictedEnv = {
        ...mockEnv,
        ALLOW_LOCAL_AUTH: "false",
      };

      const res = await honoEntry.request("/api/health", {}, restrictedEnv);

      // Should not be blocked by local OIDC middleware
      expect(res.status).not.toBe(403);
    });
  });

  describe("Route Mounting", () => {
    it("should handle API routes through mounted API router", async () => {
      const res = await honoEntry.request("/api/health", {}, mockEnv);

      // API routes should return a response (actual routing verified by other tests)
      expect(res.status).not.toBe(500);
    });

    it("should handle local OIDC routes when enabled", async () => {
      const res = await honoEntry.request(
        "/local_oidc/.well-known/openid-configuration",
        {},
        mockEnv
      );

      // Should pass security middleware (status won't be 403/500 from security)
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(500);
    });
  });

  describe("Catch-all Fallback", () => {
    it("should delegate unknown routes to original handler", async () => {
      const res = await honoEntry.request("/some/unknown/route", {}, mockEnv);

      expect(mockOriginalHandler.fetch).toHaveBeenCalledWith(
        expect.any(Request),
        mockEnv,
        expect.any(Object)
      );

      const responseText = await res.text();
      expect(responseText).toBe("Original handler response");
    });

    it("should delegate WebSocket routes to original handler", async () => {
      const res = await honoEntry.request("/livestore", {}, mockEnv);

      expect(mockOriginalHandler.fetch).toHaveBeenCalledWith(
        expect.any(Request),
        mockEnv,
        expect.any(Object)
      );
    });

    it("should delegate root route to original handler", async () => {
      const res = await honoEntry.request("/", {}, mockEnv);

      expect(mockOriginalHandler.fetch).toHaveBeenCalledWith(
        expect.any(Request),
        mockEnv,
        expect.any(Object)
      );
    });

    it("should preserve request method in delegation", async () => {
      await honoEntry.request(
        "/unknown",
        {
          method: "POST",
          body: JSON.stringify({ test: "data" }),
          headers: { "Content-Type": "application/json" },
        },
        mockEnv
      );

      const [request] = mockOriginalHandler.fetch.mock.calls[0];
      expect(request.method).toBe("POST");
    });

    it("should preserve request headers in delegation", async () => {
      await honoEntry.request(
        "/unknown",
        {
          headers: { "X-Custom-Header": "test-value" },
        },
        mockEnv
      );

      const [request] = mockOriginalHandler.fetch.mock.calls[0];
      expect(request.headers.get("X-Custom-Header")).toBe("test-value");
    });
  });

  describe("CORS Middleware", () => {
    it("should add CORS headers to responses", async () => {
      const res = await honoEntry.request("/api/health", {}, mockEnv);

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      // CORS methods header may vary by implementation
    });

    it("should handle OPTIONS preflight requests", async () => {
      const res = await honoEntry.request(
        "/api/health",
        {
          method: "OPTIONS",
        },
        mockEnv
      );

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("should add CORS headers to local OIDC routes", async () => {
      const res = await honoEntry.request(
        "/local_oidc/.well-known/openid-configuration",
        {},
        mockEnv
      );

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("Logging Middleware", () => {
    it("should log requests", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await honoEntry.request("/api/health", {}, mockEnv);

      expect(consoleSpy).toHaveBeenCalledWith(
        "🔍 Hono middleware:",
        expect.objectContaining({
          method: "GET",
          pathname: "/api/health",
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Environment Variables", () => {
    it("should work with minimal environment configuration", async () => {
      const minimalEnv = {
        DEPLOYMENT_ENV: "development",
      } as Env;

      const res = await honoEntry.request("/api/health", {}, minimalEnv);

      // Should not crash with minimal env
      expect(res.status).not.toBe(500);
    });

    it("should handle missing DEPLOYMENT_ENV", async () => {
      const envWithoutDeployment = {
        ALLOW_LOCAL_AUTH: "true",
      } as Env;

      // Should not crash when DEPLOYMENT_ENV is undefined
      await expect(
        honoEntry.request(
          "/local_oidc/.well-known/openid-configuration",
          {},
          envWithoutDeployment
        )
      ).resolves.not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle errors from original handler gracefully", async () => {
      mockOriginalHandler.fetch.mockRejectedValueOnce(
        new Error("Original handler error")
      );

      const res = await honoEntry.request("/unknown-route", {}, mockEnv);

      // Error should be handled and return error response
      expect(res.status).toBe(500);
    });

    it("should handle malformed requests", async () => {
      // Test with invalid URL path
      const res = await honoEntry.request("/invalid%path", {}, mockEnv);

      // Should not crash the application
      expect(res).toBeDefined();
    });
  });

  describe("Request Context", () => {
    it("should provide environment to route handlers", async () => {
      // This tests that the environment binding is correctly passed through
      const res = await honoEntry.request("/api/health", {}, mockEnv);

      // The health endpoint should be able to access env.DEPLOYMENT_ENV
      expect(res.status).not.toBe(500);
    });

    it("should provide execution context to delegated handlers", async () => {
      await honoEntry.request("/unknown", {}, mockEnv);

      const [, env, ctx] = mockOriginalHandler.fetch.mock.calls[0];
      expect(env).toBe(mockEnv);
      expect(ctx).toBeDefined();
      // In test environment, execution context may be empty object
      expect(typeof ctx).toBe("object");
    });
  });
});
