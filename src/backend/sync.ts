import { makeDurableObject, makeWorker } from "@livestore/sync-cf/cf-worker";

import { Env } from "./types";

import { validateAuthPayload, validateProductionEnvironment } from "./auth";

export class WebSocketServer extends makeDurableObject({
  onPush: async (_message) => {
    // Handle push message
  },
  onPull: async (_message) => {
    // Handle pull message
  },
}) {}

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
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
      // Routing to LiveStore worker

      const worker = makeWorker({
        validatePayload: async (payload: any) => {
          console.log("🔐 Validating payload:", {
            hasAuthToken: !!payload?.authToken,
            authTokenLength: payload?.authToken?.length || 0,
            isRuntime: payload?.runtime === true,
          });
          try {
            const validatedUser = await validateAuthPayload(payload, env);
            console.log("✅ Payload validation successful for user:", {
              userId: validatedUser.id,
              isAnonymous: validatedUser.isAnonymous,
              email: validatedUser.email,
            });
          } catch (error: any) {
            console.error("🚫 Authentication failed:", error.message);
            throw error;
          }
        },

        enableCORS: true,
      });

      try {
        const response = await worker.fetch(request, env, ctx);
        // LiveStore worker response received

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
      // Debug auth endpoint called
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

    // Request not handled, returning 404
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
