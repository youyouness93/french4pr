-- French4PR member area — initial schema
-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.
-- Roles: admin (everything), teacher (their groups + students), student (only their own data).

-- ─────────────────────────────────────────────────────────── Types ──
create type public.user_role     as enum ('admin', 'teacher', 'student');
create type public.cefr_level    as enum ('zero', 'A1', 'A2', 'B1', 'B2');
create type public.request_stage as enum ('new', 'contacted', 'booked', 'assessed', 'enrolled', 'lost');
create type public.plan_type     as enum ('group', 'private', 'fast_track');
create type public.test_type     as enum ('TEF', 'TCF');

-- ──────────────────────────────────────────────────────── Profiles ──
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  role               public.user_role not null default 'student',
  full_name          text check (char_length(full_name) <= 200),
  email              text,
  phone              text check (char_length(phone) <= 40),
  city               text check (char_length(city) <= 100),
  immigration_status text check (char_length(immigration_status) <= 60),
  permit_expiry      date,
  level              public.cefr_level,
  level_started_on   date,
  test_type          public.test_type,
  test_date          date,
  plan               public.plan_type,
  plan_price_cad     integer check (plan_price_cad >= 0),
  next_payment_date  date,
  payment_status     text check (payment_status in ('paid', 'due', 'late')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─────────────────────────────────────────── Role helper functions ──
-- SECURITY DEFINER so policies can call them without recursive RLS checks.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'teacher'));
$$;

-- New account → profile row (role student by default).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Students can edit their contact details and test info, never their role, level or plan.
-- (auth.uid() is null in the SQL editor and with the service key: those are trusted.)
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  new.id                := old.id;
  new.role              := old.role;
  new.email             := old.email;
  new.level             := old.level;
  new.level_started_on  := old.level_started_on;
  new.plan              := old.plan;
  new.plan_price_cad    := old.plan_price_cad;
  new.next_payment_date := old.next_payment_date;
  new.payment_status    := old.payment_status;
  new.created_at        := old.created_at;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ─────────────────────────────────────────── Assessment requests ──
-- Filled by the public website form (anonymous insert only).
create table public.assessment_requests (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  full_name          text not null check (char_length(full_name) between 1 and 200),
  email              text not null check (char_length(email) between 3 and 254 and email like '%@%'),
  phone              text not null check (char_length(phone) between 3 and 40),
  city               text not null check (char_length(city) between 1 and 100),
  immigration_status text check (char_length(immigration_status) <= 60),
  permit_expiry      date,
  french_level       text check (char_length(french_level) <= 20),
  preferred_format   text check (char_length(preferred_format) <= 20),
  availability       text[] check (cardinality(availability) <= 5),
  source             text check (char_length(source) <= 40),
  consent            boolean not null,
  stage              public.request_stage not null default 'new',
  admin_notes        text,
  student_id         uuid references public.profiles (id) on delete set null
);

-- ──────────────────────────────────────────── Groups & membership ──
create table public.groups (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 80),
  level          public.cefr_level not null,
  is_private     boolean not null default false,
  teacher_id     uuid references public.profiles (id) on delete set null,
  schedule_label text check (char_length(schedule_label) <= 120),
  capacity       integer not null default 8 check (capacity between 1 and 12),
  teams_url      text check (teams_url is null or teams_url like 'https://%'),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_on  date not null default current_date,
  primary key (group_id, student_id)
);

create or replace function public.teaches_group(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.groups where id = g and teacher_id = auth.uid());
$$;

create or replace function public.in_group(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = g and student_id = auth.uid());
$$;

-- ──────────────────────────────────────── Class sessions (calendar) ──
create table public.sessions (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  topic      text check (char_length(topic) <= 160),
  teams_url  text check (teams_url is null or teams_url like 'https://%'),  -- overrides the group link
  cancelled  boolean not null default false,
  check (ends_at > starts_at)
);
create index sessions_group_start_idx on public.sessions (group_id, starts_at);
create index sessions_start_idx on public.sessions (starts_at);

