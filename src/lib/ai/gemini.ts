import "server-only";

import { z } from "zod";

import { getRequiredEnv } from "@/lib/env";

export const GEMINI_PROMPT_VERSION = "gemini-food-estimate-v1";
export const GEMINI_FOLLOW_UP_PROMPT_VERSION = "gemini-food-followup-v1";

const geminiItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity_estimate: z.string().trim().min(1).max(120),
  kcal: z.number().finite().min(0).max(5000),
  confidence: z.number().finite().min(0).max(1),
  reasoning: z.string().trim().min(1).max(500),
});

const geminiMealEstimateSchema = z.object({
  meal_title: z.string().trim().min(1).max(120),
  total_kcal: z.number().finite().min(0).max(10000),
  confidence: z.number().finite().min(0).max(1),
  items: z.array(geminiItemSchema).min(1).max(20),
  assumptions: z.array(z.string().trim().min(1).max(300)).max(12),
  questions_for_user: z.array(z.string().trim().min(1).max(300)).max(8),
  warning: z.string().trim().max(400),
});

const geminiResponseEnvelopeSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional(),
            })
          ),
        }),
      })
    )
    .optional(),
  promptFeedback: z
    .object({
      blockReason: z.string().optional(),
      blockReasonMessage: z.string().optional(),
    })
    .optional(),
  error: z
    .object({
      code: z.number().optional(),
      message: z.string(),
      status: z.string().optional(),
    })
    .optional(),
});

const geminiResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    meal_title: {
      type: "string",
      description:
        "A short, user-friendly meal title based on the visible food and drink.",
    },
    total_kcal: {
      type: "number",
      minimum: 0,
      maximum: 10000,
      description:
        "A single best-estimate total calorie count for the whole meal, not a range.",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description:
        "Confidence in the estimate from 0 to 1. Lower values should reflect uncertainty.",
    },
    items: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      description:
        "Visible foods and drinks that contribute to the calorie estimate.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            description: "The identified food or drink item.",
          },
          quantity_estimate: {
            type: "string",
            description:
              "A brief estimate of the visible portion size or serving amount.",
          },
          kcal: {
            type: "number",
            minimum: 0,
            maximum: 5000,
            description: "Best-estimate calories for this item only.",
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confidence from 0 to 1 for this item estimate.",
          },
          reasoning: {
            type: "string",
            description:
              "Short reasoning that explains the calorie estimate so the user can verify it.",
          },
        },
        required: [
          "name",
          "quantity_estimate",
          "kcal",
          "confidence",
          "reasoning",
        ],
      },
    },
    assumptions: {
      type: "array",
      maxItems: 12,
      description:
        "Important assumptions, including hidden ingredients, oils, sauces, or preparation details.",
      items: {
        type: "string",
      },
    },
    questions_for_user: {
      type: "array",
      maxItems: 8,
      description:
        "Short follow-up questions when the image leaves important calorie uncertainty.",
      items: {
        type: "string",
      },
    },
    warning: {
      type: "string",
      description:
        "A short caution when the estimate is uncertain or likely missing hidden ingredients.",
    },
  },
  required: [
    "meal_title",
    "total_kcal",
    "confidence",
    "items",
    "assumptions",
    "questions_for_user",
    "warning",
  ],
} as const;

function buildPrompt(input: {
  mealType: string;
  loggedAt: string;
  userNotes: string | null;
}) {
  return [
    "Estimate calories for the provided meal photo for a mobile calorie tracking app.",
    `Meal type: ${input.mealType}.`,
    `Logged at: ${input.loggedAt}.`,
    input.userNotes
      ? `User notes: ${input.userNotes}.`
      : "User notes: none provided.",
    "Requirements:",
    "- Estimate visible foods and drinks only, but mention likely hidden ingredients when relevant.",
    "- Do not pretend to know exact calories.",
    "- Return one best estimate total_kcal, not a range, because the app uses a daily counter.",
    "- Keep confidence honest and lower it when the image is incomplete or ambiguous.",
    "- Include concise itemized reasoning so the user can verify the estimate.",
    "- Mention uncertainty and hidden ingredients in assumptions or warning when appropriate.",
    "- Questions for the user should be short and helpful, and only included when they could materially improve accuracy.",
  ].join("\n");
}

