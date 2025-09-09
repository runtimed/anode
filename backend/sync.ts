import {
  makeDurableObject,
  getSyncRequestSearchParams,
  handleSyncRequest,
} from "@livestore/sync-cf/cf-worker";
import { type Env, type ExecutionContext } from "./types";

import { getValidatedUser } from "./auth";
import { Schema } from "@livestore/livestore";

export class SyncBackendDO extends makeDurableObject({
  onPush: async (message, _context) => {
    console.log("onPush", message.batch);
  },
  onPull: async (message, _context) => {
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
    const requestParamsResult = getSyncRequestSearchParams(request as any);

    if (requestParamsResult._tag === "Some") {
      return handleSyncRequest({
        request: request as any,
        searchParams: requestParamsResult.value,
        env,
        ctx,
        options: {
          headers: {},
          durableObject: {
            name: "WEBSOCKET_SERVER",
          },
          validatePayload: async (rawPayload) => {
            try {
              const payload = decodePayload(rawPayload);
              let validatedUser = await getValidatedUser(
                payload.authToken,
                env
              );

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
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
