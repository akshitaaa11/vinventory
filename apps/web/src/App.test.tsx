// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const labId = "b6d97d61-f99c-4d6a-8f05-80797861710d";
const user = { id: "owner-id", displayName: "Test Owner", email: "owner@example.edu", accountType: "student" };
const labs = [
  { id: labId, code: "M201", name: "VLSI Lab", location: "M Block", canManageStock: false },
  { id: "03e5dcba-ea72-449a-9a85-36517f15d7a4", code: "E101", name: "Electronics Lab", location: "E Block", canManageStock: false },
];
function response(body: unknown, status=200) { return { ok: status<400, status, json: async()=>body }; }
function mockApi(authenticated=true, list=labs) {
  const fetch = vi.fn(async(path:string) => {
    if (path==="/api/me") return authenticated ? response({user}) : response(null,401);
    if (path==="/api/labs") return response({labs:list});
    if (path==="/auth/logout") return response(undefined,204);
    throw new Error(`Unexpected request ${path}`);
  });
  vi.stubGlobal("fetch",fetch);
  return fetch;
}
beforeEach(()=>{ window.history.replaceState(null,"","/"); localStorage.clear(); });
afterEach(()=>{ cleanup(); vi.unstubAllGlobals(); document.documentElement.classList.remove("dark"); });

describe("landing and authenticated workspace",()=>{
  it("introduces the product and audiences without exposing the importer or protected directory",async()=>{
    const fetch=mockApi(false);
    render(<App/>);
    await waitFor(()=>expect(screen.queryByText("Checking session…")).toBeNull());
    expect(screen.getByRole("heading",{name:"Less searching. More making."})).toBeTruthy();
    expect(screen.getByRole("heading",{name:"Students & project teams"})).toBeTruthy();
    expect(screen.getByRole("heading",{name:"Lab incharges & staff"})).toBeTruthy();
    for(const link of screen.getAllByRole("link",{name:"Sign in with VAuth"})) expect(link.getAttribute("href")).toBe("/auth/login?returnTo=%2Flabs");
    expect(screen.queryByLabelText("Inventory file")).toBeNull();
    expect(fetch.mock.calls.every(([path])=>path==="/api/me")).toBe(true);
  });
  it("shows existing sessions clearly instead of presenting a redundant sign-in action",async()=>{
    mockApi(); render(<App/>);
    await screen.findByRole("link",{name:/Test Owner/});
    expect(screen.getAllByRole("link",{name:"Go to labs"})[0]?.getAttribute("href")).toBe("/labs");
    expect(screen.queryByRole("link",{name:"Sign in with VAuth"})).toBeNull();
    expect(screen.getByRole("button",{name:"Sign out"})).toBeTruthy();
  });
  it("loads and filters real lab records after authentication",async()=>{
    window.history.replaceState(null,"","/labs"); mockApi(); render(<App/>);
    await screen.findByRole("heading",{name:"Explore the labs."});
    expect(screen.getByRole("link",{name:"View VLSI Lab"}).getAttribute("href")).toBe(`/labs/${labId}`);
    await userEvent.type(screen.getByRole("searchbox",{name:"Search labs"}),"e block");
    expect(screen.queryByRole("heading",{name:"VLSI Lab"})).toBeNull();
    expect(screen.getByRole("heading",{name:"Electronics Lab"})).toBeTruthy();
    await userEvent.clear(screen.getByRole("searchbox",{name:"Search labs"}));
    await userEvent.type(screen.getByRole("searchbox",{name:"Search labs"}),"no match");
    expect(screen.getByRole("heading",{name:"No matching labs."})).toBeTruthy();
    await userEvent.click(screen.getByRole("button",{name:"Clear search"}));
    expect(screen.getByRole("heading",{name:"VLSI Lab"})).toBeTruthy();
  });
  it("keeps empty setup distinct from failed login",async()=>{
    window.history.replaceState(null,"","/labs"); mockApi(true,[]); render(<App/>);
    await screen.findByRole("heading",{name:"No labs have been added yet."});
    expect(screen.getByText("Your account is connected")).toBeTruthy();
    expect(screen.queryByRole("link",{name:"Sign in with VAuth"})).toBeNull();
  });
  it("protects direct workspace visits when no session exists",async()=>{
    window.history.replaceState(null,"","/labs"); const fetch=mockApi(false); render(<App/>);
    await screen.findByRole("heading",{name:"Your labs are one sign-in away."});
    expect(fetch.mock.calls.some(([path])=>path==="/api/labs")).toBe(false);
  });
  it("does not mount import tools for users without stock permission",async()=>{
    window.history.replaceState(null,"","/labs/"+labId+"/import"); const fetch=mockApi(); render(<App/>);
    await screen.findByRole("heading",{name:"Stock management is restricted."});
    expect(fetch.mock.calls.some(([path])=>path==="/api/import-labs")).toBe(false);
    expect(screen.queryByLabelText("Inventory file")).toBeNull();
  });
  it("reports service failures and recovers when connection retry succeeds",async()=>{
    const fetch=mockApi(false); fetch.mockRejectedValueOnce(new Error("Network failure")); render(<App/>);
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toContain("couldn’t connect");
    await userEvent.click(screen.getByRole("button",{name:"Retry connection"}));
    await waitFor(()=>expect(screen.queryByRole("alert")).toBeNull());
  });
  it("signs out the local session and returns to the public landing page",async()=>{
    window.history.replaceState(null,"","/labs"); const fetch=mockApi(); render(<App/>);
    await screen.findByRole("heading",{name:"Explore the labs."});
    await userEvent.click(screen.getByRole("button",{name:"Sign out"}));
    await screen.findByRole("heading",{name:"Less searching. More making."});
    expect(window.location.pathname).toBe("/");
    expect(fetch).toHaveBeenCalledWith("/auth/logout",expect.objectContaining({method:"POST",credentials:"same-origin"}));
    expect(screen.queryByRole("button",{name:"Sign out"})).toBeNull();
  });
  it("shows a useful provider error and supports the supplied dark theme",async()=>{
    window.history.replaceState(null,"","/?authError=provider_unavailable"); mockApi(false); render(<App/>);
    await waitFor(()=>expect(screen.queryByText("Checking session…")).toBeNull());
    expect(screen.getByRole("alert").textContent).toContain("VAuth is temporarily unavailable");
    await userEvent.click(screen.getByRole("button",{name:"Switch to dark theme"}));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("vinventory-theme")).toBe("dark");
  });
});
