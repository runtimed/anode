import type { discovery, Configuration, DPoPOptions, TokenEndpointResponseHelpers } from "openid-client";
import { Observable, from, shareReplay } from "rxjs";

export interface OpenIdClient {
  discovery: typeof discovery;
  randomPKCECodeVerifier: () => string;
  calculatePKCECodeChallenge: (verifier: string) => Promise<string>;
  randomState: () => string;
  buildAuthorizationUrl: (config: Configuration, parameters: URLSearchParams | Record<string, string>) => URL;
  refreshTokenGrant: (config: Configuration, refreshToken: string, parameters?: URLSearchParams | Record<string, string>, options?: DPoPOptions) =>
    Promise<TokenEndpointResponseHelpers>;
}

export interface RequestState {
  verifier: string;
  challenge: string;
  state: string;
}

export class OpenIdService {
  private config$: Observable<Configuration> | null = null;

  constructor(private client: OpenIdClient) { }

  public getConfig(): Observable<Configuration> {
    if (!this.config$) {
      this.config$ = new Observable<Configuration>((observer => from(this.client.discovery(
        new URL(import.meta.env.VITE_AUTH_URI),
        import.meta.env.VITE_AUTH_CLIENT_ID,
      )).subscribe(observer))).pipe(shareReplay());
    }
    return this.config$;
  }
}
