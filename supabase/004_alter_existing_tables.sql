-- Glox Platform: Extend existing tables for groups + approval-based enrollment
-- Run this in the Supabase SQL Editor after 003_storage_materials_bucket.sql.

alter table public.enrollments
  add column if not exists group_id uuid references public.groups(id);

alter table public.courses
  add column if not exists enrollment_type text default 'open'
    check (enrollment_type in ('open', 'approval_required'));

-- The original "Users can enroll" policy only lets a student insert their
-- OWN enrollment row. When an instructor approves an enrollment_requests
-- row, the instructor is the one inserting into enrollments on the
-- student's behalf, so a matching insert policy is required.
create policy "Instructors can enroll approved students"
  on public.enrollments for insert
  with check (
    exists (
      select 1 from public.courses c
      where c.id = enrollments.course_id and c.instructor_id = auth.uid()
    )
  );
