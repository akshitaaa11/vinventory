import {
  and,
  eq,
  gt,
  isNull,
  labMemberships,
  userSessions,
  users,
  type Database,
} from "@vinventory/db";

import type {
  AuthRepository,
  CurrentUser,
  LabPermission,
  VerifiedIdentity,
} from "./types.js";

const permissionColumns = {
  manage_stock: labMemberships.canManageStock,
  manage_policies: labMemberships.canManagePolicies,
  approve_requests: labMemberships.canApproveRequests,
  issue: labMemberships.canIssue,
  receive: labMemberships.canReceive,
  export: labMemberships.canExport,
} as const;

export class DrizzleAuthRepository implements AuthRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  async upsertIdentity(identity: VerifiedIdentity): Promise<CurrentUser> {
    const [user] = await this.#db
      .insert(users)
      .values({
        authProvider: identity.provider,
        authSubject: identity.subject,
        displayName: identity.displayName,
        email: identity.email,
      })
      .onConflictDoUpdate({
        target: [users.authProvider, users.authSubject],
        set: {
          displayName: identity.displayName,
          email: identity.email,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        accountType: users.accountType,
        isActive: users.isActive,
      });

    if (!user || !user.isActive) {
      throw new Error("Local VInventory account is inactive");
    }

    return user;
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
    ipHash: string | null;
  }): Promise<void> {
    await this.#db.insert(userSessions).values(input);
  }

  async findActiveSession(
    tokenHash: string,
    now: Date,
  ): Promise<CurrentUser | null> {
    const [row] = await this.#db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        accountType: users.accountType,
      })
      .from(userSessions)
      .innerJoin(users, eq(users.id, userSessions.userId))
      .where(
        and(
          eq(userSessions.tokenHash, tokenHash),
          isNull(userSessions.revokedAt),
          gt(userSessions.expiresAt, now),
          eq(users.isActive, true),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async revokeSession(tokenHash: string, revokedAt: Date): Promise<void> {
    await this.#db
      .update(userSessions)
      .set({ revokedAt })
      .where(
        and(
          eq(userSessions.tokenHash, tokenHash),
          isNull(userSessions.revokedAt),
        ),
      );
  }

  async hasLabPermission(
    userId: string,
    labId: string,
    permission: LabPermission,
  ): Promise<boolean> {
    const [user] = await this.#db
      .select({ accountType: users.accountType })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .limit(1);

    if (user?.accountType === "system_admin") {
      return true;
    }

    const permissionColumn = permissionColumns[permission];
    const [membership] = await this.#db
      .select({ role: labMemberships.role, allowed: permissionColumn })
      .from(labMemberships)
      .where(
        and(
          eq(labMemberships.userId, userId),
          eq(labMemberships.labId, labId),
          eq(labMemberships.isActive, true),
        ),
      )
      .limit(1);

    return membership?.role === "incharge" || membership?.allowed === true;
  }
}
