import { and, eq, labs, labMemberships, type Database } from "@vinventory/db";
import type { LabSummary } from "@vinventory/contracts";
import type { CurrentUser } from "../auth/types.js";

export interface LabsRepository {
  listActiveLabs(user: CurrentUser): Promise<LabSummary[]>;
}

export class DrizzleLabsRepository implements LabsRepository {
  constructor(private readonly db: Database) {}

  async listActiveLabs(user: CurrentUser): Promise<LabSummary[]> {
    const rows = await this.db.select({
      id: labs.id, code: labs.code, name: labs.name, location: labs.location,
      role: labMemberships.role, managesStock: labMemberships.canManageStock,
    }).from(labs).leftJoin(labMemberships, and(
      eq(labMemberships.labId, labs.id), eq(labMemberships.userId, user.id),
      eq(labMemberships.isActive, true),
    )).where(eq(labs.isActive, true)).orderBy(labs.code);

    return rows.map(({ role, managesStock, ...lab }) => ({
      ...lab,
      canManageStock: user.accountType === "system_admin" || role === "incharge" || managesStock === true,
    }));
  }
}
