import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  auditEvents,
  componentModels,
  extensionRequests,
  inventoryMovements,
  labMemberships,
  labStock,
  labs,
  loanLines,
  loanParticipants,
  loans,
  loanUnits,
  notificationAttempts,
  notificationJobs,
  physicalUnits,
  quantityBalances,
  requestLines,
  requests,
  returnLines,
  returnRecords,
  stockPolicies,
  stockVerifications,
  userSessions,
  users,
} from "./index.js";

const tables = [
  users,
  userSessions,
  labs,
  labMemberships,
  componentModels,
  stockPolicies,
  labStock,
  quantityBalances,
  physicalUnits,
  requests,
  requestLines,
  loans,
  loanParticipants,
  loanLines,
  loanUnits,
  returnRecords,
  returnLines,
  extensionRequests,
  inventoryMovements,
  stockVerifications,
  notificationJobs,
  notificationAttempts,
  auditEvents,
];

describe("database foundation", () => {
  it("exports every table in the Phase 1 model", () => {
    const names = tables.map(getTableName);

    expect(names).toHaveLength(23);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(
      expect.arrayContaining([
        "users",
        "user_sessions",
        "labs",
        "lab_memberships",
        "lab_stock",
        "loans",
        "inventory_movements",
        "audit_events",
      ]),
    );
  });

  it("generates the critical ownership and inventory constraints", () => {
    const migrationPath = fileURLToPath(
      new URL("../../migrations/0000_spooky_pestilence.sql", import.meta.url),
    );
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain('CREATE TABLE "labs"');
    expect(sql).toContain('CREATE TABLE "user_sessions"');
    expect(sql).toContain('CREATE TABLE "audit_events"');
    expect(sql).toContain('CONSTRAINT "lab_stock_policy_same_lab_fk"');
    expect(sql).toContain('CONSTRAINT "quantity_balances_non_negative"');
    expect(sql).toContain(
      'CREATE UNIQUE INDEX "loan_units_one_active_loan_per_unit"',
    );
    expect(sql).toContain('WHERE "loan_units"."returned_at" IS NULL');
  });
});
