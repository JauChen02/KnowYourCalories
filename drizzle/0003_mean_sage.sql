ALTER TABLE "food_items" ADD COLUMN "ai_name" text;--> statement-breakpoint
ALTER TABLE "food_items" ADD COLUMN "user_name" text;--> statement-breakpoint
ALTER TABLE "food_items" ADD COLUMN "ai_quantity_estimate" text;--> statement-breakpoint
ALTER TABLE "food_items" ADD COLUMN "user_quantity_estimate" text;--> statement-breakpoint
ALTER TABLE "food_items" ADD COLUMN "deleted_at" timestamp with time zone;