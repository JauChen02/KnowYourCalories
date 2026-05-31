"use server";

import { del, put } from "@vercel/blob";
import { and, eq, isNull, sql } from "drizzle-orm";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  analyzeMealCorrectionWithGemini,
  analyzeMealPhotoWithGemini,
  type GeminiMealEstimate,
  parseGeminiMealEstimate,
} from "@/lib/ai/gemini";
import { authOptions } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { appSetup } from "@/lib/env";

const foodItemsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(80),
      portionLabel: z.string().trim().max(80).nullable(),
      estimatedCalories: z.number().int().min(0).max(5000).nullable(),
      finalCalories: z.number().int().min(0).max(5000).nullable(),
    })
  )
  .min(1, "Add at least one food item.");

const targetSchema = z.object({
  dailyCalorieTarget: z.number().int().min(100).max(10000),
  goalType: z.enum(["cutting", "maintaining", "bulking"]),
});

const itemEditSchema = z.object({
  entryId: z.string().min(1),
  itemId: z.string().min(1),
  portionLabel: z.string().trim().max(80).nullable(),
  finalCalories: z.number().int().min(0).max(5000),
});

const followUpSchema = z.object({
  entryId: z.string().min(1),
  message: z.string().trim().min(2).max(500),
});

const photoMealTypeValues = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "drink",
  "other",
] as const;

const analyzePendingEntrySchema = z.object({
  entryId: z.string().min(1),
});

const verificationItemSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(120),
  quantityEstimate: z.string().trim().max(120).nullable(),
  finalCalories: z.number().int().min(0).max(5000),
});

const saveMealVerificationSchema = z.object({
  entryId: z.string().min(1),
  confirm: z.boolean(),
  items: z
    .array(verificationItemSchema)
    .min(1, "Keep at least one item in the meal.")
    .max(30, "That meal has too many items to save at once."),
});

const followUpDecisionSchema = z.object({
  entryId: z.string().min(1),
  followUpId: z.string().min(1),
});

const deleteEntrySchema = z.object({
  entryId: z.string().min(1),
});

const imageRetentionPreferenceSchema = z.object({
  retainImagesAfterAnalysis: z.boolean(),
});

const maxPhotoSizeBytes = 8 * 1024 * 1024;

class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

function raiseActionError(message: string): never {
  throw new ActionError(message);
}

function getSafeActionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ActionError) {
    return error.message;
  }

  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  return fallback;
}

function getSafeStoredErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ActionError) {
    return error.message;
  }

  return fallback;
}

function parseJsonInput<T>(value: string, fallbackMessage: string) {
  try {
    return JSON.parse(value) as T;
  } catch {
    raiseActionError(fallbackMessage);
  }
}

function roundCalories(value: number) {
  return Math.max(0, Math.round(value));
}

function normalizeConfidenceScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function normalizeOptionalShortText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : null;
}

function getStoredAnalysisAttemptCount(rawJson: Record<string, unknown> | null) {
  const value = rawJson?.analysisAttemptCount;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getAiAnalysisStatus(estimate: GeminiMealEstimate) {
  if (estimate.confidence < 0.7) {
    return "needs_review" as const;
  }

  if (estimate.items.some((item) => item.confidence < 0.55)) {
    return "needs_review" as const;
  }

  return "analyzed" as const;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeOptionalNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function normalizeGeminiItemsForStorage(
  estimate: GeminiMealEstimate,
  reasoningPrefix?: string
) {
  return estimate.items.map((item) => ({
    name: item.name,
    quantityEstimate: item.quantity_estimate,
    aiKcal: roundCalories(item.kcal),
    finalKcal: roundCalories(item.kcal),
    confidence: normalizeConfidenceScore(item.confidence),
    reasoning: reasoningPrefix
      ? `${reasoningPrefix} ${item.reasoning}`.trim()
      : item.reasoning,
  }));
}

async function requireUserId() {
  if (!appSetup.authReady) {
    raiseActionError("Authentication is not configured yet.");
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    raiseActionError("You must be signed in to perform this action.");
  }

  return session.user.id;
}

export async function updateCalorieTargetAction(input: {
  dailyCalorieTarget: number;
  goalType: "cutting" | "maintaining" | "bulking";
}) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const parsed = targetSchema.parse(input);
    const effectiveFrom = format(new Date(), "yyyy-MM-dd");

    await db
      .insert(schema.calorieTargets)
      .values({
        userId,
        targetKcal: parsed.dailyCalorieTarget,
        goalType: parsed.goalType,
        effectiveFrom,
      })
      .onConflictDoUpdate({
        target: [
          schema.calorieTargets.userId,
          schema.calorieTargets.effectiveFrom,
        ],
        set: {
          targetKcal: parsed.dailyCalorieTarget,
          goalType: parsed.goalType,
        },
      });

    revalidatePath("/");

    return {
      ok: true,
      message: "Your daily target is saved.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionErrorMessage(error, "Unable to update target."),
    };
  }
}

