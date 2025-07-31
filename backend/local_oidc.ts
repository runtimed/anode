import { Env } from "./types";

export interface OpenIdConfiguration {
  issuer: string;
  authorization_endpoint: string;
  jwks_uri: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint: string;
  scopes_supported: string[];
  response_types_supported: string[];
  token_endpoint_auth_methods_supported: string[];
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function generateOpenIdConfiguration(
  baseUrl: string,
  env: Env
): OpenIdConfiguration {
  return {
    issuer: `${baseUrl}/local_oidc`,
    authorization_endpoint:
      env.LOCAL_OIDC_AUTHORIZATION_ENDPOINT ??
      "http://localhost:5731/local_oidc/authorize",
    jwks_uri: `${baseUrl}/local_oidc/.well-known/jwks.json`,
    token_endpoint: `${baseUrl}/local_oidc/token`,
    userinfo_endpoint: `${baseUrl}/local_oidc/userinfo`,
    end_session_endpoint: `${baseUrl}/local_oidc/logout`,
    scopes_supported: ["profile", "email", "openid"],
    response_types_supported: ["code"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
  };
}

async function handleOpenIdConfiguration(
  request: Request,
  env: Env
): Promise<Response> {
  const baseUrl = getBaseUrl(request);
  const config = generateOpenIdConfiguration(baseUrl, env);

  return new Response(JSON.stringify(config, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function handleOidcRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Route to appropriate handler based on path
  if (pathname === "/local_oidc/.well-known/openid-configuration") {
    return handleOpenIdConfiguration(request, env);
  }

  // For now, return 404 for other endpoints - we'll implement them in subsequent iterations
  return new Response("Not Found", { status: 404 });
}
