// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const labId = "b6d97d61-f99c-4d6a-8f05-80797861710d";
const secondLabId = "03e5dcba-ea72-449a-9a85-36517f15d7a4";
const policyId = "bd7c53a8-5c18-4164-a7f5-ec375dafed4c";
const row = { row: 2, stockCode: "001", name: "Board", tracking: "quantity", quantity: 2, assetTags: [] };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mockApi(issues: unknown[] = []) {
  const fetch = vi.fn(async (path: string) => {
    let body: unknown;
    if (path === "/api/import-labs") body = { labs: [
      { id: labId, code: "M201", name: "VLSI Lab", location: "M201" },
      { id: secondLabId, code: "OTHER", name: "Other lab", location: "Other" },
    ] };
    else if (path.endsWith("import-policies")) body = { policies: [{ id: policyId, name: "Essential", defaultLoanDays: 4 }] };
    else if (path.endsWith("/preview")) body = { rows: [row], issues };
    else body = { imported: 1, units: 2, status: "awaiting_testing" };
    return { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

async function showPreview() {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect((screen.getByLabelText("Lab") as HTMLSelectElement).value).toBe(labId));
  await user.upload(screen.getByLabelText("Inventory file"), new File(["Stock code,Item/model name,Tracking,Quantity\n001,Board,quantity,2"], "items.csv", { type: "text/csv" }));
  await user.click(screen.getByRole("button", { name: "Preview file" }));
  await screen.findByRole("heading", { name: "3. Review and import" });
  return user;
}

describe("inventory import interface", () => {
  it("previews before confirmation, sends reviewed settings, and clears the completed import", async () => {
    const fetch = mockApi();
    const user = await showPreview();
    const importButton = screen.getByRole("button", { name: "Import 1 items" }) as HTMLButtonElement;
    expect(importButton.disabled).toBe(true);
    await user.selectOptions(screen.getByLabelText("Borrowing policy for this batch"), policyId);
    await user.click(screen.getByRole("checkbox"));
    expect(importButton.disabled).toBe(false);
    await user.click(importButton);
    await screen.findByText(/Imported 1 item records and 2 units/);
    const call = fetch.mock.calls.find(([path]) => path.endsWith("/inventory/import")) as unknown as [string, RequestInit];
    expect(JSON.parse(call[1].body as string)).toMatchObject({ policyId, storageLocation: "M201", confirmed: true, filename: "items.csv" });
    expect(screen.queryByRole("heading", { name: "3. Review and import" })).toBeNull();
  });

  it("shows row errors and blocks import", async () => {
    mockApi([{ row: 2, field: "Quantity", message: "Use a whole number" }]);
    await showPreview();
    expect(screen.getByRole("alert").textContent).toContain("Row 2 · Quantity: Use a whole number");
    expect((screen.getByRole("button", { name: "Import 1 items" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("invalidates the preview when the file or lab changes", async () => {
    mockApi();
    const user = await showPreview();
    await user.upload(screen.getByLabelText("Inventory file"), new File(["different data"], "second.csv", { type: "text/csv" }));
    expect(screen.queryByRole("heading", { name: "3. Review and import" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Preview file" }));
    await screen.findByRole("heading", { name: "3. Review and import" });
    await user.selectOptions(screen.getByLabelText("Lab"), secondLabId);
    await waitFor(() => expect(screen.queryByRole("heading", { name: "3. Review and import" })).toBeNull());
  });

  it("keeps sign-in guidance and the template available without authentication", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 401, ok: false })));
    render(<App />);
    await screen.findByText("Sign in with VAuth to import inventory.");
    expect(screen.getByRole("link", { name: "Download CSV template" }).getAttribute("href")).toBe("/inventory-template.csv");
    expect((screen.getByRole("button", { name: "Preview file" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
