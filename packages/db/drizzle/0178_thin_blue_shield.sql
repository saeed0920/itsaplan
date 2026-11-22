ALTER TABLE "user_preference" ADD COLUMN "calendar" text DEFAULT 'gregory' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "week_start" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_calendar_check" CHECK ("user_preference"."calendar" IN ('gregory', 'persian'));--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_week_start_check" CHECK ("workspace"."week_start" IN (0, 1, 6));