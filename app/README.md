# French4PR — member area (Next.js + Supabase)

Student and admin spaces for French4PR. Setup guide (FR): `../docs/espace-membre-installation.md`.

- `src/app/(student)` — student pages: dashboard, classes, progress, profile
- `src/app/admin` — admin/teacher pages: dashboard, assessment requests, students, groups, calendar
- `src/app/admin/actions.ts` — all writes (server actions); each re-checks the caller's role
- `../supabase/migrations` — database schema + Row Level Security (the real access control)
- `../supabase/tests` — RLS tests on plain PostgreSQL:
  `psql -d test -v ON_ERROR_STOP=1 -f supabase/tests/supabase_stub.sql -f supabase/migrations/0001_member_area.sql -f supabase/tests/rls_test.sql`

Roles: `admin` (everything), `teacher` (their groups: classes, attendance, homework, mock exams, notes), `student` (own data only).
Accounts are invite-only (sign-ups disabled; login by email link). All class times are Toronto time. Classes run on Microsoft Teams: paste the recurring meeting link on each group.

```bash
cp .env.example .env.local   # fill in the Supabase values
npm install
npm run dev
```
