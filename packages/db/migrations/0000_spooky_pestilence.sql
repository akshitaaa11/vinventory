CREATE TYPE "public"."account_type" AS ENUM('student', 'staff', 'system_admin');--> statement-breakpoint
CREATE TYPE "public"."extension_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('available', 'borrowed', 'awaiting_testing', 'damaged', 'missing', 'retired');--> statement-breakpoint
CREATE TYPE "public"."lab_member_role" AS ENUM('incharge', 'staff');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('active', 'partially_returned', 'closed');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('opening_balance', 'receipt', 'consumption', 'issue', 'return', 'adjustment', 'status_change', 'write_off');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('pre_due', 'due', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'processing', 'sent', 'retry', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."policy_preset" AS ENUM('consumable', 'essential', 'project', 'custom');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."return_condition" AS ENUM('usable', 'untested', 'damaged');--> statement-breakpoint
CREATE TYPE "public"."tracking_method" AS ENUM('individual', 'quantity');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lab_id" uuid,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"correlation_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "component_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_key" text NOT NULL,
	"manufacturer" text,
	"name" text NOT NULL,
	"variant" text,
	"description" text,
	"specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"search_aliases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"photo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extension_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_line_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"previous_due_at" timestamp with time zone NOT NULL,
	"requested_due_at" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"status" "extension_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"decision_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "extension_requests_date_moves_forward" CHECK ("extension_requests"."requested_due_at" > "extension_requests"."previous_due_at")
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_id" uuid NOT NULL,
	"physical_unit_id" uuid,
	"movement_type" "movement_type" NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"from_status" "inventory_status",
	"to_status" "inventory_status",
	"actor_user_id" uuid NOT NULL,
	"loan_line_id" uuid,
	"return_line_id" uuid,
	"reason" text,
	"purpose" text,
	"idempotency_key" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_quantity_positive" CHECK ("inventory_movements"."quantity" > 0),
	CONSTRAINT "inventory_movements_unit_quantity_one" CHECK ("inventory_movements"."physical_unit_id" IS NULL OR "inventory_movements"."quantity" = 1),
	CONSTRAINT "inventory_movements_reason_required" CHECK ("inventory_movements"."movement_type" NOT IN ('adjustment', 'write_off')
        OR nullif(trim("inventory_movements"."reason"), '') IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "lab_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lab_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "lab_member_role" NOT NULL,
	"can_manage_stock" boolean DEFAULT false NOT NULL,
	"can_manage_policies" boolean DEFAULT false NOT NULL,
	"can_approve_requests" boolean DEFAULT false NOT NULL,
	"can_issue" boolean DEFAULT false NOT NULL,
	"can_receive" boolean DEFAULT false NOT NULL,
	"can_export" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lab_id" uuid NOT NULL,
	"component_model_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"stock_code" text NOT NULL,
	"storage_location" text NOT NULL,
	"unit_of_measure" text NOT NULL,
	"allows_fractional_quantity" boolean DEFAULT false NOT NULL,
	"tracking_method" "tracking_method" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"stock_id" uuid NOT NULL,
	"quantity_issued" numeric(14, 3) NOT NULL,
	"quantity_outstanding" numeric(14, 3) NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"due_revision" integer DEFAULT 1 NOT NULL,
	"project_purpose" text,
	"issue_condition" text,
	"policy_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_lines_quantities_valid" CHECK ("loan_lines"."quantity_issued" > 0
        AND "loan_lines"."quantity_outstanding" >= 0
        AND "loan_lines"."quantity_outstanding" <= "loan_lines"."quantity_issued"),
	CONSTRAINT "loan_lines_due_revision_positive" CHECK ("loan_lines"."due_revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "loan_participants" (
	"loan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_participants_loan_id_user_id_pk" PRIMARY KEY("loan_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "loan_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_line_id" uuid NOT NULL,
	"physical_unit_id" uuid NOT NULL,
	"returned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lab_id" uuid NOT NULL,
	"borrower_user_id" uuid NOT NULL,
	"source_request_id" uuid,
	"status" "loan_status" DEFAULT 'active' NOT NULL,
	"issued_by" uuid NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"outcome" text NOT NULL,
	"provider_message_id" text,
	"error_code" text,
	"error_detail" text,
	CONSTRAINT "notification_attempts_number_positive" CHECK ("notification_attempts"."attempt_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "notification_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_line_id" uuid NOT NULL,
	"due_revision" integer NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_jobs_due_revision_positive" CHECK ("notification_jobs"."due_revision" > 0),
	CONSTRAINT "notification_jobs_attempt_count_non_negative" CHECK ("notification_jobs"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "physical_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_id" uuid NOT NULL,
	"asset_tag" text NOT NULL,
	"serial_number" text,
	"status" "inventory_status" NOT NULL,
	"condition_notes" text,
	"acquired_at" date,
	"retired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "physical_units_retirement_consistent" CHECK (("physical_units"."status" = 'retired' AND "physical_units"."retired_at" IS NOT NULL)
        OR ("physical_units"."status" <> 'retired' AND "physical_units"."retired_at" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "quantity_balances" (
	"stock_id" uuid PRIMARY KEY NOT NULL,
	"available_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"borrowed_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"awaiting_testing_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"damaged_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"missing_quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quantity_balances_non_negative" CHECK ("quantity_balances"."available_quantity" >= 0
        AND "quantity_balances"."borrowed_quantity" >= 0
        AND "quantity_balances"."awaiting_testing_quantity" >= 0
        AND "quantity_balances"."damaged_quantity" >= 0
        AND "quantity_balances"."missing_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "request_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"stock_id" uuid NOT NULL,
	"quantity_requested" numeric(14, 3) NOT NULL,
	"quantity_fulfilled" numeric(14, 3) DEFAULT '0' NOT NULL,
	"project_purpose" text,
	"desired_due_at" timestamp with time zone,
	CONSTRAINT "request_lines_quantities_valid" CHECK ("request_lines"."quantity_requested" > 0
        AND "request_lines"."quantity_fulfilled" >= 0
        AND "request_lines"."quantity_fulfilled" <= "request_lines"."quantity_requested")
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lab_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"decision_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_record_id" uuid NOT NULL,
	"loan_line_id" uuid NOT NULL,
	"loan_unit_id" uuid,
	"quantity" numeric(14, 3) NOT NULL,
	"condition" "return_condition" NOT NULL,
	"destination_status" "inventory_status" NOT NULL,
	"condition_notes" text,
	CONSTRAINT "return_lines_quantity_positive" CHECK ("return_lines"."quantity" > 0),
	CONSTRAINT "return_lines_unit_quantity_one" CHECK ("return_lines"."loan_unit_id" IS NULL OR "return_lines"."quantity" = 1),
	CONSTRAINT "return_lines_destination_valid" CHECK ("return_lines"."destination_status" IN ('available', 'awaiting_testing', 'damaged')),
	CONSTRAINT "return_lines_condition_destination_consistent" CHECK (("return_lines"."condition" = 'usable' AND "return_lines"."destination_status" = 'available')
        OR ("return_lines"."condition" = 'untested' AND "return_lines"."destination_status" = 'awaiting_testing')
        OR ("return_lines"."condition" = 'damaged' AND "return_lines"."destination_status" = 'damaged'))
);
--> statement-breakpoint
CREATE TABLE "return_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"received_by" uuid NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"idempotency_key" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lab_id" uuid NOT NULL,
	"name" text NOT NULL,
	"preset" "policy_preset" NOT NULL,
	"borrower_required" boolean NOT NULL,
	"return_required" boolean NOT NULL,
	"default_loan_days" smallint,
	"approval_required" boolean DEFAULT true NOT NULL,
	"project_purpose_required" boolean DEFAULT false NOT NULL,
	"extensions_allowed" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_policies_duration_positive" CHECK ("stock_policies"."default_loan_days" IS NULL OR "stock_policies"."default_loan_days" > 0),
	CONSTRAINT "stock_policies_returnable_consistent" CHECK ((
        "stock_policies"."return_required"
        AND "stock_policies"."borrower_required"
        AND "stock_policies"."default_loan_days" IS NOT NULL
      ) OR (
        NOT "stock_policies"."return_required"
        AND NOT "stock_policies"."borrower_required"
        AND "stock_policies"."default_loan_days" IS NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "stock_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_id" uuid NOT NULL,
	"verified_by" uuid NOT NULL,
	"counted_available" numeric(14, 3) DEFAULT '0' NOT NULL,
	"counted_borrowed" numeric(14, 3) DEFAULT '0' NOT NULL,
	"counted_awaiting_testing" numeric(14, 3) DEFAULT '0' NOT NULL,
	"counted_damaged" numeric(14, 3) DEFAULT '0' NOT NULL,
	"counted_missing" numeric(14, 3) DEFAULT '0' NOT NULL,
	"notes" text,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_verifications_non_negative" CHECK ("stock_verifications"."counted_available" >= 0
        AND "stock_verifications"."counted_borrowed" >= 0
        AND "stock_verifications"."counted_awaiting_testing" >= 0
        AND "stock_verifications"."counted_damaged" >= 0
        AND "stock_verifications"."counted_missing" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_provider" text NOT NULL,
	"auth_subject" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"account_type" "account_type" DEFAULT 'student' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_loan_line_id_loan_lines_id_fk" FOREIGN KEY ("loan_line_id") REFERENCES "public"."loan_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_requests" ADD CONSTRAINT "extension_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_stock_id_lab_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."lab_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_physical_unit_id_physical_units_id_fk" FOREIGN KEY ("physical_unit_id") REFERENCES "public"."physical_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_loan_line_id_loan_lines_id_fk" FOREIGN KEY ("loan_line_id") REFERENCES "public"."loan_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_return_line_id_return_lines_id_fk" FOREIGN KEY ("return_line_id") REFERENCES "public"."return_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_memberships" ADD CONSTRAINT "lab_memberships_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_memberships" ADD CONSTRAINT "lab_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_stock" ADD CONSTRAINT "lab_stock_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_stock" ADD CONSTRAINT "lab_stock_component_model_id_component_models_id_fk" FOREIGN KEY ("component_model_id") REFERENCES "public"."component_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_policies_id_lab_unique" ON "stock_policies" USING btree ("id","lab_id");--> statement-breakpoint
ALTER TABLE "lab_stock" ADD CONSTRAINT "lab_stock_policy_same_lab_fk" FOREIGN KEY ("policy_id","lab_id") REFERENCES "public"."stock_policies"("id","lab_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_lines" ADD CONSTRAINT "loan_lines_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_lines" ADD CONSTRAINT "loan_lines_stock_id_lab_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."lab_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_participants" ADD CONSTRAINT "loan_participants_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_participants" ADD CONSTRAINT "loan_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_units" ADD CONSTRAINT "loan_units_loan_line_id_loan_lines_id_fk" FOREIGN KEY ("loan_line_id") REFERENCES "public"."loan_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_units" ADD CONSTRAINT "loan_units_physical_unit_id_physical_units_id_fk" FOREIGN KEY ("physical_unit_id") REFERENCES "public"."physical_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_user_id_users_id_fk" FOREIGN KEY ("borrower_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_source_request_id_requests_id_fk" FOREIGN KEY ("source_request_id") REFERENCES "public"."requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_attempts" ADD CONSTRAINT "notification_attempts_job_id_notification_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."notification_jobs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_loan_line_id_loan_lines_id_fk" FOREIGN KEY ("loan_line_id") REFERENCES "public"."loan_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_units" ADD CONSTRAINT "physical_units_stock_id_lab_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."lab_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quantity_balances" ADD CONSTRAINT "quantity_balances_stock_id_lab_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."lab_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_lines" ADD CONSTRAINT "request_lines_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_lines" ADD CONSTRAINT "request_lines_stock_id_lab_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."lab_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_return_record_id_return_records_id_fk" FOREIGN KEY ("return_record_id") REFERENCES "public"."return_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_loan_line_id_loan_lines_id_fk" FOREIGN KEY ("loan_line_id") REFERENCES "public"."loan_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_lines" ADD CONSTRAINT "return_lines_loan_unit_id_loan_units_id_fk" FOREIGN KEY ("loan_unit_id") REFERENCES "public"."loan_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_records" ADD CONSTRAINT "return_records_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_records" ADD CONSTRAINT "return_records_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_policies" ADD CONSTRAINT "stock_policies_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_policies" ADD CONSTRAINT "stock_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_verifications" ADD CONSTRAINT "stock_verifications_stock_id_lab_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."lab_stock"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_verifications" ADD CONSTRAINT "stock_verifications_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_lab_occurred_idx" ON "audit_events" USING btree ("lab_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_events_correlation_idx" ON "audit_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "component_models_model_key_unique" ON "component_models" USING btree ("model_key");--> statement-breakpoint
CREATE INDEX "component_models_search_aliases_idx" ON "component_models" USING gin ("search_aliases");--> statement-breakpoint
CREATE UNIQUE INDEX "extension_requests_one_pending_per_line" ON "extension_requests" USING btree ("loan_line_id") WHERE "extension_requests"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_movements_idempotency_key_unique" ON "inventory_movements" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "inventory_movements_stock_occurred_idx" ON "inventory_movements" USING btree ("stock_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lab_memberships_lab_user_unique" ON "lab_memberships" USING btree ("lab_id","user_id");--> statement-breakpoint
CREATE INDEX "lab_memberships_user_active_idx" ON "lab_memberships" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "lab_stock_lab_code_unique" ON "lab_stock" USING btree ("lab_id","stock_code");--> statement-breakpoint
CREATE INDEX "lab_stock_lab_model_active_idx" ON "lab_stock" USING btree ("lab_id","component_model_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "labs_code_unique" ON "labs" USING btree ("code");--> statement-breakpoint
CREATE INDEX "loan_lines_loan_idx" ON "loan_lines" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "loan_lines_stock_due_outstanding_idx" ON "loan_lines" USING btree ("stock_id","due_at") WHERE "loan_lines"."quantity_outstanding" > 0;--> statement-breakpoint
CREATE INDEX "loan_participants_user_idx" ON "loan_participants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "loan_units_line_unit_unique" ON "loan_units" USING btree ("loan_line_id","physical_unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "loan_units_one_active_loan_per_unit" ON "loan_units" USING btree ("physical_unit_id") WHERE "loan_units"."returned_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "loans_idempotency_key_unique" ON "loans" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "loans_lab_status_issued_idx" ON "loans" USING btree ("lab_id","status","issued_at");--> statement-breakpoint
CREATE INDEX "loans_borrower_issued_idx" ON "loans" USING btree ("borrower_user_id","issued_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_attempts_job_number_unique" ON "notification_attempts" USING btree ("job_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_jobs_logical_job_unique" ON "notification_jobs" USING btree ("loan_line_id","due_revision","kind","recipient_user_id","channel");--> statement-breakpoint
CREATE INDEX "notification_jobs_claim_idx" ON "notification_jobs" USING btree ("status","next_attempt_at","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "physical_units_asset_tag_unique" ON "physical_units" USING btree ("asset_tag");--> statement-breakpoint
CREATE INDEX "physical_units_serial_number_idx" ON "physical_units" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "physical_units_stock_status_idx" ON "physical_units" USING btree ("stock_id","status");--> statement-breakpoint
CREATE INDEX "request_lines_request_idx" ON "request_lines" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "requests_lab_status_created_idx" ON "requests" USING btree ("lab_id","status","created_at");--> statement-breakpoint
CREATE INDEX "requests_requester_created_idx" ON "requests" USING btree ("requested_by","created_at");--> statement-breakpoint
CREATE INDEX "return_lines_return_record_idx" ON "return_lines" USING btree ("return_record_id");--> statement-breakpoint
CREATE INDEX "return_lines_loan_line_idx" ON "return_lines" USING btree ("loan_line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "return_lines_loan_unit_unique" ON "return_lines" USING btree ("loan_unit_id") WHERE "return_lines"."loan_unit_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "return_records_idempotency_key_unique" ON "return_records" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "return_records_loan_received_idx" ON "return_records" USING btree ("loan_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_policies_lab_name_unique" ON "stock_policies" USING btree ("lab_id","name");--> statement-breakpoint
CREATE INDEX "stock_verifications_stock_verified_idx" ON "stock_verifications" USING btree ("stock_id","verified_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_token_hash_unique" ON "user_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "user_sessions_user_active_idx" ON "user_sessions" USING btree ("user_id","expires_at","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_identity_unique" ON "users" USING btree ("auth_provider","auth_subject");--> statement-breakpoint
CREATE INDEX "users_account_type_active_idx" ON "users" USING btree ("account_type","is_active");
