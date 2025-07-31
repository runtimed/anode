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

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
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
      "http://localhost:5173/local_oidc/authorize",
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

async function handleToken(
  request: Request,
  _env: Env
): Promise<Response> {
  // Parse form data instead of URL search params
  const formData = await request.formData();
  const clientId = formData.get("client_id") as string;
  const redirectUri = formData.get("redirect_uri") as string;
  const code = formData.get("code") as string;
  const grantType = formData.get("grant_type") as string;

  console.log("formData", formData);


  if (clientId !== "local-anode-client") {
    console.log("Invalid client_id", clientId);
    return new Response("Invalid client_id", { status: 400 });
  }

  if (!redirectUri || !redirectUri.startsWith("http://localhost")) {
    console.log("Invalid redirect_uri", redirectUri);
    return new Response("Invalid redirect_uri", { status: 400 });
  }

  if (grantType !== "authorization_code") {
    console.log("Invalid grant_type", grantType);
    return new Response("Invalid grant_type", { status: 400 });
  }

  if (!code) {
    console.log("Missing code parameter", code);
    return new Response("Missing code parameter", { status: 400 });
  }

  try {
    const decodedCode = atob(code);
    const userData = JSON.parse(decodedCode) as UserData;
    
    if (!userData.firstName || !userData.lastName || !userData.email) {
      console.log("Invalid code: missing required fields", userData);
      return new Response("Invalid code: missing required fields", { status: 400 });
    }
  } catch {
    console.log("Invalid code: not a valid BASE64 encoded JSON", code);
    return new Response("Invalid code: not a valid BASE64 encoded JSON", { status: 400 });
  }

  const payload = {
    access_token: "my_access_token",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "my_refresh_token",
    scope: "openid profile email",
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    }
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

  if (pathname === "/local_oidc/token") {
    return handleToken(request, env);
  }

  // For now, return 404 for other endpoints - we'll implement them in subsequent iterations
  return new Response("Not Found", { status: 404 });
}
