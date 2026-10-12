import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

const zeroQuantity = "0";

export const accountTypeEnum = pgEnum("account_type", [
  "student",
  "staff",
  "system_admin",
]);
export const labMemberRoleEnum = pgEnum("lab_member_role", [
  "incharge",
  "staff",
]);
export const trackingMethodEnum = pgEnum("tracking_method", [
  "individual",
  "quantity",
]);
export const policyPresetEnum = pgEnum("policy_preset", [
  "consumable",
  "essential",
  "project",
  "custom",
]);
export const inventoryStatusEnum = pgEnum("inventory_status", [
  "available",
  "borrowed",
  "awaiting_testing",
  "damaged",
  "missing",
  "retired",
]);
export const movementTypeEnum = pgEnum("movement_type", [
  "opening_balance",
  "receipt",
  "consumption",
  "issue",
  "return",
  "adjustment",
  "status_change",
  "write_off",
]);
export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "fulfilled",
]);
export const loanStatusEnum = pgEnum("loan_status", [
  "active",
  "partially_returned",
  "closed",
]);
export const returnConditionEnum = pgEnum("return_condition", [
  "usable",
  "untested",
  "damaged",
]);
export const extensionStatusEnum = pgEnum("extension_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const notificationKindEnum = pgEnum("notification_kind", [
  "pre_due",
  "due",
  "overdue",
]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "processing",
  "sent",
  "retry",
  "cancelled",
  "failed",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authProvider: text("auth_provider").notNull(),
    authSubject: text("auth_subject").notNull(),
    displayName: text("display_name").notNull(),
    email: text("email"),
    accountType: accountTypeEnum("account_type").default("student").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_auth_identity_unique").on(
      table.authProvider,
      table.authSubject,
    ),
    index("users_account_type_active_idx").on(
      table.accountType,
      table.isActive,
    ),
  ],
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_sessions_token_hash_unique").on(table.tokenHash),
    index("user_sessions_user_active_idx").on(
      table.userId,
      table.expiresAt,
      table.revokedAt,
    ),
  ],
);

export const labs = pgTable(
  "labs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    location: text("location"),
    timezone: text("timezone").default("Asia/Kolkata").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("labs_code_unique").on(table.code)],
);

export const labMemberships = pgTable(
  "lab_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    labId: uuid("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: labMemberRoleEnum("role").notNull(),
    canManageStock: boolean("can_manage_stock").default(false).notNull(),
    canManagePolicies: boolean("can_manage_policies")
      .default(false)
      .notNull(),
    canApproveRequests: boolean("can_approve_requests")
      .default(false)
      .notNull(),
    canIssue: boolean("can_issue").default(false).notNull(),
    canReceive: boolean("can_receive").default(false).notNull(),
    canExport: boolean("can_export").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("lab_memberships_lab_user_unique").on(
      table.labId,
      table.userId,
    ),
    index("lab_memberships_user_active_idx").on(
      table.userId,
      table.isActive,
    ),
  ],
);

export const componentModels = pgTable(
  "component_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    modelKey: text("model_key").notNull(),
    manufacturer: text("manufacturer"),
    name: text("name").notNull(),
    variant: text("variant"),
    description: text("description"),
    specifications: jsonb("specifications")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    searchAliases: text("search_aliases")
      .array()
      .default(sql`ARRAY[]::text[]`)
      .notNull(),
    photoUrl: text("photo_url"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("component_models_model_key_unique").on(table.modelKey),
    index("component_models_search_aliases_idx").using(
      "gin",
      table.searchAliases,
    ),
  ],
);

export const stockPolicies = pgTable(
  "stock_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    labId: uuid("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    preset: policyPresetEnum("preset").notNull(),
    borrowerRequired: boolean("borrower_required").notNull(),
    returnRequired: boolean("return_required").notNull(),
    defaultLoanDays: smallint("default_loan_days"),
    approvalRequired: boolean("approval_required").default(true).notNull(),
    projectPurposeRequired: boolean("project_purpose_required")
      .default(false)
      .notNull(),
    extensionsAllowed: boolean("extensions_allowed")
      .default(false)
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("stock_policies_lab_name_unique").on(table.labId, table.name),
    uniqueIndex("stock_policies_id_lab_unique").on(table.id, table.labId),
    check(
      "stock_policies_duration_positive",
      sql`${table.defaultLoanDays} IS NULL OR ${table.defaultLoanDays} > 0`,
    ),
    check(
      "stock_policies_returnable_consistent",
      sql`(
        ${table.returnRequired}
        AND ${table.borrowerRequired}
        AND ${table.defaultLoanDays} IS NOT NULL
      ) OR (
        NOT ${table.returnRequired}
        AND NOT ${table.borrowerRequired}
        AND ${table.defaultLoanDays} IS NULL
      )`,
    ),
  ],
);

