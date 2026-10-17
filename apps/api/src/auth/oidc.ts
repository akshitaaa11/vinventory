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
  email_verified: z.literal(true),
  name: z.string().trim().nullish(),
});

export type VAuthClientConfig = {
  issuer: string;
  discoveryUrl: string;
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
    this.#configuration ??= this.#discover().catch((error: unknown) => {
      this.#configuration = undefined;
      throw error;
    });
    return this.#configuration;
  }

  async #discover(): Promise<oidc.Configuration> {
    const configuration = await oidc.discovery(
      new URL(this.#settings.discoveryUrl),
      this.#settings.clientId,
      { client_secret: this.#settings.clientSecret, id_token_signed_response_alg: "EdDSA" },
      oidc.ClientSecretPost(this.#settings.clientSecret),
      { timeout: 10, execute: [
        oidc.enableNonRepudiationChecks,
        ...(this.#settings.allowInsecureRequests ? [oidc.allowInsecureRequests] : []),
      ] },
    );
    // Explicit discovery URLs bypass openid-client's automatic issuer comparison.
    if (configuration.serverMetadata().issuer !== this.#settings.issuer) {
      throw new Error("VAuth discovery issuer does not match the configured issuer");
    }
    return configuration;
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
      displayName: claims.name || claims.email.split("@")[0] || claims.email,
      email: claims.email.toLowerCase(),
    };
  }
}
