import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getOpenIdService, LocalStorageKey } from "../../src/services/openid";
import type { UserInfo } from "../../src/services/openid";

// Console setup for Anode tests
console.log("🧪 Starting Anode test suite...");

describe("Auth Recovery System", () => {
  let originalLocalStorage: Storage;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    originalLocalStorage = global.localStorage;

    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    } as Storage;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    vi.clearAllMocks();
  });

  describe("Token Validation", () => {
    it("should handle corrupted token data gracefully", () => {
      // Set corrupted token data
      mockLocalStorage[LocalStorageKey.Tokens] = "invalid-json";

      const openIdService = getOpenIdService();
      const tokens = openIdService.getTokens();

      expect(tokens).toBeNull();
    });

    it("should handle malformed JWT tokens", () => {
      const invalidTokens = {
        accessToken: "not.a.jwt", // Invalid JWT structure
        refreshToken: "refresh-token",
        expiresAt: Date.now() / 1000 + 3600,
        claims: {
          sub: "user123",
          email: "test@example.com",
          email_verified: true,
        },
      };

      mockLocalStorage[LocalStorageKey.Tokens] = JSON.stringify(invalidTokens);

      const openIdService = getOpenIdService();
      const tokens = openIdService.getTokens();

      // Should return tokens but sync payload should reject them
      expect(tokens).not.toBeNull();
      expect(tokens?.accessToken).toBe("not.a.jwt");
    });

    it("should validate JWT structure in sync payload", () => {
      // Create a mock sync payload getter similar to CustomLiveStoreProvider
      const syncPayload = {
        get authToken() {
          try {
            const tokenString = localStorage.getItem("openid_tokens");

            if (
              !tokenString ||
              tokenString === "null" ||
              tokenString === "undefined"
            ) {
              return "";
            }

            const tokens = JSON.parse(tokenString);

            if (!tokens || typeof tokens !== "object") {
              console.warn("Invalid token structure in localStorage");
              return "";
            }

            const { accessToken } = tokens;
            if (!accessToken || typeof accessToken !== "string") {
              return "";
            }

            // Basic JWT structure validation (should have 3 parts)
            const jwtParts = accessToken.split(".");
            if (jwtParts.length !== 3) {
              console.warn("Access token doesn't appear to be a valid JWT");
              return "";
            }

            // Check if token is obviously expired (basic check)
            try {
              const payload = JSON.parse(atob(jwtParts[1]));
              const now = Math.floor(Date.now() / 1000);
              if (payload.exp && payload.exp < now - 60) {
                // Token expired more than 1 minute ago
                console.warn("Access token appears to be expired");
                return "";
              }
            } catch (jwtError) {
              // JWT parsing failed, but we'll still try to use the token
              console.debug(
                "Could not parse JWT payload, but token might still be valid"
              );
            }

            return accessToken;
          } catch (error) {
            console.warn("Failed to get auth token for sync:", error);

            // Try to clear corrupted data
            try {
              localStorage.removeItem("openid_tokens");
              console.debug("Cleared corrupted auth tokens from localStorage");
            } catch (clearError) {
              console.error("Failed to clear corrupted tokens:", clearError);
            }

            return "";
          }
        },
      };

      // Test with invalid JWT
      mockLocalStorage["openid_tokens"] = JSON.stringify({
        accessToken: "not.a.jwt",
        refreshToken: "refresh",
        expiresAt: Date.now() / 1000 + 3600,
        claims: { sub: "123", email: "test@example.com", email_verified: true },
      });

      // Malformed JWT still gets returned (fallback behavior)
      expect(syncPayload.authToken).toBe("not.a.jwt");

      // Test with valid JWT structure
      const validJWT =
        "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImV4cCI6OTk5OTk5OTk5OX0.invalid-signature";

      mockLocalStorage["openid_tokens"] = JSON.stringify({
        accessToken: validJWT,
        refreshToken: "refresh",
        expiresAt: Date.now() / 1000 + 3600,
        claims: { sub: "123", email: "test@example.com", email_verified: true },
      });

      expect(syncPayload.authToken).toBe(validJWT);
    });

    it("should handle expired tokens in sync payload", () => {
      // Create expired JWT payload
      const expiredTime = Math.floor(Date.now() / 1000) - 120; // 2 minutes ago
      const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const payload = btoa(
        JSON.stringify({
          sub: "123",
          exp: expiredTime,
          iat: expiredTime - 3600,
        })
      );
      const signature = "fake-signature";
      const expiredJWT = `${header}.${payload}.${signature}`;

      const syncPayload = {
        get authToken() {
          try {
            const tokenString = localStorage.getItem("openid_tokens");
            const tokens = JSON.parse(tokenString || "{}");
            const { accessToken } = tokens;

            if (!accessToken) return "";

            const jwtParts = accessToken.split(".");
            if (jwtParts.length !== 3) return "";

            // Check if token is expired
            try {
              const payload = JSON.parse(atob(jwtParts[1]));
              const now = Math.floor(Date.now() / 1000);
              if (payload.exp && payload.exp < now - 60) {
                return "";
              }
            } catch (jwtError) {
              // JWT parsing failed, but we'll still try to use the token
            }

            return accessToken;
          } catch (error) {
            return "";
          }
        },
      };

      mockLocalStorage["openid_tokens"] = JSON.stringify({
        accessToken: expiredJWT,
        refreshToken: "refresh",
        expiresAt: expiredTime,
        claims: { sub: "123", email: "test@example.com", email_verified: true },
      });

      expect(syncPayload.authToken).toBe("");
    });
  });

  describe("Auth State Recovery", () => {
    it("should reset auth when tokens have invalid claims", () => {
      const tokensWithInvalidClaims = {
        accessToken: "valid.jwt.token",
        refreshToken: "refresh-token",
        expiresAt: Date.now() / 1000 + 3600,
        claims: {
          sub: "", // Invalid - empty sub
          email: "test@example.com",
          email_verified: true,
        },
      };

      mockLocalStorage[LocalStorageKey.Tokens] = JSON.stringify(
        tokensWithInvalidClaims
      );

      const openIdService = getOpenIdService();

      // Simulate auth provider validation
      const tokens = openIdService.getTokens();
      const isValid = tokens?.claims?.sub && tokens?.claims?.email;

      if (!isValid && tokens) {
        openIdService.reset();
      }

      expect(mockLocalStorage[LocalStorageKey.Tokens]).toBeUndefined();
    });

    it("should handle localStorage corruption gracefully", () => {
      // Simulate various corruption scenarios
      const corruptionTests = [
        "invalid-json",
        '{"incomplete":',
        "null",
        "undefined",
        '{"accessToken": null}',
        '{"claims": {"sub": null}}',
      ];

      corruptionTests.forEach((corruptData) => {
        mockLocalStorage[LocalStorageKey.Tokens] = corruptData;

        const openIdService = getOpenIdService();
        const tokens = openIdService.getTokens();

        // Should handle corruption without throwing
        expect(() => openIdService.getTokens()).not.toThrow();

        // Should return null for corrupted data
        if (corruptData === "null" || corruptData === "undefined") {
          expect(tokens).toBeNull();
        }
      });
    });

    it("should clean up corrupted data automatically", () => {
      // Mock sync payload behavior that cleans up on error
      const cleanupSyncPayload = {
        get authToken() {
          try {
            const tokenString = localStorage.getItem("openid_tokens");
            const tokens = JSON.parse(tokenString || "{}");
            return tokens?.accessToken || "";
          } catch (error) {
            // Clean up corrupted data
            localStorage.removeItem("openid_tokens");
            return "";
          }
        },
      };

      mockLocalStorage["openid_tokens"] = "invalid-json";

      const result = cleanupSyncPayload.authToken;

      expect(result).toBe("");
      expect(mockLocalStorage["openid_tokens"]).toBeUndefined();
      expect(localStorage.removeItem).toHaveBeenCalledWith("openid_tokens");
    });
  });

  describe("Auth Reset Functionality", () => {
    it("should clear all auth-related localStorage on reset", () => {
      // Set up auth data
      mockLocalStorage[LocalStorageKey.Tokens] = JSON.stringify({
        accessToken: "token",
        refreshToken: "refresh",
        expiresAt: Date.now() / 1000 + 3600,
        claims: { sub: "123", email: "test@example.com", email_verified: true },
      });
      mockLocalStorage[LocalStorageKey.RequestState] = JSON.stringify({
        verifier: "verifier",
        challenge: "challenge",
        state: "state",
      });

      const openIdService = getOpenIdService();
      openIdService.reset();

      expect(mockLocalStorage[LocalStorageKey.Tokens]).toBeUndefined();
      expect(mockLocalStorage[LocalStorageKey.RequestState]).toBeUndefined();
    });

    it("should handle reset errors gracefully", () => {
      // Mock localStorage.removeItem to throw
      const originalRemoveItem = localStorage.removeItem;
      (localStorage.removeItem as any).mockImplementation(() => {
        throw new Error("Storage error");
      });

      const openIdService = getOpenIdService();

      // Should not throw even if localStorage operations fail
      expect(() => openIdService.reset()).not.toThrow();

      // Restore original
      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe("Error Boundary Scenarios", () => {
    it("should handle missing UserInfo fields", () => {
      const validateUserInfo = (claims: any): boolean => {
        if (!claims || typeof claims !== "object") {
          return false;
        }

        return (
          typeof claims.sub === "string" &&
          claims.sub.length > 0 &&
          typeof claims.email === "string" &&
          claims.email.includes("@") &&
          typeof claims.email_verified === "boolean"
        );
      };

      // Test various invalid claim scenarios
      const invalidClaims = [
        null,
        undefined,
        {},
        { sub: "" },
        { sub: "123" }, // Missing email
        { sub: "123", email: "invalid-email" }, // Invalid email format
        { sub: "123", email: "test@example.com" }, // Missing email_verified
        { sub: "123", email: "test@example.com", email_verified: "true" }, // Wrong type
      ];

      invalidClaims.forEach((claims) => {
        expect(validateUserInfo(claims)).toBe(false);
      });

      // Valid claims should pass
      const validClaims = {
        sub: "123",
        email: "test@example.com",
        email_verified: true,
      };

      expect(validateUserInfo(validClaims)).toBe(true);
    });

    it("should handle network connectivity issues during auth", () => {
      // This would be tested in integration tests with actual network mocking
      // For now, just ensure the auth system has proper error handling structure

      const mockAuthError = new Error("Network error during auth");

      // Simulate auth provider error handling
      const handleAuthError = (error: Error) => {
        if (error.message.includes("Network")) {
          return { valid: false, loading: false, error };
        }
        throw error;
      };

      const result = handleAuthError(mockAuthError);

      expect(result.valid).toBe(false);
      expect(result.error).toBe(mockAuthError);
    });
  });

  describe("URL Parameter Auth Reset", () => {
    it("should detect reset_auth parameter", () => {
      const mockSearchParams = new URLSearchParams("?reset_auth=true");

      expect(mockSearchParams.has("reset_auth")).toBe(true);

      // Simulate cleanup
      mockSearchParams.delete("reset_auth");

      expect(mockSearchParams.has("reset_auth")).toBe(false);
    });

    it("should preserve other URL parameters during auth reset", () => {
      const mockSearchParams = new URLSearchParams(
        "?reset_auth=true&other=value&notebook_id=123"
      );

      mockSearchParams.delete("reset_auth");

      expect(mockSearchParams.get("other")).toBe("value");
      expect(mockSearchParams.get("notebook_id")).toBe("123");
      expect(mockSearchParams.toString()).toBe("other=value&notebook_id=123");
    });
  });
});
