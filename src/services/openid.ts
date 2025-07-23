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
  filter,
  of,
  catchError,
  tap,
  mergeMap,
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
  ) => Promise<TokenEndpointResponse & TokenEndpointResponseHelpers>;
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

const OPENID_SCOPES = "openid email profile offline_access";

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
  private tokenChangeSubject$ = new Subject<LocalStorageKey>();
  private client: OpenIdClient = openidClient;
  private refreshedToken$: Observable<Tokens | null> | null = null;

  private syncToLocalStorage(key: LocalStorageKey, value: any): void {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
    this.tokenChangeSubject$.next(key);
  }

  private getFromLocalStorage<T>(key: LocalStorageKey): T | null {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

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
                  scope: OPENID_SCOPES,
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

  public getAccessToken(): Observable<string | null> {
    return this.tokenChangeSubject$.pipe(
      startWith(LocalStorageKey.Tokens), // Trigger initial load
      filter(key => key === LocalStorageKey.Tokens),
      mergeMap(() => {
        const tokens = this.getFromLocalStorage<Tokens>(LocalStorageKey.Tokens);
        if (!tokens) {
          return of(null);
        }

        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = tokens.expiresAt - now;
        const shouldRefresh = timeUntilExpiry <= 60; // 1 minute threshold

        if (shouldRefresh) {
          // If expired or about to expire, trigger refresh
          return this.refreshTokens(tokens.refreshToken).pipe(
            map(refreshedTokens => refreshedTokens?.accessToken || null),
            catchError(() => of(null))
          );
        }

        return of(tokens.accessToken);
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
    this.refreshedToken$ = null;
    this.syncToLocalStorage(LocalStorageKey.RequestState, null);
    this.syncToLocalStorage(LocalStorageKey.Tokens, null);
    this.resetSubject$.next();
  }

  private refreshTokens(refreshToken: string): Observable<Tokens | null> {
    if (!this.refreshedToken$) {
      this.refreshedToken$ = this.getConfig().pipe(
        switchMap(config =>
          from(this.client.refreshTokenGrant(config, refreshToken, {
            scopes: OPENID_SCOPES,
          }))
        ),
        map((response): Tokens => {
          if (!response.refresh_token) {
            throw new Error("No refresh token returned from server");
          }
          const expiresAt = computeExpiresAt(response.expires_in);

          const refreshedTokens = {
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            expiresAt,
          };

          this.syncToLocalStorage(LocalStorageKey.Tokens, refreshedTokens);
          return refreshedTokens;
        }),
        catchError(error => {
          // Clear tokens on refresh failure
          this.syncToLocalStorage(LocalStorageKey.Tokens, null);
          throw error;
        }),
        tap(() => {
          // Reset the refresh observable after completion
          this.refreshedToken$ = null;
        }),
        shareReplay(1)
      );
    }
    return this.refreshedToken$;
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

              this.syncToLocalStorage(LocalStorageKey.RequestState, requestState);
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
        const requestState = this.getFromLocalStorage<RequestState>(
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

        this.syncToLocalStorage(LocalStorageKey.Tokens, tokens);
        return tokens;
      })
    );
  }

  private getConfig(): Observable<Configuration> {
    if (!this.config$) {
      this.config$ = from(
        this.client.discovery(
          new URL(import.meta.env.VITE_AUTH_URI || ''),
          import.meta.env.VITE_AUTH_CLIENT_ID || ''
        )
      ).pipe(shareReplay(1));
    }
    return this.config$;
  }
}
