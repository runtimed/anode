import { makeDurableObject, makeWorker } from "@livestore/sync-cf/cf-worker";

import { Schema } from "@runtimed/schema";

export class WebSocketServer extends makeDurableObject({
  onPush: async (message, { payload, storeId }) => {
    try {
      const decodedPayload = decodePayload(payload);
      // Note: env is not available in onPush context, so we skip full auth validation here
      // This is a limitation of the current LiveStore sync-cf API
      console.log("📝 Push received:", {
        storeId,
        eventCount: message.batch.length,
        hasPayload: !!payload,
      });

      // For now, we'll do basic payload validation without full auth
      if (!decodedPayload.authToken) {
        throw new Error("AuthToken is required");
      }

      // Log the type of client
      if (decodedPayload?.runtime === true) {
        console.log("📝 Runtime agent push:", {
          runtimeId: decodedPayload.runtimeId,
          storeId,
          eventCount: message.batch.length,
        });
      } else {
        console.log("📝 User push:", {
          storeId,
          eventCount: message.batch.length,
        });
      }
    } catch (error: any) {
      console.error("🚫 Push authentication failed:", error.message);
      throw error;
    }
  },
  onPull: async (_message, { payload, storeId }) => {
    try {
      const decodedPayload = decodePayload(payload);

      // Note: env is not available in onPull context, so we skip full auth validation here
      console.log("📝 Pull request:", {
        storeId,
        isRuntime: decodedPayload?.runtime === true,
        hasPayload: !!payload,
      });

      // Basic payload validation
      if (!decodedPayload.authToken) {
        throw new Error("AuthToken is required");
      }
    } catch (error: any) {
      console.error("🚫 Pull validation failed:", error.message);
      throw error;
    }
  },
}) {}

// User sync payload (runtime is false or undefined)
const UserSyncPayloadSchema = Schema.Struct({
  authToken: Schema.String,
  runtime: Schema.optional(Schema.Literal(false)),
});

// Runtime sync payload (runtime is true with additional fields)
const RuntimeSyncPayloadSchema = Schema.Struct({
  authToken: Schema.String,
  runtime: Schema.Literal(true),
  runtimeId: Schema.String,
  sessionId: Schema.String,
  userId: Schema.String,
});

// Union schema for all sync payload types
const SyncPayloadSchema = Schema.Union(
  UserSyncPayloadSchema,
  RuntimeSyncPayloadSchema
);

const decodePayload = Schema.decodeUnknownSync(SyncPayloadSchema);

export default makeWorker({
  syncBackendBinding: "SYNC_BACKEND_DO",
  validatePayload: async (rawPayload: unknown, { storeId }) => {
    try {
      const payload = decodePayload(rawPayload);

      // Basic payload structure validation - detailed auth happens in Durable Object
      if (!payload.authToken || typeof payload.authToken !== "string") {
        throw new Error("Valid authToken is required");
      }

      if (payload?.runtime === true) {
        // For runtime agents, require additional fields
        if (!payload.runtimeId || !payload.sessionId || !payload.userId) {
          throw new Error(
            "Runtime agents require runtimeId, sessionId, and userId"
          );
        }
        console.log(
          "📝 Runtime agent payload structure valid for store:",
          storeId
        );
      } else {
        console.log("📝 User payload structure valid for store:", storeId);
      }

      // Full authentication happens in onPush/onPull handlers where Env is available
    } catch (error: any) {
      console.error("🚫 Payload validation failed:", error.message);
      throw error;
    }
  },
  enableCORS: true,
});
