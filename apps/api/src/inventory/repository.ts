import { randomUUID } from "node:crypto";
import {
  and, eq, inArray, or, sql, labs, labMemberships, stockPolicies, labStock,
  componentModels, physicalUnits, quantityBalances, inventoryMovements, auditEvents,
  type Database,
} from "@vinventory/db";
import type { ImportIssue, ImportLab, ImportPolicy, ImportResult, InventoryImportRow } from "@vinventory/contracts";
import type { CurrentUser } from "../auth/types.js";
import { ImportError } from "./parser.js";

export type CommitImport = {
  labId: string; policyId: string; storageLocation: string;
  actorUserId: string; filename: string; rows: InventoryImportRow[];
};
export interface InventoryRepository {
  listLabs(user: CurrentUser): Promise<ImportLab[]>;
  listPolicies(labId: string): Promise<ImportPolicy[]>;
  conflicts(labId: string, rows: InventoryImportRow[]): Promise<ImportIssue[]>;
  commit(input: CommitImport): Promise<ImportResult>;
}

export class DrizzleInventoryRepository implements InventoryRepository {
  constructor(private readonly db: Database) {}

  async listLabs(user: CurrentUser): Promise<ImportLab[]> {
    const fields = { id: labs.id, code: labs.code, name: labs.name, location: labs.location };
    if (user.accountType === "system_admin") {
      return this.db.select(fields).from(labs).where(eq(labs.isActive, true)).orderBy(labs.code);
    }
    return this.db.select(fields).from(labs)
      .innerJoin(labMemberships, eq(labMemberships.labId, labs.id))
      .where(and(eq(labs.isActive, true), eq(labMemberships.userId, user.id),
        eq(labMemberships.isActive, true),
        or(eq(labMemberships.role, "incharge"), eq(labMemberships.canManageStock, true))))
      .orderBy(labs.code);
  }

  async listPolicies(labId: string): Promise<ImportPolicy[]> {
    return this.db.select({ id: stockPolicies.id, name: stockPolicies.name, defaultLoanDays: stockPolicies.defaultLoanDays })
      .from(stockPolicies).innerJoin(labs, eq(labs.id, stockPolicies.labId))
      .where(and(eq(stockPolicies.labId, labId), eq(stockPolicies.isActive, true),
        eq(stockPolicies.returnRequired, true), eq(labs.isActive, true)))
      .orderBy(stockPolicies.name);
  }

  async conflicts(labId: string, rows: InventoryImportRow[]): Promise<ImportIssue[]> {
    if (!rows.length) return [];
    const existing = await this.db.select({ code: labStock.stockCode }).from(labStock)
      .where(and(eq(labStock.labId, labId), inArray(labStock.stockCode, rows.map((row) => row.stockCode))));
    const assetTags = rows.flatMap((row) => row.assetTags);
    const existingTags = assetTags.length ? await this.db.select({ tag: physicalUnits.assetTag }).from(physicalUnits)
      .where(inArray(physicalUnits.assetTag, assetTags)) : [];
    const codes = new Set(existing.map((row) => row.code));
    const tags = new Set(existingTags.map((row) => row.tag));
    return rows.flatMap((row) => {
      const issues: ImportIssue[] = [];
      if (codes.has(row.stockCode)) issues.push({ row: row.row, field: "Stock code", message: "Stock code already exists in this lab; existing records are not overwritten." });
      if (row.assetTags.some((tag) => tags.has(tag))) issues.push({ row: row.row, field: "Asset tags", message: "One or more asset tags already exist. Use unique tags." });
      return issues;
    });
  }

  async commit(input: CommitImport): Promise<ImportResult> {
    try {
      return await this.db.transaction(async (tx) => {
        // Serialize imports within a lab. Unique indexes also protect concurrent
        // writes from other workflows and globally unique asset tags.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.labId}))`);
        const [lab] = await tx.select().from(labs)
          .where(and(eq(labs.id, input.labId), eq(labs.isActive, true))).for("share");
        if (!lab) throw new ImportError("The selected lab is no longer active.", 409);
        const [policy] = await tx.select().from(stockPolicies).where(and(
          eq(stockPolicies.id, input.policyId), eq(stockPolicies.labId, input.labId),
          eq(stockPolicies.isActive, true), eq(stockPolicies.returnRequired, true),
        )).for("share");
        if (!policy) throw new ImportError("Choose an active returnable-item policy belonging to this lab.", 409);
        const conflicts = await new DrizzleInventoryRepository(tx as unknown as Database).conflicts(input.labId, input.rows);
        if (conflicts.length) throw new ImportError("Stock codes or asset tags now exist. Preview the file again; nothing was imported.", 409);
        const batchId = randomUUID();
        for (const row of input.rows) {
          const modelId = randomUUID();
          const stockId = randomUUID();
          await tx.insert(componentModels).values({ id: modelId, modelKey: `import:${modelId}`, name: row.name });
          await tx.insert(labStock).values({
            id: stockId, labId: input.labId, componentModelId: modelId, policyId: policy.id,
            stockCode: row.stockCode, storageLocation: input.storageLocation,
            unitOfMeasure: "unit", trackingMethod: row.tracking,
          });
          if (row.tracking === "quantity") {
            await tx.insert(quantityBalances).values({ stockId, awaitingTestingQuantity: String(row.quantity) });
            if (row.quantity > 0) await tx.insert(inventoryMovements).values({
              stockId, movementType: "opening_balance", quantity: String(row.quantity),
              toStatus: "awaiting_testing", actorUserId: input.actorUserId,
              reason: "File import; physical verification pending", idempotencyKey: `${batchId}:${stockId}`,
            });
          } else if (row.assetTags.length) {
            const units = row.assetTags.map((assetTag) => ({ id: randomUUID(), stockId, assetTag, status: "awaiting_testing" as const }));
            await tx.insert(physicalUnits).values(units);
            await tx.insert(inventoryMovements).values(units.map((unit) => ({
              stockId, physicalUnitId: unit.id, movementType: "opening_balance" as const, quantity: "1",
              toStatus: "awaiting_testing" as const, actorUserId: input.actorUserId,
              reason: "File import; physical verification pending", idempotencyKey: `${batchId}:${unit.id}`,
            })));
          }
          await tx.insert(auditEvents).values({
            labId: input.labId, actorUserId: input.actorUserId, action: "inventory.imported",
            entityType: "lab_stock", entityId: stockId, correlationId: batchId,
            afterData: { ...row, filename: input.filename, policyId: policy.id, storageLocation: input.storageLocation, status: "awaiting_testing" },
          });
        }
        return { imported: input.rows.length, units: input.rows.reduce((sum, row) => sum + row.quantity, 0), status: "awaiting_testing" as const };
      });
    } catch (error) {
      // Drizzle wraps PostgreSQL constraint errors in a cause.
      const dbError = error as { code?: string; cause?: { code?: string } };
      if (dbError.code === "23505" || dbError.cause?.code === "23505") {
        throw new ImportError("A stock code or asset tag was imported concurrently. Nothing was imported; preview again.", 409);
      }
      throw error;
    }
  }
}
