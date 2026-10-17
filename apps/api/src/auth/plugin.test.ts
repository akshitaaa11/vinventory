import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../app.js";
import type {
  AuthRepository,
  CurrentUser,
  LabPermission,
  OidcClient,
  OidcTransaction,
  VerifiedIdentity,
} from "./types.js";

const testUser: CurrentUser = {
  id: "6fdf4a64-3c26-44dc-8c94-22ddfc42063b",
  displayName: "Test Student",
  email: "student@example.edu",
  accountType: "student",
};

function cookieFrom(
  headers: Record<string, string | string[] | number | undefined>,
  name: string,
): string {
  const raw = headers["set-cookie"];
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? [raw]
      : [];
  const cookie = values.find((value) => value.startsWith(`${name}=`));

  if (!cookie) {
    throw new Error(`Missing ${name} cookie`);
  }

  return cookie.split(";", 1)[0] ?? cookie;
}

function createFixture(permissionGranted = true) {
  let activeSessionHash: string | null = null;

  const repository: AuthRepository = {
    upsertIdentity: vi.fn(async () => testUser),
    createSession: vi.fn(async (input) => {
      activeSessionHash = input.tokenHash;
    }),
    findActiveSession: vi.fn(async (tokenHash) =>
      tokenHash === activeSessionHash ? testUser : null,
    ),
    revokeSession: vi.fn(async (tokenHash) => {
      if (tokenHash === activeSessionHash) {
        activeSessionHash = null;
      }
    }),
    hasLabPermission: vi.fn(
      async (_userId: string, _labId: string, _permission: LabPermission) =>
        permissionGranted,
    ),
  };

  const transaction: OidcTransaction = {
    codeVerifier: "test-code-verifier",
    state: "test-state",
    nonce: "test-nonce",
    returnTo: "/loans",
    createdAt: Date.now(),
  };
  const oidcClient: OidcClient = {
    createAuthorizationRequest: vi.fn(async (returnTo) => ({
      authorizationUrl: "https://accounts.example.edu/authorize?state=test-state",
      transaction: { ...transaction, returnTo },
    })),
    exchangeCallback: vi.fn(
      async (_callbackUrl: URL, _transaction: OidcTransaction): Promise<VerifiedIdentity> => ({
        provider: "vauth",
        subject: "vauth-user-1",
        displayName: testUser.displayName,
        email: testUser.email!,
      }),
    ),
  };

  return { repository, oidcClient };
}

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function createAuthenticatedApp(permissionGranted = true) {
  const fixture = createFixture(permissionGranted);
  const app = await buildApp({
    logger: false,
    auth: {
      ...fixture,
      cookieSecret: "test-cookie-secret-that-is-at-least-32-characters",
      secureCookies: false,
      sessionTtlHours: 12,
      webOrigin: "http://localhost:5173",
      callbackUrl: "http://localhost:5173/api/auth/oauth2/callback/voss",
    },
  });
  apps.push(app);
  return { app, ...fixture };
}

