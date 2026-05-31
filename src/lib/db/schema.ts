import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const goalTypeEnum = pgEnum("goal_type", [
  "cutting",
  "maintaining",
  "bulking",
]);

export const mealTypeEnum = pgEnum("meal_type", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "drink",
  "other",
]);

export const entryStatusEnum = pgEnum("entry_status", [
  "pending",
  "analyzed",
  "logged",
  "needs_review",
  "confirmed",
]);

export const user = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
  retainImagesAfterAnalysis: boolean("retain_images_after_analysis")
    .notNull()
    .default(true),
});

export const account = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  })
);

export const session = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
});

export const verificationToken = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.identifier, table.token],
    }),
  })
);

export const authenticator = pgTable(
  "authenticator",
  {
    credentialID: text("credentialID").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerAccountId: text("providerAccountId").notNull(),
    credentialPublicKey: text("credentialPublicKey").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credentialDeviceType").notNull(),
    credentialBackedUp: boolean("credentialBackedUp").notNull(),
    transports: text("transports"),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.userId, table.credentialID],
    }),
  })
);

export const calorieTargets = pgTable(
  "calorie_targets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetKcal: integer("target_kcal").notNull(),
    goalType: goalTypeEnum("goal_type").notNull().default("maintaining"),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("calorie_targets_user_id_idx").on(table.userId),
    effectiveFromIdx: index("calorie_targets_effective_from_idx").on(
      table.effectiveFrom
    ),
    userEffectiveFromIdx: index("calorie_targets_user_effective_from_idx").on(
      table.userId,
      table.effectiveFrom
    ),
    userEffectiveFromUnique: uniqueIndex(
      "calorie_targets_user_effective_from_unique"
    ).on(table.userId, table.effectiveFrom),
  })
);

export const foodEntries = pgTable(
  "food_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    loggedAt: timestamp("logged_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    mealType: mealTypeEnum("meal_type").notNull(),
    title: text("title").notNull(),
    imageUrl: text("image_url"),
    imageBlurhash: text("image_blurhash"),
    status: entryStatusEnum("status").notNull().default("logged"),
    aiTotalKcal: integer("ai_total_kcal"),
    userTotalKcal: integer("user_total_kcal"),
    finalTotalKcal: integer("final_total_kcal").notNull().default(0),
    confidence: integer("confidence"),
    aiModel: text("ai_model"),
    aiPromptVersion: text("ai_prompt_version"),
    aiRawJson: jsonb("ai_raw_json").$type<Record<string, unknown> | null>(),
    userNotes: text("user_notes"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("food_entries_user_id_idx").on(table.userId),
    entryDateIdx: index("food_entries_entry_date_idx").on(table.entryDate),
    userEntryDateIdx: index("food_entries_user_entry_date_idx").on(
      table.userId,
      table.entryDate
    ),
    userLoggedAtIdx: index("food_entries_user_logged_at_idx").on(
      table.userId,
      table.loggedAt
    ),
  })
);

export const foodItems = pgTable(
  "food_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    foodEntryId: text("food_entry_id")
      .notNull()
      .references(() => foodEntries.id, { onDelete: "cascade" }),
    aiName: text("ai_name"),
    userName: text("user_name"),
    name: text("name").notNull(),
    aiQuantityEstimate: text("ai_quantity_estimate"),
    userQuantityEstimate: text("user_quantity_estimate"),
    quantityEstimate: text("quantity_estimate"),
    aiKcal: integer("ai_kcal"),
    userKcal: integer("user_kcal"),
    finalKcal: integer("final_kcal").notNull().default(0),
    confidence: integer("confidence"),
    reasoning: text("reasoning"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => ({
    foodEntryIdIdx: index("food_items_food_entry_id_idx").on(table.foodEntryId),
  })
);

export const entryFollowups = pgTable(
  "entry_followups",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    foodEntryId: text("food_entry_id")
      .notNull()
      .references(() => foodEntries.id, { onDelete: "cascade" }),
    userPrompt: text("user_prompt").notNull(),
    aiResponseJson: jsonb("ai_response_json").$type<Record<string, unknown> | null>(),
    previousTotalKcal: integer("previous_total_kcal"),
    revisedTotalKcal: integer("revised_total_kcal"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    foodEntryIdIdx: index("entry_followups_food_entry_id_idx").on(
      table.foodEntryId
    ),
  })
);
