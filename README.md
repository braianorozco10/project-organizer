# Project Organizer

Group Jira tickets into projects and track how done each one actually is.

Sign in with Atlassian, create a project, and paste ticket links into it. The
ticket code, title, status, assignee and last-updated date come straight from
Jira — the only thing you fill in is a completion percentage, because that is the
one number Jira does not know.

## How it works

- **Login** — Atlassian OAuth 2.0 (3LO). You click *Continue with Atlassian*,
  approve read-only Jira scopes, and never type a password or API token. The
  browser cookie holds only an opaque session id; the access and refresh tokens
  live in Postgres encrypted with AES-256-GCM, and are refreshed silently when
  the hourly access token expires.
- **Projects** — cards on the main page, each showing its tickets and overall
  progress. Every row is scoped to `sha256(site | accountId)`, so two Jira
  accounts sharing a deployment never see each other's data.
- **Tasks** — paste a `/browse/DEV-246` link, a board URL with `?selectedIssue=`,
  or just `DEV-246`. Jira fields are cached in Postgres so the table paints
  instantly, and **Sync with Jira** re-pulls them on demand.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4
· Drizzle ORM · Neon Postgres · Atlassian OAuth 2.0 (3LO) · jose · next-themes

## Local setup

```bash
npm install
cp .env.example .env.local     # then fill in the values below
npm run db:migrate
npm run dev
```

`.env.local` needs:

| Variable                   | What it is                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | Any Postgres connection string. Neon hosts use Neon's HTTP driver; anything else (including `localhost`) uses plain TCP.  |
| `SESSION_SECRET`           | Encrypts the session cookie *and* the stored OAuth tokens. 32+ chars, `openssl rand -base64 48`.                          |
| `ATLASSIAN_CLIENT_ID`      | From your OAuth 2.0 app in the Atlassian developer console.                                                              |
| `ATLASSIAN_CLIENT_SECRET`  | Same app. Treat as a secret; never commit it.                                                                            |
| `APP_URL`                  | Public origin, no trailing slash. The callback is `<APP_URL>/api/auth/callback` and must match the console exactly.       |

Running Postgres locally instead of Neon:

```bash
brew install postgresql@17 && brew services start postgresql@17
createdb project_organizer
# DATABASE_URL="postgresql://$USER@localhost:5432/project_organizer"
```

## Registering the Atlassian OAuth app

One-time setup, at <https://developer.atlassian.com/console/myapps>:

1. **Create → OAuth 2.0 integration**, give it a name.
2. **Permissions → Jira API → Add**, then **Configure** and enable the classic
   scopes `read:jira-work` and `read:jira-user`.
3. **Authorization → OAuth 2.0 (3LO) → Configure**, set the callback URL to
   `http://localhost:3000/api/auth/callback` for local work, and add your
   production `https://<your-app>.vercel.app/api/auth/callback` too.
4. **Settings** → copy the client ID and secret into `ATLASSIAN_CLIENT_ID` and
   `ATLASSIAN_CLIENT_SECRET`.

The grant is read-only — nothing is ever written back to Jira — and anyone can
revoke it from their Atlassian account settings. `offline_access` is what lets
the app refresh the hourly access token instead of re-prompting.

If the account can reach several Jira sites, a picker appears after sign-in and
projects are tracked per site.

## Deploying to Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. **Storage → Create Database → Neon**, attach it to the project. Vercel sets
   `DATABASE_URL` for you.
3. Under **Settings → Environment Variables** (all environments) add
   `SESSION_SECRET` (a fresh `openssl rand -base64 48` value, not the local one),
   `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET`, and `APP_URL` set to the
   deployment's public origin.
4. Add `<APP_URL>/api/auth/callback` to the callback URLs in the Atlassian
   developer console.
5. Deploy, then apply the schema once against the production database:

   ```bash
   DATABASE_URL="<production url>" npm run db:migrate
   ```

## Scripts

| Command               | Does                                           |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Dev server                                     |
| `npm run build`       | Production build                               |
| `npm run lint`        | ESLint                                         |
| `npm run db:generate` | Generate a migration after editing `schema.ts` |
| `npm run db:migrate`  | Apply pending migrations                       |
| `npm run db:studio`   | Browse the database                            |

## Layout

```
src/
  app/
    login/            Sign-in page
    api/auth/         OAuth authorize + callback routes
    select-site/      Site picker for multi-site grants
    projects/         Organizer grid
    projects/[id]/    Ticket table for one project
  components/         Client and presentational components
  lib/
    actions.ts        Server Actions (projects, tasks, sync, site choice)
    atlassian.ts      OAuth 3LO: authorize, token exchange, refresh
    jira.ts           Jira REST client and link parsing
    session.ts        DB-backed session, silent token refresh
    crypto.ts         AES-256-GCM for tokens at rest
    data.ts           Read queries
    db/schema.ts      Drizzle schema
drizzle/              Generated SQL migrations
```
