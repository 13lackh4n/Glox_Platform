-- Glox Platform: RLS patch enabling instructor + super_admin panels
-- Run this in the Supabase SQL Editor AFTER the initial schema script.
-- The original schema only grants students access to their own rows;
-- this patch adds the cross-user access the instructor and admin
-- dashboards need (manage own-course tests/questions, view own-course
-- students/results, and full platform access for super_admin).

-- Safe role lookup (security definer avoids recursive RLS on public.users)
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- USERS: admins can view & update all profiles (role changes, etc.)
create policy "Admins can view all users"
  on public.users for select
  using (public.current_user_role() = 'super_admin');

create policy "Admins can update all users"
  on public.users for update
  using (public.current_user_role() = 'super_admin');

-- COURSES: admins can manage every course
create policy "Admins can manage all courses"
  on public.courses for all
  using (public.current_user_role() = 'super_admin');

-- TESTS: instructors manage tests within their own courses; admins manage all
create policy "Instructors manage own course tests"
  on public.tests for all
  using (
    exists (
      select 1 from public.courses c
      where c.id = tests.course_id and c.instructor_id = auth.uid()
    )
  );

create policy "Admins manage all tests"
  on public.tests for all
  using (public.current_user_role() = 'super_admin');

-- QUESTIONS: instructors manage questions on their own tests; admins manage all
create policy "Instructors manage own test questions"
  on public.questions for all
  using (
    exists (
      select 1 from public.tests t
      join public.courses c on c.id = t.course_id
      where t.id = questions.test_id and c.instructor_id = auth.uid()
    )
  );

create policy "Admins manage all questions"
  on public.questions for all
  using (public.current_user_role() = 'super_admin');

-- ENROLLMENTS: instructors can see who enrolled in their own courses; admins all
create policy "Instructors view own course enrollments"
  on public.enrollments for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = enrollments.course_id and c.instructor_id = auth.uid()
    )
  );

create policy "Admins manage all enrollments"
  on public.enrollments for all
  using (public.current_user_role() = 'super_admin');

-- RESULTS: instructors can see results for their own course tests; admins all
create policy "Instructors view own course results"
  on public.results for select
  using (
    exists (
      select 1 from public.tests t
      join public.courses c on c.id = t.course_id
      where t.id = results.test_id and c.instructor_id = auth.uid()
    )
  );

create policy "Admins view all results"
  on public.results for select
  using (public.current_user_role() = 'super_admin');
