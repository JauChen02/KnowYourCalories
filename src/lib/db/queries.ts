import "server-only";

import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

export async function getDailyCalorieTotals(params: {
  userId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const db = getDb();

  // Daily totals must always come from final_total_kcal, never raw AI estimates.
  return db
    .select({
      entryDate: schema.foodEntries.entryDate,
      totalKcal:
        sql<number>`coalesce(sum(${schema.foodEntries.finalTotalKcal}), 0)`.mapWith(
          Number
        ),
    })
    .from(schema.foodEntries)
    .where(
      and(
        eq(schema.foodEntries.userId, params.userId),
        gte(schema.foodEntries.entryDate, params.dateFrom),
        lte(schema.foodEntries.entryDate, params.dateTo),
        isNull(schema.foodEntries.deletedAt)
      )
    )
    .groupBy(schema.foodEntries.entryDate)
    .orderBy(schema.foodEntries.entryDate);
}