function buildFollowUpPrompt(input: {
  mealType: string;
  loggedAt: string;
  userNotes: string | null;
  userCorrection: string;
  originalAiResult: unknown;
  currentItems: Array<{
    name: string;
    quantityEstimate: string | null;
    finalKcal: number;
    aiKcal: number | null;
    reasoning: string | null;
  }>;
  currentFinalTotal: number;
}) {
  return [
    "Revise a meal calorie estimate for a mobile calorie tracking app.",
    `Meal type: ${input.mealType}.`,
    `Logged at: ${input.loggedAt}.`,
    input.userNotes
      ? `User notes: ${input.userNotes}.`
      : "User notes: none provided.",
    `User correction: ${input.userCorrection}.`,
    `Current final total: ${input.currentFinalTotal}.`,
    "Original AI result JSON:",
    JSON.stringify(input.originalAiResult ?? null),
    "Current item breakdown JSON:",
    JSON.stringify(input.currentItems),
    "Requirements:",
    "- Use the correction seriously and revise the item breakdown when needed.",
    "- Estimate visible foods and drinks, and add likely hidden ingredients only when the correction or image supports it.",
    "- Do not pretend to know exact calories.",
    "- Return one best estimate total_kcal, not a range.",
    "- Keep confidence honest and lower it when the correction still leaves uncertainty.",
    "- Include concise itemized reasoning so the user can verify the revised estimate.",
    "- Mention uncertainty and hidden ingredients in assumptions or warning when appropriate.",
    "- Questions for the user should be short and only included if they could materially improve accuracy.",
  ].join("\n");
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractGeminiText(responseJson: unknown) {
  const parsed = geminiResponseEnvelopeSchema.parse(responseJson);

  if (parsed.error) {
    throw new Error(parsed.error.message);
  }

  const text = parsed.candidates?.[0]?.content.parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    const blockedMessage = parsed.promptFeedback?.blockReasonMessage;
    const blockedReason = parsed.promptFeedback?.blockReason;

    throw new Error(
      blockedMessage ||
        (blockedReason
          ? `Gemini blocked the response: ${blockedReason}.`
          : "Gemini returned an empty analysis response.")
    );
  }

  return text;
}

async function fetchImageAsBase64(imageUrl: string) {
  const isPrivateBlob = imageUrl.includes(".private.blob.vercel-storage.com");
  const headers: Record<string, string> = {};
  if (isPrivateBlob && process.env.BLOB_READ_WRITE_TOKEN) {
    headers.authorization = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
  }
  const response = await fetch(imageUrl, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("We couldn't read the saved meal photo for analysis.");
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const data = Buffer.from(arrayBuffer).toString("base64");

  if (!data) {
    throw new Error("The saved meal photo was empty.");
  }

  return {
    contentType,
    data,
  };
}

async function callGemini(requestBody: Record<string, unknown>) {
  const apiKey = getRequiredEnv("GEMINI_API_KEY");
  const model = getRequiredEnv("GEMINI_MODEL");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      });

      const responseJson = (await response.json()) as unknown;

      if (!response.ok) {
        const parsed = geminiResponseEnvelopeSchema.safeParse(responseJson);
        const message =
          parsed.success && parsed.data.error?.message
            ? parsed.data.error.message
            : `Gemini request failed with status ${response.status}.`;

        if (response.status === 408 || response.status === 429 || response.status >= 500) {
          throw new Error(message);
        }

        throw new Error(message);
      }

      return {
        model,
        responseJson,
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown Gemini request error.");

      if (attempt === 3) {
        break;
      }

      await sleep(400 * attempt);
    }
  }

  throw lastError ?? new Error("Gemini request failed.");
}

async function requestMealEstimate(input: {
  prompt: string;
  imageUrl?: string | null;
  promptVersion: string;
}) {
  const image = input.imageUrl ? await fetchImageAsBase64(input.imageUrl) : null;
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: input.prompt,
          },
          ...(image
            ? [
                {
                  inline_data: {
                    mime_type: image.contentType,
                    data: image.data,
                  },
                },
              ]
            : []),
        ],
      },
    ],
    systemInstruction: {
      role: "system",
      parts: [
        {
          text:
            "You estimate meal calories from photos for KnowYourCalories. Be careful, grounded, and transparent about uncertainty.",
        },
      ],
    },
    generationConfig: {
      temperature: 0.2,
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema: geminiResponseJsonSchema,
        },
      },
    },
    store: false,
  } satisfies Record<string, unknown>;

  const { model, responseJson } = await callGemini(requestBody);
  const text = extractGeminiText(responseJson);
  const parsed = geminiMealEstimateSchema.parse(JSON.parse(text));

  return {
    model,
    promptVersion: input.promptVersion,
    parsed,
    rawResponse: responseJson,
  };
}

export async function analyzeMealPhotoWithGemini(input: {
  imageUrl: string;
  mealType: string;
  loggedAt: string;
  userNotes: string | null;
}) {
  return requestMealEstimate({
    prompt: buildPrompt(input),
    imageUrl: input.imageUrl,
    promptVersion: GEMINI_PROMPT_VERSION,
  });
}

export async function analyzeMealCorrectionWithGemini(input: {
  imageUrl?: string | null;
  mealType: string;
  loggedAt: string;
  userNotes: string | null;
  userCorrection: string;
  originalAiResult: unknown;
  currentItems: Array<{
    name: string;
    quantityEstimate: string | null;
    finalKcal: number;
    aiKcal: number | null;
    reasoning: string | null;
  }>;
  currentFinalTotal: number;
}) {
  return requestMealEstimate({
    prompt: buildFollowUpPrompt(input),
    imageUrl: input.imageUrl,
    promptVersion: GEMINI_FOLLOW_UP_PROMPT_VERSION,
  });
}

export function parseGeminiMealEstimate(value: unknown) {
  return geminiMealEstimateSchema.parse(value);
}

export type GeminiMealEstimate = z.infer<typeof geminiMealEstimateSchema>;
