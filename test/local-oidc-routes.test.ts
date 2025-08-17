import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { Hono } from "hono";
import { cors } from "hono/cors";
import localOidcRoutes from "../backend/local-oidc-routes";
import { type Env } from "../backend/types";

// Mock JOSE library
vi.mock("jose", () => ({
  generateKeyPair: vi.fn().mockResolvedValue({
    privateKey: "mock-private-key",
  }),
  exportPKCS8: vi.fn().mockResolvedValue("mock-pem-string"),
  importPKCS8: vi.fn().mockResolvedValue("mock-imported-key"),
  exportJWK: vi.fn().mockResolvedValue({
    kty: "RSA",
    n: "mock-modulus",
    e: "AQAB",
  }),
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock-jwt-token"),
  })),
}));

// Mock UUID library
vi.mock("uuid", () => ({
  v5: vi.fn().mockReturnValue("mock-user-uuid"),
}));

// Mock auth functions
vi.mock("../backend/auth", () => ({
  getPassport: vi.fn().mockResolvedValue({
    jwt: {
      sub: "test-user-id",
      given_name: "John",
      family_name: "Doe",
      email: "john@example.com",
      iss: "test-issuer",
      aud: "local-anode-client",
    },
  }),
  parseToken: vi.fn().mockResolvedValue({
    user: {
      givenName: "John",
      familyName: "Doe",
      email: "john@example.com",
    },
  }),
}));

