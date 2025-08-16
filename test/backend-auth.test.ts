import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { SignJWT } from "jose";
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
    } as Env;

    expect(() => validateProductionEnvironment(env)).not.toThrow();
  });

  it("should throw error for production without AUTH_ISSUER", () => {
    const env: Env = {
      DEPLOYMENT_ENV: "production",
      AUTH_ISSUER: "",
    } as Env;

    expect(() => validateProductionEnvironment(env)).toThrow(
      "STARTUP_ERROR: AUTH_ISSUER is required when DEPLOYMENT_ENV is production"
    );
  });

  it("should pass validation for development with AUTH_ISSUER", () => {
    const env: Env = {
      DEPLOYMENT_ENV: "development",
      AUTH_ISSUER: "https://auth.example.com",
    } as Env;

    expect(() => validateProductionEnvironment(env)).not.toThrow();
  });
});
