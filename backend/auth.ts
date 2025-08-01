import * as jose from "jose";
import { Env } from "./types";

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

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

export function getPassport(
  request: Request,
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

export function determineAuthType(
  payload: AuthPayload,
  env: Env
): "access_token" | "auth_token" {
  try {
    jose.decodeJwt(payload.authToken);
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
  const jwtBuilder = new jose.SignJWT({
    sub: "example-user",
  }).setProtectedHeader({
    alg: "HS256",
  });
  const expectedSecret = new TextEncoder().encode(env.AUTH_TOKEN);
  const actualSecret = new TextEncoder().encode(payload.authToken);
  const jwt = await jwtBuilder.sign(expectedSecret);

  try {
    await jose.jwtVerify(jwt, expectedSecret, {
      algorithms: ["HS256"],
    });
  } catch {
    // This should work because we're just verifying the JWT we just created, with the same secret
    throw new Error(
      "INVALID_AUTH_TOKEN: Unexpected error validating the AUTH_TOKEN"
    );
  }

  try {
    await jose.jwtVerify(jwt, actualSecret, {
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
      email: "runtime-agent@example.com",
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
