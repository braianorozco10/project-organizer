"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "./db";
import { projects, tasks } from "./db/schema";
import { requireSession } from "./data";
import {
  JiraError,
  fetchIssue,
  fetchIssues,
  issueUrl,
  normalizeSite,
  parseIssueKey,
  verifyCredentials,
} from "./jira";
import { createSession, destroySession, ownerKey } from "./session";

export type ActionState = { error?: string; message?: string };

const uuidSchema = z.uuid();

function fail(error: string): ActionState {
  return { error };
}

/**
 * Postgres reports a unique violation as SQLSTATE 23505. Drivers wrap the
 * original error, so walk the cause chain rather than string-matching a message.
 */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  let current = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    const candidate = current as { code?: string; constraint?: string; cause?: unknown };
    if (candidate.code === "23505") {
      return !candidate.constraint || candidate.constraint === constraint;
    }
    current = candidate.cause;
  }
  return false;
}

/** Confirms the project exists and belongs to the caller. Returns the owner key. */
async function assertProjectOwner(projectId: string) {
  const session = await requireSession();
  const owner = ownerKey(session);

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerKey, owner)))
    .limit(1);

  if (!project) throw new Error("NOT_FOUND");
  return { session, owner };
}

// ---------------------------------------------------------------- auth

const loginSchema = z.object({
  site: z.string().min(1, "Enter your Jira site URL."),
  email: z.email("Enter the email address on your Atlassian account."),
  apiToken: z.string().min(1, "Paste your Jira API token."),
});

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    site: formData.get("site"),
    email: formData.get("email"),
    apiToken: formData.get("apiToken"),
  });

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the form and try again.");
  }

  let site: string;
  try {
    site = normalizeSite(parsed.data.site);
  } catch {
    return fail("That does not look like a valid URL. Try something like acme.atlassian.net.");
  }

  const credentials = {
    site,
    email: parsed.data.email.trim(),
    apiToken: parsed.data.apiToken.trim(),
  };

  try {
    const identity = await verifyCredentials(credentials);
    await createSession({
      ...credentials,
      accountId: identity.accountId,
      displayName: identity.displayName,
      avatarUrl: identity.avatarUrl,
    });
  } catch (error) {
    if (error instanceof JiraError) return fail(error.message);
    return fail("Could not reach Jira. Check the site URL and your connection.");
  }

  redirect("/projects");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

// ------------------------------------------------------------ projects

export async function createProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return fail("Give the project a name.");
  if (name.length > 80) return fail("Keep the name under 80 characters.");

  await db.insert(projects).values({ ownerKey: ownerKey(session), name });
  refresh();
  return { message: `Created ${name}.` };
}

export async function renameProject(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!uuidSchema.safeParse(projectId).success) return fail("Unknown project.");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("Give the project a name.");
  if (name.length > 80) return fail("Keep the name under 80 characters.");

  const { owner } = await assertProjectOwner(projectId);
  await db
    .update(projects)
    .set({ name })
    .where(and(eq(projects.id, projectId), eq(projects.ownerKey, owner)));

  refresh();
  return { message: "Renamed." };
}

export async function deleteProject(projectId: string): Promise<void> {
  if (!uuidSchema.safeParse(projectId).success) return;

  const { owner } = await assertProjectOwner(projectId);
  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerKey, owner)));

  refresh();
  redirect("/projects");
}

// --------------------------------------------------------------- tasks

export async function addTask(
  projectId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!uuidSchema.safeParse(projectId).success) return fail("Unknown project.");

  const input = String(formData.get("link") ?? "").trim();
  if (!input) return fail("Paste a Jira ticket link.");

  const key = parseIssueKey(input);
  if (!key) {
    return fail("No ticket code found in that link. Expected something like DEV-246.");
  }

  const { session } = await assertProjectOwner(projectId);

  let issue;
  try {
    issue = await fetchIssue(session, key);
  } catch (error) {
    if (error instanceof JiraError) return fail(error.message);
    return fail("Could not reach Jira to look up that ticket.");
  }

  if (!issue) {
    return fail(`${key} does not exist in this Jira site, or you cannot see it.`);
  }

  // The pasted link may point at a board view; store the canonical browse URL.
  const url = /^https?:\/\//i.test(input) ? input : issueUrl(session.site, issue.key);

  try {
    await db.insert(tasks).values({
      projectId,
      issueKey: issue.key,
      url,
      title: issue.title,
      status: issue.status,
      statusCategory: issue.statusCategory,
      assignee: issue.assignee,
      jiraUpdatedAt: issue.updatedAt,
    });
  } catch (error) {
    if (isUniqueViolation(error, "tasks_project_issue_idx")) {
      return fail(`${issue.key} is already in this project.`);
    }
    throw error;
  }

  refresh();
  return { message: `Added ${issue.key}.` };
}

export async function updateCompletion(taskId: string, completion: number): Promise<void> {
  if (!uuidSchema.safeParse(taskId).success) return;

  const clamped = Math.max(0, Math.min(100, Math.round(completion)));

  const [task] = await db
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task) return;
  await assertProjectOwner(task.projectId);

  await db.update(tasks).set({ completion: clamped }).where(eq(tasks.id, taskId));
  refresh();
}

export async function deleteTask(taskId: string): Promise<void> {
  if (!uuidSchema.safeParse(taskId).success) return;

  const [task] = await db
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task) return;
  await assertProjectOwner(task.projectId);

  await db.delete(tasks).where(eq(tasks.id, taskId));
  refresh();
}

/** Re-pulls title, status, assignee and last-updated for every ticket in a project. */
export async function refreshProject(projectId: string): Promise<ActionState> {
  if (!uuidSchema.safeParse(projectId).success) return fail("Unknown project.");

  const { session } = await assertProjectOwner(projectId);

  const rows = await db
    .select({ id: tasks.id, issueKey: tasks.issueKey })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  if (rows.length === 0) return { message: "Nothing to refresh yet." };

  let issues;
  try {
    issues = await fetchIssues(
      session,
      rows.map((row) => row.issueKey),
    );
  } catch (error) {
    if (error instanceof JiraError) return fail(error.message);
    return fail("Could not reach Jira.");
  }

  await Promise.all(
    rows.map((row) => {
      const issue = issues.get(row.issueKey);
      if (!issue) return null;
      return db
        .update(tasks)
        .set({
          title: issue.title,
          status: issue.status,
          statusCategory: issue.statusCategory,
          assignee: issue.assignee,
          jiraUpdatedAt: issue.updatedAt,
        })
        .where(eq(tasks.id, row.id));
    }),
  );

  refresh();

  const missing = rows.length - issues.size;
  return {
    message:
      missing > 0
        ? `Synced ${issues.size} of ${rows.length} tickets — ${missing} could not be read from Jira.`
        : `Synced ${issues.size} ticket${issues.size === 1 ? "" : "s"} from Jira.`,
  };
}
