import Fastify from "fastify";

import { healthResponseSchema } from "@vinventory/contracts";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => healthResponseSchema.parse({ status: "ok" }));

  return app;
}
