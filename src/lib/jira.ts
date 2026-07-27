import type { Session } from "./session";

export type JiraIssue = {
  key: string;
  title: string;
  status: string | null;
  statusCategory: string | null;
  assignee: string | null;
  updatedAt: Date | null;
};

export class JiraError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "JiraError";
    this.status = status;
  }
}

/** Accepts a bare host, a full URL, or a URL with a path, and returns a clean origin. */
export function normalizeSite(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withScheme).origin;
}

/**
 * Pulls an issue key out of anything a user is likely to paste: a /browse/ link,
 * a board URL with ?selectedIssue=, a new-issue-view URL, or the bare key itself.
 */
export function parseIssueKey(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const patterns = [
    /[?&]selectedIssue=([A-Za-z][A-Za-z0-9_]*-\d+)/,
    /\/browse\/([A-Za-z][A-Za-z0-9_]*-\d+)/,
    /\/issues\/([A-Za-z][A-Za-z0-9_]*-\d+)/,
    /^([A-Za-z][A-Za-z0-9_]*-\d+)$/,
    /([A-Za-z][A-Za-z0-9_]*-\d+)/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

export function issueUrl(site: string, key: string): string {
  return `${site}/browse/${key}`;
}

function authHeader(session: Pick<Session, "email" | "apiToken">): string {
  const encoded = Buffer.from(`${session.email}:${session.apiToken}`).toString("base64");
  return `Basic ${encoded}`;
}

async function jiraFetch(
  session: Pick<Session, "site" | "email" | "apiToken">,
  path: string,
): Promise<Response> {
  const response = await fetch(`${session.site}${path}`, {
    headers: {
      Authorization: authHeader(session),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    throw new JiraError(
      "Jira rejected these credentials. Check the email and API token.",
      response.status,
    );
  }
  return response;
}

export type JiraIdentity = {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrl?: string;
};

/** Verifies credentials and returns who they belong to. Used by the login form. */
export async function verifyCredentials(
  credentials: Pick<Session, "site" | "email" | "apiToken">,
): Promise<JiraIdentity> {
  const response = await jiraFetch(credentials, "/rest/api/3/myself");

  if (!response.ok) {
    throw new JiraError(
      `Jira responded with ${response.status}. Confirm the site URL points at your Jira Cloud instance.`,
      response.status,
    );
  }

  const data = (await response.json()) as {
    accountId?: string;
    displayName?: string;
    emailAddress?: string;
    avatarUrls?: Record<string, string>;
  };

  if (!data.accountId) {
    throw new JiraError("Jira did not return an account for these credentials.", 500);
  }

  return {
    accountId: data.accountId,
    displayName: data.displayName ?? credentials.email,
    emailAddress: data.emailAddress,
    avatarUrl: data.avatarUrls?.["48x48"],
  };
}

type IssueResponse = {
  key: string;
  fields?: {
    summary?: string;
    updated?: string;
    status?: { name?: string; statusCategory?: { key?: string } };
    assignee?: { displayName?: string } | null;
  };
};

/** Fetches one issue. Returns null when the issue does not exist or is not visible. */
export async function fetchIssue(
  session: Pick<Session, "site" | "email" | "apiToken">,
  key: string,
): Promise<JiraIssue | null> {
  const fields = "summary,updated,status,assignee";
  const response = await jiraFetch(
    session,
    `/rest/api/3/issue/${encodeURIComponent(key)}?fields=${fields}`,
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new JiraError(`Could not load ${key} from Jira (${response.status}).`, response.status);
  }

  const data = (await response.json()) as IssueResponse;
  const updated = data.fields?.updated;

  return {
    key: data.key,
    title: data.fields?.summary ?? key,
    status: data.fields?.status?.name ?? null,
    statusCategory: data.fields?.status?.statusCategory?.key ?? null,
    assignee: data.fields?.assignee?.displayName ?? null,
    updatedAt: updated ? new Date(updated) : null,
  };
}

/**
 * Fetches many issues with a small concurrency cap so a large board refresh does
 * not open dozens of sockets at once. Missing issues are simply omitted.
 */
export async function fetchIssues(
  session: Pick<Session, "site" | "email" | "apiToken">,
  keys: string[],
  concurrency = 6,
): Promise<Map<string, JiraIssue>> {
  const results = new Map<string, JiraIssue>();
  const queue = [...new Set(keys)];

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (let key = queue.shift(); key; key = queue.shift()) {
      try {
        const issue = await fetchIssue(session, key);
        if (issue) results.set(issue.key, issue);
      } catch (error) {
        // One unreachable issue should not abort the whole refresh.
        if (error instanceof JiraError && error.status === 401) throw error;
      }
    }
  });

  await Promise.all(workers);
  return results;
}
