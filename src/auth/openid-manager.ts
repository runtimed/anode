import * as client from "openid-client";
import PromiseQueue from "../util/promise-queue";
import { LocalStorageSync } from "../util/localstorage-proxy";

interface RequestState {
  verifier: string;
  challenge: string;
  state: string;
}

export type Whoami = Record<string, any>;

const OPENID_SCOPES = "openid email profile offline_access";
let openidManagerSingleton: OpenidManager | undefined;

export function getOpenIdManager(): OpenidManager {
  if (!openidManagerSingleton) {
    openidManagerSingleton = new OpenidManager();
  }
  return openidManagerSingleton;
}

class OpenidManager {
  private sync: {
    openid_tokens: {
      access_token: string;
      refresh_token?: string;
      id_token?: string;
      expires_at: number;
    } | null;
    openid_request_state: RequestState | null;
  };
  private config: client.Configuration | null = null;
  private queue: PromiseQueue = new PromiseQueue();
  private oldCodes: Set<string> = new Set();

  constructor() {
    this.sync = LocalStorageSync({
      openid_tokens: null,
      openid_request_state: null,
    });
  }

  public async getAuthorizationUrl(
    prompt: "login" | "registration"
  ): Promise<URL> {
    return this.queue.add(async (): Promise<URL> => {
      await this.#logout();
      const state = await this.#generateRequestState();
      const parameters: Record<string, string> = {
        redirect_uri: import.meta.env.VITE_AUTH_REDIRECT_URI,
        scope: OPENID_SCOPES,
        prompt,
        code_challenge: state.challenge,
        code_challenge_method: "S256",
        state: state.state,
      };
      const config = await this.#getConfig();
      return client.buildAuthorizationUrl(config, parameters);
    }).promise;
  }

  public async handleRedirectResponse(url: URL): Promise<void> {
    return this.queue.add(async () => {
      const config = await this.#getConfig();
      const requestState = this.sync.openid_request_state;
      if (!requestState) {
        throw new Error("No request state found");
      }
      const code = url.searchParams.get("code");
      if (!code) {
        throw new Error("No code found");
      }
      if (this.oldCodes.has(code)) {
        console.log("Already processed this code, skipping");
        return;
      }
      try {
        const tokenResp = await client.authorizationCodeGrant(config, url, {
          pkceCodeVerifier: requestState.verifier,
          expectedState: requestState.state,
        });
        const expires_at = this.computeExpiresAt(tokenResp.expires_in);
        this.sync.openid_tokens = {
          access_token: tokenResp.access_token,
          refresh_token: tokenResp.refresh_token,
          id_token: tokenResp.id_token,
          expires_at,
        };
      } catch (e) {
        console.log(`Error handling redirect response: ${e}`);
        throw e;
      } finally {
        this.oldCodes.add(code);
      }
      this.sync.openid_request_state = null;
    }).promise;
  }

  public async logout() {
    return this.queue.add(async () => {
      this.#logout();
    }).promise;
  }

  public async getAccessToken(): Promise<string | null> {
    return this.queue.add(async () => {
      return this.#getAccessToken();
    }).promise;
  }

  public async getUserInfo(): Promise<Whoami> {
    return this.queue.add(async () => {
      const accessToken = await this.#getAccessToken();
      if (!accessToken) {
        throw new Error("No access token found");
      }
      const config = await this.#getConfig();
      const { userinfo_endpoint } = config.serverMetadata();
      if (!userinfo_endpoint) {
        throw new Error("No userinfo endpoint found");
      }
      const response = await fetch(userinfo_endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.json() as Whoami;
    }).promise;
  }

  async #getConfig(): Promise<client.Configuration> {
    if (this.config) {
      return this.config;
    }
    this.config = await client.discovery(
      new URL(import.meta.env.VITE_AUTH_URI),
      import.meta.env.VITE_AUTH_CLIENT_ID
    );
    return this.config;
  }

  async #generateRequestState(): Promise<RequestState> {
    const verifier = client.randomPKCECodeVerifier();
    const challenge = await client.calculatePKCECodeChallenge(verifier);
    const state = client.randomState();
    const requestState = {
      verifier,
      challenge,
      state,
    };
    this.sync.openid_request_state = requestState;
    return requestState;
  }

  private computeExpiresAt(expires_in: number | undefined): number {
    const now = Math.floor(Date.now() / 1000);
    return expires_in ? now + expires_in : now + 3600;
  }

  async #getAccessToken(): Promise<string | null> {
    const tokens = this.sync.openid_tokens;
    if (!tokens) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    // Refresh if token will expire within the next minute
    if (now + 60 > tokens.expires_at) {
      const refreshToken = tokens.refresh_token;
      if (!refreshToken) {
        await this.#logout();
        return null;
      }
      const config = await this.#getConfig();
      try {
        const refreshed = await client.refreshTokenGrant(config, refreshToken, {
          scopes: OPENID_SCOPES,
        });
        const expires_at = this.computeExpiresAt(refreshed.expires_in);
        this.sync.openid_tokens = {
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          id_token: refreshed.id_token,
          expires_at,
        };
        return refreshed.access_token;
      } catch (e) {
        console.log(`Error refreshing access token: ${e}`);
        await this.#logout();
        return null;
      }
    }
    return tokens.access_token;
  }

  #logout() {
    this.config = null;
    this.sync.openid_request_state = null;
    this.sync.openid_tokens = null;
  }
}

export type OpenIdManager = typeof OpenidManager;
