CREATE TABLE "issue_assignee" (
	"issue_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "issue_assignee_issue_id_user_id_pk" PRIMARY KEY("issue_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "issue_assignee" ADD CONSTRAINT "issue_assignee_issue_id_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_assignee" ADD CONSTRAINT "issue_assignee_project_id_user_id_project_member_project_id_user_id_fk" FOREIGN KEY ("project_id","user_id") REFERENCES "public"."project_member"("project_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_assignee_member_idx" ON "issue_assignee" USING btree ("project_id","user_id");
--> statement-breakpoint
CREATE TRIGGER issue_assignee_rev AFTER INSERT OR UPDATE OR DELETE ON issue_assignee
  FOR EACH ROW EXECUTE FUNCTION rev_issue_child('issue_id', 'board');