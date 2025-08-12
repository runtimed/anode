import {
  type ProviderContext,
  type AuthenticatedProviderContext,
  type Passport,
  RuntError,
  ErrorType,
  AuthType,
  Scope,
  Resource,
} from "@runtimed/extensions";
import {
  type ApiKeyProvider,
  type ApiKey,
  ApiKeyCapabilities,
  type CreateApiKeyRequest,
  type ListApiKeysRequest,
} from "@runtimed/extensions/providers/api_key";
import { type JWTPayload } from "jose";

import {
  shouldAuthenticate,
  authenticate,
  createGetJWKS,
} from "@japikey/authenticate";
import {
  CreateApiKeyOptions,
  CreateApiKeyResult,
  MalformedTokenError,
  createApiKey,
  SigningError,
  type ApiKeyRow,
} from "@japikey/japikey";
import { D1Driver } from "@japikey/cloudflare";

const getBaseIssuer = (context: ProviderContext): URL => {
  const issuer = context.env.AUTH_ISSUER;
  const match = issuer.match(/^http:\/\/localhost:(\d+)\/local_oidc$/);
  if (!match) {
    throw new RuntError(ErrorType.ServerMisconfigured, {
      message: "Cannot determine the api key issuer from the AUTH_ISSUER",
      debugPayload: {
        issuer,
      },
    });
  }
  return new URL(`http://localhost:${match[1]}/api-keys`);
};

const claimToMaybeString = (item: unknown): string | undefined => {
  if (typeof item === "string") {
    return item;
  }
  return undefined;
};

const convertRowToApiKey = (row: ApiKeyRow): ApiKey => {
  const key: ApiKey = {
    id: row.kid,
    userId: row.user_id,
    revoked: row.revoked,
    scopes: row.metadata.scopes as Scope[],
    expiresAt: row.metadata.expiresAt as string,
    userGenerated: row.metadata.userGenerated as boolean,
    name: row.metadata.name as string,
  };
  if (row.metadata.resources) {
    key.resources = row.metadata.resources as Resource[];
  }
  return key;
};

const provider: ApiKeyProvider = {
  capabilities: new Set([
    ApiKeyCapabilities.Revoke,
    ApiKeyCapabilities.CreateWithResources,
  ]),
  isApiKey: (context: ProviderContext): boolean => {
    if (!context.bearerToken) {
      return false;
    }
    const baseIssuer = getBaseIssuer(context);
    return shouldAuthenticate(context.bearerToken, baseIssuer);
  },
  validateApiKey: async (context: ProviderContext): Promise<Passport> => {
    if (!context.bearerToken) {
      throw new RuntError(ErrorType.MissingAuthToken);
    }
    const baseIssuer = getBaseIssuer(context);
    const getJWKS = createGetJWKS(baseIssuer);
    let payload: JWTPayload;
    try {
      payload = await authenticate(context.bearerToken, {
        baseIssuer,
        getJWKS,
      });
    } catch (error) {
      if (error instanceof MalformedTokenError) {
        throw new RuntError(ErrorType.AuthTokenInvalid, { cause: error });
      }
      throw new RuntError(ErrorType.AuthTokenWrongSignature, {
        cause: error as Error,
      });
    }

    if (typeof payload.sub !== "string" || !payload.sub) {
      throw new RuntError(ErrorType.AuthTokenInvalid, {
        message: "The sub claim is required",
      });
    }

    if (typeof payload.email !== "string" || !payload.email) {
      throw new RuntError(ErrorType.AuthTokenInvalid, {
        message: "The email claim is required",
      });
    }

    let scopes: Scope[] | null = null;
    if ("scopes" in payload) {
      if (
        !Array.isArray(payload.scopes) ||
        payload.scopes.some((scope) => typeof scope !== "string")
      ) {
        throw new RuntError(ErrorType.AuthTokenInvalid, {
          message: "The scopes claim must be an array of strings",
          debugPayload: {
            scopes: payload.scopes,
          },
        });
      }
      scopes = payload.scopes;
    }

    return {
      type: AuthType.ApiKey,
      user: {
        id: payload.sub,
        email: payload.email,
        name: claimToMaybeString(payload.name),
        givenName: claimToMaybeString(payload.given_name),
        familyName: claimToMaybeString(payload.family_name),
      },
      claims: payload,
      scopes,
      resources: null,
    };
  },
  createApiKey: async (
    context: AuthenticatedProviderContext,
    request: CreateApiKeyRequest
  ): Promise<string> => {
    let result: CreateApiKeyResult;
    try {
      const claims: JWTPayload = {
        scopes: request.scopes,
        resources: request.resources,
      };
      const options: CreateApiKeyOptions = {
        sub: context.passport.user.id,
        iss: getBaseIssuer(context),
        aud: "api-keys",
        expiresAt: new Date(request.expiresAt),
      };
      result = await createApiKey(claims, options);
    } catch (error) {
      if (error instanceof SigningError) {
        throw new RuntError(ErrorType.InvalidRequest, {
          message: "Failed to create the api key",
          cause: error,
          debugPayload: {
            request,
          },
        });
      }
      throw new RuntError(ErrorType.Unknown, { cause: error as Error });
    }
    const db = new D1Driver(context.env.DB);
    await db.ensureTable();
    try {
      await db.insertApiKey({
        kid: result.kid,
        user_id: context.passport.user.id,
        revoked: false,
        jwk: result.jwk,
        metadata: {
          scopes: request.scopes,
          resources: request.resources,
          expiresAt: request.expiresAt,
          name: request.name,
          userGenerated: request.userGenerated,
        },
      });
    } catch (error) {
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to insert the api key into the database",
        cause: error as Error,
      });
    }
    return result.jwt;
  },
  getApiKey: async (
    context: AuthenticatedProviderContext,
    id: string
  ): Promise<ApiKey> => {
    const db = new D1Driver(context.env.DB);
    await db.ensureTable();
    let row: ApiKeyRow | null;
    try {
      row = await db.getApiKey(id);
    } catch (error) {
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to get the api key from the database",
        cause: error as Error,
      });
    }
    if (!row || row.user_id !== context.passport.user.id) {
      throw new RuntError(ErrorType.NotFound, { message: "Api key not found" });
    }
    return convertRowToApiKey(row);
  },
  listApiKeys: async (
    context: AuthenticatedProviderContext,
    request: ListApiKeysRequest
  ): Promise<ApiKey[]> => {
    const db = new D1Driver(context.env.DB);
    await db.ensureTable();
    let rows: ApiKeyRow[];
    try {
      rows = await db.findApiKeys(
        context.passport.user.id,
        request.limit,
        request.offset
      );
    } catch (error) {
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to get the api keys from the database",
        cause: error as Error,
      });
    }
    return rows.map(convertRowToApiKey);
  },
  revokeApiKey: async (
    context: AuthenticatedProviderContext,
    id: string
  ): Promise<void> => {
    const db = new D1Driver(context.env.DB);
    await db.ensureTable();
    try {
      await db.revokeApiKey({ user_id: context.passport.user.id, kid: id });
    } catch (error) {
      throw new RuntError(ErrorType.Unknown, {
        message: "Failed to revoke the api key",
        cause: error as Error,
      });
    }
  },
  deleteApiKey: async (): Promise<void> => {
    throw new RuntError(ErrorType.CapabilityNotAvailable, {
      message: "delete capability is not supported",
    });
  },
};

export default provider;
