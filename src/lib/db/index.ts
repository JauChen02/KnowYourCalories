import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getRequiredEnv } from "@/lib/env";
import * as schema from "@/lib/db/schema";

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (database) {
    return database;
  }

  const connection = neon(getRequiredEnv("DATABASE_URL"));
  database = drizzle(connection, { schema });

  return database;
}

export { schema };
