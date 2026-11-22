CREATE TABLE "issue_archive" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_archive_id_project_uq" UNIQUE("id","project_id")
);
--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN "archive_id" integer;--> statement-breakpoint
ALTER TABLE "issue_archive" ADD CONSTRAINT "issue_archive_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "issue_archive_project_name_uq" ON "issue_archive" USING btree ("project_id","name");--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_archive_id_issue_archive_id_fk" FOREIGN KEY ("archive_id") REFERENCES "public"."issue_archive"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_archive_project_fk" FOREIGN KEY ("archive_id","project_id") REFERENCES "public"."issue_archive"("id","project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_archive_requires_archived_check" CHECK ("issue"."archive_id" IS NULL OR "issue"."archived_at" IS NOT NULL);
--> statement-breakpoint
CREATE FUNCTION rev_issue_archive() RETURNS trigger AS $$
BEGIN
  PERFORM bump_rev('board:' || COALESCE(NEW.project_id, OLD.project_id), COALESCE(NEW.project_id, OLD.project_id));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER issue_archive_rev AFTER INSERT OR UPDATE OR DELETE ON issue_archive
  FOR EACH ROW EXECUTE FUNCTION rev_issue_archive();
