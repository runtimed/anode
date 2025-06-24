import { makeDurableObject, makeWorker } from "@livestore/sync-cf/cf-worker";

// Validate production environment requirements at startup
function validateProductionEnvironment(env: any): void {
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

async function validateAuthPayload(
  payload: AuthPayload & { kernel?: boolean },
  env: any
): Promise<void> {
  console.log("🔐 Starting auth validation:", {
    hasPayload: !!payload,
    hasAuthToken: !!payload?.authToken,
    isKernel: payload?.kernel === true,
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
  if (payload.kernel === true) {
    console.log("🤖 Validating runtime agent token");
    if (env.AUTH_TOKEN && token === env.AUTH_TOKEN) {
      console.log("✅ Authenticated runtime agent with service token");
      return;
    }
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
      // Google token is valid
      console.log(
        "✅ Authenticated user via Google OAuth:",
        googlePayload.email
      );
      return;
    }
    console.log("⚠️ Google OAuth validation failed, trying fallback");
  }

  // Fallback to simple token validation (for local development)
  if (env.AUTH_TOKEN && token === env.AUTH_TOKEN) {
    console.log("✅ Authenticated with fallback token");
    return;
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

export class WebSocketServer extends makeDurableObject({
  onPush: async (message) => {
    console.log("onPush", message.batch);
  },
  onPull: async (message) => {
    console.log("onPull", message);
  },
}) {}

export default {
  fetch: async (request: Request, env: any, ctx: ExecutionContext) => {
    // Validate environment on first request
    try {
      validateProductionEnvironment(env);
    } catch (error: any) {
      console.error("💥 Startup validation failed:", error.message);
      return new Response(
        JSON.stringify({
          error: "STARTUP_VALIDATION_FAILED",
          message: error.message,
          deployment_env: env.DEPLOYMENT_ENV,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const url = new URL(request.url);

    console.log("🔍 Worker request received:", {
      method: request.method,
      url: request.url,
      pathname: url.pathname,
      origin: request.headers.get("origin"),
      upgrade: request.headers.get("upgrade"),
      userAgent: request.headers.get("user-agent"),
      timestamp: new Date().toISOString(),
    });

    // Handle health endpoint
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          deployment_env: env.DEPLOYMENT_ENV || "development",
          timestamp: new Date().toISOString(),
          config: {
            has_google_client_id: !!env.GOOGLE_CLIENT_ID,
            has_google_client_secret: !!env.GOOGLE_CLIENT_SECRET,
            has_auth_token: !!env.AUTH_TOKEN,
            google_client_id_partial: env.GOOGLE_CLIENT_ID
              ? env.GOOGLE_CLIENT_ID.substring(0, 20) + "..."
              : null,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
          },
        }
      );
    }

    // Handle CORS preflight for all requests
    if (request.method === "OPTIONS") {
      console.log("✅ Handling CORS preflight request");
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Handle API routes (WebSocket and LiveStore sync)
    if (
      url.pathname.startsWith("/api/") ||
      request.headers.get("upgrade") === "websocket"
    ) {
      console.log("🚀 Routing to LiveStore worker:", {
        isWebSocket: request.headers.get("upgrade") === "websocket",
        pathname: url.pathname,
        searchParams: url.searchParams.toString(),
      });

      const worker = makeWorker({
        validatePayload: async (payload: any) => {
          console.log("🔐 Validating payload:", {
            hasAuthToken: !!payload?.authToken,
            authTokenLength: payload?.authToken?.length || 0,
            isKernel: payload?.kernel === true,
          });
          try {
            await validateAuthPayload(payload, env);
            console.log("✅ Payload validation successful");
          } catch (error: any) {
            console.error("🚫 Authentication failed:", error.message);
            throw error;
          }
        },
        enableCORS: true,
      });

      try {
        const response = await worker.fetch(request, env, ctx);
        console.log("📤 LiveStore worker response:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        // Don't modify headers for WebSocket upgrade responses (status 101)
        // The headers are immutable after protocol switch
        if (response.status !== 101) {
          // Add CORS headers to non-WebSocket responses
          response.headers.set("Access-Control-Allow-Origin", "*");
          response.headers.set(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS"
          );
          response.headers.set("Access-Control-Allow-Headers", "*");
        }

        return response;
      } catch (error) {
        console.error("❌ Error in LiveStore worker:", error);
        throw error;
      }
    }

    // Handle debug endpoints
    if (url.pathname === "/debug/auth" && request.method === "POST") {
      console.log("🔧 Debug auth endpoint called");
      try {
        const body = (await request.json()) as { authToken?: string };
        const authToken = body.authToken;

        if (!authToken) {
          return new Response(
            JSON.stringify({
              error: "MISSING_AUTH_TOKEN",
              message: "No authToken provided in request body",
              timestamp: new Date().toISOString(),
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods":
                  "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
              },
            }
          );
        }

        // Test authentication
        try {
          await validateAuthPayload({ authToken }, env);
          return new Response(
            JSON.stringify({
              success: true,
              message: "Authentication successful",
              tokenType: authToken.startsWith("eyJ")
                ? "Google JWT"
                : "Service Token",
              timestamp: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods":
                  "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
              },
            }
          );
        } catch (authError: any) {
          return new Response(
            JSON.stringify({
              error: "AUTHENTICATION_FAILED",
              message: authError.message,
              tokenType: authToken.startsWith("eyJ")
                ? "Google JWT"
                : "Service Token",
              timestamp: new Date().toISOString(),
              hasGoogleClientId: !!env.GOOGLE_CLIENT_ID,
              hasGoogleClientSecret: !!env.GOOGLE_CLIENT_SECRET,
              hasAuthToken: !!env.AUTH_TOKEN,
            }),
            {
              status: 401,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods":
                  "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
              },
            }
          );
        }
      } catch (parseError) {
        return new Response(
          JSON.stringify({
            error: "INVALID_REQUEST",
            message: "Invalid JSON in request body",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
              "Access-Control-Allow-Headers": "*",
            },
          }
        );
      }
    }

    console.log("❌ Request not handled, returning 404:", url.pathname);
    // Return 404 for non-API routes (web client now served by Pages)
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  },
};
