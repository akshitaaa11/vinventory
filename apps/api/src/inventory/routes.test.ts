import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import type { AuthRepository, CurrentUser, OidcClient } from "../auth/types.js";
import type { InventoryRepository } from "./repository.js";
import { importTemplate } from "./parser.js";

const labId = "b6d97d61-f99c-4d6a-8f05-80797861710d";
const policyId = "bd7c53a8-5c18-4164-a7f5-ec375dafed4c";
const user: CurrentUser = { id: "20959a43-4fac-4b75-8a9d-1325313488c6", displayName: "Staff", email: null, accountType: "staff" };
const file = { filename: "inventory.csv", content: Buffer.from(`${importTemplate}A,Board,quantity,2,`).toString("base64") };
const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

async function fixture(allowed = true) {
  const auth: AuthRepository = {
    upsertIdentity: vi.fn(async () => user), createSession: vi.fn(async () => {}),
    findActiveSession: vi.fn(async () => user), revokeSession: vi.fn(async () => {}),
    hasLabPermission: vi.fn(async () => allowed),
  };
  const oidc: OidcClient = {
    createAuthorizationRequest: vi.fn(), exchangeCallback: vi.fn(),
  };
  const repository: InventoryRepository = {
    listLabs: vi.fn(async () => [{ id: labId, code: "M201", name: "VLSI Lab", location: "M201" }]),
    listPolicies: vi.fn(async () => [{ id: policyId, name: "Essential", defaultLoanDays: 4 }]),
    conflicts: vi.fn(async () => []),
    commit: vi.fn(async () => ({ imported: 1, units: 2, status: "awaiting_testing" as const })),
  };
  const directory = { listActiveLabs: vi.fn(async () => [{ id: labId, code: "M201", name: "VLSI Lab", location: "M201", canManageStock: allowed }]) };
  const app = await buildApp({ logger: false, inventory: repository, labs: directory, auth: {
    repository: auth, oidcClient: oidc, cookieSecret: "test-secret-with-at-least-32-characters",
    secureCookies: false, sessionTtlHours: 12, webOrigin: "http://127.0.0.1:5173", callbackUrl: "http://localhost:5173/api/auth/oauth2/callback/voss",
  } });
  apps.push(app);
  await app.ready();
  const cookie = `vinventory_session=${encodeURIComponent(app.signCookie("test-session"))}`;
  return { app, repository, auth, cookie, directory };
}

describe("inventory import routes", () => {
  it("requires a session for the lab directory but does not require stock-management access", async () => {
    const { app, cookie, directory } = await fixture(false);
    expect((await app.inject({ method: "GET", url: "/api/labs" })).statusCode).toBe(401);
    expect(directory.listActiveLabs).not.toHaveBeenCalled();
    const response = await app.inject({ method: "GET", url: "/api/labs", headers: { cookie } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ labs: [{ id: labId, code: "M201", name: "VLSI Lab", location: "M201", canManageStock: false }] });
    expect(directory.listActiveLabs).toHaveBeenCalledWith(user);
  });

  it("requires authentication and lab stock permission for preview and import", async () => {
    const { app, cookie, auth, repository } = await fixture(false);
    for (const suffix of ["/preview", ""]) {
      const url = `/api/labs/${labId}/inventory/import${suffix}`;
      expect((await app.inject({ method: "POST", url, payload: file })).statusCode).toBe(401);
      expect((await app.inject({ method: "POST", url, headers: { cookie }, payload: file })).statusCode).toBe(403);
    }
    expect(auth.hasLabPermission).toHaveBeenCalledWith(user.id, labId, "manage_stock");
    expect(repository.commit).not.toHaveBeenCalled();
  });

  it("previews without writes and surfaces existing-stock conflicts", async () => {
    const { app, cookie, repository } = await fixture();
    vi.mocked(repository.conflicts).mockResolvedValue([{ row: 2, field: "Stock code", message: "Already exists" }]);
    const result = await app.inject({ method: "POST", url: `/api/labs/${labId}/inventory/import/preview`, headers: { cookie }, payload: file });
    expect(result.statusCode).toBe(200);
    expect(result.json().issues).toHaveLength(1);
    expect(repository.commit).not.toHaveBeenCalled();
  });

  it("revalidates on commit, requires confirmation, and uses the authenticated actor", async () => {
    const { app, cookie, repository } = await fixture();
    const url = `/api/labs/${labId}/inventory/import`;
    const payload = { ...file, policyId, storageLocation: "M201", confirmed: true };
    expect((await app.inject({ method: "POST", url, headers: { cookie }, payload: { ...payload, confirmed: false } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url, headers: { cookie }, payload: { ...payload, content: Buffer.from(`${importTemplate}A,Board,quantity,-3,`).toString("base64") } })).statusCode).toBe(422);
    expect(repository.commit).not.toHaveBeenCalled();
    const result = await app.inject({ method: "POST", url, headers: { cookie }, payload });
    expect(result.statusCode).toBe(201);
    expect(repository.commit).toHaveBeenCalledWith(expect.objectContaining({ labId, actorUserId: user.id, rows: [expect.objectContaining({ quantity: 2 })] }));
  });

  it("rejects invalid lab IDs, untrusted origins, and oversized bodies", async () => {
    const { app, cookie } = await fixture();
    expect((await app.inject({ method: "POST", url: "/api/labs/not-a-uuid/inventory/import/preview", headers: { cookie }, payload: file })).statusCode).toBe(400);
    const url = `/api/labs/${labId}/inventory/import/preview`;
    expect((await app.inject({ method: "POST", url, headers: { cookie, origin: "https://untrusted.example" }, payload: file })).statusCode).toBe(403);
    expect((await app.inject({ method: "POST", url, headers: { cookie }, payload: { ...file, content: "a".repeat(3 * 1024 * 1024) } })).statusCode).toBe(413);
  });
});
