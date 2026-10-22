-- Fix (#43, P1): public.student_age(uuid) is SECURITY DEFINER and executable by any signed-in user,
-- so anyone could learn any student's age by id. Return the age only to callers who can already see the student
-- (student self, active guardian, active share grantee) or to internal/service calls with no end-user (auth.uid() is null).
-- Internal callers (can_view_student, student_at_or_over_threshold, gal_insert policy) are all self/guardian paths: unchanged.
-- Expired shares excluded (from Team E's equivalent fix #64 / DEC-188). Does not call can_view_student (which calls student_age) to avoid recursion.
-- rollback: re-create the previous body from 20261021000000_initial_tenant_model.sql (line ~217) in a new migration.
-- integration-signoff: #62 (RLS tests: supabase/tests/student_age_int_test.sql)
create or replace function public.student_age(p_student uuid)
returns int language sql stable security definer set search_path = public as $$
  select extract(year from age(current_date, s.birth_date))::int
  from public.students s
  where s.id = p_student
    and (
      (select auth.uid()) is null
      or public.is_student_self(p_student)
      or public.is_active_guardian(p_student)
      or exists (
        select 1 from public.shares sh
        where sh.student_id = p_student and sh.grantee_profile_id = (select auth.uid()) and sh.revoked_at is null
          and (sh.expires_at is null or sh.expires_at > now()))
    )
$$;
