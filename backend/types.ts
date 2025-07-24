/**
 * The Env interface includes all bindings from the original sync worker,
 * plus the `ASSETS` binding for serving static assets.
 */
export interface Env {
  DEPLOYMENT_ENV: string;

  // Bindings from the original sync worker configuration
  WEBSOCKET_SERVER: DurableObjectNamespace;
  DB: D1Database;

  // Secrets
  AUTH_TOKEN: string;
  AUTH_ISSUER: string;

  // Legacy Google OAuth properties (being replaced with OIDC)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  // New binding for the preview worker to serve the frontend application
  ASSETS: Fetcher;

  // Bindings for the artifact service, as per artifact-service-design.md
  ARTIFACT_BUCKET: R2Bucket;
  ARTIFACT_STORAGE: "r2" | "local";
  ARTIFACT_THRESHOLD: string;

  // Hidden bits from LiveStore (?!)
  ADMIN_SECRET: string;
}
