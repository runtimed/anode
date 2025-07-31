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
};
