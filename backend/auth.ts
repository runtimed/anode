// Temporary stubs for OIDC transition - will be replaced with proper OIDC implementation
import { Env } from "./types";
import * as openid from "openid-client";

export interface ValidatedUser {
  id: string;
  email?: string;
  name?: string;
  isAnonymous: boolean;
}

interface AuthPayload {
  authToken: string;
  runtime?: boolean;
}

export function validateProductionEnvironment(env: Env): void {
  if (
    (env.AUTH_CLIENT_ID != null && env.AUTH_URI == null) ||
    (env.AUTH_CLIENT_ID == null && env.AUTH_URI != null)
  ) {
    throw new Error(
      "STARTUP_ERROR: AUTH_CLIENT_ID and AUTH_URI must both be set or both be null"
    );
  }

  if (env.DEPLOYMENT_ENV === "production") {
    if (!env.AUTH_CLIENT_ID) {
      throw new Error(
        "STARTUP_ERROR: AUTH_CLIENT_ID is required when DEPLOYMENT_ENV is production"
      );
    }
    console.log("✅ Production environment validation passed");
  } else {
    if (env.AUTH_CLIENT_ID) {
      console.log("✅ Development environment passed using OAuth");
    } else if (env.AUTH_TOKEN) {
      console.log("✅ Development environment passed using AUTH_TOKEN");
    } else {
      throw new Error(
        "STARTUP_ERROR: AUTH_CLIENT_ID or AUTH_TOKEN must be set when DEPLOYMENT_ENV is development"
      );
    }
  }
}

export async function validateAuthPayload(
  payload: AuthPayload,
  env: Env
): Promise<ValidatedUser> {
  if (env.DEPLOYMENT_ENV !== "production" && env.AUTH_TOKEN) {
    return validateHardcodedAuthToken(payload, env);
  }

  const userEndpoint = await getUserEndpoint(env);
  const headers = { Authorization: `Bearer ${payload.authToken}` };
  const userResponse = await fetch(userEndpoint, { headers });
  if (!userResponse.ok) {
    throw new Error(
      `INVALID_OAUTH_TOKEN: User endpoint returned ${userResponse.status} code`
    );
  }
  let userData: any;
  try {
    userData = await userResponse.json();
  } catch (error) {
    throw new Error("INVALID_OAUTH_TOKEN: User endpoint returned invalid JSON");
  }
  if (!userData.sub) {
    throw new Error("INVALID_OAUTH_TOKEN: User info missing id");
  }
  return {
    id: userData.sub,
    email: userData.email,
    name: userData.name,
    isAnonymous: false,
  };
}

async function getUserEndpoint(env: Env): Promise<string> {
  const url = new URL(env.AUTH_URI);
  const config = await openid.discovery(url, env.AUTH_CLIENT_ID!);
  const endpoint = config.serverMetadata().userinfo_endpoint;
  if (!endpoint) {
    throw new Error("missing_user_endpoint: No endpoint found");
  }
  return endpoint;
}

function validateHardcodedAuthToken(
  payload: AuthPayload,
  env: Env
): ValidatedUser {
  const encoder = new TextEncoder();
  const expected = encoder.encode(env.AUTH_TOKEN);
  const actual = encoder.encode(payload.authToken);
  // @ts-ignore - timingSafeEqual exists in runtime but not in types
  if (crypto.subtle.timingSafeEqual(expected, actual)) {
    return {
      id: "local-dev-user",
      email: "local@example.com",
      name: "Local Development User",
      isAnonymous: true,
    };
  }
  throw new Error("INVALID_AUTH_TOKEN: Authentication failed");
}
