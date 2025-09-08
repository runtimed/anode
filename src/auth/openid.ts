import type {
  Configuration,
  TokenEndpointResponse,
  TokenEndpointResponseHelpers,
} from "openid-client";
import * as openidClient from "openid-client";
import { decodeJwt } from "jose";
import {
  Observable,
  from,
  shareReplay,
  switchMap,
  map,
  Subject,
  startWith,
  filter,
  of,
  catchError,
  combineLatest,
  finalize,
  interval,
  tap,
  throwError,
} from "rxjs";

export type UserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  family_name?: string;
  given_name?: string;
  name?: string;
  picture?: string;
};

export type User = {
  accessToken: string;
  claims: UserInfo;
};

interface RequestState {
  verifier: string;
  challenge: string;
  state: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  claims: UserInfo;
}

export type RedirectUrls = {
  loginUrl: URL;
  registrationUrl: URL;
};

export enum LocalStorageKey {
  RequestState = "openid_request_state",
  Tokens = "openid_tokens",
  LocalAuthRegistration = "local-auth-registration",
}

const OPENID_SCOPES = "openid email profile offline_access";

function computeExpiresAt(expires_in: number | undefined): number {
  const now = Math.floor(Date.now() / 1000);
  return expires_in ? now + expires_in : now + 3600;
}

