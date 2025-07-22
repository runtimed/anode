import { validateAuthPayload } from "./auth";
import { 
  canManagePermissions,
  getNotebookPermissions,
  grantNotebookPermission,
  revokeNotebookPermission,
  checkNotebookPermission,
  initializeSpiceDB
} from "./permissions";
import { Env } from "./types";

/**
 * Handle permission management API endpoints
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // Initialize SpiceDB client (singleton pattern prevents redundant calls)
      await initializeSpiceDB(env.SPICEDB_ENDPOINT || 'localhost:50051', env.SPICEDB_TOKEN || 'somerandomkeyhere');

      // Parse request body for authenticated requests
      let body: any = {};
      if (request.method !== "GET") {
        try {
          body = await request.json();
        } catch (e) {
          return new Response(
            JSON.stringify({ error: "Invalid JSON body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Validate authentication
      const authToken = request.headers.get("Authorization")?.replace("Bearer ", "") || body.authToken;
      if (!authToken) {
        return new Response(
          JSON.stringify({ error: "Missing authentication token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validatedUser = await validateAuthPayload({ authToken }, env);

      // Route to specific permission endpoints
      if (url.pathname === "/api/permissions/list" && request.method === "GET") {
        return await handleListPermissions(request, env, validatedUser, corsHeaders);
      }

      if (url.pathname === "/api/permissions/grant" && request.method === "POST") {
        return await handleGrantPermission(request, env, validatedUser, body, corsHeaders);
      }

      if (url.pathname === "/api/permissions/revoke" && request.method === "DELETE") {
        return await handleRevokePermission(request, env, validatedUser, body, corsHeaders);
      }

      if (url.pathname === "/api/permissions/check" && request.method === "GET") {
        return await handleCheckPermission(request, env, validatedUser, corsHeaders);
      }

      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (error: any) {
      console.error("Permission API error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          message: error.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};

async function handleListPermissions(
  request: Request,
  env: Env,
  validatedUser: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const notebookId = url.searchParams.get("notebookId");

  if (!notebookId) {
    return new Response(
      JSON.stringify({ error: "Missing notebookId parameter" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if user can manage permissions (must be owner)
  const canManage = await canManagePermissions(
    env.SPICEDB_ENDPOINT || 'localhost:50051', 
    env.SPICEDB_TOKEN || 'somerandomkeyhere',
    notebookId, 
    validatedUser.id
  );
  if (!canManage) {
    return new Response(
      JSON.stringify({ error: "Permission denied: Only notebook owners can view permissions" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const permissions = await getNotebookPermissions(
    env.SPICEDB_ENDPOINT || 'localhost:50051',
    env.SPICEDB_TOKEN || 'somerandomkeyhere', 
    notebookId
  );
  
  return new Response(
    JSON.stringify({ permissions }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGrantPermission(
  _request: Request,
  env: Env,
  validatedUser: any,
  body: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { notebookId, userId, role } = body;

  if (!notebookId || !userId || !role) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: notebookId, userId, role" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!['owner', 'editor'].includes(role)) {
    return new Response(
      JSON.stringify({ error: "Invalid role. Must be 'owner' or 'editor'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if user can manage permissions (must be owner)
  const canManage = await canManagePermissions(
    env.SPICEDB_ENDPOINT || 'localhost:50051',
    env.SPICEDB_TOKEN || 'somerandomkeyhere',
    notebookId,
    validatedUser.id
  );
  if (!canManage) {
    return new Response(
      JSON.stringify({ error: "Permission denied: Only notebook owners can grant permissions" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const success = await grantNotebookPermission(
    env.SPICEDB_ENDPOINT || 'localhost:50051',
    env.SPICEDB_TOKEN || 'somerandomkeyhere', 
    notebookId, 
    userId, 
    role, 
    validatedUser.id
  );
  
  if (success) {
    return new Response(
      JSON.stringify({ message: "Permission granted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    return new Response(
      JSON.stringify({ error: "Failed to grant permission" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

async function handleRevokePermission(
  _request: Request,
  env: Env,
  validatedUser: any,
  body: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { notebookId, userId } = body;

  if (!notebookId || !userId) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: notebookId, userId" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if user can manage permissions (must be owner)
  const canManage = await canManagePermissions(
    env.SPICEDB_ENDPOINT || 'localhost:50051',
    env.SPICEDB_TOKEN || 'somerandomkeyhere',
    notebookId,
    validatedUser.id
  );
  if (!canManage) {
    return new Response(
      JSON.stringify({ error: "Permission denied: Only notebook owners can revoke permissions" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Prevent owner from revoking their own access
  const targetPermission = await checkNotebookPermission(
    env.SPICEDB_ENDPOINT || 'localhost:50051',
    env.SPICEDB_TOKEN || 'somerandomkeyhere',
    notebookId,
    userId
  );
  if (targetPermission === 'owner' && userId === validatedUser.id) {
    return new Response(
      JSON.stringify({ error: "Cannot revoke your own owner permissions" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const success = await revokeNotebookPermission(
    env.SPICEDB_ENDPOINT || 'localhost:50051',
    env.SPICEDB_TOKEN || 'somerandomkeyhere',
    notebookId,
    userId
  );
  
  if (success) {
    return new Response(
      JSON.stringify({ message: "Permission revoked successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    return new Response(
      JSON.stringify({ error: "Failed to revoke permission" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

async function handleCheckPermission(
  request: Request,
  env: Env,
  validatedUser: any,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const notebookId = url.searchParams.get("notebookId");

  if (!notebookId) {
    return new Response(
      JSON.stringify({ error: "Missing notebookId parameter" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const permission = await checkNotebookPermission(
    env.SPICEDB_ENDPOINT || 'localhost:50051',
    env.SPICEDB_TOKEN || 'somerandomkeyhere',
    notebookId,
    validatedUser.id
  );
  
  return new Response(
    JSON.stringify({ 
      notebookId,
      userId: validatedUser.id,
      permission 
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}