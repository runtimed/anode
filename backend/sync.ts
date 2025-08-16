import {
  makeDurableObject,
  handleWebSocket,
} from "@livestore/sync-cf/cf-worker";
import { type Env, type ExecutionContext } from "./types";

import { getValidatedUser } from "./auth";

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
    const url = new URL(request.url);

    const pathname = url.pathname;

    if (
      !pathname.startsWith("/livestore") &&
      !pathname.startsWith("/websocket")
    ) {
      return new Response("Invalid request", { status: 400 });
    }

    return handleWebSocket(request, env, ctx, {
      validatePayload: async (payload: any) => {
        console.log("🔐 Validating payload:", {
          hasAuthToken: !!payload?.authToken,
          isRuntime: payload?.runtime === true,
          clientId: payload?.clientId,
        });

        try {
          let validatedUser = await getValidatedUser(payload?.authToken, env);

          if (!validatedUser) {
            throw new Error("User must be authenticated");
          }

          // Step 2: Validate the client ID against the authenticated user
          const clientId = payload?.clientId;
          if (!clientId) {
            throw new Error(
              "CLIENT_ID_MISSING: No clientId provided in syncPayload."
            );
          }

          // TODO: Revisit this flow to determine if the runtime agent will have both a
          //       User ID (via their API key) and an identifier for the runtime agent
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
          } else if (payload?.runtime === true) {
            // For API key authenticated runtime agents, allow runtime ID as clientId
            // These are user-attributed runtime agents using their own API keys
            console.log("✅ API key authenticated runtime agent:", {
              userId: validatedUser.id,
              runtimeClientId: clientId,
            });
          } else {
            // For regular users, the clientId must match their user ID
            if (clientId !== validatedUser.id) {
              // For anonymous/local-dev users, we allow a generic clientId
              if (validatedUser.isAnonymous && clientId === "anonymous-user") {
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
    });
  },
};
