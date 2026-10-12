import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema/index.js";

export function createDatabase(connectionString: string) {
  const pool = new Pool({ connectionString });

  return {
    db: drizzle(pool, { schema }),
    close: () => pool.end(),
  };
}

export * from "./schema/index.js";
export { and, eq, gt, isNull } from "drizzle-orm";

export type Database = ReturnType<typeof createDatabase>["db"];
