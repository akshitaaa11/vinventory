import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@vinventory/db";
import { DrizzleInventoryRepository, type CommitImport } from "./repository.js";

// A fresh, in-memory PostgreSQL engine; never uses DATABASE_URL or real pilot data.
const client = new PGlite();
const repository = new DrizzleInventoryRepository(drizzle(client) as unknown as Database);
const actorUserId = "20959a43-4fac-4b75-8a9d-1325313488c6";
const labId = "b6d97d61-f99c-4d6a-8f05-80797861710d";
const otherLabId = "03e5dcba-ea72-449a-9a85-36517f15d7a4";
const policyId = "bd7c53a8-5c18-4164-a7f5-ec375dafed4c";
const input: CommitImport = {
  actorUserId, labId, policyId, filename: "test.csv", storageLocation: "Cabinet A",
  rows: [
    { row: 2, stockCode: "001", name: "Sensor", tracking: "quantity", quantity: 5, assetTags: [] },
    { row: 3, stockCode: "002", name: "Board", tracking: "individual", quantity: 2, assetTags: ["UNIT-01", "UNIT-02"] },
  ],
};

beforeAll(async () => {
  await client.exec(await readFile(new URL("../../../../packages/db/migrations/0000_spooky_pestilence.sql", import.meta.url), "utf8"));
}, 30000);
beforeEach(async () => {
  await client.exec("TRUNCATE users, labs, component_models CASCADE");
  await client.query("INSERT INTO users(id,auth_provider,auth_subject,display_name,account_type) VALUES ($1,'test','test-staff','Staff','staff')", [actorUserId]);
  await client.query("INSERT INTO labs(id,code,name) VALUES ($1,'M201','Test lab'),($2,'OTHER','Other lab')", [labId, otherLabId]);
  await client.query("INSERT INTO lab_memberships(lab_id,user_id,role) VALUES ($1,$2,'incharge')", [labId, actorUserId]);
  await client.query("INSERT INTO stock_policies(id,lab_id,name,preset,borrower_required,return_required,default_loan_days,created_by) VALUES ($1,$2,'Essential','essential',true,true,4,$3)", [policyId, labId, actorUserId]);
});
afterAll(async () => { await client.close(); });

describe("transactional inventory imports", () => {
  it("persists models, stock, unverified quantities/units, movements and audit events together", async () => {
    expect(await repository.commit(input)).toEqual({ imported: 2, units: 7, status: "awaiting_testing" });
    const balances = await client.query("SELECT available_quantity,awaiting_testing_quantity FROM quantity_balances");
    expect(balances.rows).toEqual([{ available_quantity: "0.000", awaiting_testing_quantity: "5.000" }]);
    const units = await client.query("SELECT asset_tag,status FROM physical_units ORDER BY asset_tag");
    expect(units.rows).toEqual([{ asset_tag: "UNIT-01", status: "awaiting_testing" }, { asset_tag: "UNIT-02", status: "awaiting_testing" }]);
    expect((await client.query("SELECT * FROM inventory_movements")).rows).toHaveLength(3);
    expect((await client.query("SELECT * FROM audit_events WHERE actor_user_id = $1", [actorUserId])).rows).toHaveLength(2);
    expect((await client.query("SELECT * FROM stock_verifications")).rows).toHaveLength(0);
  });

  it("rejects repeat imports without adding stock or movements", async () => {
    await repository.commit(input);
    expect(await repository.conflicts(labId, input.rows)).toHaveLength(3);
    await expect(repository.commit(input)).rejects.toThrow("nothing was imported");
    expect((await client.query("SELECT * FROM lab_stock")).rows).toHaveLength(2);
    expect((await client.query("SELECT * FROM inventory_movements")).rows).toHaveLength(3);
  });

  it("rolls back every earlier write if a later row hits a database constraint", async () => {
    await expect(repository.commit({ ...input, rows: [input.rows[0]!, { ...input.rows[1]!, stockCode: "001" }] })).rejects.toThrow("Nothing was imported");
    for (const table of ["component_models", "lab_stock", "quantity_balances", "physical_units", "inventory_movements", "audit_events"]) {
      expect((await client.query(`SELECT * FROM ${table}`)).rows).toHaveLength(0);
    }
  });

  it("rejects another lab's policy and inactive labs", async () => {
    await expect(repository.commit({ ...input, labId: otherLabId })).rejects.toThrow("belonging to this lab");
    await client.query("UPDATE labs SET is_active = false WHERE id = $1", [labId]);
    await expect(repository.commit(input)).rejects.toThrow("no longer active");
    expect((await client.query("SELECT * FROM lab_stock")).rows).toHaveLength(0);
  });

  it("lists only authorized active labs and returnable policies", async () => {
    const user = { id: actorUserId, displayName: "Staff", email: null, accountType: "staff" as const };
    expect((await repository.listLabs(user)).map((lab) => lab.id)).toEqual([labId]);
    expect(await repository.listPolicies(otherLabId)).toEqual([]);
    expect(await repository.listPolicies(labId)).toEqual([{ id: policyId, name: "Essential", defaultLoanDays: 4 }]);
    await client.query("UPDATE lab_memberships SET is_active = false");
    expect(await repository.listLabs(user)).toEqual([]);
  });
});
