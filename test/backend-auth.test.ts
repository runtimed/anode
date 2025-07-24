import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  validateAuthPayload,
  validateProductionEnvironment,
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
