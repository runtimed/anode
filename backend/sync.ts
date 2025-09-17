import {
  makeDurableObject,
  handleWebSocket,
} from "@livestore/sync-cf/cf-worker";
import { type Env, type ExecutionContext } from "./types";

import { getValidatedUser } from "./auth";
import { Schema } from "@runtimed/schema";

export class WebSocketServer extends makeDurableObject({
  onPush: async (message) => {
    console.log("onPush", message.batch);
  },
  onPull: async (message) => {
    console.log("onPull", message);
  },
}) {}

const SyncPayloadSchema = Schema.Struct({
  authToken: Schema.String,
  runtime: Schema.optional(Schema.Boolean),
});

const decodePayload = Schema.decodeUnknownSync(SyncPayloadSchema);

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    const url = new URL(request.url);

    const pathname = url.pathname;

    if (!pathname.startsWith("/livestore")) {
      return new Response("Invalid request", { status: 400 });
    }

    return handleWebSocket(request, env, ctx, {
      validatePayload: async (rawPayload) => {
        try {
          const payload = decodePayload(rawPayload);
          let validatedUser = await getValidatedUser(payload.authToken, env);

          if (!validatedUser) {
            throw new Error("User must be authenticated");
          }

          // User identity is validated via JWT token
          // LiveStore will manage clientId for device/app instance identification
          if (validatedUser.id === "runtime-agent") {
            console.log("✅ Runtime agent authenticated");
          } else if (payload?.runtime === true) {
            // For API key authenticated runtime agents
            console.log("✅ API key authenticated runtime agent:", {
              userId: validatedUser.id,
            });
          } else {
            // For regular users
            console.log("✅ Authenticated user:", {
              userId: validatedUser.id,
            });
          }

          // SECURITY NOTE: This validation only occurs at connection time.
          // The current version of `@livestore/sync-cf` does not provide a mechanism
          // to verify that the `clientId` on incoming events matches the `clientId`
          // that was validated with this initial connection payload. A malicious
          // client could pass this check and then send events with a different clientId.
        } catch (error: any) {
          console.error("🚫 Authentication failed:", error.message);
          throw error; // Reject the WebSocket connection
        }
      },
    });
  },
};