create table public.attendance (
  session_id  uuid not null references public.sessions (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  present     boolean not null,
  recorded_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

create or replace function public.teaches_session(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sessions se join public.groups g on g.id = se.group_id
    where se.id = s and g.teacher_id = auth.uid()
  );
$$;

-- ──────────────────────────────────── Progress: mock exams & notes ──
create table public.mock_exams (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  taken_on   date not null default current_date,
  test_type  public.test_type not null default 'TCF',
  listening  smallint check (listening between 0 and 12),   -- NCLC levels
  reading    smallint check (reading between 0 and 12),
  writing    smallint check (writing between 0 and 12),
  speaking   smallint check (speaking between 0 and 12),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index mock_exams_student_idx on public.mock_exams (student_id, taken_on desc);

-- Internal notes: staff only, never shown to students.
create table public.teacher_notes (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  author_id  uuid default auth.uid() references public.profiles (id) on delete set null,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index teacher_notes_student_idx on public.teacher_notes (student_id, created_at desc);

-- ─────────────────────────────────────────────────────── Homework ──
create table public.homework (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 160),
  skill      text check (skill in ('listening', 'reading', 'writing', 'speaking', 'grammar', 'vocabulary')),
  due_on     date,
  details    text check (char_length(details) <= 4000),
  created_at timestamptz not null default now()
);

create table public.homework_status (
  homework_id uuid not null references public.homework (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  status      text not null default 'todo' check (status in ('todo', 'done', 'corrected')),
  grade       text check (char_length(grade) <= 20),
  primary key (homework_id, student_id)
);

-- ───────────────────────────────────────────── Row Level Security ──
alter table public.profiles            enable row level security;
alter table public.assessment_requests enable row level security;
alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.sessions            enable row level security;
alter table public.attendance          enable row level security;
alter table public.mock_exams          enable row level security;
alter table public.teacher_notes       enable row level security;
alter table public.homework            enable row level security;
alter table public.homework_status     enable row level security;

-- profiles
create policy "profiles: read own or staff"   on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "profiles: update own or admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "profiles: admin delete"        on public.profiles for delete to authenticated using (public.is_admin());

-- assessment_requests: anyone may submit (with consent), only admins read or change
create policy "requests: public submit" on public.assessment_requests for insert to anon, authenticated
  with check (consent and stage = 'new' and student_id is null and admin_notes is null);
create policy "requests: admin read"   on public.assessment_requests for select to authenticated using (public.is_admin());
create policy "requests: admin update" on public.assessment_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "requests: admin delete" on public.assessment_requests for delete to authenticated using (public.is_admin());

-- groups & members
create policy "groups: staff or member read" on public.groups for select to authenticated using (public.is_staff() or public.in_group(id));
create policy "groups: admin write"          on public.groups for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "members: staff or self read"  on public.group_members for select to authenticated using (public.is_staff() or student_id = auth.uid());
create policy "members: admin write"         on public.group_members for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- sessions
create policy "sessions: staff or member read" on public.sessions for select to authenticated using (public.is_staff() or public.in_group(group_id));
create policy "sessions: admin or teacher write" on public.sessions for all to authenticated
  using (public.is_admin() or public.teaches_group(group_id)) with check (public.is_admin() or public.teaches_group(group_id));

-- attendance
create policy "attendance: staff or self read" on public.attendance for select to authenticated using (public.is_staff() or student_id = auth.uid());
create policy "attendance: admin or teacher write" on public.attendance for all to authenticated
  using (public.is_admin() or public.teaches_session(session_id)) with check (public.is_admin() or public.teaches_session(session_id));

-- mock exams
create policy "mock: staff or self read" on public.mock_exams for select to authenticated using (public.is_staff() or student_id = auth.uid());
create policy "mock: staff write"        on public.mock_exams for all    to authenticated using (public.is_staff()) with check (public.is_staff());

-- teacher notes (internal)
create policy "notes: staff only" on public.teacher_notes for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- homework
create policy "homework: staff or member read" on public.homework for select to authenticated using (public.is_staff() or public.in_group(group_id));
create policy "homework: admin or teacher write" on public.homework for all to authenticated
  using (public.is_admin() or public.teaches_group(group_id)) with check (public.is_admin() or public.teaches_group(group_id));
create policy "hw status: staff or self read" on public.homework_status for select to authenticated using (public.is_staff() or student_id = auth.uid());
create policy "hw status: staff write"        on public.homework_status for all    to authenticated using (public.is_staff()) with check (public.is_staff());

-- Only the website form may write anonymously; nothing else is readable without an account.
revoke all on all tables in schema public from anon;
grant insert on public.assessment_requests to anon;
