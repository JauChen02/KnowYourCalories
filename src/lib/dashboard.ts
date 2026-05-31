import "server-only";

import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { eachDayOfInterval, endOfDay, format, startOfDay, subDays } from "date-fns";

import { getDb, schema } from "@/lib/db";
import { getDailyCalorieTotals } from "@/lib/db/queries";

type MealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "drink"
  | "other";

type EntryStatus = "pending" | "analyzed" | "logged" | "needs_review" | "confirmed";
type GoalType = "cutting" | "maintaining" | "bulking";
type DailyState = "under" | "near" | "over";

type RecentEntry = {
  id: string;
  entryDate: string;
  title: string;
  mealType: MealType;
  status: EntryStatus;
  loggedAt: Date;
  imageUrl: string | null;
  notes: string | null;
  totalCalories: number;
  estimatedCalories: number | null;
  confidence: number | null;
  estimate: {
    totalCalories: number;
  } | null;
  items: Array<{
    id: string;
    name: string;
    portionLabel: string | null;
    estimatedCalories: number | null;
    finalCalories: number;
  }>;
  followUps: Array<{
    id: string;
    role: "user";
    message: string;
  }>;
};

type DayEntryPreview = {
  id: string;
  title: string;
  mealType: MealType;
  status: EntryStatus;
  loggedAtLabel: string;
  imageUrl: string | null;
  totalCalories: number;
};

function getDailyState(consumed: number, target: number): DailyState {
  if (target <= 0) {
    return "near";
  }

  const ratio = consumed / target;

  if (ratio > 1.05) {
    return "over";
  }

  if (ratio >= 0.9) {
    return "near";
  }

  return "under";
}

async function getEntriesForUser(userId: string, limit?: number): Promise<RecentEntry[]> {
  const db = getDb();

  let query = db
    .select()
    .from(schema.foodEntries)
    .where(
      and(
        eq(schema.foodEntries.userId, userId),
        isNull(schema.foodEntries.deletedAt)
      )
    )
    .orderBy(desc(schema.foodEntries.loggedAt))
    .$dynamic();

  if (limit != null) {
    query = query.limit(limit);
  }

  const entryRows = await query;
  const entryIds = entryRows.map((entry) => entry.id);

  const [itemRows, followUpRows] = await Promise.all([
    entryIds.length
      ? db
          .select()
          .from(schema.foodItems)
          .where(
            and(
              inArray(schema.foodItems.foodEntryId, entryIds),
              isNull(schema.foodItems.deletedAt)
            )
          )
          .orderBy(schema.foodItems.createdAt)
      : Promise.resolve([]),
    entryIds.length
      ? db
          .select()
          .from(schema.entryFollowups)
          .where(inArray(schema.entryFollowups.foodEntryId, entryIds))
          .orderBy(desc(schema.entryFollowups.createdAt))
      : Promise.resolve([]),
  ]);

  const itemsByEntry = new Map<string, RecentEntry["items"]>();
  const followUpsByEntry = new Map<string, RecentEntry["followUps"]>();

  for (const item of itemRows) {
    itemsByEntry.set(item.foodEntryId, [
      ...(itemsByEntry.get(item.foodEntryId) ?? []),
      {
        id: item.id,
        name: item.name,
        portionLabel: item.quantityEstimate,
        estimatedCalories: item.aiKcal,
        finalCalories: item.finalKcal,
      },
    ]);
  }

  for (const followUp of followUpRows) {
    followUpsByEntry.set(followUp.foodEntryId, [
      ...(followUpsByEntry.get(followUp.foodEntryId) ?? []),
      {
        id: followUp.id,
        role: "user",
        message: followUp.userPrompt,
      },
    ]);
  }

  return entryRows.map((entry) => ({
    id: entry.id,
    entryDate: entry.entryDate,
    title: entry.title,
    mealType: entry.mealType,
    status: entry.status,
    loggedAt: entry.loggedAt,
    imageUrl: entry.imageUrl,
    notes: entry.userNotes,
    totalCalories: entry.finalTotalKcal,
    estimatedCalories: entry.aiTotalKcal,
    confidence: entry.confidence,
    estimate:
      entry.aiTotalKcal == null
        ? null
        : {
            totalCalories: entry.aiTotalKcal,
          },
    items: itemsByEntry.get(entry.id) ?? [],
    followUps: followUpsByEntry.get(entry.id) ?? [],
  }));
}

