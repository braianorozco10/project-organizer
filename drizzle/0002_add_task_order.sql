DROP INDEX "tasks_project_idx";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "depth" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "tasks" USING btree ("project_id","position","created_at");--> statement-breakpoint
-- Existing rows all default to position 0; seed them from their creation order
-- so the first drag does not appear to shuffle unrelated rows.
UPDATE "tasks" t
SET "position" = ordered.rn
FROM (
	SELECT "id", row_number() OVER (PARTITION BY "project_id" ORDER BY "created_at") AS rn
	FROM "tasks"
) ordered
WHERE t."id" = ordered."id";
