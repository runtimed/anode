import { describe, it, expect, beforeEach } from "vitest";
import * as openidClient from "openid-client";
import * as jose from "jose";
import { handleOidcRequest, generatePEM } from "../backend/local_oidc";
import { Env } from "../backend/types";

describe("Local OIDC handler", () => {
  let mockEnv: Env;

  beforeEach(async () => {
    // Generate a real PEM for testing
    const pem = await generatePEM();

    mockEnv = {
      DEPLOYMENT_ENV: "development",
      AUTH_TOKEN: "test-token",
      AUTH_ISSUER: "http://localhost:8787/local_oidc",
      DB: {
        prepare: (sql: string) => ({
          run: async () => {},
          first: async () => ({ pem }),
          bind: function (...args: any[]) {
            return {
              first: async () => ({ pem }),
              run: async () => {},
            };
          },
        }),
      },
      LOCAL_OIDC_PEM: pem,
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

    it("should return valid JWKS format", async () => {
      const request = new Request(
        "http://localhost:8787/local_oidc/.well-known/jwks.json"
      );
      const response = await handleOidcRequest(request, mockEnv);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const jwks = await response.json();
      expect(jwks).toHaveProperty("keys");
      expect(Array.isArray(jwks.keys)).toBe(true);
      expect(jwks.keys.length).toBeGreaterThan(0);

      const key = jwks.keys[0];
      expect(key).toHaveProperty("kty", "RSA");
      expect(key).toHaveProperty("use", "sig");
      expect(key).toHaveProperty("kid", "1");
      expect(key).toHaveProperty("n");
      expect(key).toHaveProperty("e");

      expect(key.n.length).toBeGreaterThan(0);
      expect(key.e.length).toBeGreaterThan(0);
    });

    it("should exchange a code for a token", async () => {
      const config = await getConfig();
      const state = openidClient.randomState();
      const verifier = openidClient.randomPKCECodeVerifier();
      const challenge = await openidClient.calculatePKCECodeChallenge(verifier);
      const code = btoa(
        JSON.stringify({
          firstName: "White",
          lastName: "Rabbit",
          email: "white.rabbit@runt.run",
        })
      );
      const url = new URL("http://localhost:5173/oidc");
      url.searchParams.set("code", code);
      url.searchParams.set("state", state);
      const exchangePromise = openidClient.authorizationCodeGrant(config, url, {
        pkceCodeVerifier: verifier,
        expectedState: state,
      });
      await expect(exchangePromise).resolves.toBeDefined();
      const tokenResponse = await exchangePromise;
      const tokens = tokenResponse.access_token;

      const jwksObject = await jose.createRemoteJWKSet(
        new URL("http://localhost:8787/local_oidc/.well-known/jwks.json"),
        {
          [jose.customFetch]: customFetch,
        }
      );

      const { payload: accessTokenPayload } = await jose.jwtVerify(
        tokens,
        jwksObject,
        {
          issuer: "http://localhost:8787/local_oidc",
          audience: "local-anode-client",
        }
      );

      // Verify the payload structure
      expect(accessTokenPayload.sub).toBeDefined();
      expect(accessTokenPayload.given_name).toBe("White");
      expect(accessTokenPayload.family_name).toBe("Rabbit");
      expect(accessTokenPayload.email).toBe("white.rabbit@runt.run");
      expect(accessTokenPayload.iss).toBe("http://localhost:8787/local_oidc");
      expect(accessTokenPayload.aud).toBe("local-anode-client");
      expect(accessTokenPayload.iat).toBeDefined();
      expect(accessTokenPayload.exp).toBeDefined();

      // Verify expiration (should be 5 minutes from now)
      const now = Math.floor(Date.now() / 1000);
      expect(accessTokenPayload.exp).toBeGreaterThan(now);
      expect(accessTokenPayload.exp).toBeLessThanOrEqual(now + 300); // 5 minutes

      // Verify the refresh token
      const refreshToken = tokenResponse.refresh_token;
      const { payload: refreshTokenPayload } = await jose.jwtVerify(
        refreshToken!,
        jwksObject,
        {
          issuer: "http://localhost:8787/local_oidc",
          audience: "local-anode-client",
        }
      );

      // Verify refresh token has same user data but longer expiration
      expect(refreshTokenPayload.sub).toBe(accessTokenPayload.sub);
      expect(refreshTokenPayload.given_name).toBe("White");
      expect(refreshTokenPayload.family_name).toBe("Rabbit");
      expect(refreshTokenPayload.email).toBe("white.rabbit@runt.run");
      expect(refreshTokenPayload.iss).toBe("http://localhost:8787/local_oidc");
      expect(refreshTokenPayload.aud).toBe("local-anode-client");
      expect(refreshTokenPayload.iat).toBeDefined();
      expect(refreshTokenPayload.exp).toBeDefined();

      expect(refreshTokenPayload.exp).toBeGreaterThan(now);
      expect(refreshTokenPayload.exp).toBeLessThanOrEqual(
        now + 365 * 24 * 60 * 60
      ); // 1 year

      // Verify ID token is the same as access token
      const idToken = tokenResponse.id_token;
      expect(idToken).toBe(tokens);
    });

    it("should refresh a token successfully", async () => {
      const config = await getConfig();
      const state = openidClient.randomState();
      const verifier = openidClient.randomPKCECodeVerifier();
      const code = btoa(
        JSON.stringify({
          firstName: "Alice",
          lastName: "Wonderland",
          email: "alice@wonderland.com",
        })
      );
      const url = new URL("http://localhost:5173/oidc");
      url.searchParams.set("code", code);
      url.searchParams.set("state", state);
      const tokenResponse = await openidClient.authorizationCodeGrant(
        config,
        url,
        {
          pkceCodeVerifier: verifier,
          expectedState: state,
        }
      );

      const originalRefreshToken = tokenResponse.refresh_token;
      expect(originalRefreshToken).toBeDefined();

      const refreshResponse = await openidClient.refreshTokenGrant(
        config,
        originalRefreshToken!
      );
      expect(refreshResponse).toBeDefined();

      const refreshTokenData = refreshResponse;
      expect(refreshTokenData).toHaveProperty("access_token");
      expect(refreshTokenData).toHaveProperty("refresh_token");
      expect(refreshTokenData).toHaveProperty("id_token");
      expect(refreshTokenData).toHaveProperty("expires_in", 300);
      expect(refreshTokenData).toHaveProperty("scope", "openid profile email");

      const jwksObject = await jose.createRemoteJWKSet(
        new URL("http://localhost:8787/local_oidc/.well-known/jwks.json"),
        {
          [jose.customFetch]: customFetch,
        }
      );

      const { payload: newAccessTokenPayload } = await jose.jwtVerify(
        refreshTokenData.access_token,
        jwksObject,
        {
          issuer: "http://localhost:8787/local_oidc",
          audience: "local-anode-client",
        }
      );

      // Verify the new access token has the same user data
      expect(newAccessTokenPayload.sub).toBeDefined();
      expect(newAccessTokenPayload.given_name).toBe("Alice");
      expect(newAccessTokenPayload.family_name).toBe("Wonderland");
      expect(newAccessTokenPayload.email).toBe("alice@wonderland.com");
      expect(newAccessTokenPayload.iss).toBe(
        "http://localhost:8787/local_oidc"
      );
      expect(newAccessTokenPayload.aud).toBe("local-anode-client");

      // Verify the new refresh token
      expect(refreshTokenData.refresh_token).toBeDefined();
      const { payload: newRefreshTokenPayload } = await jose.jwtVerify(
        refreshTokenData.refresh_token!,
        jwksObject,
        {
          issuer: "http://localhost:8787/local_oidc",
          audience: "local-anode-client",
        }
      );

      // Verify the new refresh token has the same user data
      expect(newRefreshTokenPayload.sub).toBe(newAccessTokenPayload.sub);
      expect(newRefreshTokenPayload.given_name).toBe("Alice");
      expect(newRefreshTokenPayload.family_name).toBe("Wonderland");
      expect(newRefreshTokenPayload.email).toBe("alice@wonderland.com");
      expect(newRefreshTokenPayload.iss).toBe(
        "http://localhost:8787/local_oidc"
      );
      expect(newRefreshTokenPayload.aud).toBe("local-anode-client");

      expect(refreshTokenData.id_token).toBe(refreshTokenData.access_token);
    });

    it("should reject invalid refresh tokens", async () => {
      const formData = new FormData();
      formData.append("grant_type", "refresh_token");
      formData.append("client_id", "local-anode-client");
      formData.append("refresh_token", "invalid.refresh.token");

      const refreshRequest = new Request(
        "http://localhost:8787/local_oidc/token",
        {
          method: "POST",
          body: formData,
        }
      );

      const refreshResponse = await handleOidcRequest(refreshRequest, mockEnv);
      expect(refreshResponse.status).toBe(400);
      expect(await refreshResponse.text()).toBe("Invalid refresh token");
    });

    it("should reject missing refresh token parameter", async () => {
      const formData = new FormData();
      formData.append("grant_type", "refresh_token");
      formData.append("client_id", "local-anode-client");
      // Missing refresh_token parameter

      const refreshRequest = new Request(
        "http://localhost:8787/local_oidc/token",
        {
          method: "POST",
          body: formData,
        }
      );

      const refreshResponse = await handleOidcRequest(refreshRequest, mockEnv);
      expect(refreshResponse.status).toBe(400);
      expect(await refreshResponse.text()).toBe(
        "Missing refresh_token parameter"
      );
    });
  });
});