export async function updateImageRetentionPreferenceAction(input: {
  retainImagesAfterAnalysis: boolean;
}) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const parsed = imageRetentionPreferenceSchema.parse(input);

    await db
      .update(schema.user)
      .set({
        retainImagesAfterAnalysis: parsed.retainImagesAfterAnalysis,
      })
      .where(eq(schema.user.id, userId));

    revalidatePath("/settings");

    return {
      ok: true,
      message: parsed.retainImagesAfterAnalysis
        ? "Meal photos will stay attached after analysis."
        : "Future analyzed meal photos will be deleted after analysis succeeds.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionErrorMessage(
        error,
        "Unable to save image retention preference."
      ),
    };
  }
}

export async function createFoodEntryAction(formData: FormData) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const title = String(formData.get("title") ?? "").trim();
    const mealType = String(formData.get("mealType") ?? "");
    const notes = normalizeOptionalText(formData.get("notes"));
    const loggedAtInput = String(formData.get("loggedAt") ?? "");
    const rawItems = String(formData.get("items") ?? "[]");
    const file = formData.get("image");

    const parsedItems = foodItemsSchema.parse(
      parseJsonInput<Array<Record<string, unknown>>>(
        rawItems,
        "We couldn't read the meal items you submitted."
      ).map((item) => ({
        name: String(item.name ?? ""),
        portionLabel: normalizeOptionalText(item.portionLabel),
        estimatedCalories: normalizeOptionalNumber(item.estimatedCalories),
        finalCalories: normalizeOptionalNumber(item.finalCalories),
      }))
    );

    const loggedAt = loggedAtInput ? new Date(loggedAtInput) : new Date();

    if (!title) {
      raiseActionError("Give the meal a short title so you can find it later.");
    }

    if (!photoMealTypeValues.includes(mealType as (typeof photoMealTypeValues)[number])) {
      raiseActionError("Choose a meal type.");
    }

    if (Number.isNaN(loggedAt.getTime())) {
      raiseActionError("Pick a valid meal time.");
    }

    let upload:
      | {
          url: string;
          pathname: string;
          contentType: string | undefined;
          size: number;
        }
      | undefined;

    if (file instanceof File && file.size > 0) {
      if (!appSetup.blobReady) {
        raiseActionError(
          "Photo upload needs BLOB_READ_WRITE_TOKEN. Remove the photo or finish blob setup first."
        );
      }

      if (!file.type.startsWith("image/")) {
        raiseActionError("Only image uploads are supported for meal photos.");
      }

      if (file.size > maxPhotoSizeBytes) {
        raiseActionError("Meal photos must be smaller than 8 MB.");
      }

      const extension = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf("."))
        : ".jpg";

      upload = await put(
        `meal-photos/${userId}/${Date.now()}-${crypto.randomUUID()}${extension}`,
        file,
        {
          access: "public",
        }
      ).then((result) => ({
        ...result,
        contentType: file.type || undefined,
        size: file.size,
      }));
    }

    const finalItems = parsedItems.map((item) => ({
      ...item,
      finalCalories: item.finalCalories ?? item.estimatedCalories ?? 0,
    }));

    const finalTotalKcal = finalItems.reduce(
      (sum, item) => sum + item.finalCalories,
      0
    );
    const aiTotalKcal = finalItems.reduce(
      (sum, item) => sum + (item.estimatedCalories ?? item.finalCalories),
      0
    );
    const confidence = upload ? 70 : 100;

    await db.transaction(async (tx) => {
      const [entry] = await tx
        .insert(schema.foodEntries)
        .values({
          userId,
          entryDate: format(loggedAt, "yyyy-MM-dd"),
          loggedAt,
          mealType: mealType as
            | "breakfast"
            | "lunch"
            | "dinner"
            | "snack"
            | "drink"
            | "other",
          title,
          imageUrl: upload?.url,
          imageBlurhash: null,
          status: "logged",
          aiTotalKcal,
          userTotalKcal: finalTotalKcal,
          finalTotalKcal,
          confidence,
          aiModel: null,
          aiPromptVersion: null,
          aiRawJson: {
            source: upload ? "camera" : "manual",
            items: finalItems.map((item) => ({
              name: item.name,
              aiKcal: item.estimatedCalories,
              finalKcal: item.finalCalories,
            })),
          },
          userNotes: notes,
        })
        .returning();

      await tx.insert(schema.foodItems).values(
        finalItems.map((item) => ({
          foodEntryId: entry.id,
          aiName: null,
          userName: item.name,
          name: item.name,
          aiQuantityEstimate: null,
          userQuantityEstimate: item.portionLabel,
          quantityEstimate: item.portionLabel,
          aiKcal: item.estimatedCalories,
          userKcal: item.finalCalories,
          finalKcal: item.finalCalories,
          confidence,
          reasoning: "Saved from a user-created meal entry.",
        }))
      );
    });

    revalidatePath("/");

    return {
      ok: true,
      message: "Meal saved to your calorie log.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionErrorMessage(error, "Unable to save meal."),
    };
  }
}

