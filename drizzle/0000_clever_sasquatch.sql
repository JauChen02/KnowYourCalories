CREATE TYPE "public"."entry_status" AS ENUM('logged', 'needs_review', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('cutting', 'maintaining', 'bulking');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticator_userId_credentialID_pk" PRIMARY KEY("userId","credentialID"),
	CONSTRAINT "authenticator_credentialID_unique" UNIQUE("credentialID")
);
--> statement-breakpoint
CREATE TABLE "calorie_targets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_kcal" integer NOT NULL,
	"goal_type" "goal_type" DEFAULT 'maintaining' NOT NULL,
	"effective_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry_followups" (
	"id" text PRIMARY KEY NOT NULL,
	"food_entry_id" text NOT NULL,
	"user_prompt" text NOT NULL,
	"ai_response_json" jsonb,
	"previous_total_kcal" integer,
	"revised_total_kcal" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entry_date" date NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"title" text NOT NULL,
	"image_url" text,
	"image_blurhash" text,
	"status" "entry_status" DEFAULT 'logged' NOT NULL,
	"ai_total_kcal" integer,
	"user_total_kcal" integer,
	"final_total_kcal" integer DEFAULT 0 NOT NULL,
	"confidence" integer,
	"ai_model" text,
	"ai_prompt_version" text,
	"ai_raw_json" jsonb,
	"user_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "food_items" (
	"id" text PRIMARY KEY NOT NULL,
	"food_entry_id" text NOT NULL,
	"name" text NOT NULL,
	"quantity_estimate" text,
	"ai_kcal" integer,
	"user_kcal" integer,
	"final_kcal" integer DEFAULT 0 NOT NULL,
	"confidence" integer,
	"reasoning" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp with time zone,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticator" ADD CONSTRAINT "authenticator_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calorie_targets" ADD CONSTRAINT "calorie_targets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_followups" ADD CONSTRAINT "entry_followups_food_entry_id_food_entries_id_fk" FOREIGN KEY ("food_entry_id") REFERENCES "public"."food_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_entries" ADD CONSTRAINT "food_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_food_entry_id_food_entries_id_fk" FOREIGN KEY ("food_entry_id") REFERENCES "public"."food_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calorie_targets_user_id_idx" ON "calorie_targets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calorie_targets_effective_from_idx" ON "calorie_targets" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "calorie_targets_user_effective_from_idx" ON "calorie_targets" USING btree ("user_id","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "calorie_targets_user_effective_from_unique" ON "calorie_targets" USING btree ("user_id","effective_from");--> statement-breakpoint
CREATE INDEX "entry_followups_food_entry_id_idx" ON "entry_followups" USING btree ("food_entry_id");--> statement-breakpoint
CREATE INDEX "food_entries_user_id_idx" ON "food_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "food_entries_entry_date_idx" ON "food_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "food_entries_user_entry_date_idx" ON "food_entries" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "food_entries_user_logged_at_idx" ON "food_entries" USING btree ("user_id","logged_at");--> statement-breakpoint
CREATE INDEX "food_items_food_entry_id_idx" ON "food_items" USING btree ("food_entry_id");