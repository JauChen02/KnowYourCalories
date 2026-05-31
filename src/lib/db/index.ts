import "server-only";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { getRequiredEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

// Required for WebSocket connections in Node.js serverless environments
if (typeof WebSocket === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws");
}

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (database) {
    return database;
  }

  const pool = new Pool({ connectionString: getRequiredEnv("DATABASE_URL") });
  database = drizzle({ client: pool, schema });

  return database;
}

export { schema };