async function getEntriesByDateRange(params: {
  userId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const db = getDb();

  const entryRows = await db
    .select()
    .from(schema.foodEntries)
    .where(
      and(
        eq(schema.foodEntries.userId, params.userId),
        gte(schema.foodEntries.entryDate, params.dateFrom),
        lte(schema.foodEntries.entryDate, params.dateTo),
        isNull(schema.foodEntries.deletedAt)
      )
    )
    .orderBy(desc(schema.foodEntries.loggedAt));

  const grouped = new Map<string, DayEntryPreview[]>();

  for (const entry of entryRows) {
    grouped.set(entry.entryDate, [
      ...(grouped.get(entry.entryDate) ?? []),
      {
        id: entry.id,
        title: entry.title,
        mealType: entry.mealType,
        status: entry.status,
        loggedAtLabel: format(entry.loggedAt, "h:mm a"),
        imageUrl: entry.imageUrl,
        totalCalories: entry.finalTotalKcal,
      },
    ]);
  }

  return grouped;
}

async function getTargetTimeline(params: {
  userId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const db = getDb();

  return db
    .select({
      effectiveFrom: schema.calorieTargets.effectiveFrom,
      targetKcal: schema.calorieTargets.targetKcal,
      goalType: schema.calorieTargets.goalType,
    })
    .from(schema.calorieTargets)
    .where(
      and(
        eq(schema.calorieTargets.userId, params.userId),
        lte(schema.calorieTargets.effectiveFrom, params.dateTo)
      )
    )
    .orderBy(asc(schema.calorieTargets.effectiveFrom));
}

export type DashboardData = {
  targetCalories: number;
  currentGoalType: GoalType;
  todayCalories: number;
  calorieDelta: number;
  weeklyAverageCalories: number;
  todayState: DailyState;
  chartData: Array<{
    dateKey: string;
    label: string;
    displayLabel: string;
    consumed: number;
    target: number;
    state: DailyState;
  }>;
  dayEntries: Array<{
    dateKey: string;
    label: string;
    displayLabel: string;
    consumed: number;
    target: number;
    state: DailyState;
    entries: DayEntryPreview[];
  }>;
  recentEntries: RecentEntry[];
};

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const today = new Date();
  const rangeStart = startOfDay(subDays(today, 6));
  const rangeEnd = endOfDay(today);
  const todayKey = format(today, "yyyy-MM-dd");
  const rangeStartKey = format(rangeStart, "yyyy-MM-dd");
  const rangeEndKey = format(rangeEnd, "yyyy-MM-dd");

  const [dailyTotalsRows, recentEntries, entriesByDay, targetTimeline] = await Promise.all([
    getDailyCalorieTotals({
      userId,
      dateFrom: rangeStartKey,
      dateTo: rangeEndKey,
    }),
    getEntriesForUser(userId, 12),
    getEntriesByDateRange({
      userId,
      dateFrom: rangeStartKey,
      dateTo: rangeEndKey,
    }),
    getTargetTimeline({
      userId,
      dateFrom: rangeStartKey,
      dateTo: rangeEndKey,
    }),
  ]);

  const caloriesByDay = new Map(
    dailyTotalsRows.map((row) => [row.entryDate, row.totalKcal] as const)
  );

  let targetIndex = -1;
  let activeTarget = {
    targetKcal: targetTimeline.at(-1)?.targetKcal ?? 2000,
    goalType: targetTimeline.at(-1)?.goalType ?? ("maintaining" as GoalType),
  };

  const chartData = eachDayOfInterval({
    start: rangeStart,
    end: rangeEnd,
  }).map((date) => {
    const dateKey = format(date, "yyyy-MM-dd");

    while (
      targetIndex + 1 < targetTimeline.length &&
      targetTimeline[targetIndex + 1]!.effectiveFrom <= dateKey
    ) {
      targetIndex += 1;
      activeTarget = {
        targetKcal: targetTimeline[targetIndex]!.targetKcal,
        goalType: targetTimeline[targetIndex]!.goalType,
      };
    }

    const consumed = caloriesByDay.get(dateKey) ?? 0;
    const target = activeTarget.targetKcal;
    const state = getDailyState(consumed, target);

    return {
      dateKey,
      label: format(date, "EEE"),
      displayLabel: format(date, "EEE, MMM d"),
      consumed,
      target,
      state,
    };
  });

  const todayChartPoint =
    chartData.find((point) => point.dateKey === todayKey) ?? chartData.at(-1);
  const todayCalories = todayChartPoint?.consumed ?? 0;
  const targetCalories = todayChartPoint?.target ?? 2000;
  const currentTargetRecord =
    [...targetTimeline]
      .reverse()
      .find((target) => target.effectiveFrom <= todayKey) ?? null;
  const currentGoalType = currentTargetRecord?.goalType ?? "maintaining";
  const weeklyAverageCalories =
    chartData.reduce((sum, point) => sum + point.consumed, 0) / chartData.length;

  return {
    targetCalories,
    currentGoalType,
    todayCalories,
    calorieDelta: targetCalories - todayCalories,
    weeklyAverageCalories: Math.round(weeklyAverageCalories),
    todayState: getDailyState(todayCalories, targetCalories),
    chartData,
    dayEntries: chartData.map((point) => ({
      ...point,
      entries: entriesByDay.get(point.dateKey) ?? [],
    })),
    recentEntries,
  };
}

export async function getMealHistory(userId: string, limit = 30) {
  return getEntriesForUser(userId, limit);
}
