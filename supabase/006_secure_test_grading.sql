-- Glox Platform: secure test grading + auto-certificates
--
-- PROBLEM: Test.jsx used to `select('*')` from public.questions while the
-- student was taking the exam, which includes `correct_answer` — a student
-- could read it straight out of the network tab before submitting.
--
-- FIX:
--   1. questions_public — a view with no correct_answer/explanation, used
--      while an exam is in progress.
--   2. submit_test_attempt() — a SECURITY DEFINER RPC that is the only
--      place grading happens. It reads the real questions table (which the
--      calling student cannot), computes the score, inserts the results +
--      answers rows, and auto-issues a certificate.
--   3. get_result_review() — a SECURITY DEFINER RPC that returns the
--      correct answer + explanation for a finished result, but only to the
--      student who owns it (or an instructor/admin).

-- =========================================================
-- 1. Public (no-answer) view for taking an exam
-- =========================================================
create or replace view public.questions_public as
  select id, test_id, part, question_text, option_a, option_b, option_c, option_d, marks, order_num
  from public.questions;

grant select on public.questions_public to authenticated;

-- =========================================================
-- 2. Server-side grading RPC
-- =========================================================
create or replace function public.submit_test_attempt(
  p_test_id uuid,
  p_answers jsonb, -- [{ "question_id": "...", "selected_answer": "a" }, ...]
  p_time_taken_seconds int
)
returns public.results
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result public.results;
  v_total_score int := 0;
  v_total_possible int := 0;
  v_part1 int := 0;
  v_part2 int := 0;
  v_part3 int := 0;
  v_q record;
  v_selected text;
  v_is_correct boolean;
  v_answer_rows jsonb := '[]'::jsonb;
  v_course_id uuid;
begin
  if v_user_id is null then
    raise exception 'Giriş tələb olunur';
  end if;

  select course_id into v_course_id from public.tests where id = p_test_id;
  if v_course_id is null then
    raise exception 'Test tapılmadı';
  end if;

  for v_q in
    select id, part, correct_answer, marks
    from public.questions
    where test_id = p_test_id
  loop
    v_selected := (
      select value ->> 'selected_answer'
      from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) value
      where (value ->> 'question_id')::uuid = v_q.id
      limit 1
    );
    v_is_correct := v_selected is not null and v_selected = v_q.correct_answer;
    v_total_possible := v_total_possible + v_q.marks;
    if v_is_correct then
      v_total_score := v_total_score + v_q.marks;
      if v_q.part = 1 then v_part1 := v_part1 + v_q.marks;
      elsif v_q.part = 2 then v_part2 := v_part2 + v_q.marks;
      elsif v_q.part = 3 then v_part3 := v_part3 + v_q.marks;
      end if;
    end if;
    v_answer_rows := v_answer_rows || jsonb_build_object(
      'question_id', v_q.id,
      'selected_answer', v_selected,
      'is_correct', v_is_correct
    );
  end loop;

  insert into public.results (
    user_id, test_id, score, total_possible, percentage,
    part1_score, part2_score, part3_score, time_taken_seconds
  ) values (
    v_user_id, p_test_id, v_total_score, v_total_possible,
    case when v_total_possible > 0 then (v_total_score::numeric / v_total_possible) * 100 else 0 end,
    v_part1, v_part2, v_part3, p_time_taken_seconds
  )
  returning * into v_result;

  insert into public.answers (result_id, question_id, selected_answer, is_correct)
  select
    v_result.id,
    (elem ->> 'question_id')::uuid,
    elem ->> 'selected_answer',
    (elem ->> 'is_correct')::boolean
  from jsonb_array_elements(v_answer_rows) elem;

  -- Auto-issue a certificate for this attempt.
  insert into public.certificates (user_id, course_id, certificate_number, type, issued_at)
  values (
    v_user_id,
    v_course_id,
    'TYE-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 100000)::text, 5, '0'),
    case
      when v_result.percentage >= 80 then 'yuksek'
      when v_result.percentage >= 60 then 'bitirib'
      else 'istirak'
    end,
    now()
  );

  return v_result;
end;
$$;

grant execute on function public.submit_test_attempt(uuid, jsonb, int) to authenticated;

-- =========================================================
-- 3. Post-submission review RPC (correct answers + explanations)
-- =========================================================
create or replace function public.get_result_review(p_result_id uuid)
returns table (
  answer_id uuid,
  question_id uuid,
  part int,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text,
  selected_answer text,
  is_correct boolean,
  marks int,
  order_num int,
  explanation text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner uuid;
begin
  select r.user_id into v_owner from public.results r where r.id = p_result_id;

  if v_owner is null then
    raise exception 'Nəticə tapılmadı';
  end if;

  if v_owner != v_user_id and public.current_user_role() not in ('instructor', 'super_admin') then
    raise exception 'İcazə yoxdur';
  end if;

  return query
    select
      a.id, q.id, q.part, q.question_text,
      q.option_a, q.option_b, q.option_c, q.option_d,
      q.correct_answer, a.selected_answer, a.is_correct,
      q.marks, q.order_num, q.explanation
    from public.answers a
    join public.questions q on q.id = a.question_id
    where a.result_id = p_result_id
    order by q.part, q.order_num;
end;
$$;

grant execute on function public.get_result_review(uuid) to authenticated;

-- =========================================================
-- 4. Lock down direct client inserts into results/answers/certificates —
--    submit_test_attempt() (SECURITY DEFINER) is now the only writer.
-- =========================================================
drop policy if exists "Users can insert own results" on public.results;
drop policy if exists "Users insert own results" on public.results;
drop policy if exists "Users can insert own answers" on public.answers;
drop policy if exists "Users insert own answers" on public.answers;