describe("Local OIDC Routes", () => {
  let mockEnv: Env;
  let mockDB: {
    prepare: Mock;
  };
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock database operations
    const mockPrepare = vi.fn();
    const mockFirst = vi.fn();
    const mockBind = vi.fn().mockReturnValue({ first: mockFirst });

    mockPrepare.mockReturnValue({
      first: mockFirst,
      bind: mockBind,
    });

    mockDB = {
      prepare: mockPrepare,
    };

    mockEnv = {
      DEPLOYMENT_ENV: "development",
      ALLOW_LOCAL_AUTH: "true",
      AUTH_ISSUER: "http://localhost:5173/local_oidc",
      DB: mockDB as any,
    } as Env;

    // Create test app with CORS middleware
    app = new Hono();
    app.use(
      "*",
      cors({
        origin: "*",
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: ["GET", "POST", "OPTIONS"],
      })
    );
    app.route("/local_oidc", localOidcRoutes);

    // Default mock for PEM operations - existing PEM
    mockFirst.mockResolvedValue({ value: "existing-pem-key" });
  });

  describe("OpenID Configuration", () => {
    it("should return OpenID configuration", async () => {
      const res = await app.request(
        "/local_oidc/.well-known/openid-configuration",
        {},
        mockEnv
      );
      const config = await res.json();

      expect(res.status).toBe(200);
      expect(config).toEqual({
        issuer: "http://localhost/local_oidc",
        authorization_endpoint: "http://localhost:5173/local_oidc/authorize",
        jwks_uri: "http://localhost/local_oidc/.well-known/jwks.json",
        token_endpoint: "http://localhost/local_oidc/token",
        userinfo_endpoint: "http://localhost/local_oidc/userinfo",
        end_session_endpoint: "http://localhost/local_oidc/logout",
        scopes_supported: ["profile", "email", "openid"],
        response_types_supported: ["code"],
        token_endpoint_auth_methods_supported: ["client_secret_post"],
      });
    });

    it("should use custom authorization endpoint from environment", async () => {
      const customEnv = {
        ...mockEnv,
        LOCAL_OIDC_AUTHORIZATION_ENDPOINT: "http://custom.example.com/auth",
      };

      const res = await app.request(
        "/local_oidc/.well-known/openid-configuration",
        {},
        customEnv
      );
      const config = await res.json();

      expect(config.authorization_endpoint).toBe(
        "http://custom.example.com/auth"
      );
    });
  });

  describe("JWKS Endpoint", () => {
    it("should return JSON Web Key Set", async () => {
      const res = await app.request(
        "/local_oidc/.well-known/jwks.json",
        {},
        mockEnv
      );
      const jwks = await res.json();

      expect(res.status).toBe(200);
      expect(jwks).toEqual({
        keys: [
          {
            kty: "RSA",
            use: "sig",
            kid: "1",
            n: "mock-modulus",
            e: "AQAB",
          },
        ],
      });
    });

    it("should handle JWKS generation errors", async () => {
      // Mock database to throw error
      mockDB.prepare.mockImplementation(() => {
        throw new Error("Database error");
      });

      const res = await app.request(
        "/local_oidc/.well-known/jwks.json",
        {},
        mockEnv
      );
      const error = await res.json();

      expect(res.status).toBe(500);
      expect(error.error).toBe("Internal Server Error");
    });

    it("should generate new PEM when none exists", async () => {
      // Mock no existing PEM, then successful creation
      mockDB.prepare
        .mockReturnValueOnce({
          first: vi.fn().mockResolvedValue(null), // No existing PEM
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ value: "new-pem-key" }),
          }),
        });

      const res = await app.request(
        "/local_oidc/.well-known/jwks.json",
        {},
        mockEnv
      );

      expect(res.status).toBe(200);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO settings")
      );
    });
  });

  describe("Token Endpoint", () => {
    it("should handle authorization code flow", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };
      const code = btoa(JSON.stringify(userData));

      const formData = new FormData();
      formData.append("client_id", "local-anode-client");
      formData.append("redirect_uri", "http://localhost:3000/callback");
      formData.append("code", code);
      formData.append("grant_type", "authorization_code");

      const res = await app.request(
        "/local_oidc/token",
        {
          method: "POST",
          body: formData,
        },
        mockEnv
      );

      const tokens = await res.json();

      expect(res.status).toBe(200);
      expect(tokens).toEqual({
        access_token: "mock-jwt-token",
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: "mock-jwt-token",
        id_token: "mock-jwt-token",
        scope: "openid profile email",
      });
    });

    it("should handle refresh token flow", async () => {
      const formData = new FormData();
      formData.append("client_id", "local-anode-client");
      formData.append("grant_type", "refresh_token");
      formData.append("refresh_token", "valid-refresh-token");

      const res = await app.request(
        "/local_oidc/token",
        {
          method: "POST",
          body: formData,
        },
        mockEnv
      );

      const tokens = await res.json();

      expect(res.status).toBe(200);
      expect(tokens.access_token).toBe("mock-jwt-token");
    });

    it("should reject invalid client_id", async () => {
      const formData = new FormData();
      formData.append("client_id", "invalid-client");
      formData.append("grant_type", "authorization_code");

      const res = await app.request(
        "/local_oidc/token",
        {
          method: "POST",
          body: formData,
        },
        mockEnv
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Invalid client_id");
    });

    it("should reject invalid redirect_uri", async () => {
      const formData = new FormData();
      formData.append("client_id", "local-anode-client");
      formData.append("redirect_uri", "https://malicious.com/callback");
      formData.append("grant_type", "authorization_code");
      formData.append("code", "some-code");

      const res = await app.request(
        "/local_oidc/token",
        {
          method: "POST",
          body: formData,
        },
        mockEnv
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Invalid redirect_uri");
    });

    it("should reject malformed authorization code", async () => {
      const formData = new FormData();
      formData.append("client_id", "local-anode-client");
      formData.append("redirect_uri", "http://localhost:3000/callback");
      formData.append("code", "invalid-base64-code");
      formData.append("grant_type", "authorization_code");

      const res = await app.request(
        "/local_oidc/token",
        {
          method: "POST",
          body: formData,
        },
        mockEnv
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toBe(
        "Invalid code: not a valid BASE64 encoded JSON"
      );
    });

    it("should reject code with missing required fields", async () => {
      const incompleteUserData = { email: "john@example.com" }; // Missing firstName, lastName
      const code = btoa(JSON.stringify(incompleteUserData));

      const formData = new FormData();
      formData.append("client_id", "local-anode-client");
      formData.append("redirect_uri", "http://localhost:3000/callback");
      formData.append("code", code);
      formData.append("grant_type", "authorization_code");

      const res = await app.request(
        "/local_oidc/token",
        {
          method: "POST",
          body: formData,
        },
        mockEnv
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Invalid code: missing required fields");
    });

    it("should reject unsupported grant types", async () => {
      const formData = new FormData();
      formData.append("client_id", "local-anode-client");
      formData.append("grant_type", "client_credentials");

      const res = await app.request(
        "/local_oidc/token",
        {
          method: "POST",
          body: formData,
        },
        mockEnv
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Invalid grant_type");
    });

    it("should handle refresh token validation errors", async () => {
      // Mock parseToken to throw an error
      const { parseToken } = await import("../backend/auth");
      vi.mocked(parseToken).mockRejectedValueOnce(new Error("Invalid token"));

      const formData = new FormData();
      formData.append("client_id", "local-anode-client");
      formData.append("grant_type", "refresh_token");
      formData.append("refresh_token", "invalid-refresh-token");

      const res = await app.request(
        "/local_oidc/token",
        {
          method: "POST",
          body: formData,
        },
        mockEnv
      );

      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Invalid refresh token");
    });
  });

  describe("User Info Endpoint", () => {
    it("should return user information with valid token", async () => {
      const res = await app.request(
        "/local_oidc/userinfo",
        {
          headers: {
            Authorization: "Bearer valid-jwt-token",
          },
        },
        mockEnv
      );

      const userInfo = await res.json();

      expect(res.status).toBe(200);
      expect(userInfo).toEqual({
        sub: "test-user-id",
        given_name: "John",
        family_name: "Doe",
        email: "john@example.com",
        iss: "test-issuer",
        aud: "local-anode-client",
      });
    });

    it("should reject invalid access tokens", async () => {
      // Mock getPassport to throw an error
      const { getPassport } = await import("../backend/auth");
      vi.mocked(getPassport).mockRejectedValueOnce(new Error("Invalid token"));

      const res = await app.request(
        "/local_oidc/userinfo",
        {
          headers: {
            Authorization: "Bearer invalid-token",
          },
        },
        mockEnv
      );

      const error = await res.json();

      expect(res.status).toBe(401);
      expect(error.error).toBe("Invalid access token");
      expect(res.headers.get("WWW-Authenticate")).toBe("Bearer");
    });

    it("should reject requests without authorization header", async () => {
      // Mock getPassport to throw an error for missing auth
      const { getPassport } = await import("../backend/auth");
      vi.mocked(getPassport).mockRejectedValueOnce(
        new Error("No authorization header")
      );

      const res = await app.request("/local_oidc/userinfo", {}, mockEnv);

      expect(res.status).toBe(401);
    });
  });

  describe("CORS Handling", () => {
    it("should handle OPTIONS preflight requests", async () => {
      const res = await app.request(
        "/local_oidc/token",
        {
          method: "OPTIONS",
        },
        mockEnv
      );

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(res.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET,POST,OPTIONS"
      );
    });

    it("should include CORS headers in responses", async () => {
      const res = await app.request(
        "/local_oidc/.well-known/openid-configuration",
        {},
        mockEnv
      );

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("Error Handling", () => {
    it("should handle database connection errors gracefully", async () => {
      // Mock database to throw error on all operations
      mockDB.prepare.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const res = await app.request(
        "/local_oidc/.well-known/jwks.json",
        {},
        mockEnv
      );

      expect(res.status).toBe(500);
    });

    it("should handle JWT signing errors", async () => {
      // Mock SignJWT to throw error
      const { SignJWT } = await import("jose");
      vi.mocked(SignJWT).mockImplementation(
        () =>
          ({
            setProtectedHeader: vi.fn().mockReturnThis(),
            sign: vi.fn().mockRejectedValue(new Error("Signing failed")),
          }) as any
      );

      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };
      const code = btoa(JSON.stringify(userData));

      const formData = new FormData();
      formData.append("client_id", "local-anode-client");
      formData.append("redirect_uri", "http://localhost:3000/callback");
      formData.append("code", code);
      formData.append("grant_type", "authorization_code");

      const res = await app.request(
        "/local_oidc/token",
        {
          method: "POST",
          body: formData,
        },
        mockEnv
      );

      expect(res.status).toBe(500);
    });
  });

  describe("PEM Key Management", () => {
    it("should handle PEM conflict resolution", async () => {
      // Mock scenario where INSERT returns nothing due to conflict, then SELECT succeeds
      mockDB.prepare
        .mockReturnValueOnce({
          first: vi.fn().mockResolvedValue(null), // No existing PEM
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null), // INSERT conflict, returns nothing
          }),
        })
        .mockReturnValueOnce({
          first: vi.fn().mockResolvedValue({ value: "conflicted-pem-key" }), // SELECT after conflict
        });

      const res = await app.request(
        "/local_oidc/.well-known/jwks.json",
        {},
        mockEnv
      );

      expect(res.status).toBe(200);
      // Should have called SELECT twice (initial check + conflict resolution)
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("SELECT value FROM settings")
      );
    });

    it("should handle PEM generation failure", async () => {
      // Mock scenario where both INSERT and SELECT after conflict fail
      mockDB.prepare
        .mockReturnValueOnce({
          first: vi.fn().mockResolvedValue(null), // No existing PEM
        })
        .mockReturnValueOnce({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null), // INSERT conflict, returns nothing
          }),
        })
        .mockReturnValueOnce({
          first: vi.fn().mockResolvedValue(null), // SELECT after conflict also fails
        });

      const res = await app.request(
        "/local_oidc/.well-known/jwks.json",
        {},
        mockEnv
      );

      expect(res.status).toBe(500);
    });
  });
});
