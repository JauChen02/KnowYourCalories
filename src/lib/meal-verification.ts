import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "@/lib/db";

const aiResultSchema = z.object({
  meal_title: z.string().optional(),
  total_kcal: z.number().optional(),
  confidence: z.number().optional(),
  assumptions: z.array(z.string()).optional(),
  questions_for_user: z.array(z.string()).optional(),
  warning: z.string().optional(),
});

function parseAiResult(rawJson: Record<string, unknown> | null) {
  const candidate = rawJson?.result;
  const parsed = aiResultSchema.safeParse(candidate);

  if (!parsed.success) {
    return {
      mealTitle: null,
      assumptions: [] as string[],
      questionsForUser: [] as string[],
      warning: null,
    };
  }

  return {
    mealTitle: parsed.data.meal_title ?? null,
    assumptions: parsed.data.assumptions ?? [],
    questionsForUser: parsed.data.questions_for_user ?? [],
    warning: parsed.data.warning?.trim() || null,
  };
}

const followUpResultSchema = z.object({
  meal_title: z.string().optional(),
  total_kcal: z.number().optional(),
  confidence: z.number().optional(),
  assumptions: z.array(z.string()).optional(),
  questions_for_user: z.array(z.string()).optional(),
  warning: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity_estimate: z.string(),
        kcal: z.number(),
        confidence: z.number(),
        reasoning: z.string(),
      })
    )
    .optional(),
});

function parseFollowUp(rawJson: Record<string, unknown> | null) {
  const result = followUpResultSchema.safeParse(rawJson?.result);

  return {
    status:
      typeof rawJson?.status === "string"
        ? rawJson.status
        : "pending",
    failureReason:
      typeof rawJson?.failureReason === "string" ? rawJson.failureReason : null,
    model: typeof rawJson?.model === "string" ? rawJson.model : null,
    promptVersion:
      typeof rawJson?.promptVersion === "string" ? rawJson.promptVersion : null,
    acceptedAt:
      typeof rawJson?.acceptedAt === "string" ? rawJson.acceptedAt : null,
    rejectedAt:
      typeof rawJson?.rejectedAt === "string" ? rawJson.rejectedAt : null,
    result: result.success
      ? {
          mealTitle: result.data.meal_title ?? null,
          totalKcal: result.data.total_kcal ?? null,
          confidence: result.data.confidence ?? null,
          assumptions: result.data.assumptions ?? [],
          questionsForUser: result.data.questions_for_user ?? [],
          warning: result.data.warning?.trim() || null,
          items:
            result.data.items?.map((item) => ({
              name: item.name,
              quantityEstimate: item.quantity_estimate,
              kcal: item.kcal,
              confidence: item.confidence,
              reasoning: item.reasoning,
            })) ?? [],
        }
      : null,
  };
}

export type MealVerificationData = {
  id: string;
  title: string;
  mealType: string;
  status: "pending" | "analyzed" | "logged" | "needs_review" | "confirmed";
  loggedAt: Date;
  imageUrl: string | null;
  notes: string | null;
  aiTotalKcal: number | null;
  userTotalKcal: number | null;
  finalTotalKcal: number;
  confidence: number | null;
  aiModel: string | null;
  aiPromptVersion: string | null;
  aiMealTitle: string | null;
  assumptions: string[];
  questionsForUser: string[];
  warning: string | null;
  items: Array<{
    id: string;
    name: string;
    quantityEstimate: string | null;
    finalCalories: number;
    aiName: string | null;
    aiQuantityEstimate: string | null;
    aiCalories: number | null;
    userName: string | null;
    userQuantityEstimate: string | null;
    userCalories: number | null;
    confidence: number | null;
    reasoning: string | null;
  }>;
  followUps: Array<{
    id: string;
    userPrompt: string;
    previousTotalKcal: number | null;
    revisedTotalKcal: number | null;
    createdAt: Date;
    status: string;
    failureReason: string | null;
    model: string | null;
    promptVersion: string | null;
    acceptedAt: string | null;
    rejectedAt: string | null;
    result: {
      mealTitle: string | null;
      totalKcal: number | null;
      confidence: number | null;
      assumptions: string[];
      questionsForUser: string[];
      warning: string | null;
      items: Array<{
        name: string;
        quantityEstimate: string;
        kcal: number;
        confidence: number;
        reasoning: string;
      }>;
    } | null;
  }>;
};

export async function getMealVerificationData(userId: string, entryId: string) {
  const db = getDb();

  const [entry] = await db
    .select()
    .from(schema.foodEntries)
    .where(
      and(
        eq(schema.foodEntries.id, entryId),
        eq(schema.foodEntries.userId, userId),
        isNull(schema.foodEntries.deletedAt)
      )
    )
    .limit(1);

  if (!entry) {
    return null;
  }

  const itemRows = await db
    .select()
    .from(schema.foodItems)
    .where(
      and(
        eq(schema.foodItems.foodEntryId, entry.id),
        isNull(schema.foodItems.deletedAt)
      )
    )
    .orderBy(schema.foodItems.createdAt);

  const followUpRows = await db
    .select()
    .from(schema.entryFollowups)
    .where(eq(schema.entryFollowups.foodEntryId, entry.id))
    .orderBy(schema.entryFollowups.createdAt);

  const aiResult = parseAiResult(entry.aiRawJson);

  return {
    id: entry.id,
    title: entry.title,
    mealType: entry.mealType,
    status: entry.status,
    loggedAt: entry.loggedAt,
    imageUrl: entry.imageUrl,
    notes: entry.userNotes,
    aiTotalKcal: entry.aiTotalKcal,
    userTotalKcal: entry.userTotalKcal,
    finalTotalKcal: entry.finalTotalKcal,
    confidence: entry.confidence,
    aiModel: entry.aiModel,
    aiPromptVersion: entry.aiPromptVersion,
    aiMealTitle: aiResult.mealTitle,
    assumptions: aiResult.assumptions,
    questionsForUser: aiResult.questionsForUser,
    warning: aiResult.warning,
    items: itemRows.map((item) => ({
      id: item.id,
      name: item.name,
      quantityEstimate: item.quantityEstimate,
      finalCalories: item.finalKcal,
      aiName: item.aiName,
      aiQuantityEstimate: item.aiQuantityEstimate,
      aiCalories: item.aiKcal,
      userName: item.userName,
      userQuantityEstimate: item.userQuantityEstimate,
      userCalories: item.userKcal,
      confidence: item.confidence,
      reasoning: item.reasoning,
    })),
    followUps: followUpRows.map((followUp) => {
      const parsedFollowUp = parseFollowUp(followUp.aiResponseJson);

      return {
        id: followUp.id,
        userPrompt: followUp.userPrompt,
        previousTotalKcal: followUp.previousTotalKcal,
        revisedTotalKcal: followUp.revisedTotalKcal,
        createdAt: followUp.createdAt,
        status: parsedFollowUp.status,
        failureReason: parsedFollowUp.failureReason,
        model: parsedFollowUp.model,
        promptVersion: parsedFollowUp.promptVersion,
        acceptedAt: parsedFollowUp.acceptedAt,
        rejectedAt: parsedFollowUp.rejectedAt,
        result: parsedFollowUp.result,
      };
    }),
  } satisfies MealVerificationData;
}
