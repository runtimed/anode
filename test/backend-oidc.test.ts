import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Mock } from "vitest";
import * as openidClient from "openid-client";
import { handleOidcRequest } from "../backend/local_oidc";
import { Env } from "../backend/types";

describe("Local OIDC handler", () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      DEPLOYMENT_ENV: "development",
      AUTH_TOKEN: "test-token",
      AUTH_ISSUER: "http://localhost:8787/local_oidc",
    } as Env;
  });

  const customFetch = (
    url: string,
    options: RequestInit
  ): Promise<Response> => {
    const request = new Request(url, options);
    return handleOidcRequest(request, mockEnv);
  };

  const getConfig = async () => {
    const url = new URL(
      "http://localhost:8787/local_oidc/.well-known/openid-configuration"
    );
    return openidClient.discovery(
      url,
      "local-anode-client",
      undefined,
      undefined,
      {
        [openidClient.customFetch]: customFetch,
        execute: [openidClient.allowInsecureRequests],
      }
    );
  };

  describe("Local OIDC", () => {
    it("should discover the client", async () => {
      const config = await getConfig();
      expect(config).toBeDefined();
      const resp = config.serverMetadata();
      expect(resp.authorization_endpoint).toBe(
        "http://localhost:5173/local_oidc/authorize"
      );
      expect(resp.token_endpoint).toBe(
        "http://localhost:8787/local_oidc/token"
      );
      expect(resp.userinfo_endpoint).toBe(
        "http://localhost:8787/local_oidc/userinfo"
      );
      expect(resp.jwks_uri).toBe(
        "http://localhost:8787/local_oidc/.well-known/jwks.json"
      );
      expect(resp.end_session_endpoint).toBe(
        "http://localhost:8787/local_oidc/logout"
      );
      expect(resp.scopes_supported).toEqual(["profile", "email", "openid"]);
      expect(resp.response_types_supported).toEqual(["code"]);
    });

    it("should exchange a code for a token", async () => {
      const config = await getConfig();
      const state = openidClient.randomState();
      const verifier = openidClient.randomPKCECodeVerifier();
      const challenge = await openidClient.calculatePKCECodeChallenge(verifier);
      const code = btoa(JSON.stringify({
        firstName: "White",
        lastName: "Rabbit",
        email: "white.rabbit@runt.run"
      }));
      const url = new URL("http://localhost:5173/oidc");
      url.searchParams.set("code", code);
      url.searchParams.set("state", state);
      const exchangePromise = openidClient.authorizationCodeGrant(config, url, {
        pkceCodeVerifier: verifier,
        expectedState: state,
      });
      await expect(exchangePromise).resolves.toBeDefined();
    })
  });
});
