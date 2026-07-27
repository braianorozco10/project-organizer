/**
 * Read directly rather than importing from ./atlassian, which is server-only —
 * this module stays plain so its link parsing can be unit tested outside Next.
 */
const API_BASE = process.env.ATLASSIAN_API_BASE ?? "https://api.atlassian.com";

export type JiraIssue = {
  key: string;
  title: string;
  status: string | null;
  statusCategory: string | null;
  assignee: string | null;
  updatedAt: Date | null;
};

/** What a Jira call needs: an OAuth access token and which site to hit. */
export type JiraAuth = {
  accessToken: string;
  cloudId: string;
};

export class JiraError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "JiraError";
    this.status = status;
  }
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

export function issueUrl(siteUrl: string, key: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/browse/${key}`;
}

async function jiraFetch(auth: JiraAuth, path: string): Promise<Response> {
  const response = await fetch(`${API_BASE}/ex/jira/${auth.cloudId}${path}`, {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new JiraError("Your Jira authorization expired. Sign in again.", 401);
  }
  if (response.status === 403) {
    throw new JiraError("This Jira grant is not allowed to read that issue.", 403);
  }
  return response;
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
export async function fetchIssue(auth: JiraAuth, key: string): Promise<JiraIssue | null> {
  const fields = "summary,updated,status,assignee";
  const response = await jiraFetch(
    auth,
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
  auth: JiraAuth,
  keys: string[],
  concurrency = 6,
): Promise<Map<string, JiraIssue>> {
  const results = new Map<string, JiraIssue>();
  const queue = [...new Set(keys)];

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (let key = queue.shift(); key; key = queue.shift()) {
      try {
        const issue = await fetchIssue(auth, key);
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
