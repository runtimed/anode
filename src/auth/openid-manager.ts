import * as client from 'openid-client';
import PromiseQueue from '../util/promise-queue';

interface RequestState {
  verifier: string;
  challenge: string;
  state: string;
}

export type Whoami = Record<string, any>;

const OPENID_SCOPES = 'openid email profile offline_access';
const REQUEST_STATE_KEY = "openid_request_state";
const TOKEN_STORAGE_KEY = "openid_tokens";
let openidManagerSingleton: OpenidManager | undefined;

export function getOpenIdManager(): OpenidManager {
  if (!openidManagerSingleton) {
    openidManagerSingleton = new OpenidManager();
  }
  return openidManagerSingleton;
}

class OpenidManager {
  private requestState: RequestState | null = null;
  private config: client.Configuration | null = null;
  private tokens: {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_at: number;
  } | null = null;
  private queue: PromiseQueue = new PromiseQueue();
  private oldCodes: Set<string> = new Set();

  constructor() {
    const raw = localStorage.getItem(REQUEST_STATE_KEY);
    if (raw) {
      try {
        this.requestState = JSON.parse(raw);
      } catch {
        this.requestState = null;
        localStorage.removeItem(REQUEST_STATE_KEY);
      }
    }
    // Only read tokens from localStorage once, here
    const tokenRaw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (tokenRaw) {
      try {
        this.tokens = JSON.parse(tokenRaw);
      } catch {
        this.tokens = null;
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  }

  private setTokens(tokens: typeof this.tokens) {
    this.tokens = tokens;
    if (tokens) {
      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }

  public async getAuthorizationUrl(prompt: 'login' | 'registration'): Promise<URL> {
    return this.queue.add(async (): Promise<URL> => {
      await this.#logout();
      const state = await this.#generateRequestState();
      const parameters: Record<string, string> = {
        redirect_uri: import.meta.env.VITE_AUTH_REDIRECT_URI,
        scope: OPENID_SCOPES,
        prompt,
        code_challenge: state.challenge,
        code_challenge_method: 'S256',
        state: state.state,
      }
      const config = await this.#getConfig();
      return client.buildAuthorizationUrl(config, parameters);
    }).promise;
  }

  public async handleRedirectResponse(url: URL): Promise<void> {
    return this.queue.add(async () => {
      const config = await this.#getConfig();
      if (!this.requestState) {
        throw new Error('No request state found');
      }
      const code = url.searchParams.get('code');
      if (!code) {
        throw new Error('No code found');
      }
      if (this.oldCodes.has(code)) {
        console.log('Already processed this code, skipping');
        return;
      }
      try {
        const tokenResp = await client.authorizationCodeGrant(config, url, {
          pkceCodeVerifier: this.requestState.verifier,
          expectedState: this.requestState.state,
        });
        const expires_at = this.computeExpiresAt(tokenResp.expires_in);
        this.setTokens({
          access_token: tokenResp.access_token,
          refresh_token: tokenResp.refresh_token,
          id_token: tokenResp.id_token,
          expires_at,
        });
      } finally {
        this.oldCodes.add(code);
      }
      // Clean up requestState from localStorage
      localStorage.removeItem(REQUEST_STATE_KEY);
      this.requestState = null;
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
        throw new Error('No access token found');
      }
      const config = await this.#getConfig();
      const {userinfo_endpoint} = config.serverMetadata();
      if (!userinfo_endpoint) {
        throw new Error('No userinfo endpoint found');
      }
      const response = await fetch(userinfo_endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      return response.json() as Whoami;
    }).promise;
  }

  async #getConfig(): Promise<client.Configuration> {
    if (this.config) {
      return this.config;
    }
    this.config = await client.discovery(new URL(import.meta.env.VITE_AUTH_URI), import.meta.env.VITE_AUTH_CLIENT_ID);
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
    this.requestState = requestState;
    localStorage.setItem(REQUEST_STATE_KEY, JSON.stringify(requestState));
    return requestState;
  }

  private computeExpiresAt(expires_in: number | undefined): number {
    const now = Math.floor(Date.now() / 1000);
    return expires_in ? now + expires_in : now + 3600;
  }

  async #getAccessToken(): Promise<string | null> {
    if (!this.tokens) {
      return null;
    }
    const now = Math.floor(Date.now() / 1000);
    // Refresh if token will expire within the next hour
    if (now + 3600 > this.tokens.expires_at) {
      const refreshToken = this.tokens.refresh_token;
      if (!refreshToken) {
        await this.logout();
        return null;
      }
      const config = await this.#getConfig();
      const refreshed = await client.refreshTokenGrant(config, refreshToken, { scopes: OPENID_SCOPES });
      const expires_at = this.computeExpiresAt(refreshed.expires_in);
      this.setTokens({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        id_token: refreshed.id_token,
        expires_at,
      });
      return refreshed.access_token;
    }
    return this.tokens.access_token;
  }

  #logout() {
    this.config = null;
    this.requestState = null;
    this.setTokens(null);
    // Clean up requestState from localStorage
    localStorage.removeItem(REQUEST_STATE_KEY);
  }
}

export type OpenIdManager = typeof OpenidManager;