describe("authentication boundary", () => {
  it("returns a failed provider connection to the landing page with a readable error state", async () => {
    const { app, oidcClient } = await createAuthenticatedApp();
    vi.mocked(oidcClient.createAuthorizationRequest).mockRejectedValueOnce(new Error("Provider unavailable"));
    const response = await app.inject({ method: "GET", url: "/auth/login?returnTo=%2Flabs" });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("http://localhost:5173/?authError=provider_unavailable");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("preserves the labs destination through hosted login and rejects cross-origin logout", async () => {
    const { app, repository } = await createAuthenticatedApp();
    const login = await app.inject({ method: "GET", url: "/auth/login?returnTo=%2Flabs" });
    const callback = await app.inject({ method: "GET", url: "/api/auth/oauth2/callback/voss?code=test-code&state=test-state",
      headers: { cookie: cookieFrom(login.headers, "vinventory_oidc") } });
    expect(callback.headers.location).toBe("http://localhost:5173/labs");
    const logout = await app.inject({ method: "POST", url: "/auth/logout",
      headers: { origin: "https://untrusted.example", cookie: cookieFrom(callback.headers, "vinventory_session") } });
    expect(logout.statusCode).toBe(403);
    expect(repository.revokeSession).not.toHaveBeenCalled();
  });

  it("requires a signed login transaction on the registered callback", async () => {
    const { app, repository } = await createAuthenticatedApp();
    const response = await app.inject({ method: "GET", url: "/api/auth/oauth2/callback/voss?code=unsolicited&state=invalid" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid_login_state" });
    expect(repository.createSession).not.toHaveBeenCalled();
    expect((await app.inject({ method: "GET", url: "/auth/callback" })).statusCode).toBe(404);
  });

  it("rejects a protected route without a local session", async () => {
    const { app } = await createAuthenticatedApp();

    const response = await app.inject({ method: "GET", url: "/api/me" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "authentication_required" });
  });

  it("does not create an identity or session when token verification fails", async () => {
    const { app, oidcClient, repository } = await createAuthenticatedApp();
    vi.mocked(oidcClient.exchangeCallback).mockRejectedValueOnce(new Error("Invalid signature"));
    const login = await app.inject({ method: "GET", url: "/auth/login" });
    const response = await app.inject({ method: "GET", url: "/api/auth/oauth2/callback/voss?code=bad&state=test-state",
      headers: { cookie: cookieFrom(login.headers, "vinventory_oidc") } });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid_auth_callback" });
    expect(repository.upsertIdentity).not.toHaveBeenCalled();
    expect(repository.createSession).not.toHaveBeenCalled();
    expect(response.headers["set-cookie"]).toEqual(expect.stringContaining("vinventory_oidc=;"));
  });

  it("completes OIDC login and creates an app-owned session", async () => {
    const { app, oidcClient, repository } = await createAuthenticatedApp();
    const login = await app.inject({
      method: "GET",
      url: "/auth/login?returnTo=%2Floans",
    });

    expect(login.statusCode).toBe(302);
    expect(login.headers.location).toContain("https://accounts.example.edu/authorize");

    const loginCookie = cookieFrom(login.headers, "vinventory_oidc");
    const callback = await app.inject({
      method: "GET",
      url: "/api/auth/oauth2/callback/voss?code=test-code&state=test-state",
      headers: { cookie: loginCookie },
    });

    expect(callback.statusCode).toBe(302);
    expect(callback.headers.location).toBe("http://localhost:5173/loans");
    expect(oidcClient.exchangeCallback).toHaveBeenCalledWith(
      new URL("http://localhost:5173/api/auth/oauth2/callback/voss?code=test-code&state=test-state"),
      expect.objectContaining({ state: "test-state", nonce: "test-nonce" }),
    );
    expect(repository.upsertIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "vauth", subject: "vauth-user-1" }),
    );
    expect(repository.createSession).toHaveBeenCalledOnce();

    const sessionCookie = cookieFrom(callback.headers, "vinventory_session");
    const me = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: sessionCookie },
    });

    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({ user: testUser });

    const logout = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { cookie: sessionCookie },
    });
    const afterLogout = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: sessionCookie },
    });

    expect(logout.statusCode).toBe(204);
    expect(repository.revokeSession).toHaveBeenCalledOnce();
    expect(afterLogout.statusCode).toBe(401);
  });

  it("does not allow an external return URL", async () => {
    const { app, oidcClient } = await createAuthenticatedApp();

    await app.inject({
      method: "GET",
      url: "/auth/login?returnTo=%2F%5Cevil.example",
    });

    expect(oidcClient.createAuthorizationRequest).toHaveBeenCalledWith("/");
  });

  it("enforces app-owned lab permissions after authentication", async () => {
    const { app, repository } = await createAuthenticatedApp(false);
    const login = await app.inject({ method: "GET", url: "/auth/login" });
    const callback = await app.inject({
      method: "GET",
      url: "/api/auth/oauth2/callback/voss?code=test-code&state=test-state",
      headers: { cookie: cookieFrom(login.headers, "vinventory_oidc") },
    });
    const sessionCookie = cookieFrom(callback.headers, "vinventory_session");

    const response = await app.inject({
      method: "GET",
      url: "/api/labs/lab-1/issue-access",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "lab_access_denied" });
    expect(repository.hasLabPermission).toHaveBeenCalledWith(
      testUser.id,
      "lab-1",
      "issue",
    );
  });
});
