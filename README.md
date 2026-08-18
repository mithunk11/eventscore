# EventScore

Competition scoring for judges. Judges mark on their phones; totals, shortlists
and rankings work themselves out.

Live at https://eventscore.mjapps.net

## What it is built on

- Next.js 16, App Router, TypeScript
- Supabase — Postgres, auth and file storage, EU region
- Vercel — hosting, function region Dublin
- Plain CSS in `src/app/globals.css`, no component library

## Setting it up from nothing

### 1. The database

Create a Supabase project in an EU region and save the database password.

In the SQL Editor, run the contents of `db/01-schema.sql`. That creates every
table, row-level security policy, function and trigger.

Then create a **private** storage bucket called `event-media` and add its policy:

```sql
create policy "own media" on storage.objects
  for all to authenticated
  using (bucket_id = 'event-media' and owner = auth.uid())
  with check (bucket_id = 'event-media' and owner = auth.uid());
```

### 2. The app

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

### 3. Environment variables

| Name | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, Project Settings, API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page. Safe to expose. |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. **Bypasses all security. Server only.** |
| `CRON_SECRET` | Any long random string |

### 4. The first owner

Create a user in Supabase under Authentication, then in the SQL Editor:

```sql
update profiles set role = 'owner' where email = 'you@example.com';
```

### 5. Deploying

Connect the repository to Vercel or Netlify. Add all four environment variables
in the host's settings — `.env.local` is deliberately not in git. Set the
function region to Dublin so it sits beside the database.

For scheduled maintenance and backups, add these repository secrets under
Settings, Secrets and variables, Actions:

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CRON_SECRET`, `APP_URL`, `SUPABASE_DB_URL`

`SUPABASE_DB_URL` must be the **session pooler** connection string. The direct
one is IPv6 only and GitHub runners cannot reach it.

## Documentation

Everything is in `docs/`:

- Judge manual — hand to judges
- Customer manual — hand to organisers
- Owner manual — accounts, recovery, what breaks
- Technical and migration guide — architecture and moving hosts
- Backups and recovery — taking and restoring copies
- Recovery and handover — disaster recovery, handing the project on
- Legal pack — terms, privacy and processing agreement drafts

Read the technical guide before changing the scoring or progression code. It
records rules that look arbitrary but are not.

## Backups

`.github/workflows/backup.yml` dumps the database nightly into `backups/`,
keeping thirty days.
