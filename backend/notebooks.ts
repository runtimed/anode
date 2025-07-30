import { Env } from "./types";
import { validateAuthPayload } from "./auth";
import {
  createSpiceDBClient,
  createStoreOwnership,
  checkStoreAccess,
} from "../src/backend/spicedb";

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function createNotebook(
  userId: string,
  title: string,
  env: Env
): Promise<{ id: string; slug: string }> {
  const notebookId = crypto.randomUUID();
  const slug = createSlug(title);
  const now = Date.now();

  // Create in D1
  await env.DB.prepare(
    "INSERT INTO notebooks (id, title, slug, created_by, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(notebookId, title, slug, userId, now)
    .run();

  // Create ownership in SpiceDB
  const spicedb = createSpiceDBClient(env);
  await createStoreOwnership(spicedb, notebookId, userId);

  console.log("✅ Created notebook:", { notebookId, title, slug, userId });

  return { id: notebookId, slug };
}

export async function listNotebooks(
  userId: string,
  env: Env
): Promise<
  Array<{ id: string; title: string; slug: string; createdAt: number }>
> {
  // For now, query all notebooks from D1 and filter by permission
  // In production, we'd use SpiceDB's lookupResources with pagination
  const notebooks = await env.DB.prepare(
    "SELECT id, title, slug, created_at FROM notebooks ORDER BY created_at DESC LIMIT 100"
  ).all();

  const spicedb = createSpiceDBClient(env);

  // Check permissions in parallel
  const accessChecks = await Promise.all(
    notebooks.results.map(async (notebook: any) => ({
      notebook,
      hasAccess: await checkStoreAccess(spicedb, notebook.id, userId),
    }))
  );

  return accessChecks
    .filter(({ hasAccess }) => hasAccess)
    .map(({ notebook }) => ({
      id: notebook.id,
      title: notebook.title,
      slug: notebook.slug,
      createdAt: notebook.created_at,
    }));
}

export async function getNotebook(
  notebookId: string,
  userId: string,
  env: Env
): Promise<{
  id: string;
  title: string;
  slug: string;
  createdAt: number;
} | null> {
  // Check access first
  const spicedb = createSpiceDBClient(env);
  const hasAccess = await checkStoreAccess(spicedb, notebookId, userId);

  if (!hasAccess) {
    return null;
  }

  const result = await env.DB.prepare(
    "SELECT id, title, slug, created_at FROM notebooks WHERE id = ?"
  )
    .bind(notebookId)
    .first();

  if (!result) {
    return null;
  }

  return {
    id: result.id as string,
    title: result.title as string,
    slug: result.slug as string,
    createdAt: result.created_at as number,
  };
}

// API route handlers
export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const authToken =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      request.headers.get("x-auth-token");

    if (!authToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let user;
    try {
      user = await validateAuthPayload({ authToken }, env);
    } catch {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // POST /api/notebooks - Create notebook
    if (request.method === "POST" && url.pathname === "/api/notebooks") {
      try {
        const body = (await request.json()) as { title?: string };
        const title = body.title || "Untitled Notebook";

        const notebook = await createNotebook(user.id, title, env);

        return new Response(
          JSON.stringify({
            ...notebook,
            url: `/n/${notebook.id}/${notebook.slug}`,
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Failed to create notebook:", error);
        return new Response(
          JSON.stringify({ error: "Failed to create notebook" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // GET /api/notebooks - List notebooks
    if (request.method === "GET" && url.pathname === "/api/notebooks") {
      try {
        const notebooks = await listNotebooks(user.id, env);

        return new Response(
          JSON.stringify({
            notebooks: notebooks.map((n) => ({
              ...n,
              url: `/n/${n.id}/${n.slug}`,
            })),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Failed to list notebooks:", error);
        return new Response(
          JSON.stringify({ error: "Failed to list notebooks" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // GET /api/notebooks/:id - Get specific notebook
    const notebookMatch = url.pathname.match(/^\/api\/notebooks\/([^\/]+)$/);
    if (request.method === "GET" && notebookMatch) {
      const notebookId = notebookMatch[1];

      try {
        const notebook = await getNotebook(notebookId, user.id, env);

        if (!notebook) {
          return new Response(JSON.stringify({ error: "Notebook not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            ...notebook,
            url: `/n/${notebook.id}/${notebook.slug}`,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Failed to get notebook:", error);
        return new Response(
          JSON.stringify({ error: "Failed to get notebook" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
