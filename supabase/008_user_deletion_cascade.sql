-- Glox Platform: hard-delete cascade for users
-- Run this in the Supabase SQL Editor.
--
-- Makes deleting a public.users row (which the delete-user Edge Function
-- does after removing the auth.users row) automatically remove every
-- dependent record instead of failing on a foreign-key violation or
-- leaving orphaned rows behind.

-- answers cascades through results already (answers.result_id -> results.id);
-- once results rows for this user are gone, their answers go with them.
-- Confirm/repair that relationship defensively too:
ALTER TABLE public.answers
  DROP CONSTRAINT IF EXISTS answers_result_id_fkey,
  ADD CONSTRAINT answers_result_id_fkey
    FOREIGN KEY (result_id)
    REFERENCES public.results(id)
    ON DELETE CASCADE;

ALTER TABLE public.results
  DROP CONSTRAINT IF EXISTS results_user_id_fkey,
  ADD CONSTRAINT results_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS certificates_user_id_fkey,
  ADD CONSTRAINT certificates_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

ALTER TABLE public.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey,
  ADD CONSTRAINT enrollments_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

ALTER TABLE public.enrollment_requests
  DROP CONSTRAINT IF EXISTS enrollment_requests_user_id_fkey,
  ADD CONSTRAINT enrollment_requests_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

ALTER TABLE public.group_members
  DROP CONSTRAINT IF EXISTS group_members_user_id_fkey,
  ADD CONSTRAINT group_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- lesson_completions is created with ON DELETE CASCADE already in
-- 009_new_features_schema.sql — nothing to alter here if that script has
-- run first. If this script runs before 009 (table doesn't exist yet),
-- the block below is skipped safely.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lesson_completions'
  ) THEN
    ALTER TABLE public.lesson_completions
      DROP CONSTRAINT IF EXISTS lesson_completions_user_id_fkey,
      ADD CONSTRAINT lesson_completions_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE CASCADE;
  END IF;
END $$;