export async function createPendingPhotoEntryAction(formData: FormData) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const titleInput = String(formData.get("title") ?? "").trim();
    const mealType = String(formData.get("mealType") ?? "");
    const notes = normalizeOptionalText(formData.get("notes"));
    const loggedAtInput = String(formData.get("loggedAt") ?? "");
    const file = formData.get("image");

    if (!appSetup.blobReady) {
      raiseActionError(
        "Photo upload needs BLOB_READ_WRITE_TOKEN before images can be stored safely."
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      raiseActionError("Add a meal photo before you continue.");
    }

    if (!file.type.startsWith("image/")) {
      raiseActionError("Only image uploads are supported for meal photos.");
    }

    if (file.size > maxPhotoSizeBytes) {
      raiseActionError("Meal photos must be smaller than 8 MB.");
    }

    if (!photoMealTypeValues.includes(mealType as (typeof photoMealTypeValues)[number])) {
      raiseActionError("Choose a meal type.");
    }

    const loggedAt = loggedAtInput ? new Date(loggedAtInput) : new Date();

    if (Number.isNaN(loggedAt.getTime())) {
      raiseActionError("Pick a valid meal time.");
    }

    const extension = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf("."))
      : ".jpg";

    const uploadResult = await put(
      `meal-photos/${userId}/${Date.now()}-${crypto.randomUUID()}${extension}`,
      file,
      { access: "private" }
    ).catch((blobError: unknown) => {
      const detail = blobError instanceof Error ? blobError.message : String(blobError);
      console.error("[blob upload failed]", detail);
      raiseActionError(`Blob upload failed: ${detail}`);
    });

    const upload = { ...uploadResult, contentType: file.type || uploadResult.contentType, size: file.size };

    const [entry] = await db
      .insert(schema.foodEntries)
      .values({
        userId,
        entryDate: format(loggedAt, "yyyy-MM-dd"),
        loggedAt,
        mealType: mealType as
          | "breakfast"
          | "lunch"
          | "dinner"
          | "snack"
          | "drink"
          | "other",
        title: titleInput || "Photo meal",
        imageUrl: upload.url,
        imageBlurhash: null,
        status: "pending",
        aiTotalKcal: null,
        userTotalKcal: null,
        finalTotalKcal: 0,
        confidence: null,
        aiModel: null,
        aiPromptVersion: null,
        aiRawJson: {
          analysisStatus: "pending",
          analysisAttemptCount: 0,
          upload: {
            contentType: upload.contentType,
            pathname: upload.pathname,
            size: upload.size,
          },
        },
        userNotes: notes,
      })
      .returning({
        id: schema.foodEntries.id,
      });

    revalidatePath("/dashboard");
    revalidatePath("/history");
    revalidatePath("/upload");

    return {
      ok: true,
      entryId: entry.id,
      message: "Photo uploaded. Starting analysis now.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionErrorMessage(
        error,
        "Unable to upload that photo."
      ),
    };
  }
}

