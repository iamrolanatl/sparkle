-- Team E / DoD re-check fix (DEC-188): student_age() is SECURITY DEFINER and executable by every
-- authenticated user, so anyone holding a student UUID could read another family's child's age.
-- Guard it to the student, active guardians, and active share grantees. Callers with no auth.uid()
-- (service role / postgres; anon has no EXECUTE) keep full access for server-side jobs.
-- Same signature and return type; semantics unchanged for authorized callers. Not a data change.
-- rollback: re-apply the original body from 20261021000000_initial_tenant_model.sql (lines 217-220)
--   with `create or replace function public.student_age(p_student uuid)`; no data to restore.
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
        where sh.student_id = p_student and sh.grantee_profile_id = (select auth.uid())
          and sh.revoked_at is null and (sh.expires_at is null or sh.expires_at > now()))
    )
$$;
