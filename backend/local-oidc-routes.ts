import { Hono } from "hono";
import { type Env } from "./types.ts";
import * as jose from "jose";
import { v5 as uuidv5 } from "uuid";
import { getPassport, parseToken } from "./auth.ts";

export interface OpenIdConfiguration {
  issuer: string;
  authorization_endpoint: string;
  jwks_uri: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
  scopes_supported: string[];
  response_types_supported: string[];
  token_endpoint_auth_methods_supported: string[];
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
}

interface JWK {
  kty: string;
  use: string;
  kid: string;
  n: string;
  e: string;
}

interface JWKS {
  keys: JWK[];
}

// Helper functions ported from original local_oidc.ts
export async function generatePEM(): Promise<string> {
  // Use jose library to generate a key that can be exported as JWK
  const { privateKey } = await jose.generateKeyPair("RS256", {
    extractable: true,
  });

  // Export as PKCS8 PEM
  const pem = await jose.exportPKCS8(privateKey);
  return pem;
}

export async function ensurePEM(env: Env): Promise<string> {
  // Check if a PEM already exists in the database
  const existing = await env.DB.prepare(
    `
    SELECT value FROM settings WHERE key = 'local_oidc_pem'
  `
  ).first<{ value: string }>();

  if (existing) {
    return existing.value;
  }

  console.log("Generating new PEM");

  // Generate a new PEM if none exists
  const privateKey = await generatePEM();

  const result = await env.DB.prepare(
    `
    INSERT INTO settings (key, value)
    VALUES ('local_oidc_pem', ?)
    ON CONFLICT(key) DO NOTHING
    RETURNING value
  `
  )
    .bind(privateKey)
    .first<{ value: string }>();

  if (!result) {
    // If there was a conflict, then nothing is returned, so we need to query again
    const existing = await env.DB.prepare(
      `
      SELECT value FROM settings WHERE key = 'local_oidc_pem'
    `
    ).first<{ value: string }>();
    if (!existing) {
      throw new Error("Failed to generate PEM");
    }
    return existing.value;
  }

  return result.value;
}

function getBaseUrl(url: string): string {
  const urlObj = new URL(url);
  return `${urlObj.protocol}//${urlObj.host}`;
}

function generateOpenIdConfiguration(
  baseUrl: string,
  env: Env
): OpenIdConfiguration {
  return {
    issuer: `${baseUrl}/local_oidc`,
    authorization_endpoint:
      env.LOCAL_OIDC_AUTHORIZATION_ENDPOINT ??
      "http://localhost:5173/local_oidc/authorize",
    jwks_uri: `${baseUrl}/local_oidc/.well-known/jwks.json`,
    token_endpoint: `${baseUrl}/local_oidc/token`,
    userinfo_endpoint: `${baseUrl}/local_oidc/userinfo`,
    end_session_endpoint: `${baseUrl}/local_oidc/logout`,
    scopes_supported: ["profile", "email", "openid"],
    response_types_supported: ["code"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
  };
}

function getUserId(userData: UserData): string {
  // We want the userId to always be the same for a given email
  const nullNamespace = "00000000-0000-0000-0000-000000000000";
  return uuidv5(userData.email.toLowerCase(), nullNamespace);
}

async function generateTokens(
  userData: UserData,
  env: Env
): Promise<{
  access_token: string;
  token_type: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  scope: string;
}> {
  const pem = await ensurePEM(env);
  const privateKey = await jose.importPKCS8(pem, "RS256", {
    extractable: true,
  });
  const userId = getUserId(userData);
  const now = Math.floor(Date.now() / 1000);

  const basePayload = {
    sub: userId,
    given_name: userData.firstName,
    family_name: userData.lastName,
    email: userData.email,
    iss: env.AUTH_ISSUER,
    aud: "local-anode-client",
    iat: now,
  };

  const accessTokenPayload = {
    ...basePayload,
    exp: now + 5 * 60, // 5 minutes
  };

  // Use a new timestamp for refresh token to ensure it's different
  const refreshNow = Math.floor(Date.now() / 1000);
  const refreshTokenPayload = {
    ...basePayload,
    iat: refreshNow,
    exp: refreshNow + 365 * 24 * 60 * 60, // 1 year
  };

  const accessToken = await new jose.SignJWT(accessTokenPayload)
    .setProtectedHeader({ alg: "RS256", kid: "1" })
    .sign(privateKey);

  const refreshToken = await new jose.SignJWT(refreshTokenPayload)
    .setProtectedHeader({ alg: "RS256", kid: "1" })
    .sign(privateKey);

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 300,
    refresh_token: refreshToken,
    id_token: accessToken,
    scope: "openid profile email",
  };
}