export async function analyzePendingPhotoEntryAction(input: { entryId: string }) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const parsed = analyzePendingEntrySchema.parse(input);
    const [userSettings] = await db
      .select({
        retainImagesAfterAnalysis: schema.user.retainImagesAfterAnalysis,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    const [entry] = await db
      .select()
      .from(schema.foodEntries)
      .where(
        and(
          eq(schema.foodEntries.id, parsed.entryId),
          eq(schema.foodEntries.userId, userId),
          isNull(schema.foodEntries.deletedAt)
        )
      )
      .limit(1);

    if (!entry) {
      raiseActionError("We couldn't find that photo entry.");
    }

    if (entry.status !== "pending") {
      const alreadyProcessedMessage =
        entry.status === "needs_review"
          ? "This photo is saved and waiting for a quick review."
          : "This photo has already been processed.";

      return {
        ok: true,
        status: entry.status,
        entryId: entry.id,
        message: alreadyProcessedMessage,
      };
    }

    if (!entry.imageUrl) {
      raiseActionError("This meal photo is missing its saved image URL.");
    }

    const attemptCount = getStoredAnalysisAttemptCount(entry.aiRawJson) + 1;

    try {
      if (!appSetup.aiReady) {
        raiseActionError(
          "AI analysis needs GEMINI_API_KEY and GEMINI_MODEL before photo estimates can run."
        );
      }

      const analysis = await analyzeMealPhotoWithGemini({
        imageUrl: entry.imageUrl,
        mealType: entry.mealType,
        loggedAt: entry.loggedAt.toISOString(),
        userNotes: entry.userNotes,
      });

      const normalizedItems = normalizeGeminiItemsForStorage(analysis.parsed);
      const aiTotalKcal = roundCalories(analysis.parsed.total_kcal);
      const nextStatus = getAiAnalysisStatus(analysis.parsed);
      const entryConfidence = normalizeConfidenceScore(analysis.parsed.confidence);

      const outcome = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${entry.id}))`
        );

        const [currentEntry] = await tx
          .select()
          .from(schema.foodEntries)
          .where(
            and(
              eq(schema.foodEntries.id, entry.id),
              eq(schema.foodEntries.userId, userId),
              isNull(schema.foodEntries.deletedAt)
            )
          )
          .limit(1);

        if (!currentEntry) {
          raiseActionError("We couldn't find that photo entry.");
        }

        if (currentEntry.status !== "pending") {
          return {
            kind: "already_processed" as const,
            status: currentEntry.status,
          };
        }

        const existingItems = await tx
          .select({
            id: schema.foodItems.id,
            userName: schema.foodItems.userName,
            userQuantityEstimate: schema.foodItems.userQuantityEstimate,
            userKcal: schema.foodItems.userKcal,
          })
          .from(schema.foodItems)
          .where(
            and(
              eq(schema.foodItems.foodEntryId, currentEntry.id),
              isNull(schema.foodItems.deletedAt)
            )
          );

        const hasUserEdits =
          currentEntry.userTotalKcal !== null ||
          existingItems.some(
            (item) =>
              item.userName !== null ||
              item.userQuantityEstimate !== null ||
              item.userKcal !== null
          );

        if (hasUserEdits) {
          await tx
            .update(schema.foodEntries)
            .set({
              status: "needs_review",
              updatedAt: new Date(),
              aiRawJson: {
                ...(currentEntry.aiRawJson ?? {}),
                analysisStatus: "skipped_after_user_edit",
                analysisAttemptCount: attemptCount,
                skippedAt: new Date().toISOString(),
              },
            })
            .where(eq(schema.foodEntries.id, currentEntry.id));

          return {
            kind: "preserved_user_edits" as const,
          };
        }

        await tx
          .delete(schema.foodItems)
          .where(
            and(
              eq(schema.foodItems.foodEntryId, currentEntry.id),
              isNull(schema.foodItems.deletedAt)
            )
          );

        await tx.insert(schema.foodItems).values(
          normalizedItems.map((item) => ({
            foodEntryId: currentEntry.id,
            aiName: item.name,
            userName: null,
            name: item.name,
            aiQuantityEstimate: item.quantityEstimate,
            userQuantityEstimate: null,
            quantityEstimate: item.quantityEstimate,
            aiKcal: item.aiKcal,
            userKcal: null,
            finalKcal: item.finalKcal,
            confidence: item.confidence,
            reasoning: item.reasoning,
          }))
        );

        await tx
          .update(schema.foodEntries)
          .set({
            status: nextStatus,
            aiTotalKcal,
            finalTotalKcal: aiTotalKcal,
            confidence: entryConfidence,
            aiModel: analysis.model,
            aiPromptVersion: analysis.promptVersion,
            aiRawJson: {
              ...(currentEntry.aiRawJson ?? {}),
              analysisStatus: "complete",
              analysisAttemptCount: attemptCount,
              analyzedAt: new Date().toISOString(),
              result: analysis.parsed,
              rawResponse: analysis.rawResponse,
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.foodEntries.id, currentEntry.id));

        return {
          kind: "updated" as const,
          status: nextStatus,
        };
      });

      if (outcome.kind === "already_processed") {
        return {
          ok: true,
          status: outcome.status,
          entryId: entry.id,
          message:
            outcome.status === "needs_review"
              ? "This photo is saved and waiting for a quick review."
              : "This photo has already been processed.",
        };
      }

      if (outcome.kind === "preserved_user_edits") {
        return {
          ok: true,
          status: "needs_review" as const,
          entryId: entry.id,
          message:
            "You already made changes to this meal, so we kept your edits and skipped replacing them.",
        };
      }

      const retainImagesAfterAnalysis =
        userSettings?.retainImagesAfterAnalysis ?? true;

      if (!retainImagesAfterAnalysis && entry.imageUrl) {
        try {
          await del(entry.imageUrl);

          const [freshEntry] = await db
            .select({
              aiRawJson: schema.foodEntries.aiRawJson,
            })
            .from(schema.foodEntries)
            .where(eq(schema.foodEntries.id, entry.id))
            .limit(1);

          await db
            .update(schema.foodEntries)
            .set({
              imageUrl: null,
              imageBlurhash: null,
              updatedAt: new Date(),
              aiRawJson: {
                ...(freshEntry?.aiRawJson ?? {}),
                imageRetention: {
                  retained: false,
                  deleteStatus: "deleted",
                  deletedAt: new Date().toISOString(),
                },
              },
            })
            .where(eq(schema.foodEntries.id, entry.id));
        } catch (imageCleanupError) {
          const [freshEntry] = await db
            .select({
              aiRawJson: schema.foodEntries.aiRawJson,
            })
            .from(schema.foodEntries)
            .where(eq(schema.foodEntries.id, entry.id))
            .limit(1);

          await db
            .update(schema.foodEntries)
            .set({
              updatedAt: new Date(),
              aiRawJson: {
                ...(freshEntry?.aiRawJson ?? {}),
                imageRetention: {
                  retained: true,
                  deleteStatus: "failed",
                  failureReason: getSafeStoredErrorMessage(
                    imageCleanupError,
                    "Image cleanup did not finish."
                  ),
                  failedAt: new Date().toISOString(),
                },
              },
            })
            .where(eq(schema.foodEntries.id, entry.id));
        }
      }

      revalidatePath("/dashboard");
      revalidatePath("/history");
      revalidatePath("/upload");
      revalidatePath(`/verify/${entry.id}`);
      revalidatePath(`/history/${entry.id}`);

      return {
        ok: true,
        status: outcome.status,
        entryId: entry.id,
        message:
          outcome.status === "needs_review"
            ? "Photo analyzed. The estimate is saved, but it could use a quick review."
            : "Photo analyzed and added to your calorie log.",
      };
    } catch (analysisError) {
      const failureOutcome = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${entry.id}))`
        );

        const [currentEntry] = await tx
          .select()
          .from(schema.foodEntries)
          .where(
            and(
              eq(schema.foodEntries.id, entry.id),
              eq(schema.foodEntries.userId, userId),
              isNull(schema.foodEntries.deletedAt)
            )
          )
          .limit(1);

        if (!currentEntry) {
          return {
            kind: "missing" as const,
          };
        }

        if (currentEntry.status !== "pending") {
          return {
            kind: "already_processed" as const,
            status: currentEntry.status,
          };
        }

        await tx
          .update(schema.foodEntries)
          .set({
            status: "needs_review",
            updatedAt: new Date(),
            aiRawJson: {
              ...(currentEntry.aiRawJson ?? {}),
              analysisStatus: "failed",
              analysisAttemptCount: attemptCount,
              failureReason: getSafeStoredErrorMessage(
                analysisError,
                "AI analysis did not finish."
              ),
              failedAt: new Date().toISOString(),
            },
          })
          .where(eq(schema.foodEntries.id, entry.id));

        return {
          kind: "marked_for_review" as const,
        };
      });

      if (failureOutcome.kind === "already_processed") {
        return {
          ok: true,
          status: failureOutcome.status,
          entryId: entry.id,
          message:
            failureOutcome.status === "needs_review"
              ? "This photo is saved and waiting for a quick review."
              : "This photo has already been processed.",
        };
      }

      revalidatePath("/dashboard");
      revalidatePath("/history");
      revalidatePath("/upload");

      return {
        ok: false,
        status: "needs_review" as const,
        entryId: entry.id,
        message:
          "We saved your photo, but the analysis did not finish. You can find the entry in History and update it later.",
      };
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[analyzePendingPhotoEntryAction outer catch]", detail);
    return {
      ok: false,
      status: "pending" as const,
      message: getSafeActionErrorMessage(error, `Unable to analyze the photo. (${detail})`),
    };
  }
}

