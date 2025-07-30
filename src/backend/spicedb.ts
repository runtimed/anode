import { v1 } from "@authzed/authzed-node";
import { Env } from "../../backend/types";

export function createSpiceDBClient(env: Env) {
  // In development, allow missing SpiceDB config
  if (!env.SPICEDB_ENDPOINT || !env.SPICEDB_TOKEN) {
    console.warn("SpiceDB not configured, using permissive mock");
    return createMockClient();
  }

  return v1.NewClient(
    env.SPICEDB_TOKEN,
    env.SPICEDB_ENDPOINT,
    env.SPICEDB_INSECURE === "true"
      ? v1.ClientSecurity.INSECURE_PLAINTEXT
      : v1.ClientSecurity.SECURE
  );
}

// Mock client that always allows access for initial development
function createMockClient() {
  return {
    async checkPermission() {
      return { hasPermission: true };
    },
    async writeRelationships() {
      return { writtenAt: { token: "mock-token" } };
    },
    async lookupResources() {
      // Return empty for now - will need D1 data
      return { resourceIds: [] };
    },
    async deleteRelationships() {
      return { deletedAt: { token: "mock-token" } };
    },
  };
}

// Minimal schema for now
export const SPICEDB_SCHEMA = `
definition user {}

definition store {
    relation owner: user
    permission access = owner
}`;

// Helper to create store ownership
export async function createStoreOwnership(
  client: any,
  storeId: string,
  userId: string
) {
  return client.writeRelationships({
    updates: [
      {
        operation: v1.RelationshipUpdate_Operation.CREATE,
        relationship: v1.Relationship.create({
          resource: v1.ObjectReference.create({
            objectType: "store",
            objectId: storeId,
          }),
          relation: "owner",
          subject: v1.SubjectReference.create({
            object: v1.ObjectReference.create({
              objectType: "user",
              objectId: userId,
            }),
          }),
        }),
      },
    ],
  });
}

// Helper to check store access
export async function checkStoreAccess(
  client: any,
  storeId: string,
  userId: string
): Promise<boolean> {
  const result = await client.checkPermission({
    resource: v1.ObjectReference.create({
      objectType: "store",
      objectId: storeId,
    }),
    permission: "access",
    subject: v1.SubjectReference.create({
      object: v1.ObjectReference.create({
        objectType: "user",
        objectId: userId,
      }),
    }),
  });

  return result.hasPermission;
}
