import { makeDurableObject, makeWorker } from "@livestore/sync-cf/cf-worker";
import {
  workerGlobals,
  type Env,
  type WorkerRequest,
  type WorkerResponse,
  type ExecutionContext,
  type SimpleHandler,
  IncomingRequestCfProperties,
} from "./types";

import { validateAuthPayload, validateProductionEnvironment } from "./auth";
import { createApiKeyProvider } from "./providers/api-key-factory.ts";
import { createProviderContext } from "./api-key-provider.ts";

export class WebSocketServer extends makeDurableObject({
  onPush: async (message) => {
    console.log("onPush", message.batch);
  },
  onPull: async (message) => {
    console.log("onPull", message);
  },
}) {}

const handler: SimpleHandler = {
  fetch: async (
    request: WorkerRequest<unknown, IncomingRequestCfProperties<unknown>>,
    env: Env,
    ctx: ExecutionContext
  ): Promise<WorkerResponse> => {
    // Validate environment on first request
    try {
      validateProductionEnvironment(env);
    } catch (error: any) {
      console.error("💥 Startup validation failed:", error.message);
      return new workerGlobals.Response(
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

    // Handle CORS preflight for all requests
    if (request.method === "OPTIONS") {
      console.log("✅ Handling CORS preflight request");
      return new workerGlobals.Response(null, {
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

      const worker: SimpleHandler = makeWorker({
        validatePayload: async (payload: any) => {
          console.log("🔐 Validating payload:", {
            hasAuthToken: !!payload?.authToken,
            isRuntime: payload?.runtime === true,
            clientId: payload?.clientId,
          });

          try {
            // Step 1: Authenticate the user token
            let validatedUser;

            // First try API key authentication
            try {
              const apiKeyProvider = createApiKeyProvider(env);
              const providerContext = createProviderContext(
                env,
                payload.authToken
              );

              if (apiKeyProvider.isApiKey(providerContext)) {
                // Validate using API key provider
                const passport =
                  await apiKeyProvider.validateApiKey(providerContext);
                validatedUser = passport.user;
                console.log("✅ Authenticated via API key:", {
                  userId: validatedUser.id,
                  email: validatedUser.email,
                });
              } else {
                // Fall back to existing auth logic (OIDC JWT or service token)
                validatedUser = await validateAuthPayload(payload, env);
              }
            } catch {
              // If API key provider fails, try standard auth as fallback
              validatedUser = await validateAuthPayload(payload, env);
            }

            // Step 2: Validate the client ID against the authenticated user
            const clientId = payload?.clientId;
            if (!clientId) {
              throw new Error(
                "CLIENT_ID_MISSING: No clientId provided in syncPayload."
              );
            }

            // For runtime agents, prevent user impersonation
            if (validatedUser.id === "runtime-agent") {
              // A runtime agent's clientId should NOT look like a real user's ID.
              // OIDC user IDs are typically numeric strings.
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
      }) as unknown as SimpleHandler; // This is another problem with the global cloudflare types mismatching. Once this is fixed, we can remove this cast

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

    console.log("❌ Request not handled, returning 404:", url.pathname);
    // Return 404 for non-API routes (web client now served by Pages)
    return new workerGlobals.Response("Not Found", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  },
};

export default handler;
