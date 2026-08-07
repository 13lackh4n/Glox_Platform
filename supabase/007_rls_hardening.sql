-- Glox Platform: defensive RLS reinforcement
--
-- I don't have read access to the live database, so I can't see the exact
-- policies created by the original (untracked) base schema. Postgres RLS
-- policies for the same command are OR'd together, so ADDING a policy here
-- can only widen access, never narrow it — if a student can currently see
-- other students' results/answers because of an existing overly-broad
-- policy, this migration alone will not fix that. Run the query at the
-- bottom of this file and check for anything unexpected before trusting it.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'results' and policyname = 'Users view own results'
  ) then
    create policy "Users view own results"
      on public.results for select
      using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'answers' and policyname = 'Users view own answers'
  ) then
    create policy "Users view own answers"
      on public.answers for select
      using (
        exists (
          select 1 from public.results r
          where r.id = answers.result_id and r.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'certificates' and policyname = 'Users view own certificates'
  ) then
    create policy "Users view own certificates"
      on public.certificates for select
      using (user_id = auth.uid());
  end if;
end $$;

-- Manual check (run in SQL Editor): list every policy on the
-- security-sensitive tables and read each `using`/`with check` expression —
-- confirm none of them grant a student access to another student's row.
--
-- select schemaname, tablename, policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('results', 'answers', 'certificates', 'questions')
-- order by tablename, policyname;