export const labStock = pgTable(
  "lab_stock",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    labId: uuid("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "restrict" }),
    componentModelId: uuid("component_model_id")
      .notNull()
      .references(() => componentModels.id, { onDelete: "restrict" }),
    policyId: uuid("policy_id").notNull(),
    stockCode: text("stock_code").notNull(),
    storageLocation: text("storage_location").notNull(),
    unitOfMeasure: text("unit_of_measure").notNull(),
    allowsFractionalQuantity: boolean("allows_fractional_quantity")
      .default(false)
      .notNull(),
    trackingMethod: trackingMethodEnum("tracking_method").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("lab_stock_lab_code_unique").on(table.labId, table.stockCode),
    index("lab_stock_lab_model_active_idx").on(
      table.labId,
      table.componentModelId,
      table.isActive,
    ),
    foreignKey({
      name: "lab_stock_policy_same_lab_fk",
      columns: [table.policyId, table.labId],
      foreignColumns: [stockPolicies.id, stockPolicies.labId],
    }).onDelete("restrict"),
  ],
);

export const quantityBalances = pgTable(
  "quantity_balances",
  {
    stockId: uuid("stock_id")
      .primaryKey()
      .references(() => labStock.id, { onDelete: "restrict" }),
    availableQuantity: numeric("available_quantity", {
      precision: 14,
      scale: 3,
    })
      .default(zeroQuantity)
      .notNull(),
    borrowedQuantity: numeric("borrowed_quantity", {
      precision: 14,
      scale: 3,
    })
      .default(zeroQuantity)
      .notNull(),
    awaitingTestingQuantity: numeric("awaiting_testing_quantity", {
      precision: 14,
      scale: 3,
    })
      .default(zeroQuantity)
      .notNull(),
    damagedQuantity: numeric("damaged_quantity", {
      precision: 14,
      scale: 3,
    })
      .default(zeroQuantity)
      .notNull(),
    missingQuantity: numeric("missing_quantity", { precision: 14, scale: 3 })
      .default(zeroQuantity)
      .notNull(),
    version: bigint("version", { mode: "number" }).default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "quantity_balances_non_negative",
      sql`${table.availableQuantity} >= 0
        AND ${table.borrowedQuantity} >= 0
        AND ${table.awaitingTestingQuantity} >= 0
        AND ${table.damagedQuantity} >= 0
        AND ${table.missingQuantity} >= 0`,
    ),
  ],
);

export const physicalUnits = pgTable(
  "physical_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => labStock.id, { onDelete: "restrict" }),
    assetTag: text("asset_tag").notNull(),
    serialNumber: text("serial_number"),
    status: inventoryStatusEnum("status").notNull(),
    conditionNotes: text("condition_notes"),
    acquiredAt: date("acquired_at"),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("physical_units_asset_tag_unique").on(table.assetTag),
    index("physical_units_serial_number_idx").on(table.serialNumber),
    index("physical_units_stock_status_idx").on(table.stockId, table.status),
    check(
      "physical_units_retirement_consistent",
      sql`(${table.status} = 'retired' AND ${table.retiredAt} IS NOT NULL)
        OR (${table.status} <> 'retired' AND ${table.retiredAt} IS NULL)`,
    ),
  ],
);

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    labId: uuid("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "restrict" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: requestStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    decisionReason: text("decision_reason"),
    ...timestamps,
  },
  (table) => [
    index("requests_lab_status_created_idx").on(
      table.labId,
      table.status,
      table.createdAt,
    ),
    index("requests_requester_created_idx").on(
      table.requestedBy,
      table.createdAt,
    ),
  ],
);

export const requestLines = pgTable(
  "request_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "restrict" }),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => labStock.id, { onDelete: "restrict" }),
    quantityRequested: numeric("quantity_requested", {
      precision: 14,
      scale: 3,
    }).notNull(),
    quantityFulfilled: numeric("quantity_fulfilled", {
      precision: 14,
      scale: 3,
    })
      .default(zeroQuantity)
      .notNull(),
    projectPurpose: text("project_purpose"),
    desiredDueAt: timestamp("desired_due_at", { withTimezone: true }),
  },
  (table) => [
    index("request_lines_request_idx").on(table.requestId),
    check(
      "request_lines_quantities_valid",
      sql`${table.quantityRequested} > 0
        AND ${table.quantityFulfilled} >= 0
        AND ${table.quantityFulfilled} <= ${table.quantityRequested}`,
    ),
  ],
);

