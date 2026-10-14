import { buildApp } from "./app.js";
import { DrizzleAuthRepository } from "./auth/repository.js";
import { VAuthOidcClient } from "./auth/oidc.js";
import { loadConfig } from "./config.js";
import { createDatabase } from "@vinventory/db";
import { DrizzleInventoryRepository } from "./inventory/repository.js";

const config = loadConfig();
const database = createDatabase(config.databaseUrl);
const app = await buildApp({
  inventory: new DrizzleInventoryRepository(database.db),
  auth: {
    repository: new DrizzleAuthRepository(database.db),
    oidcClient: new VAuthOidcClient(config.vAuth),
    cookieSecret: config.cookieSecret,
    secureCookies: config.environment === "production",
    sessionTtlHours: config.sessionTtlHours,
    webOrigin: config.webOrigin,
    callbackUrl: config.vAuth.redirectUri,
  },
});

app.addHook("onClose", async () => database.close());

try {
  await app.listen({ host: config.apiHost, port: config.apiPort });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
