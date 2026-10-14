import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { inventoryImportFileSchema, inventoryImportCommitSchema } from "@vinventory/contracts";
import { ImportError, importTemplate, parseInventoryFile } from "./parser.js";
import type { InventoryRepository } from "./repository.js";

export async function registerInventoryImports(app: FastifyInstance, repository: InventoryRepository, webOrigin: string) {
  app.get("/api/import-labs", { preHandler: [app.authenticate] }, async (request) => ({ labs: await repository.listLabs(request.currentUser!) }));
  app.get("/api/inventory/import-template.csv", async (_request, reply) => reply
    .type("text/csv; charset=utf-8").header("Content-Disposition", 'attachment; filename="inventory-template.csv"').send(importTemplate));

  await app.register(async (scope) => {
    scope.addHook("preValidation", async (request, reply) => {
      const { labId } = request.params as { labId: string };
      if (!z.uuid().safeParse(labId).success) return reply.code(400).send({ message: "Invalid lab identifier." });
      if (request.method === "POST" && request.headers.origin && request.headers.origin !== webOrigin) {
        return reply.code(403).send({ message: "Request origin is not allowed." });
      }
    });
    scope.addHook("preHandler", app.authenticate);
    scope.addHook("preHandler", app.requireLabPermission("manage_stock"));
    scope.setErrorHandler((error, request, reply) => {
      if (error instanceof ImportError) return reply.code(error.statusCode).send({ message: error.message });
      if (error instanceof Error && "statusCode" in error && typeof error.statusCode === "number" && error.statusCode < 500) {
        return reply.code(error.statusCode).send({ message: error.statusCode === 413 ? "File is too large. Use files up to 2 MB." : "Invalid import request." });
      }
      request.log.error(error);
      return reply.code(500).send({ message: "Import failed. No partial import was saved. Preview again before retrying." });
    });
    scope.get<{ Params: { labId: string } }>("/api/labs/:labId/import-policies", async (request) => ({ policies: await repository.listPolicies(request.params.labId) }));
    scope.post<{ Params: { labId: string } }>("/api/labs/:labId/inventory/import/preview", { bodyLimit: 3 * 1024 * 1024 }, async (request, reply) => {
      const file = inventoryImportFileSchema.safeParse(request.body);
      if (!file.success) return reply.code(400).send({ message: "Choose a valid CSV or .xlsx file up to 2 MB." });
      const preview = await parseInventoryFile(file.data);
      if (!preview.issues.length) preview.issues.push(...await repository.conflicts(request.params.labId, preview.rows));
      return preview;
    });
    scope.post<{ Params: { labId: string } }>("/api/labs/:labId/inventory/import", { bodyLimit: 3 * 1024 * 1024 }, async (request, reply) => {
      const input = inventoryImportCommitSchema.safeParse(request.body);
      if (!input.success) return reply.code(400).send({ message: "Review the file, choose a policy and storage location, and confirm the import." });
      const preview = await parseInventoryFile(input.data);
      if (preview.issues.length) return reply.code(422).send({ message: "Fix all file errors before importing.", issues: preview.issues });
      const result = await repository.commit({
        ...input.data, labId: request.params.labId, actorUserId: request.currentUser!.id, rows: preview.rows,
      });
      return reply.code(201).send(result);
    });
  });
}
