import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { JWTPayload, decodeJwt } from "jose";
import { Env } from "./types";

export type ValidatedUser = {
  id: string;
  email?: string;
  name?: string;
  isAnonymous: boolean;
};

interface AuthPayload {
  authToken: string;
  runtime?: boolean;
}

export function validateProductionEnvironment(env: Env): void {
  if (env.DEPLOYMENT_ENV === "production") {
    if (env.ALLOW_LOCAL_AUTH === "true") {
      throw new Error(
        "STARTUP_ERROR: ALLOW_LOCAL_AUTH cannot be enabled in production environments"
      );
    }
    if (!env.AUTH_ISSUER) {
      throw new Error(
        "STARTUP_ERROR: AUTH_ISSUER is required when DEPLOYMENT_ENV is production"
      );
    }
    console.log("✅ Production environment validation passed");
  } else {
    if (env.AUTH_ISSUER) {
      console.log("✅ Development environment passed using JWT validation");
    } else if (env.AUTH_TOKEN && env.AUTH_TOKEN.length > 0) {
      console.log("✅ Development environment passed using AUTH_TOKEN");
    } else {
      throw new Error(
        "STARTUP_ERROR: AUTH_ISSUER or AUTH_TOKEN must be set when DEPLOYMENT_ENV is development"
      );
    }
  }
}

export function determineAuthType(
  payload: AuthPayload,
  env: Env
): "access_token" | "auth_token" {
  try {
    decodeJwt(payload.authToken);
    return "access_token";
  } catch {
    // Not a valid JWT, try auth token
  }
  const allowAuthToken =
    env.AUTH_TOKEN && (payload.runtime || env.DEPLOYMENT_ENV !== "production");
  if (!allowAuthToken) {
    throw new Error("INVALID_AUTH_TOKEN: Unknown authorization method");
  }
  return "auth_token";
}

export async function validateAuthPayload(
  payload: AuthPayload,
  env: Env
): Promise<ValidatedUser> {
  const authType = determineAuthType(payload, env);
  if (authType === "access_token") {
    return await validateOAuthToken(payload, env);
  }
  return validateHardcodedAuthToken(payload, env);
}

async function validateHardcodedAuthToken(
  payload: AuthPayload,
  env: Env
): Promise<ValidatedUser> {
  // We don't have crypto.subtle.timingSafeEqual available everywere (such as tests)
  // and we need some way of doing constant-time evaluation of secrets
  // Since we are already using jwts elsewhere, we can re-use the crypto algorithms here
  // to do the same thing
  // The algorithm is straightforward: Generate two jwts signed with the two secrets.
  // If we can verify the jwt with both secrets, then the secrets must be the same
  // Or if not the same, then computationally impractical to find a hash collision
  // TL;DR: This function is a very roundabout way of checking if env.AUTH_TOKEN === payload.authToken
  const jwtBuilder = new SignJWT({ sub: "example-user" }).setProtectedHeader({
    alg: "HS256",
  });
  const expectedSecret = new TextEncoder().encode(env.AUTH_TOKEN);
  const actualSecret = new TextEncoder().encode(payload.authToken);
  const jwt = await jwtBuilder.sign(expectedSecret);

  try {
    await jwtVerify(jwt, expectedSecret, {
      algorithms: ["HS256"],
    });
  } catch {
    // This should work because we're just verifying the JWT we just created, with the same secret
    throw new Error(
      "INVALID_AUTH_TOKEN: Unexpected error validating the AUTH_TOKEN"
    );
  }

  try {
    await jwtVerify(jwt, actualSecret, {
      algorithms: ["HS256"],
    });
  } catch {
    throw new Error("INVALID_AUTH_TOKEN: Authentication failed");
  }

  if (payload.runtime) {
    console.log("✅ Authenticated runtime agent with service token");
    return {
      id: "runtime-agent",
      name: "Runtime Agent",
      isAnonymous: false,
    };
  }
  return {
    id: "local-dev-user",
    email: "local@example.com",
    name: "Local Development User",
    isAnonymous: true,
  };
}

async function validateOAuthToken(
  payload: AuthPayload,
  env: Env
): Promise<ValidatedUser> {
  const JWKS = createRemoteJWKSet(
    new URL(`${env.AUTH_ISSUER}/.well-known/jwks.json`)
  );

  let jwt: JWTPayload;
  try {
    const resp = await jwtVerify(payload.authToken, JWKS, {
      algorithms: ["RS256"],
      issuer: env.AUTH_ISSUER,
    });
    jwt = resp.payload;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
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
    name = "Unnamed User";
  }

  return name;
};
