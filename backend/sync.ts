import { makeDurableObject, makeWorker } from "@livestore/sync-cf/cf-worker";

import { Env } from "./types";

import { validateAuthPayload, validateProductionEnvironment } from "./auth";
import { 
  initializePermissionsTable, 
  checkNotebookPermission, 
  createNotebookWithOwnership 
} from "./permissions";

export class WebSocketServer extends makeDurableObject({
  onPush: async (message) => {
    console.log("onPush", message.batch);
  },
  onPull: async (message) => {
    console.log("onPull", message);
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
      console.log("🚀 Routing to LiveStore worker:", {
        isWebSocket: request.headers.get("upgrade") === "websocket",
        pathname: url.pathname,
        searchParams: url.searchParams.toString(),
      });

      const worker = makeWorker({
        validatePayload: async (payload: any) => {
          console.log("🔐 Validating payload:", {
            hasAuthToken: !!payload?.authToken,
            isRuntime: payload?.runtime === true,
            clientId: payload?.clientId,
          });

          try {
            // Step 1: Authenticate the user token
            const validatedUser = await validateAuthPayload(payload, env);

            // Step 2: Extract notebook ID from request URL
            const notebookId = url.searchParams.get("notebook") || url.searchParams.get("storeId") || "default-notebook";
            
            // Step 3: Initialize permissions table if not exists
            await initializePermissionsTable(env.DB);

            // Step 4: Check notebook permissions (skip for runtime agents)
            if (validatedUser.id !== "runtime-agent") {
              const userPermission = await checkNotebookPermission(env.DB, notebookId, validatedUser.id);
              
              if (userPermission === 'none') {
                // Check if this is a new notebook being created
                // New notebooks start with 'notebook-' and are generated in store-id.ts
                const isNewNotebook = notebookId.startsWith('notebook-') && notebookId.includes('-');
                
                if (isNewNotebook) {
                  // For new notebooks, auto-grant ownership to authenticated users
                  console.log("🆕 Creating new notebook with ownership:", { notebookId, userId: validatedUser.id });
                  const granted = await createNotebookWithOwnership(env.DB, notebookId, validatedUser.id);
                  if (!granted) {
                    throw new Error(
                      `PERMISSION_DENIED: Failed to create ownership for new notebook '${notebookId}'.`
                    );
                  }
                } else {
                  // No permission to access existing notebook
                  console.error("🚫 Access denied to notebook:", { notebookId, userId: validatedUser.id });
                  throw new Error(
                    `PERMISSION_DENIED: User '${validatedUser.id}' does not have access to notebook '${notebookId}'.`
                  );
                }
              } else {
                console.log("✅ Notebook access granted:", { 
                  notebookId, 
                  userId: validatedUser.id, 
                  permission: userPermission 
                });
              }
            } else {
              console.log("🤖 Runtime agent - skipping permission check for notebook:", notebookId);
            }

            // Step 5: Validate the client ID against the authenticated user
            const clientId = payload?.clientId;
            if (!clientId) {
              throw new Error(
                "CLIENT_ID_MISSING: No clientId provided in syncPayload."
              );
            }

            // For runtime agents, prevent user impersonation
            if (validatedUser.id === "runtime-agent") {
              // A runtime agent's clientId should NOT look like a real user's ID.
              // Google user IDs are numeric strings.
              if (/^\d+$/.test(clientId)) {
                console.error(
                  "🚫 Runtime agent attempting to use a user-like clientId:",
                  { clientId }
                );
                throw new Error(
                  `RUNTIME_IMPERSONATION_ATTEMPT: Runtime agent cannot use a numeric clientId ('${clientId}') that could be a user ID.`
                );
              }
            } else {
              // For regular users, the clientId must match their user ID
              if (clientId !== validatedUser.id) {
                // For anonymous/local-dev users, we allow a generic clientId
                if (
                  validatedUser.isAnonymous &&
                  clientId === "anonymous-user"
                ) {
                  // This is an acceptable state for anonymous users
                } else {
                  console.error("🚫 ClientId attribution mismatch:", {
                    payloadClientId: clientId,
                    authenticatedUserId: validatedUser.id,
                  });
                  throw new Error(
                    `CLIENT_ID_MISMATCH: Provided clientId '${clientId}' does not match authenticated user '${validatedUser.id}'.`
                  );
                }
              }
            }

            // SECURITY NOTE: This validation only occurs at connection time.
            // The current version of `@livestore/sync-cf` does not provide a mechanism
            // to verify that the `clientId` on incoming events matches the `clientId`
            // that was validated with this initial connection payload. A malicious
            // client could pass this check and then send events with a different clientId.

            console.log("✅ Payload validation successful:", {
              userId: validatedUser.id,
              clientId: clientId,
              isAnonymous: validatedUser.isAnonymous,
              email: validatedUser.email,
            });
          } catch (error: any) {
            console.error("🚫 Authentication failed:", error.message);
            throw error; // Reject the WebSocket connection
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
