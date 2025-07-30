import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { SignJWT } from "jose";
import {
  validateAuthPayload,
  validateProductionEnvironment,
  determineAuthType,
  type ValidatedUser,
} from "../backend/auth";
import type { Env } from "../backend/types";

describe("validateProductionEnvironment", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should pass validation for production with AUTH_ISSUER", () => {
    const env: Env = {
      DEPLOYMENT_ENV: "production",
      AUTH_ISSUER: "https://auth.example.com",
      AUTH_TOKEN: "",
    } as Env;

    expect(() => validateProductionEnvironment(env)).not.toThrow();
  });

  it("should throw error for production without AUTH_ISSUER", () => {
    const env: Env = {
      DEPLOYMENT_ENV: "production",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "",
    } as Env;

    expect(() => validateProductionEnvironment(env)).toThrow(
      "STARTUP_ERROR: AUTH_ISSUER is required when DEPLOYMENT_ENV is production"
    );
  });

  it("should pass validation for development with AUTH_ISSUER", () => {
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "https://auth.example.com",
      AUTH_TOKEN: "",
    } as Env;

    expect(() => validateProductionEnvironment(env)).not.toThrow();
  });

  it("should pass validation for development with AUTH_TOKEN", () => {
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "test-token",
    } as Env;

    expect(() => validateProductionEnvironment(env)).not.toThrow();
  });

  it("should throw error for development with empty AUTH_TOKEN", () => {
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "",
    } as Env;

    expect(() => validateProductionEnvironment(env)).toThrow(
      "STARTUP_ERROR: AUTH_ISSUER or AUTH_TOKEN must be set when DEPLOYMENT_ENV is development"
    );
  });
});

describe("determineAuthType", () => {
  it("should return access_token for valid JWT", async () => {
    const jwt = await new SignJWT({ sub: "test-user" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("test-secret"));

    const payload = { authToken: jwt };
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "test-token",
    } as Env;

    const result = determineAuthType(payload, env);
    expect(result).toBe("access_token");
  });

  it("should return access_token for JWT with wrong signature", async () => {
    const jwt = await new SignJWT({ sub: "test-user" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("test-secret"));

    // Create a JWT with wrong signature by modifying the last part
    const parts = jwt.split(".");
    const headerAndPayload = parts.slice(0, 2).join(".");
    const wrongSignature = "wrong-signature";
    const invalidJwt = `${headerAndPayload}.${wrongSignature}`;

    const payload = { authToken: invalidJwt };
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "test-token",
    } as Env;

    const result = determineAuthType(payload, env);
    expect(result).toBe("access_token");
  });

  it("should return auth_token when payload.runtime is true", () => {
    const payload = {
      authToken: "not-a-jwt-token",
      runtime: true,
    };
    const env: Env = {
      DEPLOYMENT_ENV: "production",
      AUTH_ISSUER: "https://auth.example.com",
      AUTH_TOKEN: "test-token",
    } as Env;

    const result = determineAuthType(payload, env);
    expect(result).toBe("auth_token");
  });

  it("should return auth_token when env.AUTH_TOKEN is set in development", () => {
    const payload = { authToken: "not-a-jwt-token" };
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "test-token",
    } as Env;

    const result = determineAuthType(payload, env);
    expect(result).toBe("auth_token");
  });

  it("should return auth_token when env.AUTH_TOKEN is set in non-production", () => {
    const payload = { authToken: "not-a-jwt-token" };
    const env: Env = {
      DEPLOYMENT_ENV: "staging",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "test-token",
    } as Env;

    const result = determineAuthType(payload, env);
    expect(result).toBe("auth_token");
  });

  it("should throw error for unsupported auth method in production", () => {
    const payload = { authToken: "not-a-jwt-token" };
    const env: Env = {
      DEPLOYMENT_ENV: "production",
      AUTH_ISSUER: "https://auth.example.com",
      AUTH_TOKEN: "",
    } as Env;

    expect(() => determineAuthType(payload, env)).toThrow(
      "INVALID_AUTH_TOKEN: Unknown authorization method"
    );
  });

  it("should handle empty auth token", () => {
    const payload = { authToken: "" };
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "test-token",
    } as Env;

    const result = determineAuthType(payload, env);
    expect(result).toBe("auth_token");
  });
});

describe("validateAuthPayload - Hardcoded Auth Token", () => {
  it("should validate successfully when auth tokens match", async () => {
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "test-secret-token",
    } as Env;

    const payload = {
      authToken: "test-secret-token",
    };

    const result = await validateAuthPayload(payload, env);

    expect(result).toEqual({
      id: "local-dev-user",
      email: "local@example.com",
      name: "Local Development User",
      isAnonymous: true,
    });
  });

  it("should throw error when auth tokens don't match", async () => {
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "correct-token",
    } as Env;

    const payload = {
      authToken: "wrong-token",
    };

    await expect(validateAuthPayload(payload, env)).rejects.toThrow(
      "INVALID_AUTH_TOKEN: Authentication failed"
    );
  });

  it("should throw error when payload auth token is empty", async () => {
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "test-token",
    } as Env;

    const payload = {
      authToken: "",
    };

    await expect(validateAuthPayload(payload, env)).rejects.toThrow(
      "INVALID_AUTH_TOKEN: Authentication failed"
    );
  });

  it("should handle special characters in auth tokens", async () => {
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: "special!@#$%^&*()_+-=[]{}|;:,.<>?",
    } as Env;

    const payload = {
      authToken: "special!@#$%^&*()_+-=[]{}|;:,.<>?",
    };

    const result = await validateAuthPayload(payload, env);

    expect(result).toEqual({
      id: "local-dev-user",
      email: "local@example.com",
      name: "Local Development User",
      isAnonymous: true,
    });
  });

  it("should handle long auth tokens", async () => {
    const longToken = "a".repeat(1000);
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "",
      AUTH_TOKEN: longToken,
    } as Env;

    const payload = {
      authToken: longToken,
    };

    const result = await validateAuthPayload(payload, env);

    expect(result).toEqual({
      id: "local-dev-user",
      email: "local@example.com",
      name: "Local Development User",
      isAnonymous: true,
    });
  });
});
