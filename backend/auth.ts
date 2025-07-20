// Validate production environment requirements at startup
export function validateProductionEnvironment(env: any): void {
  if (env.DEPLOYMENT_ENV === "production") {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error(
        "STARTUP_ERROR: GOOGLE_CLIENT_ID is required when DEPLOYMENT_ENV is production"
      );
    }
    if (!env.GOOGLE_CLIENT_SECRET) {
      console.warn(
        "⚠️ GOOGLE_CLIENT_SECRET not set in production - Google OAuth validation may be limited"
      );
    }
    console.log("✅ Production environment validation passed");
  }
}

interface AuthPayload {
  authToken: string;
  runtime?: boolean;
}

export interface ValidatedUser {
  id: string;
  email?: string;
  name?: string;
  isAnonymous: boolean;
}

interface GoogleJWTPayload {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  exp: number;
  iat: number;
}

// Validate Google ID token using Google's tokeninfo endpoint
async function validateGoogleToken(
  token: string,
  clientId: string
): Promise<GoogleJWTPayload | null> {
  try {
    // Use Google's tokeninfo endpoint to validate the token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    );

    if (!response.ok) {
      console.error(
        "Token validation failed:",
        response.status,
        response.statusText
      );
      return null;
    }

    const tokenInfo = (await response.json()) as GoogleJWTPayload;

    // Validate the audience (client ID)
    if (tokenInfo.aud !== clientId) {
      console.error("Invalid audience:", tokenInfo.aud, "expected:", clientId);
      return null;
    }

    // Validate the issuer
    if (
      tokenInfo.iss !== "https://accounts.google.com" &&
      tokenInfo.iss !== "accounts.google.com"
    ) {
      console.error("Invalid issuer:", tokenInfo.iss);
      return null;
    }

    // Check expiration (Google's endpoint already validates this, but double-check)
    const now = Math.floor(Date.now() / 1000);
    if (tokenInfo.exp < now) {
      const expirationTime = new Date(tokenInfo.exp * 1000).toISOString();
      const currentTime = new Date(now * 1000).toISOString();
      console.error(
        `Token expired at ${expirationTime}, current time: ${currentTime}`
      );
      return null;
    }

    return tokenInfo;
  } catch (error) {
    console.error("Google token validation failed:", error);
    return null;
  }
}

export async function validateAuthPayload(
  payload: AuthPayload,
  env: any
): Promise<ValidatedUser> {
  console.log("🔐 Starting auth validation:", {
    hasPayload: !!payload,
    hasAuthToken: !!payload?.authToken,
    isRuntime: payload?.runtime === true,
    hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
    hasEnvAuthToken: !!env.AUTH_TOKEN,
  });

  if (!payload?.authToken) {
    console.error("❌ Missing auth token in payload");
    throw new Error(
      "MISSING_AUTH_TOKEN: No authentication token provided. Please sign in to continue."
    );
  }

  const token = payload.authToken;
  console.log("🎫 Token info:", {
    tokenLength: token.length,
    tokenStart: token.substring(0, 10) + "...",
    isJWT: token.startsWith("eyJ"),
  });

  // For runtime agents, always allow service token authentication
  if (payload.runtime === true) {
    console.log("🤖 Validating runtime agent token");
    if (env.AUTH_TOKEN && token === env.AUTH_TOKEN) {
      console.log("✅ Authenticated runtime agent with service token");
      return {
        id: "runtime-agent",
        name: "Runtime Agent",
        isAnonymous: false,
      };
    }
    // If runtime auth fails, we don't proceed to other methods for this payload type.
    console.error("❌ Invalid service token for runtime agent");
    throw new Error(
      "INVALID_SERVICE_TOKEN: Runtime agent authentication failed. Check AUTH_TOKEN configuration."
    );
  }

  // For regular users, try Google OAuth first if enabled
  if (env.GOOGLE_CLIENT_ID) {
    console.log("🔍 Attempting Google OAuth validation");
    const googlePayload = await validateGoogleToken(
      token,
      env.GOOGLE_CLIENT_ID
    );
    if (googlePayload) {
      // Google token is valid - return validated user info
      console.log(
        "✅ Authenticated user via Google OAuth:",
        googlePayload.email
      );
      return {
        id: googlePayload.sub,
        email: googlePayload.email,
        name: googlePayload.name,
        isAnonymous: false,
      };
    }
    console.log("⚠️ Google OAuth validation failed, trying fallback");
  }

  // Fallback to simple token validation (for local development)
  if (env.AUTH_TOKEN && token === env.AUTH_TOKEN) {
    console.log("✅ Authenticated with fallback token");
    return {
      id: "local-dev-user",
      email: "local@example.com",
      name: "Local Development User",
      isAnonymous: true,
    };
  }

  console.error("❌ All authentication methods failed");

  // Provide specific error based on token type
  if (token.startsWith("eyJ")) {
    throw new Error(
      "GOOGLE_TOKEN_INVALID: Google authentication token expired or invalid. Please refresh the page to sign in again."
    );
  } else {
    throw new Error(
      "INVALID_AUTH_TOKEN: Authentication failed. Please check your credentials and try again."
    );
  }
}

/**
 * Event user ID validation functions
 *
 * Note: These functions are provided for application-level validation since LiveStore
 * doesn't support event-level validation hooks at the worker level. Applications should
 * validate user IDs in events at the component level before committing them to the store.
 *
 * For maximum security in production:
 * 1. Frontend components should only use the authenticated user ID from useCurrentUser()
 * 2. Backend materializers can optionally validate user IDs if needed
 * 3. Runtime agents are trusted and can act on behalf of any user
 */

// Event user ID validation function
export function validateEventUserId(
  eventUserId: string,
  validatedUser: ValidatedUser
): boolean {
  // For runtime agents, allow any user ID (they can act on behalf of any user)
  if (validatedUser.id === "runtime-agent") {
    return true;
  }

  // For authenticated users, ensure the event user ID matches their validated ID
  if (!validatedUser.isAnonymous) {
    return eventUserId === validatedUser.id;
  }

  // For anonymous/local dev users, allow the local dev user ID or session IDs
  if (validatedUser.isAnonymous) {
    return (
      eventUserId === validatedUser.id ||
      eventUserId.startsWith("session-") ||
      eventUserId.startsWith("client-")
    );
  }

  return false;
}

// Extract user IDs from common event types for validation
export function extractUserIdFromEvent(event: any): string | null {
  // Common user ID fields in events
  const userIdFields = [
    "createdBy",
    "modifiedBy",
    "requestedBy",
    "cancelledBy",
    "clearedBy",
    "changedBy",
  ];

  for (const field of userIdFields) {
    if (event[field] && typeof event[field] === "string") {
      return event[field];
    }
  }

  return null;
}
