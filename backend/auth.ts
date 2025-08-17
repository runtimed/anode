import * as jose from "jose";
import { type Env, type WorkerRequest } from "./types";
import type { D1Database } from "@cloudflare/workers-types";
import { createApiKeyProvider } from "./providers/api-key-factory.ts";
import { createProviderContext } from "./api-key-provider.ts";

export type ValidatedUser = {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  isAnonymous: boolean;
};

export type Passport = {
  jwt: jose.JWTPayload;
  user: ValidatedUser;
};

interface AuthPayload {
  authToken: string;
  runtime?: boolean;
}

export function extractBearerToken(request: WorkerRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

export function getPassport(
  request: WorkerRequest,
  env: Env,
  verify?: jose.JWTVerifyOptions
): Promise<Passport> {
  const token = extractBearerToken(request);
  if (!token) {
    throw new jose.errors.JWTInvalid("Missing Authorization header");
  }
  return parseToken(token, env, verify);
}

export async function parseToken(
  token: string,
  env: Env,
  verify?: jose.JWTVerifyOptions
): Promise<Passport> {
  const decoded = jose.decodeJwt(token);
  if (decoded.iss !== env.AUTH_ISSUER) {
    throw new jose.errors.JWTInvalid("Invalid issuer");
  }
  const jwks = jose.createRemoteJWKSet(
    new URL(`${env.AUTH_ISSUER}/.well-known/jwks.json`),
    { [jose.customFetch]: env.customFetch }
  );
  const { payload: jwt } = await jose.jwtVerify(token, jwks, {
    algorithms: ["RS256"],
    issuer: env.AUTH_ISSUER,
    ...verify,
  });
  const { sub, email } = jwt;
  if (!(typeof sub === "string") || !sub) {
    throw new jose.errors.JWTInvalid("Invalid sub claim");
  }

  if (!(typeof email === "string") || !sub) {
    throw new jose.errors.JWTInvalid("Invalid email claim");
  }

  const name = getDisplayName(jwt);
  const givenName =
    typeof jwt.given_name === "string" ? jwt.given_name : undefined;
  const familyName =
    typeof jwt.family_name === "string" ? jwt.family_name : undefined;

  const user: ValidatedUser = {
    id: sub,
    email,
    name,
    givenName,
    familyName,
    isAnonymous: false,
  };
  return { jwt, user };
}

export async function validateAuthPayload(
  payload: AuthPayload,
  env: Env
): Promise<ValidatedUser> {
  const user = await validateOAuthToken(payload, env);
  // Upsert user to registry for all endpoints (GraphQL, LiveStore, REST, etc.)
  if (!user.isAnonymous && env.DB) {
    await upsertUser(env.DB, user);
  }

  return user;
}

async function validateOAuthToken(
  payload: AuthPayload,
  env: Env
): Promise<ValidatedUser> {
  const { user } = await parseToken(payload.authToken, env);
  return user;
}

const getDisplayName = (jwt: jose.JWTPayload): string => {
  if (typeof jwt.name === "string") {
    return jwt.name;
  }

  let name: string = "";
  if (typeof jwt.given_name === "string") {
    name = jwt.given_name;
  }

  if (typeof jwt.family_name === "string") {
    if (name) {
      name += " ";
    }
    name += jwt.family_name;
  }

  if (!name && typeof jwt.email === "string") {
    name = jwt.email;
  }

  if (!name) {
    name = "Unnamed User";
  }

  return name;
};

/**
 * Upsert a user record from authentication data
 * Updates existing users or creates new ones
 */
async function upsertUser(db: D1Database, user: ValidatedUser): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Check if user exists
    const existing = await db
      .prepare("SELECT id, first_seen_at FROM users WHERE id = ?")
      .bind(user.id)
      .first<{ id: string; first_seen_at: string }>();

    if (existing) {
      // Update existing user
      const updates: string[] = [];
      const bindings: unknown[] = [];

      // Always update email (in case it changed)
      updates.push("email = ?");
      bindings.push(user.email);

      if (user.givenName) {
        updates.push("given_name = ?");
        bindings.push(user.givenName);
      }

      if (user.familyName) {
        updates.push("family_name = ?");
        bindings.push(user.familyName);
      }

      updates.push("last_seen_at = ?", "updated_at = ?");
      bindings.push(now, now, user.id);

      await db
        .prepare(
          `
          UPDATE users
          SET ${updates.join(", ")}
          WHERE id = ?
        `
        )
        .bind(...bindings)
        .run();
    } else {
      // Create new user
      await db
        .prepare(
          `
          INSERT INTO users (
            id, email, given_name, family_name,
            first_seen_at, last_seen_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        )
        .bind(
          user.id,
          user.email,
          user.givenName || null,
          user.familyName || null,
          now,
          now,
          now
        )
        .run();
    }
  } catch (error) {
    console.error("Failed to upsert user:", {
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Don't throw - authentication should still succeed even if user registry fails
  }
}

/**
 * Extract auth token from various request sources
 * Supports both Authorization: Bearer and X-Auth-Token headers
 */
export function extractAuthToken(request: Request): string | null {
  // Try Authorization: Bearer first
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }

  return null;
}

/**
 * Centralized user validation supporting both API keys and OIDC tokens
 * Returns ValidatedUser on success, null on failure (no throwing)
 */
export async function getValidatedUser(
  authToken: string | null,
  env: Env
): Promise<ValidatedUser | null> {
  if (!authToken) {
    return null;
  }

  try {
    // Try API key authentication first
    const apiKeyProvider = createApiKeyProvider(env);
    const providerContext = createProviderContext(env, authToken);

    if (apiKeyProvider.isApiKey(providerContext)) {
      const passport = await apiKeyProvider.validateApiKey(providerContext);
      return passport.user;
    }

    // Fallback to OIDC/service token validation
    return await validateAuthPayload({ authToken }, env);
  } catch (error) {
    // Auth failed - return null instead of throwing
    console.debug(
      "Auth validation failed:",
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Extract and validate user in one step
 * Convenience function combining extractAuthToken + getValidatedUser
 */
export async function extractAndValidateUser(
  request: Request,
  env: Env
): Promise<ValidatedUser | null> {
  const authToken = extractAuthToken(request);
  return await getValidatedUser(authToken, env);
}
