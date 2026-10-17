import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { VAuthOidcClient } from "./oidc.js";

const issuer = "https://accounts.vosslabs.org/api/auth";
const discoveryUrl = `${issuer}/.well-known/openid-configuration`;
const redirectUri = "http://localhost:5173/api/auth/oauth2/callback/voss";
let keys: CryptoKeyPair;
let publicJwk: JsonWebKey;

beforeAll(async () => {
  keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  publicJwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
});
afterEach(() => vi.unstubAllGlobals());

async function fixture(options: { claims?: Record<string, unknown>; badSignature?: boolean; metadataIssuer?: string } = {}) {
  let nonce = "";
  const tokenRequest = vi.fn();
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === discoveryUrl) return Response.json({
      issuer: options.metadataIssuer ?? issuer,
      authorization_endpoint: `${issuer}/oauth2/authorize`,
      token_endpoint: `${issuer}/oauth2/token`,
      jwks_uri: `${issuer}/jwks`,
      response_types_supported: ["code"], subject_types_supported: ["public"],
      token_endpoint_auth_methods_supported: ["client_secret_post"],
      code_challenge_methods_supported: ["S256"],
      authorization_response_iss_parameter_supported: true,
      id_token_signing_alg_values_supported: ["EdDSA"],
    });
    if (url === `${issuer}/jwks`) return Response.json({ keys: [{ ...publicJwk, kid: "test-key", alg: "EdDSA", use: "sig" }] });
    if (url === `${issuer}/oauth2/token`) {
      tokenRequest(init);
      const now = Math.floor(Date.now() / 1000);
      const encode = (data: unknown) => Buffer.from(JSON.stringify(data)).toString("base64url");
      const payload = `${encode({ alg: "EdDSA", kid: "test-key" })}.${encode({
        iss: issuer, aud: "test-client", sub: "test-subject", iat: now, exp: now + 300,
        nonce, email: "Test.Student@vit.edu.in", email_verified: true,
        ...options.claims,
      })}`;
      const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", keys.privateKey, Buffer.from(payload)));
      if (options.badSignature) signature[0] = (signature[0] ?? 0) ^ 1;
      return Response.json({ access_token: "test-access", token_type: "Bearer", expires_in: 300,
        id_token: `${payload}.${Buffer.from(signature).toString("base64url")}` });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const client = new VAuthOidcClient({ issuer, discoveryUrl, redirectUri,
    clientId: "test-client", clientSecret: "test-secret", allowInsecureRequests: false });
  const authorization = await client.createAuthorizationRequest("/loans");
  nonce = authorization.transaction.nonce;
  const callback = new URL(redirectUri);
  callback.search = new URLSearchParams({ code: "test-code", state: authorization.transaction.state, iss: issuer }).toString();
  return { client, ...authorization, callback, tokenRequest, fetchMock };
}

describe("VAuth OIDC adapter", () => {
  it("uses explicit hosted discovery, PKCE S256, state, nonce and the registered callback", async () => {
    const result = await fixture();
    const url = new URL(result.authorizationUrl);
    expect(result.fetchMock.mock.calls[0]?.[0]).toBe(discoveryUrl);
    expect(url.origin + url.pathname).toBe(`${issuer}/oauth2/authorize`);
    expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
    expect(url.searchParams.get("scope")).toBe("openid profile email");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    const expectedChallenge = Buffer.from(await crypto.subtle.digest("SHA-256", Buffer.from(result.transaction.codeVerifier))).toString("base64url");
    expect(url.searchParams.get("code_challenge")).toBe(expectedChallenge);
    expect(url.searchParams.get("state")).toBe(result.transaction.state);
    expect(url.searchParams.get("nonce")).toBe(result.transaction.nonce);
    const identity = await result.client.exchangeCallback(result.callback, result.transaction);
    expect(identity).toEqual({ provider: "vauth", subject: "test-subject", email: "test.student@vit.edu.in", displayName: "Test.Student" });
    const request = result.tokenRequest.mock.calls[0]?.[0] as RequestInit;
    const body = new URLSearchParams(String(request.body));
    expect(body.get("client_id")).toBe("test-client");
    expect(body.get("client_secret")).toBe("test-secret");
    expect(body.get("code_verifier")).toBe(result.transaction.codeVerifier);
    expect(body.get("redirect_uri")).toBe(redirectUri);
    expect(result.fetchMock.mock.calls.some(([input]) => String(input) === `${issuer}/jwks`)).toBe(true);
  });

  it.each(["", "   ", null, undefined])("uses an email fallback when name is %s", async (name) => {
    const result = await fixture({ claims: { name } });
    expect((await result.client.exchangeCallback(result.callback, result.transaction)).displayName).toBe("Test.Student");
  });

  it.each([
    { email_verified: false }, { email_verified: undefined },
    { iss: "https://untrusted.example" }, { aud: "another-client" },
    { exp: Math.floor(Date.now() / 1000) - 3600 }, { nonce: "wrong-nonce" },
  ])("rejects invalid identity/token claims: %j", async (claims) => {
    const result = await fixture({ claims });
    await expect(result.client.exchangeCallback(result.callback, result.transaction)).rejects.toThrow();
  });

  it("rejects an invalid EdDSA signature", async () => {
    const result = await fixture({ badSignature: true });
    await expect(result.client.exchangeCallback(result.callback, result.transaction)).rejects.toThrow();
  });

  it("rejects mismatched callback state before exchanging the code", async () => {
    const result = await fixture();
    result.callback.searchParams.set("state", "wrong-state");
    await expect(result.client.exchangeCallback(result.callback, result.transaction)).rejects.toThrow();
    expect(result.tokenRequest).not.toHaveBeenCalled();
  });

  it("rejects a discovery document advertising a different issuer", async () => {
    await expect(fixture({ metadataIssuer: "https://untrusted.example" })).rejects.toThrow(/discovery issuer/);
  });
});
