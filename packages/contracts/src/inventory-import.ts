import { z } from "zod";

export const maxImportBytes = 2 * 1024 * 1024;
export const maxImportRows = 500;
export const inventoryImportFileSchema = z.object({
  filename: z.string().min(1).max(200).regex(/\.(csv|xlsx)$/i),
  content: z.string().min(4).max(Math.ceil(maxImportBytes / 3) * 4)
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
});
export const inventoryImportCommitSchema = inventoryImportFileSchema.extend({
  policyId: z.uuid(),
  storageLocation: z.string().trim().min(1).max(200),
  confirmed: z.literal(true),
});

export type InventoryImportFile = z.infer<typeof inventoryImportFileSchema>;
export type InventoryImportRow = {
  row: number;
  stockCode: string;
  name: string;
  tracking: "individual" | "quantity";
  quantity: number;
  assetTags: string[];
};
export type ImportIssue = { row: number; field: string; message: string };
export type ImportPreview = { rows: InventoryImportRow[]; issues: ImportIssue[] };
export type ImportLab = { id: string; code: string; name: string; location: string | null };
export type ImportPolicy = { id: string; name: string; defaultLoanDays: number | null };
export type ImportResult = { imported: number; units: number; status: "awaiting_testing" };