export async function saveMealVerificationAction(input: {
  entryId: string;
  confirm: boolean;
  items: Array<{
    id?: string;
    name: string;
    quantityEstimate: string | null;
    finalCalories: number;
  }>;
}) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const parsed = saveMealVerificationSchema.parse({
      ...input,
      items: input.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantityEstimate: normalizeOptionalShortText(item.quantityEstimate),
        finalCalories: roundCalories(item.finalCalories),
      })),
    });

    const totalFinalCalories = parsed.items.reduce(
      (sum, item) => sum + item.finalCalories,
      0
    );
    const submittedIds = new Set(
      parsed.items.map((item) => item.id).filter(Boolean) as string[]
    );

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${parsed.entryId}))`
      );

      const [entry] = await tx
        .select()
        .from(schema.foodEntries)
        .where(
          and(
            eq(schema.foodEntries.id, parsed.entryId),
            eq(schema.foodEntries.userId, userId),
            isNull(schema.foodEntries.deletedAt)
          )
        )
        .limit(1);

      if (!entry) {
        raiseActionError("We couldn't find that meal entry.");
      }

      const existingItems = await tx
        .select()
        .from(schema.foodItems)
        .where(eq(schema.foodItems.foodEntryId, entry.id));

      const existingItemsById = new Map(
        existingItems.map((item) => [item.id, item] as const)
      );
      const now = new Date();

      for (const existingItem of existingItems) {
        if (!submittedIds.has(existingItem.id) && !existingItem.deletedAt) {
          await tx
            .update(schema.foodItems)
            .set({
              deletedAt: now,
              updatedAt: now,
            })
            .where(eq(schema.foodItems.id, existingItem.id));
        }
      }

      for (const item of parsed.items) {
        if (item.id) {
          const existingItem = existingItemsById.get(item.id);

          if (!existingItem || existingItem.foodEntryId !== entry.id) {
            raiseActionError("One of the meal items could not be found.");
          }

          const aiBaselineName = existingItem.aiName;
          const aiBaselineQuantity = existingItem.aiQuantityEstimate;
          const aiBaselineCalories = existingItem.aiKcal;
          const hasAiBaseline =
            aiBaselineName !== null ||
            aiBaselineQuantity !== null ||
            aiBaselineCalories !== null;

          await tx
            .update(schema.foodItems)
            .set({
              name: item.name,
              quantityEstimate: item.quantityEstimate,
              finalKcal: item.finalCalories,
              userName: hasAiBaseline ? (item.name !== aiBaselineName ? item.name : null) : item.name,
              userQuantityEstimate: hasAiBaseline
                ? item.quantityEstimate !== aiBaselineQuantity
                  ? item.quantityEstimate
                  : null
                : item.quantityEstimate,
              userKcal: hasAiBaseline
                ? item.finalCalories !== aiBaselineCalories
                  ? item.finalCalories
                  : null
                : item.finalCalories,
              deletedAt: null,
              updatedAt: now,
            })
            .where(eq(schema.foodItems.id, existingItem.id));

          continue;
        }

        await tx.insert(schema.foodItems).values({
          foodEntryId: entry.id,
          aiName: null,
          userName: item.name,
          name: item.name,
          aiQuantityEstimate: null,
          userQuantityEstimate: item.quantityEstimate,
          quantityEstimate: item.quantityEstimate,
          aiKcal: null,
          userKcal: item.finalCalories,
          finalKcal: item.finalCalories,
          confidence: null,
          reasoning: "Added during meal verification.",
        });
      }

      await tx
        .update(schema.foodEntries)
        .set({
          userTotalKcal: totalFinalCalories,
          finalTotalKcal: totalFinalCalories,
          status: parsed.confirm
            ? "confirmed"
            : entry.status === "confirmed"
              ? "confirmed"
              : "needs_review",
          updatedAt: now,
        })
        .where(eq(schema.foodEntries.id, entry.id));
    });

    revalidatePath("/dashboard");
    revalidatePath("/history");
    revalidatePath(`/verify/${parsed.entryId}`);

    return {
      ok: true,
      message: parsed.confirm
        ? "Meal confirmed and saved."
        : "Verification changes saved.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionErrorMessage(
        error,
        "Unable to save verification changes."
      ),
    };
  }
}

export async function updateEntryItemAction(input: {
  entryId: string;
  itemId: string;
  portionLabel: string | null;
  finalCalories: number;
}) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const parsed = itemEditSchema.parse(input);

    const outcome = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${parsed.entryId}))`
      );

      const [record] = await tx
        .select({
          item: schema.foodItems,
          entry: schema.foodEntries,
        })
        .from(schema.foodItems)
        .innerJoin(
          schema.foodEntries,
          eq(schema.foodEntries.id, schema.foodItems.foodEntryId)
        )
        .where(
          and(
            eq(schema.foodItems.id, parsed.itemId),
            eq(schema.foodEntries.id, parsed.entryId),
            eq(schema.foodEntries.userId, userId),
            isNull(schema.foodEntries.deletedAt),
            isNull(schema.foodItems.deletedAt)
          )
        )
        .limit(1);

      if (!record) {
        raiseActionError("That item could not be found.");
      }

      const nextQuantityEstimate = parsed.portionLabel?.trim() || null;
      const nextFinalKcal = parsed.finalCalories;
      const didChange =
        record.item.quantityEstimate !== nextQuantityEstimate ||
        record.item.finalKcal !== nextFinalKcal;

      if (!didChange) {
        return {
          kind: "no_change" as const,
        };
      }

      const hasAiBaseline =
        record.item.aiQuantityEstimate !== null || record.item.aiKcal !== null;
      const nextUserQuantityEstimate = hasAiBaseline
        ? nextQuantityEstimate !== record.item.aiQuantityEstimate
          ? nextQuantityEstimate
          : null
        : nextQuantityEstimate;
      const nextUserKcal = hasAiBaseline
        ? nextFinalKcal !== record.item.aiKcal
          ? nextFinalKcal
          : null
        : nextFinalKcal;
      const now = new Date();

      await tx
        .update(schema.foodItems)
        .set({
          userQuantityEstimate: nextUserQuantityEstimate,
          quantityEstimate: nextQuantityEstimate,
          userKcal: nextUserKcal,
          finalKcal: nextFinalKcal,
          updatedAt: now,
        })
        .where(eq(schema.foodItems.id, parsed.itemId));

      const [totals] = await tx
        .select({
          total:
            sql<number>`coalesce(sum(${schema.foodItems.finalKcal}), 0)`.mapWith(
              Number
            ),
        })
        .from(schema.foodItems)
        .where(
          and(
            eq(schema.foodItems.foodEntryId, parsed.entryId),
            isNull(schema.foodItems.deletedAt)
          )
        );

      await tx
        .update(schema.foodEntries)
        .set({
          userTotalKcal: Number(totals?.total ?? 0),
          finalTotalKcal: Number(totals?.total ?? 0),
          updatedAt: now,
        })
        .where(eq(schema.foodEntries.id, parsed.entryId));

      return {
        kind: "updated" as const,
      };
    });

    if (outcome.kind === "no_change") {
      return {
        ok: true,
        message: "No changes were needed.",
      };
    }

    revalidatePath("/");

    return {
      ok: true,
      message: "Item updated.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionErrorMessage(error, "Unable to update item."),
    };
  }
}

