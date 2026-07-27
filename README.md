# Project Organizer

Group Jira tickets into projects and track how done each one actually is.

Sign in with your Jira credentials, create a project, and paste ticket links into
it. The ticket code, title, status, assignee and last-updated date come straight
from Jira — the only thing you fill in is a completion percentage, because that
is the one number Jira does not know.

## How it works

- **Login** — Jira Cloud site URL + Atlassian email + API token. Credentials are
  verified against `/rest/api/3/myself`, then encrypted (A256GCM) into an
  httpOnly session cookie. The API token is never written to the database.
- **Projects** — cards on the main page, each showing its tickets and overall
  progress. Every row is scoped to `sha256(site | accountId)`, so two Jira
  accounts sharing a deployment never see each other's data.
- **Tasks** — paste a `/browse/DEV-246` link, a board URL with `?selectedIssue=`,
  or just `DEV-246`. Jira fields are cached in Postgres so the table paints
  instantly, and **Sync with Jira** re-pulls them on demand.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4
· Drizzle ORM · Neon Postgres · jose · next-themes

## Local setup

```bash
npm install
cp .env.example .env.local     # then fill in the two values below
npm run db:migrate
npm run dev
```

`.env.local` needs:

| Variable         | What it is                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | Any Postgres connection string. Neon hosts use Neon's HTTP driver; anything else (including `localhost`) uses plain TCP.  |
| `SESSION_SECRET` | Cookie encryption key, 32+ chars. Generate with `openssl rand -base64 48`.                                               |

Running Postgres locally instead of Neon:

```bash
brew install postgresql@17 && brew services start postgresql@17
createdb project_organizer
# DATABASE_URL="postgresql://$USER@localhost:5432/project_organizer"
```

## Getting a Jira API token

1. Go to <https://id.atlassian.com/manage-profile/security/api-tokens>.
2. **Create API token**, give it a label, copy the value.
3. Paste it into the login form along with your site URL (`your-team.atlassian.net`)
   and the email on your Atlassian account.

The token needs no special scopes — it inherits whatever you can already see in
Jira. Tickets you cannot view simply fail to add.

## Deploying to Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. **Storage → Create Database → Neon**, attach it to the project. Vercel sets
   `DATABASE_URL` for you.
3. Add `SESSION_SECRET` under **Settings → Environment Variables** (all
   environments). Use a fresh `openssl rand -base64 48` value, not the local one.
4. Deploy, then apply the schema once against the production database:

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
    projects/         Organizer grid
    projects/[id]/    Ticket table for one project
  components/         Client and presentational components
  lib/
    actions.ts        Server Actions (auth, projects, tasks, sync)
    jira.ts           Jira REST client and link parsing
    session.ts        Encrypted cookie session
    data.ts           Read queries
    db/schema.ts      Drizzle schema
drizzle/              Generated SQL migrations
```