export const loans = pgTable(
  "loans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    labId: uuid("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "restrict" }),
    borrowerUserId: uuid("borrower_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sourceRequestId: uuid("source_request_id").references(() => requests.id, {
      onDelete: "restrict",
    }),
    status: loanStatusEnum("status").default("active").notNull(),
    issuedBy: uuid("issued_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    notes: text("notes"),
    idempotencyKey: text("idempotency_key").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("loans_idempotency_key_unique").on(table.idempotencyKey),
    index("loans_lab_status_issued_idx").on(
      table.labId,
      table.status,
      table.issuedAt,
    ),
    index("loans_borrower_issued_idx").on(
      table.borrowerUserId,
      table.issuedAt,
    ),
  ],
);

export const loanParticipants = pgTable(
  "loan_participants",
  {
    loanId: uuid("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.loanId, table.userId] }),
    index("loan_participants_user_idx").on(table.userId),
  ],
);

export const loanLines = pgTable(
  "loan_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "restrict" }),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => labStock.id, { onDelete: "restrict" }),
    quantityIssued: numeric("quantity_issued", {
      precision: 14,
      scale: 3,
    }).notNull(),
    quantityOutstanding: numeric("quantity_outstanding", {
      precision: 14,
      scale: 3,
    }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    dueRevision: integer("due_revision").default(1).notNull(),
    projectPurpose: text("project_purpose"),
    issueCondition: text("issue_condition"),
    policySnapshot: jsonb("policy_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index("loan_lines_loan_idx").on(table.loanId),
    index("loan_lines_stock_due_outstanding_idx")
      .on(table.stockId, table.dueAt)
      .where(sql`${table.quantityOutstanding} > 0`),
    check(
      "loan_lines_quantities_valid",
      sql`${table.quantityIssued} > 0
        AND ${table.quantityOutstanding} >= 0
        AND ${table.quantityOutstanding} <= ${table.quantityIssued}`,
    ),
    check("loan_lines_due_revision_positive", sql`${table.dueRevision} > 0`),
  ],
);

export const loanUnits = pgTable(
  "loan_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    loanLineId: uuid("loan_line_id")
      .notNull()
      .references(() => loanLines.id, { onDelete: "restrict" }),
    physicalUnitId: uuid("physical_unit_id")
      .notNull()
      .references(() => physicalUnits.id, { onDelete: "restrict" }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("loan_units_line_unit_unique").on(
      table.loanLineId,
      table.physicalUnitId,
    ),
    uniqueIndex("loan_units_one_active_loan_per_unit")
      .on(table.physicalUnitId)
      .where(sql`${table.returnedAt} IS NULL`),
  ],
);

export const returnRecords = pgTable(
  "return_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "restrict" }),
    receivedBy: uuid("received_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    notes: text("notes"),
    idempotencyKey: text("idempotency_key").notNull(),
  },
  (table) => [
    uniqueIndex("return_records_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    index("return_records_loan_received_idx").on(
      table.loanId,
      table.receivedAt,
    ),
  ],
);

export const returnLines = pgTable(
  "return_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    returnRecordId: uuid("return_record_id")
      .notNull()
      .references(() => returnRecords.id, { onDelete: "restrict" }),
    loanLineId: uuid("loan_line_id")
      .notNull()
      .references(() => loanLines.id, { onDelete: "restrict" }),
    loanUnitId: uuid("loan_unit_id").references(() => loanUnits.id, {
      onDelete: "restrict",
    }),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    condition: returnConditionEnum("condition").notNull(),
    destinationStatus: inventoryStatusEnum("destination_status").notNull(),
    conditionNotes: text("condition_notes"),
  },
  (table) => [
    index("return_lines_return_record_idx").on(table.returnRecordId),
    index("return_lines_loan_line_idx").on(table.loanLineId),
    uniqueIndex("return_lines_loan_unit_unique")
      .on(table.loanUnitId)
      .where(sql`${table.loanUnitId} IS NOT NULL`),
    check("return_lines_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "return_lines_unit_quantity_one",
      sql`${table.loanUnitId} IS NULL OR ${table.quantity} = 1`,
    ),
    check(
      "return_lines_destination_valid",
      sql`${table.destinationStatus} IN ('available', 'awaiting_testing', 'damaged')`,
    ),
    check(
      "return_lines_condition_destination_consistent",
      sql`(${table.condition} = 'usable' AND ${table.destinationStatus} = 'available')
        OR (${table.condition} = 'untested' AND ${table.destinationStatus} = 'awaiting_testing')
        OR (${table.condition} = 'damaged' AND ${table.destinationStatus} = 'damaged')`,
    ),
  ],
);

export const extensionRequests = pgTable(
  "extension_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    loanLineId: uuid("loan_line_id")
      .notNull()
      .references(() => loanLines.id, { onDelete: "restrict" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    previousDueAt: timestamp("previous_due_at", { withTimezone: true }).notNull(),
    requestedDueAt: timestamp("requested_due_at", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    status: extensionStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    decisionReason: text("decision_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("extension_requests_one_pending_per_line")
      .on(table.loanLineId)
      .where(sql`${table.status} = 'pending'`),
    check(
      "extension_requests_date_moves_forward",
      sql`${table.requestedDueAt} > ${table.previousDueAt}`,
    ),
  ],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => labStock.id, { onDelete: "restrict" }),
    physicalUnitId: uuid("physical_unit_id").references(
      () => physicalUnits.id,
      { onDelete: "restrict" },
    ),
    movementType: movementTypeEnum("movement_type").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
    fromStatus: inventoryStatusEnum("from_status"),
    toStatus: inventoryStatusEnum("to_status"),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    loanLineId: uuid("loan_line_id").references(() => loanLines.id, {
      onDelete: "restrict",
    }),
    returnLineId: uuid("return_line_id").references(() => returnLines.id, {
      onDelete: "restrict",
    }),
    reason: text("reason"),
    purpose: text("purpose"),
    idempotencyKey: text("idempotency_key").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("inventory_movements_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    index("inventory_movements_stock_occurred_idx").on(
      table.stockId,
      table.occurredAt,
    ),
    check("inventory_movements_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "inventory_movements_unit_quantity_one",
      sql`${table.physicalUnitId} IS NULL OR ${table.quantity} = 1`,
    ),
    check(
      "inventory_movements_reason_required",
      sql`${table.movementType} NOT IN ('adjustment', 'write_off')
        OR nullif(trim(${table.reason}), '') IS NOT NULL`,
    ),
  ],
);

export const stockVerifications = pgTable(
  "stock_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stockId: uuid("stock_id")
      .notNull()
      .references(() => labStock.id, { onDelete: "restrict" }),
    verifiedBy: uuid("verified_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    countedAvailable: numeric("counted_available", { precision: 14, scale: 3 })
      .default(zeroQuantity)
      .notNull(),
    countedBorrowed: numeric("counted_borrowed", { precision: 14, scale: 3 })
      .default(zeroQuantity)
      .notNull(),
    countedAwaitingTesting: numeric("counted_awaiting_testing", {
      precision: 14,
      scale: 3,
    })
      .default(zeroQuantity)
      .notNull(),
    countedDamaged: numeric("counted_damaged", { precision: 14, scale: 3 })
      .default(zeroQuantity)
      .notNull(),
    countedMissing: numeric("counted_missing", { precision: 14, scale: 3 })
      .default(zeroQuantity)
      .notNull(),
    notes: text("notes"),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stock_verifications_stock_verified_idx").on(
      table.stockId,
      table.verifiedAt,
    ),
    check(
      "stock_verifications_non_negative",
      sql`${table.countedAvailable} >= 0
        AND ${table.countedBorrowed} >= 0
        AND ${table.countedAwaitingTesting} >= 0
        AND ${table.countedDamaged} >= 0
        AND ${table.countedMissing} >= 0`,
    ),
  ],
);

export const notificationJobs = pgTable(
  "notification_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    loanLineId: uuid("loan_line_id")
      .notNull()
      .references(() => loanLines.id, { onDelete: "restrict" }),
    dueRevision: integer("due_revision").notNull(),
    kind: notificationKindEnum("kind").notNull(),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    channel: text("channel").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: notificationStatusEnum("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("notification_jobs_logical_job_unique").on(
      table.loanLineId,
      table.dueRevision,
      table.kind,
      table.recipientUserId,
      table.channel,
    ),
    index("notification_jobs_claim_idx").on(
      table.status,
      table.nextAttemptAt,
      table.scheduledAt,
    ),
    check("notification_jobs_due_revision_positive", sql`${table.dueRevision} > 0`),
    check("notification_jobs_attempt_count_non_negative", sql`${table.attemptCount} >= 0`),
  ],
);

export const notificationAttempts = pgTable(
  "notification_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => notificationJobs.id, { onDelete: "restrict" }),
    attemptNumber: integer("attempt_number").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    outcome: text("outcome").notNull(),
    providerMessageId: text("provider_message_id"),
    errorCode: text("error_code"),
    errorDetail: text("error_detail"),
  },
  (table) => [
    uniqueIndex("notification_attempts_job_number_unique").on(
      table.jobId,
      table.attemptNumber,
    ),
    check(
      "notification_attempts_number_positive",
      sql`${table.attemptNumber} > 0`,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    labId: uuid("lab_id").references(() => labs.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    beforeData: jsonb("before_data").$type<Record<string, unknown>>(),
    afterData: jsonb("after_data").$type<Record<string, unknown>>(),
    correlationId: uuid("correlation_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_events_lab_occurred_idx").on(table.labId, table.occurredAt),
    index("audit_events_entity_idx").on(table.entityType, table.entityId),
    index("audit_events_correlation_idx").on(table.correlationId),
  ],
);
