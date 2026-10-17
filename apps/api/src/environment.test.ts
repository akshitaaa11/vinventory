import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

describe("workspace environment loading", () => {
  it("loads the root file from a package cwd, preserves host values, and skips production", () => {
    const root = mkdtempSync(join(tmpdir(), "vinventory-env-"));
    try {
      mkdirSync(join(root, "scripts"));
      mkdirSync(join(root, "apps", "api"), { recursive: true });
      const loader = join(root, "scripts", "load-env.mjs");
      copyFileSync(fileURLToPath(new URL("../../../scripts/load-env.mjs", import.meta.url)), loader);
      writeFileSync(join(root, ".env"), "VINVENTORY_TEST_FILE=from-file\nVINVENTORY_TEST_OVERRIDE=from-file\n");
      for (const environment of ["development", "production"]) {
        const result = spawnSync(process.execPath, ["--import", pathToFileURL(loader).href, "--input-type=module", "-e",
          "process.stdout.write(JSON.stringify([process.env.VINVENTORY_TEST_FILE ?? null, process.env.VINVENTORY_TEST_OVERRIDE]))"], {
          cwd: join(root, "apps", "api"), encoding: "utf8",
          env: { ...process.env, NODE_ENV: environment, VINVENTORY_TEST_OVERRIDE: "from-host" },
        });
        expect(result.status, result.stderr).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual([environment === "production" ? null : "from-file", "from-host"]);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