async function getJwks(env: Env): Promise<JWKS> {
  const pem = await ensurePEM(env);
  const privateKey = await jose.importPKCS8(pem, "RS256", {
    extractable: true,
  });

  const publicKey = await jose.exportJWK(privateKey);

  const jwk: JWK = {
    kty: publicKey.kty!,
    use: "sig",
    kid: "1",
    n: publicKey.n!,
    e: publicKey.e!,
  };

  return {
    keys: [jwk],
  };
}

// Create Hono app for local OIDC routes
const localOidcRoutes = new Hono<{ Bindings: Env }>();

// OpenID Connect Configuration endpoint
localOidcRoutes.get("/.well-known/openid-configuration", (c) => {
  const baseUrl = getBaseUrl(c.req.url);
  const config = generateOpenIdConfiguration(baseUrl, c.env);

  return c.json(config, 200, {
    "Content-Type": "application/json",
  });
});

// JSON Web Key Set endpoint
localOidcRoutes.get("/.well-known/jwks.json", async (c) => {
  try {
    const jwks = await getJwks(c.env);

    return c.json(jwks, 200, {
      "Content-Type": "application/json",
    });
  } catch (error) {
    console.error("Error generating JWKS:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Token endpoint - handles authorization code and refresh token flows
localOidcRoutes.post("/token", async (c) => {
  try {
    // Parse form data instead of URL search params
    const formData = await c.req.formData();
    const clientId = formData.get("client_id") as string;
    const redirectUri = formData.get("redirect_uri") as string;
    const code = formData.get("code") as string;
    const grantType = formData.get("grant_type") as string;
    const refreshToken = formData.get("refresh_token") as string;

    if (clientId !== "local-anode-client") {
      console.log("Invalid client_id", clientId);
      return c.text("Invalid client_id", 400);
    }

    if (grantType === "authorization_code") {
      if (!redirectUri || !redirectUri.startsWith("http://localhost")) {
        console.log("Invalid redirect_uri", redirectUri);
        return c.text("Invalid redirect_uri", 400);
      }

      if (!code) {
        console.log("Missing code parameter", code);
        return c.text("Missing code parameter", 400);
      }

      let userData: UserData;
      try {
        const decodedCode = atob(code);
        userData = JSON.parse(decodedCode) as UserData;

        if (!userData.firstName || !userData.lastName || !userData.email) {
          console.log("Invalid code: missing required fields", userData);
          return c.text("Invalid code: missing required fields", 400);
        }
      } catch {
        console.log("Invalid code: not a valid BASE64 encoded JSON", code);
        return c.text("Invalid code: not a valid BASE64 encoded JSON", 400);
      }

      try {
        const tokens = await generateTokens(userData, c.env);
        return c.json(tokens);
      } catch (error) {
        console.error("Error creating tokens:", error);
        return c.text("Internal Server Error", 500);
      }
    } else if (grantType === "refresh_token") {
      if (!refreshToken) {
        console.log("Missing refresh_token parameter");
        return c.text("Missing refresh_token parameter", 400);
      }

      try {
        // Verify the refresh token using the public key
        const { user } = await parseToken(refreshToken, c.env);

        const { givenName, familyName, email } = user;

        // Generate new tokens
        const tokens = await generateTokens(
          {
            firstName: givenName ?? "",
            lastName: familyName ?? "",
            email: email ?? "",
          },
          c.env
        );

        return c.json(tokens);
      } catch (error) {
        console.error("Error verifying refresh token:", error);
        return c.text("Invalid refresh token", 400);
      }
    } else {
      console.log("Invalid grant_type", grantType);
      return c.text("Invalid grant_type", 400);
    }
  } catch (error) {
    console.error("Error in token endpoint:", error);
    return c.text("Internal Server Error", 500);
  }
});

// User info endpoint
localOidcRoutes.get("/userinfo", async (c) => {
  let jwt: jose.JWTPayload;
  try {
    const request = c.req.raw as any; // Type compatibility with existing auth functions
    const parsed = await getPassport(request, c.env);
    jwt = parsed.jwt;
  } catch (error) {
    console.error("Error verifying access token:", error);
    return c.json({ error: "Invalid access token" }, 401, {
      "WWW-Authenticate": "Bearer",
    });
  }

  return c.json(jwt);
});

export default localOidcRoutes;
