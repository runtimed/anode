import { CreateApiKeyRequest } from "@runtimed/extensions/providers/api_key";
import * as jose from "jose";
import {
  RuntError,
  ErrorType,
  Passport,
  AuthType,
  AuthenticatedProviderContext,
} from "@runtimed/extensions";
import {
  IncomingRequestCfProperties,
  ExportedHandlerFetchHandler,
} from "@cloudflare/workers-types";
import {
  type WorkerRequest,
  type WorkerResponse,
  Env,
  ExecutionContext,
  workerGlobals,
  SimpleHandler,
} from "./types";
import { extractBearerToken, parseToken } from "./auth";

import apiKeyProvider from "./local_extension/api_key_provider";

// ajv doesn't work in cloudflare workers, so just implement manual validation
const validateCreateApiKeyRequest = (
  body: unknown
): body is CreateApiKeyRequest => {
  if (typeof body !== "object" || body === null) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "Request body must be an object",
    });
  }

  const request = body as Record<string, unknown>;

  if (
    !Array.isArray(request.scopes) ||
    request.scopes.length === 0 ||
    request.scopes.some((scope) => typeof scope !== "string")
  ) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "scopes is invalid",
    });
  }

  if (request.resources !== undefined) {
    if (
      !Array.isArray(request.resources) ||
      request.resources.some(
        (resource) =>
          typeof resource?.id !== "string" || typeof resource?.type !== "string"
      )
    ) {
      throw new RuntError(ErrorType.InvalidRequest, {
        message: "resources is invalid",
      });
    }
  }

  if (typeof request.expiresAt !== "string") {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "expiresAt is invalid",
    });
  }
  try {
    new Date(request.expiresAt);
  } catch (error) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "expiresAt is invalid",
      cause: error as Error,
    });
  }

  if (request.name !== undefined && typeof request.name !== "string") {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "name is invalid",
    });
  }

  if (typeof request.userGenerated !== "boolean") {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "userGenerated is invalid",
    });
  }
  return true;
};

const parseJsonBody = async <T>(
  request: WorkerRequest<unknown, IncomingRequestCfProperties<unknown>>
): Promise<T> => {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new RuntError(ErrorType.InvalidRequest, {
      message: "Failed to JSON parse the request body",
      cause: error as Error,
    });
  }
};

const createApiKeyHandler: ExportedHandlerFetchHandler<Env> = async (
  request: WorkerRequest<unknown, IncomingRequestCfProperties<unknown>>,
  env: Env,
  ctx: ExecutionContext
): Promise<WorkerResponse> => {
  let passport: Passport;
  const authToken = extractBearerToken(request);
  if (!authToken) {
    throw new RuntError(ErrorType.MissingAuthToken);
  }
  try {
    const oldPassport = await parseToken(authToken, env);
    passport = {
      type: AuthType.OAuth,
      user: oldPassport.user,
      claims: oldPassport.jwt,
      scopes: null,
      resources: null,
    };
  } catch (error) {
    if (error instanceof jose.errors.JWTExpired) {
      throw new RuntError(ErrorType.AuthTokenExpired, { cause: error });
    }
    throw new RuntError(ErrorType.AuthTokenInvalid, { cause: error as Error });
  }

  const body = await parseJsonBody<CreateApiKeyRequest>(request);
  validateCreateApiKeyRequest(body);
  const context: AuthenticatedProviderContext = {
    request,
    env,
    ctx,
    bearerToken: authToken,
    passport,
  };
  const result = await apiKeyProvider!.createApiKey(context, body);
  return new workerGlobals.Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
};

const mainHandler: ExportedHandlerFetchHandler<Env> = async (
  request: WorkerRequest<unknown, IncomingRequestCfProperties<unknown>>,
  env: Env,
  ctx: ExecutionContext
) => {
  try {
    if (
      request.method === "POST" &&
      new URL(request.url).pathname === "/api/api-keys"
    ) {
      const response = await createApiKeyHandler(request, env, ctx);
      return response;
    }
    throw new RuntError(ErrorType.NotFound, {
      message: "Unknown API endpoint",
      debugPayload: { url: request.url },
    });
  } catch (error) {
    let runtError: RuntError;
    if (error instanceof RuntError) {
      runtError = error;
    } else {
      runtError = new RuntError(ErrorType.Unknown, { cause: error as Error });
    }
    if (runtError.statusCode === 500) {
      console.error("500 error for request", request.url, JSON.stringify(runtError.getPayload(true), null, 2));
    }
    return new workerGlobals.Response(
      JSON.stringify(runtError.getPayload(env.DEBUG ?? false)),
      {
        headers: { "Content-Type": "application/json" },
        status: runtError.statusCode,
      }
    );
  }
};

const handler: SimpleHandler = {
  fetch: mainHandler,
};

export default handler;
