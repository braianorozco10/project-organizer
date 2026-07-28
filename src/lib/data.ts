import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "./db";
import { projects, tasks, type Project, type Task } from "./db/schema";
import { getSession, ownerKey, type Session } from "./session";

export type ProjectWithTasks = Project & { tasks: Task[] };

/** Session or bust — every page and action funnels through this. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

/** A session that has settled on a Jira site, so it can actually call the API. */
export type ActiveSession = Session & { cloudId: string; siteUrl: string };

export function hasSite(session: Session): session is ActiveSession {
  return Boolean(session.cloudId && session.siteUrl);
}

export async function requireActiveSession(): Promise<ActiveSession> {
  const session = await requireSession();
  if (!hasSite(session)) throw new Error("NO_SITE_SELECTED");
  return session;
}

export async function listProjects(session: Session): Promise<ProjectWithTasks[]> {
  const owner = ownerKey(session);

  const rows = await db
    .select()
    .from(projects)
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(eq(projects.ownerKey, owner))
    .orderBy(desc(projects.createdAt), asc(tasks.position), asc(tasks.createdAt));

  const byId = new Map<string, ProjectWithTasks>();
  for (const row of rows) {
    let project = byId.get(row.projects.id);
    if (!project) {
      project = { ...row.projects, tasks: [] };
      byId.set(project.id, project);
    }
    if (row.tasks) project.tasks.push(row.tasks);
  }
  return [...byId.values()];
}

/** Returns null rather than throwing so pages can render a clean 404. */
export async function getProject(
  session: Session,
  projectId: string,
): Promise<ProjectWithTasks | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerKey, ownerKey(session))))
    .limit(1);

  if (!project) return null;

  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, project.id))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));

  return { ...project, tasks: rows };
}
