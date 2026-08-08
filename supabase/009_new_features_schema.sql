-- Glox Platform: schema for approval flow, lesson group access,
-- lesson completions and test attempt tracking.
-- Run this in the Supabase SQL Editor. Requires 002 (groups/lessons) and
-- rls_patch_instructor_admin.sql (public.current_user_role()) to already exist.

-- =========================================================
-- lesson_group_access — which groups a lesson is visible to
-- (no row for a lesson = visible to every enrolled student, "hamısı üçün")
-- =========================================================
CREATE TABLE IF NOT EXISTS public.lesson_group_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lesson_id, group_id)
);
ALTER TABLE public.lesson_group_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors manage lesson access" ON public.lesson_group_access;
CREATE POLICY "Instructors manage lesson access"
  ON public.lesson_group_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_group_access.lesson_id
        AND c.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage all lesson access" ON public.lesson_group_access;
CREATE POLICY "Admins manage all lesson access"
  ON public.lesson_group_access FOR ALL
  USING (public.current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Students view own lesson access" ON public.lesson_group_access;
CREATE POLICY "Students view own lesson access"
  ON public.lesson_group_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = lesson_group_access.group_id
        AND gm.user_id = auth.uid()
    )
  );

-- =========================================================
-- users: approval workflow + profile fields
-- =========================================================
-- admin_note wasn't in the original column list but Mərhələ 2.5 ("Rədd et"
-- + admin_note modal) has nowhere to store the rejection reason without it —
-- added here so that flow actually persists something.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS admin_note text;

-- =========================================================
-- lesson_completions — tracks which lessons a student has finished
-- =========================================================
CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own completions" ON public.lesson_completions;
CREATE POLICY "Users manage own completions"
  ON public.lesson_completions FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Instructors view completions" ON public.lesson_completions;
CREATE POLICY "Instructors view completions"
  ON public.lesson_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = lesson_completions.lesson_id
        AND c.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view all completions" ON public.lesson_completions;
CREATE POLICY "Admins view all completions"
  ON public.lesson_completions FOR SELECT
  USING (public.current_user_role() = 'super_admin');

-- =========================================================
-- results: attempt tracking (one row per attempt; attempt_number lets a
-- retry — after an instructor/admin clears the previous result — stack
-- cleanly instead of colliding)
-- =========================================================
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS attempt_number int DEFAULT 1;
