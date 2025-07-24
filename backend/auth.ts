import { jwtVerify, createRemoteJWKSet } from "jose";
import type { JWTPayload } from "jose";
import { Env } from "./types";


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
  if (env.DEPLOYMENT_ENV === "production") {
    if (!env.AUTH_ISSUER) {
      throw new Error(
        "STARTUP_ERROR: AUTH_ISSUER is required when DEPLOYMENT_ENV is production"
      );
    }
    console.log("✅ Production environment validation passed");
  } else {
    if (env.AUTH_ISSUER) {
      console.log("✅ Development environment passed using JWT validation");
    } else if (env.AUTH_TOKEN) {
      console.log("✅ Development environment passed using AUTH_TOKEN");
    } else {
      throw new Error(
        "STARTUP_ERROR: AUTH_ISSUER or AUTH_TOKEN must be set when DEPLOYMENT_ENV is development"
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
  const JWKS = createRemoteJWKSet(new URL(`${env.AUTH_ISSUER}/.well-known/jwks.json`));

  let jwt: JWTPayload;
  try {
    const resp = await jwtVerify(payload.authToken, JWKS, {
      algorithms: ['RS256'],
      issuer: env.AUTH_ISSUER,
    });
    jwt = resp.payload;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`VALIDATE_JWT_ERROR: ${errorMessage}`);
  }

  const { sub } = jwt;
  if (!(typeof sub === "string")) {
    throw new Error("INVALID_JWT_TOKEN: JWT missing sub claim");
  }

  const email = typeof jwt.email === "string" ? jwt.email : undefined;
  const name = getDisplayName(jwt);

  const user: ValidatedUser = {
    id: sub,
    email,
    name,
    isAnonymous: false,
  };
  console.log("🔑 Validated user", user);
  return user;
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

const getDisplayName = (jwt: JWTPayload): string => {
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
    name = "Unnamed User"
  }

  return name;
};
