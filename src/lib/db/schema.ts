import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** One Jira site the signed-in account can reach, from accessible-resources. */
export type AtlassianSite = {
  cloudId: string;
  url: string;
  name: string;
};

/**
 * Server-side half of a login. The cookie carries only this row's id, so
 * rotating refresh tokens can be persisted from anywhere in the app.
 */
export const oauthSessions = pgTable(
  "oauth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: text("account_id").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    /** Null until the account picks one, when it can reach more than one site. */
    cloudId: text("cloud_id"),
    siteUrl: text("site_url"),
    siteName: text("site_name"),
    sites: jsonb("sites").$type<AtlassianSite[]>().notNull().default([]),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("oauth_sessions_account_idx").on(table.accountId)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** sha256(site|accountId) — scopes every row to one Jira user. */
    ownerKey: text("owner_key").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("projects_owner_idx").on(table.ownerKey, table.createdAt)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    issueKey: text("issue_key").notNull(),
    url: text("url").notNull(),
    /** Cached Jira fields so the table paints before we re-query Jira. */
    title: text("title"),
    status: text("status"),
    statusCategory: text("status_category"),
    assignee: text("assignee"),
    jiraUpdatedAt: timestamp("jira_updated_at", { withTimezone: true }),
    /** Manual 0–100 progress, the one column Jira does not own. */
    completion: integer("completion").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tasks_project_idx").on(table.projectId, table.createdAt),
    uniqueIndex("tasks_project_issue_idx").on(table.projectId, table.issueKey),
  ],
);

export type OAuthSession = typeof oauthSessions.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