export async function addFollowUpAction(input: {
  entryId: string;
  message: string;
}) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const parsed = followUpSchema.parse(input);

    const [entry] = await db
      .select()
      .from(schema.foodEntries)
      .where(
        and(
          eq(schema.foodEntries.id, parsed.entryId),
          eq(schema.foodEntries.userId, userId),
          isNull(schema.foodEntries.deletedAt)
        )
      )
      .limit(1);

    if (!entry) {
      raiseActionError("That meal entry could not be found.");
    }

    const currentItems = await db
      .select()
      .from(schema.foodItems)
      .where(
        and(
          eq(schema.foodItems.foodEntryId, parsed.entryId),
          isNull(schema.foodItems.deletedAt)
        )
      )
      .orderBy(schema.foodItems.createdAt);

    const [followUp] = await db
      .insert(schema.entryFollowups)
      .values({
        foodEntryId: parsed.entryId,
        userPrompt: parsed.message,
        aiResponseJson: {
          status: "pending",
          source: "gemini-followup",
        },
        previousTotalKcal: entry.finalTotalKcal,
        revisedTotalKcal: entry.finalTotalKcal,
      })
      .returning({
        id: schema.entryFollowups.id,
      });

    try {
      if (!appSetup.aiReady) {
        raiseActionError(
          "AI follow-up revisions need GEMINI_API_KEY and GEMINI_MODEL before they can run."
        );
      }

      const analysis = await analyzeMealCorrectionWithGemini({
        imageUrl: entry.imageUrl,
        mealType: entry.mealType,
        loggedAt: entry.loggedAt.toISOString(),
        userNotes: entry.userNotes,
        userCorrection: parsed.message,
        originalAiResult: entry.aiRawJson?.result ?? null,
        currentItems: currentItems.map((item) => ({
          name: item.name,
          quantityEstimate: item.quantityEstimate,
          finalKcal: item.finalKcal,
          aiKcal: item.aiKcal,
          reasoning: item.reasoning,
        })),
        currentFinalTotal: entry.finalTotalKcal,
      });
      const revisedTotalKcal = roundCalories(analysis.parsed.total_kcal);

      await db
        .update(schema.entryFollowups)
        .set({
          aiResponseJson: {
            status: "proposed",
            source: "gemini-followup",
            model: analysis.model,
            promptVersion: analysis.promptVersion,
            createdFromFinalTotal: entry.finalTotalKcal,
            createdFromItems: currentItems.map((item) => ({
              id: item.id,
              name: item.name,
              quantityEstimate: item.quantityEstimate,
              finalKcal: item.finalKcal,
            })),
            originalAiResult: entry.aiRawJson?.result ?? null,
            result: analysis.parsed,
            rawResponse: analysis.rawResponse,
          },
          revisedTotalKcal: revisedTotalKcal,
        })
        .where(eq(schema.entryFollowups.id, followUp.id));

      revalidatePath("/history");
      revalidatePath(`/verify/${parsed.entryId}`);

      return {
        ok: true,
        message: "Revised estimate ready. Review it before you accept it.",
      };
    } catch (analysisError) {
      await db
        .update(schema.entryFollowups)
        .set({
          aiResponseJson: {
            status: "failed",
            source: "gemini-followup",
            failureReason: getSafeStoredErrorMessage(
              analysisError,
              "AI follow-up analysis did not finish."
            ),
            failedAt: new Date().toISOString(),
          },
          revisedTotalKcal: entry.finalTotalKcal,
        })
        .where(eq(schema.entryFollowups.id, followUp.id));

      revalidatePath("/history");
      revalidatePath(`/verify/${parsed.entryId}`);

      return {
        ok: false,
        message:
          "We saved your correction, but the revised estimate did not finish. You can try again from this meal.",
      };
    }
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionErrorMessage(error, "Unable to save follow-up."),
    };
  }
}

