CREATE TABLE "oauth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"cloud_id" text,
	"site_url" text,
	"site_name" text,
	"sites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "oauth_sessions_account_idx" ON "oauth_sessions" USING btree ("account_id");