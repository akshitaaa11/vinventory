import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

// Resolve from this file, because pnpm runs each command from its package directory.
// Node preserves exported environment values over entries in the file.
const environmentFile = fileURLToPath(new URL("../.env", import.meta.url));
if (process.env.NODE_ENV !== "production" && existsSync(environmentFile)) {
  loadEnvFile(environmentFile);
}
