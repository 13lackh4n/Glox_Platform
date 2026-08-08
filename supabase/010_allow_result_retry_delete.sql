-- Glox Platform: allow instructors/admins to delete a result to grant a retry
--
-- Mərhələ 5 (test attempt limits): the "retry-ə icazə ver" action in
-- instructor/admin Results screens deletes a student's previous result for
-- a test so they can attempt it again. RLS on public.results only had
-- SELECT policies for instructors/admins (rls_patch_instructor_admin.sql),
-- so the delete would silently be blocked by RLS without these.

create policy "Instructors delete own course results"
  on public.results for delete
  using (
    exists (
      select 1 from public.tests t
      join public.courses c on c.id = t.course_id
      where t.id = results.test_id and c.instructor_id = auth.uid()
    )
  );

create policy "Admins delete all results"
  on public.results for delete
  using (public.current_user_role() = 'super_admin');
