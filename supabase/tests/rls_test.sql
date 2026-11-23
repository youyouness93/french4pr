-- RLS tests for the member area. Run after supabase_stub.sql + the migration:
--   psql -v ON_ERROR_STOP=1 -f supabase_stub.sql -f ../migrations/0001_member_area.sql -f rls_test.sql
-- Each check raises an exception on failure; the last line prints "ALL RLS TESTS PASSED".

-- Users (the signup trigger creates their profiles): admin …a, teacher …b, students …1 and …2
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.ca',   '{"full_name":"Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'teacher@test.ca', '{"full_name":"Teacher"}'),
  ('00000000-0000-0000-0000-000000000001', 's1@test.ca',      '{"full_name":"Student One"}'),
  ('00000000-0000-0000-0000-000000000002', 's2@test.ca',      '{"full_name":"Student Two"}');

-- Promote roles as the SQL editor would (auth.uid() is null here, so allowed)
update public.profiles set role = 'admin'   where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'teacher' where id = '00000000-0000-0000-0000-00000000000b';

-- Seed: one group taught by the teacher, student 1 in it, a session, a mock exam, a note
insert into public.groups (id, name, level, teacher_id, teams_url)
  values ('10000000-0000-0000-0000-000000000001', 'B1 Evening', 'B1', '00000000-0000-0000-0000-00000000000b', 'https://teams.microsoft.com/l/x');
insert into public.groups (id, name, level) values ('10000000-0000-0000-0000-000000000002', 'A1 Morning', 'A1');
insert into public.group_members values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', current_date);
insert into public.sessions (id, group_id, starts_at, ends_at)
  values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', now() + interval '1 day', now() + interval '1 day 1 hour'),
         ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', now() + interval '1 day', now() + interval '1 day 1 hour');
insert into public.mock_exams (student_id, listening, reading, writing, speaking) values ('00000000-0000-0000-0000-000000000001', 7, 7, 6, 6);
insert into public.teacher_notes (student_id, body) values ('00000000-0000-0000-0000-000000000001', 'Internal note');

create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- ── Anonymous visitor (website form) ──
begin;
set local role anon;
insert into public.assessment_requests (full_name, email, phone, city, consent, permit_expiry, availability)
  values ('Web Lead', 'lead@test.ca', '4165550000', 'Brampton', true, '2027-02-01', array['weekends']);
select pg_temp.check(true, 'anon can submit the assessment form');
commit;

do $$ begin
  set local role anon;
  begin
    insert into public.assessment_requests (full_name, email, phone, city, consent) values ('X', 'x@test.ca', '1', 'Y', false);
    raise exception 'FAILED: anon insert without consent was accepted';
  exception when insufficient_privilege or check_violation then raise notice 'ok - anon insert without consent rejected';
  end;
end $$;

do $$ begin
  set local role anon;
  begin
    perform 1 from public.assessment_requests;
    raise exception 'FAILED: anon could read requests';
  exception when insufficient_privilege then raise notice 'ok - anon cannot read requests';
  end;
  begin
    perform 1 from public.profiles;
    raise exception 'FAILED: anon could read profiles';
  exception when insufficient_privilege then raise notice 'ok - anon cannot read profiles';
  end;
end $$;

-- ── Student 1 ──
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select pg_temp.check((select count(*) from public.profiles) = 1, 'student sees only own profile');
select pg_temp.check((select count(*) from public.assessment_requests) = 0, 'student sees no requests');
select pg_temp.check((select count(*) from public.groups) = 1, 'student sees only own group');
select pg_temp.check((select count(*) from public.sessions) = 1, 'student sees only own group sessions');
select pg_temp.check((select count(*) from public.mock_exams) = 1, 'student sees own mock exam');
select pg_temp.check((select count(*) from public.teacher_notes) = 0, 'student cannot see internal notes');
update public.profiles set role = 'admin', plan_price_cad = 1, city = 'Mississauga' where id = '00000000-0000-0000-0000-000000000001';
select pg_temp.check((select role::text || '/' || coalesce(plan_price_cad::text, 'null') || '/' || city from public.profiles where id = '00000000-0000-0000-0000-000000000001') = 'student/null/Mississauga',
  'student can edit city but not role or plan');
update public.profiles set city = 'Hacked' where id = '00000000-0000-0000-0000-000000000002';
commit;

do $$ begin
  set local role authenticated;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
  begin
    insert into public.mock_exams (student_id, listening) values ('00000000-0000-0000-0000-000000000001', 12);
    raise exception 'FAILED: student could write a mock exam';
  exception when insufficient_privilege then raise notice 'ok - student cannot add mock exams';
  end;
  begin
    insert into public.group_members values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', current_date);
    raise exception 'FAILED: student could join a group';
  exception when insufficient_privilege then raise notice 'ok - student cannot join groups';
  end;
end $$;

-- ── Student 2 (in no group) ──
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select pg_temp.check((select city from public.profiles) is null, 'student 2 profile untouched by student 1');
select pg_temp.check((select count(*) from public.sessions) = 0, 'student 2 sees no sessions');
select pg_temp.check((select count(*) from public.mock_exams) = 0, 'student 2 sees no one else''s mock exams');
commit;

-- ── Teacher ──
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) from public.profiles) = 4, 'teacher sees all profiles');
select pg_temp.check((select count(*) from public.assessment_requests) = 0, 'teacher cannot see requests');
insert into public.attendance values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', true, now());
select pg_temp.check(true, 'teacher records attendance in own group');
insert into public.teacher_notes (student_id, body) values ('00000000-0000-0000-0000-000000000001', 'Good speaking today');
select pg_temp.check((select count(*) from public.teacher_notes) = 2, 'teacher writes and reads notes');
commit;

do $$ begin
  set local role authenticated;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
  begin
    insert into public.attendance values ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', true, now());
    raise exception 'FAILED: teacher wrote attendance for a group they do not teach';
  exception when insufficient_privilege then raise notice 'ok - teacher limited to own groups';
  end;
  update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000b';
  if (select role from public.profiles where id = '00000000-0000-0000-0000-00000000000b') <> 'teacher' then
    raise exception 'FAILED: teacher promoted themselves';
  end if;
  raise notice 'ok - teacher cannot change own role';
end $$;

-- ── Admin ──
begin;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select count(*) from public.assessment_requests) = 1, 'admin reads requests');
update public.assessment_requests set stage = 'contacted';
update public.profiles set plan = 'group', plan_price_cad = 239, level = 'B1' where id = '00000000-0000-0000-0000-000000000001';
select pg_temp.check((select plan_price_cad from public.profiles where id = '00000000-0000-0000-0000-000000000001') = 239, 'admin sets plan and level');
insert into public.groups (name, level) values ('A2 Weekend', 'A2');
select pg_temp.check((select count(*) from public.groups) = 3, 'admin creates groups');
commit;

select 'ALL RLS TESTS PASSED' as result;
