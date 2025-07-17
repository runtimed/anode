import * as client from 'openid-client';
import PromiseQueue from '../util/promise-queue';

interface RequestState {
  verifier: string;
  challenge: string;
  state: string;
}

export type Whoami = Record<string, any>;

const OPENID_SCOPES = 'openid email profile offline_access';
export default class OpenidManager {
  private requestState: RequestState | null = null;
  private config: client.Configuration | null = null;
  private tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers | null = null;
  private queue: PromiseQueue = new PromiseQueue();

  constructor() {
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
      this.tokens = await client.authorizationCodeGrant(config, url, {
        pkceCodeVerifier: this.requestState.verifier,
        expectedState: this.requestState.state,
      });
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
    const verifier = client.randomPKCECodeVerifier()
    const challenge = await client.calculatePKCECodeChallenge(verifier);
    const state = client.randomState();
    const requestState = {
      verifier,
      challenge,
      state,
    }
    this.requestState = requestState;
    return requestState;
  }

  async #getAccessToken(): Promise<string | null> {
    if (!this.tokens) {
      return null;
    }
    const expiresIn = this.tokens.expiresIn();
    if (expiresIn !== undefined && expiresIn < 60) {
      const refreshToken = this.tokens.refresh_token;
      if (!refreshToken) {
        await this.logout();
        return null;
      }
      // The token is going to expire within 60 seconds, so refresh it first before returning
      const config = await this.#getConfig();
      client.refreshTokenGrant(config, refreshToken, {scopes: OPENID_SCOPES}, )
    }
    return this.tokens.access_token;
  }

  #logout() {
    this.config = null;
    this.requestState = null;
    this.tokens = null;
  }
}
