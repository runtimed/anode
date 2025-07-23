// Temporary stubs for OIDC transition - will be replaced with proper OIDC implementation

export interface ValidatedUser {
  id: string;
  email?: string;
  name?: string;
  isAnonymous: boolean;
}

interface AuthPayload {
  authToken: string;
  runtime?: boolean;
}

export function validateProductionEnvironment(_env: any): void {
  // TODO: Replace with OIDC validation
  console.log("🔧 Production environment validation - OIDC implementation pending");
}

export async function validateAuthPayload(
  payload: AuthPayload,
  env: any
): Promise<ValidatedUser> {
  // TODO: Replace with OIDC token validation
  console.log("🔧 Auth validation - OIDC implementation pending");

  if (!payload?.authToken) {
    throw new Error("MISSING_AUTH_TOKEN: No authentication token provided");
  }

  // Temporary fallback for development
  if (env.AUTH_TOKEN && payload.authToken === env.AUTH_TOKEN) {
    return {
      id: "local-dev-user",
      email: "local@example.com",
      name: "Local Development User",
      isAnonymous: true,
    };
  }

  throw new Error("INVALID_AUTH_TOKEN: Authentication failed");
}
