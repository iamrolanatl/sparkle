-- CR-0007 / NFR-43: RLS performance + foreign-key/policy-column indexes.
-- 1) Wrap auth.uid() in a scalar sub-select so Postgres evaluates it once per statement (initPlan),
--    not once per row. Rewrites every public policy in place (idempotent).
do $$
declare p record; q text; c text; stmt text;
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies
           where schemaname = 'public' and (qual ~ 'auth\.uid\(\)' or with_check ~ 'auth\.uid\(\)') loop
    q := regexp_replace(p.qual, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'gi');
    c := regexp_replace(p.with_check, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'gi');
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if q is not null then stmt := stmt || format(' using (%s)', q); end if;
    if c is not null then stmt := stmt || format(' with check (%s)', c); end if;
    execute stmt;
  end loop;
end $$;

-- 2) Index every foreign key / policy column (none of these were indexed).
create index if not exists ai_drafts_student_id_idx on public.ai_drafts (student_id);
create index if not exists assignments_class_id_idx on public.assignments (class_id);
create index if not exists assignments_student_id_idx on public.assignments (student_id);
create index if not exists assignments_unit_id_idx on public.assignments (unit_id);
create index if not exists classes_student_id_idx on public.classes (student_id);
create index if not exists daily_notes_student_id_idx on public.daily_notes (student_id);
create index if not exists grades_assignment_id_idx on public.grades (assignment_id);
create index if not exists grades_class_id_idx on public.grades (class_id);
create index if not exists grades_student_id_idx on public.grades (student_id);
create index if not exists guardian_access_limits_limited_by_idx on public.guardian_access_limits (limited_by);
create index if not exists household_members_profile_id_idx on public.household_members (profile_id);
create index if not exists households_created_by_idx on public.households (created_by);
create index if not exists invitations_accepted_by_idx on public.invitations (accepted_by);
create index if not exists invitations_approved_by_idx on public.invitations (approved_by);
create index if not exists invitations_invited_by_idx on public.invitations (invited_by);
create index if not exists invitations_student_id_idx on public.invitations (student_id);
create index if not exists shares_granted_by_idx on public.shares (granted_by);
create index if not exists shares_grantee_profile_id_idx on public.shares (grantee_profile_id);
create index if not exists shares_student_id_idx on public.shares (student_id);
create index if not exists shopping_items_created_by_idx on public.shopping_items (created_by);
create index if not exists shopping_items_household_id_idx on public.shopping_items (household_id);
create index if not exists student_guardians_guardian_profile_id_idx on public.student_guardians (guardian_profile_id);
create index if not exists students_created_by_idx on public.students (created_by);
create index if not exists support_tickets_session_id_idx on public.support_tickets (session_id);
create index if not exists sync_runs_student_id_idx on public.sync_runs (student_id);
create index if not exists units_class_id_idx on public.units (class_id);
create index if not exists units_student_id_idx on public.units (student_id);
