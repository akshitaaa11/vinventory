import { z } from "zod";

export const labSummarySchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  location: z.string().nullable(),
  canManageStock: z.boolean(),
});
export const labsResponseSchema = z.object({ labs: z.array(labSummarySchema) });
export type LabSummary = z.infer<typeof labSummarySchema>;
