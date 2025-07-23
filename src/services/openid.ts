import type {
  discovery,
  Configuration,
  DPoPOptions,
  TokenEndpointResponseHelpers,
  TokenEndpointResponse,
  AuthorizationCodeGrantChecks,
  AuthorizationCodeGrantOptions,
} from "openid-client";
import * as openidClient from "openid-client";
import {
  Observable,
  from,
  shareReplay,
  switchMap,
  map,
  Subject,
  startWith,
  take,
} from "rxjs";

export interface OpenIdClient {
  discovery: typeof discovery;
  randomPKCECodeVerifier: () => string;
  calculatePKCECodeChallenge: (verifier: string) => Promise<string>;
  randomState: () => string;
  buildAuthorizationUrl: (
    config: Configuration,
    parameters: URLSearchParams | Record<string, string>
  ) => URL;
  refreshTokenGrant: (
    config: Configuration,
    refreshToken: string,
    parameters?: URLSearchParams | Record<string, string>,
    options?: DPoPOptions
  ) => Promise<TokenEndpointResponseHelpers>;
  authorizationCodeGrant: (
    config: Configuration,
    currentUrl: URL | Request,
    checks?: AuthorizationCodeGrantChecks,
    tokenEndpointParameters?: URLSearchParams | Record<string, string>,
    options?: AuthorizationCodeGrantOptions
  ) => Promise<TokenEndpointResponse & TokenEndpointResponseHelpers>;
}

interface RequestState {
  verifier: string;
  challenge: string;
  state: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface RedirectUrls {
  loginUrl: URL;
  registrationUrl: URL;
}

enum LocalStorageKey {
  RequestState = "openid_request_state",
  Tokens = "openid_tokens",
}

function syncToLocalStorage(key: LocalStorageKey, value: any): void {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function getFromLocalStorage<T>(key: LocalStorageKey): T | null {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

function computeExpiresAt(expires_in: number | undefined): number {
  const now = Math.floor(Date.now() / 1000);
  return expires_in ? now + expires_in : now + 3600;
}

let singleton: OpenIdService | null = null;

export function getOpenIdService(): OpenIdService {
  if (!singleton) {
    singleton = new OpenIdService();
  }
  return singleton;
}

export class OpenIdService {
  private config$: Observable<Configuration> | null = null;
  private authorizationSecrets$: Observable<RequestState> | null = null;
  private resetSubject$ = new Subject<void>();
  private client: OpenIdClient = openidClient;

  public setClient(client: OpenIdClient): void {
    // Used for unit testing to override the client
    this.client = client;
  }

  public getRedirectUrls(): Observable<RedirectUrls> {
    return this.resetSubject$.pipe(
      startWith(null), // Trigger initial load
      switchMap(() => {
        return this.getAuthorizationSecrets().pipe(
          switchMap((secrets) => {
            return this.getConfig().pipe(
              map((config) => {
                const parameters: Record<string, string> = {
                  redirect_uri: import.meta.env.VITE_AUTH_REDIRECT_URI,
                  scope: "openid email profile offline_access",
                  code_challenge: secrets.challenge,
                  code_challenge_method: "S256",
                  state: secrets.state,
                };

                const loginUrl = this.client.buildAuthorizationUrl(config, {
                  ...parameters,
                  prompt: "login",
                });

                const registrationUrl = this.client.buildAuthorizationUrl(
                  config,
                  {
                    ...parameters,
                    prompt: "registration",
                  }
                );

                return {
                  loginUrl,
                  registrationUrl,
                };
              })
            );
          })
        );
      }),
      shareReplay(1)
    );
  }

  public handleRedirect(url: URL): Observable<void> {
    return this.convertCodeToToken(url).pipe(
      map(() => { }),
      take(1)
    );
  }

  public reset(): void {
    this.config$ = null;
    this.authorizationSecrets$ = null;
    syncToLocalStorage(LocalStorageKey.RequestState, null);
    syncToLocalStorage(LocalStorageKey.Tokens, null);
    this.resetSubject$.next();
  }

  private getAuthorizationSecrets(): Observable<RequestState> {
    if (!this.authorizationSecrets$) {
      this.authorizationSecrets$ = this.getConfig().pipe(
        switchMap(() => {
          const verifier = this.client.randomPKCECodeVerifier();
          const challengePromise =
            this.client.calculatePKCECodeChallenge(verifier);
          const state = this.client.randomState();

          return from(challengePromise).pipe(
            map((challenge) => {
              const requestState: RequestState = {
                verifier,
                challenge,
                state,
              };

              syncToLocalStorage(LocalStorageKey.RequestState, requestState);
              return requestState;
            })
          );
        }),
        shareReplay(1)
      );
    }
    return this.authorizationSecrets$;
  }

  private convertCodeToToken(url: URL): Observable<Tokens> {
    return this.getConfig().pipe(
      switchMap((config) => {
        const requestState = getFromLocalStorage<RequestState>(
          LocalStorageKey.RequestState
        );
        if (!requestState) {
          throw new Error("Missing pre-login secrets. Is localstorage enabled?");
        }
        return from(
          this.client.authorizationCodeGrant(config, url, {
            pkceCodeVerifier: requestState.verifier,
            expectedState: requestState.state,
          })
        );
      }),
      map((tokenResp): Tokens => {
        if (!tokenResp.refresh_token) {
          throw new Error("No refresh token returned from server");
        }
        const expiresAt = computeExpiresAt(tokenResp.expires_in);

        const tokens = {
          accessToken: tokenResp.access_token,
          refreshToken: tokenResp.refresh_token,
          expiresAt,
        };

        syncToLocalStorage(LocalStorageKey.Tokens, tokens);
        return tokens;
      })
    );
  }

  private getConfig(): Observable<Configuration> {
    if (!this.config$) {
      this.config$ = from(
        this.client.discovery(
          new URL(import.meta.env.VITE_AUTH_URI),
          import.meta.env.VITE_AUTH_CLIENT_ID
        )
      ).pipe(shareReplay(1));
    }
    return this.config$;
  }
}
