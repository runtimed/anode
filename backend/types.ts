import type {
  Request as WorkerRequest,
  Response as WorkerResponse,
  ExecutionContext,
  ExportedHandler,
  DurableObjectNamespace,
  D1Database,
  Fetcher,
  R2Bucket,
  Headers,
  FormData,
} from "@cloudflare/workers-types/experimental";
// N.B. it's important that we pull in all the types directly from /experimental
// because we are NOT adding @cloudflare/workers-types to the types[] field in tsconfig.json
// This means that e.g. the global Request and Response objects are not correct
// If we use the experimental types, then these don't assume the global vars are correctly typed
// TL;DR: This can go away once we switch to a monorepo setup and isolate the cloudflare types to only worker projects

/**
 * The Env interface includes all bindings from the original sync worker,
 * plus the `ASSETS` binding for serving static assets.
 */
export type Env = {
  DEPLOYMENT_ENV: string;

  // Bindings from the original sync worker configuration
  WEBSOCKET_SERVER: DurableObjectNamespace;
  DB: D1Database;

  // Secrets
  AUTH_TOKEN: string;
  AUTH_ISSUER: string;

  // New binding for the preview worker to serve the frontend application
  ASSETS: Fetcher;

  // Bindings for the artifact service, as per artifact-service-design.md
  ARTIFACT_BUCKET: R2Bucket;
  ARTIFACT_STORAGE: "r2" | "local";
  ARTIFACT_THRESHOLD: string;

  // Hidden bits from LiveStore (?!)
  ADMIN_SECRET: string;

  LOCAL_OIDC_AUTHORIZATION_ENDPOINT?: string;

  // Whether to enable the local_oidc routes
  ALLOW_LOCAL_AUTH?: string;

  customFetch?: typeof fetch; // Only used in unit tests to mock fetch
};

// The global Request and Response object is different between cloudflare and node
// For right now, we are using a single tsconfig environment for the whole repository
// so there's going to be a conflict between the global Request/Response objects between the DOM, Node, and Cloudflare
// To workaround this, we'll use a module-wide constant that is just the global response object, but re-cast to be the cloudflare object
// In the long term, we should fix this properly by using a monorepo setup and having different environments for each deploy target

const workerGlobals = {
  Request: globalThis.Request as any as typeof WorkerRequest,
  Response: globalThis.Response as any as typeof WorkerResponse,
  Headers: globalThis.Headers as any as typeof Headers,
  FormData: globalThis.FormData as any as typeof FormData,
};

export type FetchHandler = (
  request: WorkerRequest,
  env: Env,
  ctx: ExecutionContext
) => WorkerResponse | Promise<WorkerResponse>;

export type SimpleHandler = {
  fetch: FetchHandler;
};

export type {
  WorkerRequest,
  WorkerResponse,
  ExecutionContext,
  ExportedHandler,
  Headers,
  FormData,
};
export { workerGlobals };
