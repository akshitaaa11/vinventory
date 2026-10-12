import * as oidc from "openid-client";
import { z } from "zod";

import type {
  OidcClient,
  OidcTransaction,
  VerifiedIdentity,
} from "./types.js";

const identityClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  name: z.string().trim().min(1).optional(),
});

export type VAuthClientConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  allowInsecureRequests: boolean;
};

export class VAuthOidcClient implements OidcClient {
  readonly #settings: VAuthClientConfig;
  #configuration: Promise<oidc.Configuration> | undefined;

  constructor(settings: VAuthClientConfig) {
    this.#settings = settings;
  }

  async #getConfiguration(): Promise<oidc.Configuration> {
    this.#configuration ??= oidc.discovery(
      new URL(this.#settings.issuer),
      this.#settings.clientId,
      this.#settings.clientSecret,
      oidc.ClientSecretPost(this.#settings.clientSecret),
      this.#settings.allowInsecureRequests
        ? { execute: [oidc.allowInsecureRequests] }
        : undefined,
    );

    return this.#configuration;
  }

  async createAuthorizationRequest(returnTo: string): Promise<{
    authorizationUrl: string;
    transaction: OidcTransaction;
  }> {
    const configuration = await this.#getConfiguration();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();

    const authorizationUrl = oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: this.#settings.redirectUri,
      scope: "openid profile email",
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      nonce,
    });

    return {
      authorizationUrl: authorizationUrl.href,
      transaction: {
        codeVerifier,
        state,
        nonce,
        returnTo,
        createdAt: Date.now(),
      },
    };
  }

  async exchangeCallback(
    callbackUrl: URL,
    transaction: OidcTransaction,
  ): Promise<VerifiedIdentity> {
    const configuration = await this.#getConfiguration();
    const tokens = await oidc.authorizationCodeGrant(
      configuration,
      callbackUrl,
      {
        pkceCodeVerifier: transaction.codeVerifier,
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
        idTokenExpected: true,
      },
    );
    const claims = identityClaimsSchema.parse(tokens.claims());

    return {
      provider: "vauth",
      subject: claims.sub,
      displayName: claims.name ?? claims.email.split("@")[0] ?? claims.email,
      email: claims.email.toLowerCase(),
    };
  }
}
