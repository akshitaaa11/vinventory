import Fastify from "fastify";

import { healthResponseSchema } from "@vinventory/contracts";

import { registerAuthentication } from "./auth/plugin.js";
import type { AuthRepository, OidcClient } from "./auth/types.js";

type BuildAppOptions = {
  logger?: boolean;
  auth?: {
    repository: AuthRepository;
    oidcClient: OidcClient;
    cookieSecret: string;
    secureCookies: boolean;
    sessionTtlHours: number;
    webOrigin: string;
    callbackUrl: string;
  };
};

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });

  app.get("/health", async () => healthResponseSchema.parse({ status: "ok" }));

  if (options.auth) {
    await registerAuthentication(app, options.auth);

    app.get(
      "/api/me",
      { preHandler: [app.authenticate] },
      async (request) => ({ user: request.currentUser }),
    );

    app.get<{ Params: { labId: string } }>(
      "/api/labs/:labId/issue-access",
      {
        preHandler: [app.authenticate, app.requireLabPermission("issue")],
      },
      async () => ({ allowed: true }),
    );
  }

  return app;
}