export async function acceptFollowUpRevisionAction(input: {
  entryId: string;
  followUpId: string;
}) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const parsed = followUpDecisionSchema.parse(input);

    const outcome = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${parsed.entryId}))`
      );

      const [record] = await tx
        .select({
          entry: schema.foodEntries,
          followUp: schema.entryFollowups,
        })
        .from(schema.entryFollowups)
        .innerJoin(
          schema.foodEntries,
          eq(schema.foodEntries.id, schema.entryFollowups.foodEntryId)
        )
        .where(
          and(
            eq(schema.entryFollowups.id, parsed.followUpId),
            eq(schema.foodEntries.id, parsed.entryId),
            eq(schema.foodEntries.userId, userId),
            isNull(schema.foodEntries.deletedAt)
          )
        )
        .limit(1);

      if (!record) {
        raiseActionError("That follow-up revision could not be found.");
      }

      const aiResponseJson = record.followUp.aiResponseJson ?? {};
      const status = aiResponseJson.status;

      if (status === "accepted") {
        return {
          kind: "already_accepted" as const,
        };
      }

      if (status !== "proposed") {
        raiseActionError("This follow-up revision is not ready to accept.");
      }

      const result = parseGeminiMealEstimate(aiResponseJson.result);
      const normalizedItems = normalizeGeminiItemsForStorage(
        result,
        "Accepted from a follow-up correction."
      );
      const revisedTotalKcal = roundCalories(result.total_kcal);
      const now = new Date();

      await tx
        .update(schema.foodItems)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.foodItems.foodEntryId, record.entry.id),
            isNull(schema.foodItems.deletedAt)
          )
        );

      await tx.insert(schema.foodItems).values(
        normalizedItems.map((item) => ({
          foodEntryId: record.entry.id,
          aiName: item.name,
          userName: null,
          name: item.name,
          aiQuantityEstimate: item.quantityEstimate,
          userQuantityEstimate: null,
          quantityEstimate: item.quantityEstimate,
          aiKcal: item.aiKcal,
          userKcal: null,
          finalKcal: item.finalKcal,
          confidence: item.confidence,
          reasoning: item.reasoning,
        }))
      );

      await tx
        .update(schema.foodEntries)
        .set({
          userTotalKcal: revisedTotalKcal,
          finalTotalKcal: revisedTotalKcal,
          status: "confirmed",
          updatedAt: now,
        })
        .where(eq(schema.foodEntries.id, record.entry.id));

      await tx
        .update(schema.entryFollowups)
        .set({
          aiResponseJson: {
            ...aiResponseJson,
            status: "accepted",
            acceptedAt: now.toISOString(),
          },
          revisedTotalKcal: revisedTotalKcal,
        })
        .where(eq(schema.entryFollowups.id, record.followUp.id));

      return {
        kind: "accepted" as const,
      };
    });

    if (outcome.kind === "already_accepted") {
      return {
        ok: true,
        message: "That revised estimate was already applied to this meal.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/history");
    revalidatePath(`/verify/${parsed.entryId}`);

    return {
      ok: true,
      message: "Revised estimate accepted and applied to this meal.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionErrorMessage(
        error,
        "Unable to accept that revised estimate."
      ),
    };
  }
}

export async function rejectFollowUpRevisionAction(input: {
  entryId: string;
  followUpId: string;
}) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const parsed = followUpDecisionSchema.parse(input);

    const outcome = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${parsed.entryId}))`
      );

      const [record] = await tx
        .select({
          entry: schema.foodEntries,
          followUp: schema.entryFollowups,
        })
        .from(schema.entryFollowups)
        .innerJoin(
          schema.foodEntries,
          eq(schema.foodEntries.id, schema.entryFollowups.foodEntryId)
        )
        .where(
          and(
            eq(schema.entryFollowups.id, parsed.followUpId),
            eq(schema.foodEntries.id, parsed.entryId),
            eq(schema.foodEntries.userId, userId),
            isNull(schema.foodEntries.deletedAt)
          )
        )
        .limit(1);

      if (!record) {
        raiseActionError("That follow-up revision could not be found.");
      }

      const currentStatus = record.followUp.aiResponseJson?.status;

      if (currentStatus === "accepted") {
        return {
          kind: "already_accepted" as const,
        };
      }

      if (currentStatus === "rejected") {
        return {
          kind: "already_rejected" as const,
        };
      }

      await tx
        .update(schema.entryFollowups)
        .set({
          aiResponseJson: {
            ...(record.followUp.aiResponseJson ?? {}),
            status: "rejected",
            rejectedAt: new Date().toISOString(),
          },
        })
        .where(eq(schema.entryFollowups.id, record.followUp.id));

      return {
        kind: "rejected" as const,
      };
    });

    if (outcome.kind === "already_accepted") {
      return {
        ok: true,
        message: "That revised estimate was already accepted for this meal.",
      };
    }

    if (outcome.kind === "already_rejected") {
      return {
        ok: true,
        message: "That revised estimate was already rejected.",
      };
    }

    revalidatePath("/history");
    revalidatePath(`/verify/${parsed.entryId}`);

    return {
      ok: true,
      message: "Revised estimate rejected. Your current saved meal was left unchanged.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionErrorMessage(
        error,
        "Unable to reject that revised estimate."
      ),
    };
  }
}