function convertToUserInfo(
  response: TokenEndpointResponse & TokenEndpointResponseHelpers
): UserInfo {
  const claims = response.claims();
  if (!claims) {
    throw new Error("No claims available from the token");
  }
  const userInfo: UserInfo = {
    sub: claims.sub,
    email: claims.email as string,
    email_verified: (claims.email_verified as boolean | undefined) ?? false,
  };
  // Be careful to not pass through null values,
  // as the LiveStore spec requires optional fields to be undefined
  if (typeof claims.family_name === "string") {
    userInfo.family_name = claims.family_name;
  }
  if (typeof claims.given_name === "string") {
    userInfo.given_name = claims.given_name;
  }
  if (typeof claims.name === "string") {
    userInfo.name = claims.name;
  }
  if (typeof claims.picture === "string") {
    userInfo.picture = claims.picture;
  }
  return userInfo;
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
  private client = openidClient;
  private tokens$: Observable<Tokens | null> | null = null;
  private refreshedToken$: Observable<Tokens | null> | null = null;
  private convertedCodes$: Observable<Tokens> | null = null;
  private freshness$: Observable<void> | null = null;

  public setClient(client: typeof openidClient): void {
    // Used for unit testing to override the client
    this.client = client;
  }

  public getRedirectUrls(): Observable<RedirectUrls> {
    return this.resetSubject$.pipe(
      startWith(null), // Trigger initial load
      switchMap(() =>
        combineLatest([this.getAuthorizationSecrets(), this.getConfig()]).pipe(
          map(([secrets, config]) => {
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

            const registrationUrl = this.client.buildAuthorizationUrl(config, {
              ...parameters,
              prompt: "registration",
            });

            return {
              loginUrl,
              registrationUrl,
            };
          })
        )
      ),
      shareReplay(1)
    );
  }

  public getUser(): Observable<User | null> {
    return this.getTokens().pipe(
      map((tokens) =>
        tokens
          ? { accessToken: tokens.accessToken, claims: tokens.claims }
          : null
      )
    );
  }

  public handleRedirect(): Observable<Tokens> {
    if (!this.convertedCodes$) {
      const url = new URL(window.location.href);
      this.convertedCodes$ = this.convertCodeToToken(url).pipe(shareReplay(1));
    }

    return this.convertedCodes$;
  }

  public keepFresh(): Observable<void> {
    // We want to keep the access token valid, so we don't hit any auth issues
    // This is a simple solution to accomplish this, just by triggering the tokenChangeSubject
    // every minute. As a side effect, this re-triggers getTokens()
    // (Note if we just mapped/called getTokens, it wouldn't do anything since
    // the source stream is $this.tokenChangeSubject
    // Consider this observable for refactorin in the future, but this is a
    // simple, easily verifiable solution.
    if (!this.freshness$) {
      this.freshness$ = interval(60 * 1000).pipe(
        map(() => {}),
        tap(() => {
          this.tokenChangeSubject$.next(LocalStorageKey.Tokens);
        }),
        shareReplay(1)
      );
    }
    return this.freshness$;
  }

  public reset(): void {
    this.config$ = null;
    this.authorizationSecrets$ = null;
    this.refreshedToken$ = null;
    this.convertedCodes$ = null;
    this.syncToLocalStorage(LocalStorageKey.RequestState, null);
    this.syncToLocalStorage(LocalStorageKey.Tokens, null);
    this.syncToLocalStorage(LocalStorageKey.LocalAuthRegistration, null);
    this.resetSubject$.next();
    // Note: Do NOT clear the tokens$ observable, because we want people to continue subscribing to it
    // $tokens will emit `null` due to the localStorage side-effect
  }

  private getTokens(): Observable<Tokens | null> {
    if (!this.tokens$) {
      this.tokens$ = this.tokenChangeSubject$.pipe(
        startWith(LocalStorageKey.Tokens), // Trigger initial load
        filter((key) => key === LocalStorageKey.Tokens),
        switchMap(() => {
          const tokens = this.getFromLocalStorage<Tokens>(
            LocalStorageKey.Tokens
          );
          if (!tokens) {
            return of(null);
          }

          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = tokens.expiresAt - now;
          const shouldRefresh = timeUntilExpiry <= 60; // 1 minute threshold

          if (shouldRefresh) {
            // If expired or about to expire, trigger refresh
            return this.refreshTokens(tokens.refreshToken);
          }

          return of(tokens);
        }),
        shareReplay(1)
      );
    }
    return this.tokens$;
  }

  private refreshTokens(refreshToken: string): Observable<Tokens | null> {
    if (!this.refreshedToken$) {
      const oldTokens = this.getFromLocalStorage<Tokens>(
        LocalStorageKey.Tokens
      );
      this.refreshedToken$ = this.getConfig().pipe(
        switchMap((config) =>
          from(
            this.client.refreshTokenGrant(config, refreshToken, {
              scopes: OPENID_SCOPES,
            })
          )
        ),
        map((response): Tokens => {
          if (!response.refresh_token) {
            throw new Error("No refresh token returned from server");
          }
          let claims: UserInfo;
          if (response.claims()) {
            claims = convertToUserInfo(response);
          } else {
            // According to the spec, the /token endpoint does not have to return an id_token
            // when using the grant_type=refresh_token
            // https://openid.net/specs/openid-connect-core-1_0.html#RefreshTokenResponse
            // This means the claims() are undefined, since those are part of the id_token per-spec

            // So, what we'll do instead is re-use the existing claims. First, we need to double-check
            // that the sub is the same. If the oldTokens are missing, or the sub is different
            // we'll throw an error and the user will have to log in again

            // Technically, per spec, the access_token doesn't need to be a JWT but in practice the providers
            // we care about send a JWT for the access token as well.
            // If this becomes a problem later, we can make sure we have the oldTokens in sync and skip the decoding
            const jwt = decodeJwt(response.access_token);
            if (
              typeof jwt.sub !== "string" ||
              !jwt.sub ||
              jwt.sub !== oldTokens?.claims.sub
            ) {
              throw new Error(
                "Missing id_token and mismatch with previous claims"
              );
            }
            claims = oldTokens.claims;
          }
          const expiresAt = computeExpiresAt(response.expires_in);

          const refreshedTokens: Tokens = {
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            expiresAt,
            claims,
          };

          this.syncToLocalStorage(LocalStorageKey.Tokens, refreshedTokens);
          return refreshedTokens;
        }),
        catchError((error) => {
          this.syncToLocalStorage(LocalStorageKey.Tokens, null);
          throw error;
        }),
        finalize(() => {
          // Now that we've completed the refresh
          // clear the observable, so that we'll trigger a fresh attempt
          // the next time
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

              this.syncToLocalStorage(
                LocalStorageKey.RequestState,
                requestState
              );
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
    return combineLatest([
      this.getConfig(),
      of(this.getFromLocalStorage<RequestState>(LocalStorageKey.RequestState)),
    ]).pipe(
      switchMap(([config, requestState]) => {
        if (!requestState) {
          throw new Error(
            "Missing pre-login secrets. Is localstorage enabled?"
          );
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
        const claims = convertToUserInfo(tokenResp);
        const expiresAt = computeExpiresAt(tokenResp.expires_in);

        const tokens: Tokens = {
          accessToken: tokenResp.access_token,
          refreshToken: tokenResp.refresh_token,
          expiresAt,
          claims,
        };

        this.syncToLocalStorage(LocalStorageKey.Tokens, tokens);
        return tokens;
      })
    );
  }

  private getConfig(): Observable<Configuration> {
    if (!this.config$) {
      // Check if auth configuration is present
      const authUri = import.meta.env.VITE_AUTH_URI;
      const clientId = import.meta.env.VITE_AUTH_CLIENT_ID;

      if (!authUri || !clientId) {
        this.config$ = throwError(
          () =>
            new Error(
              "Authentication not configured. Please set VITE_AUTH_URI and VITE_AUTH_CLIENT_ID environment variables."
            )
        ).pipe(shareReplay(1));
      } else {
        const url = new URL(authUri);
        const allowInsecure =
          url.hostname === "localhost" &&
          url.protocol === "http:" &&
          clientId === "local-anode-client";

        const discoveryOptions = allowInsecure
          ? { execute: [this.client.allowInsecureRequests] }
          : {};

        this.config$ = from(
          this.client.discovery(
            url,
            clientId,
            undefined,
            undefined,
            discoveryOptions
          )
        ).pipe(shareReplay(1));
      }
    }
    return this.config$;
  }

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
}
