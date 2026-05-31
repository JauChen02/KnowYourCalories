import "server-only";

import { and, desc, eq, lte } from "drizzle-orm";
import { format } from "date-fns";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function getRequiredSession() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return null;
  }

  return session;
}

export async function getActiveCalorieTarget(userId: string) {
  const db = getDb();
  const today = format(new Date(), "yyyy-MM-dd");

  const [target] = await db
    .select()
    .from(schema.calorieTargets)
    .where(
      and(
        eq(schema.calorieTargets.userId, userId),
        lte(schema.calorieTargets.effectiveFrom, today)
      )
    )
    .orderBy(desc(schema.calorieTargets.effectiveFrom))
    .limit(1);

  return target ?? null;
}

export async function getAuthenticatedAppDestination(userId: string) {
  const activeTarget = await getActiveCalorieTarget(userId);

  return activeTarget ? "/dashboard" : "/onboarding";
}

export async function getUserImageRetentionPreference(userId: string) {
  const db = getDb();

  const [record] = await db
    .select({
      retainImagesAfterAnalysis: schema.user.retainImagesAfterAnalysis,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);

  return record?.retainImagesAfterAnalysis ?? true;
}