export async function deleteFoodEntryAction(input: { entryId: string }) {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const parsed = deleteEntrySchema.parse(input);

    const outcome = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${parsed.entryId}))`
      );

      const [entry] = await tx
        .select({
          id: schema.foodEntries.id,
          deletedAt: schema.foodEntries.deletedAt,
        })
        .from(schema.foodEntries)
        .where(
          and(
            eq(schema.foodEntries.id, parsed.entryId),
            eq(schema.foodEntries.userId, userId)
          )
        )
        .limit(1);

      if (!entry) {
        raiseActionError("That meal entry could not be found.");
      }

      if (entry.deletedAt) {
        return {
          kind: "already_deleted" as const,
        };
      }

      const now = new Date();

      await tx
        .update(schema.foodEntries)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.foodEntries.id, parsed.entryId));

      return {
        kind: "deleted" as const,
      };
    });

    if (outcome.kind === "already_deleted") {
      return {
        ok: true,
        message: "That entry was already removed from your history.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/history");
    revalidatePath(`/history/${parsed.entryId}`);
    revalidatePath(`/verify/${parsed.entryId}`);

    return {
      ok: true,
      message: "Entry removed from your active calorie history.",
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionErrorMessage(
        error,
        "Unable to remove that entry."
      ),
    };
  }
}
