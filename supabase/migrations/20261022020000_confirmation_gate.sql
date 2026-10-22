-- WBS 3.6 / handoff §9 / ADR-04: nothing outbound is ever sent without explicit human confirmation.
alter table public.ai_drafts add column if not exists confirmed_by uuid references public.profiles (id);
alter table public.ai_drafts add column if not exists sent_at timestamptz;
alter table public.ai_drafts add column if not exists recipient text;
create index if not exists ai_drafts_confirmed_by_idx on public.ai_drafts (confirmed_by);

-- A draft can only be marked sent after it was confirmed (DB-level guarantee, independent of app code).
alter table public.ai_drafts drop constraint if exists ai_drafts_sent_requires_confirmation;
alter table public.ai_drafts add constraint ai_drafts_sent_requires_confirmation
  check (sent_at is null or (confirmed_at is not null and confirmed_by is not null and sent_at >= confirmed_at));

-- Confirm a draft: only a guardian (or the student themself) who can see messages; records who and when.
create or replace function public.confirm_draft(p_draft uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_student uuid; v_at timestamptz := now();
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  select student_id into v_student from public.ai_drafts where id = p_draft and confirmed_at is null;
  if v_student is null then raise exception 'draft not found or already confirmed'; end if;
  if not (public.is_active_guardian(v_student) or public.is_student_self(v_student)) then
    raise exception 'not allowed';
  end if;
  update public.ai_drafts set confirmed_at = v_at, confirmed_by = (select auth.uid()) where id = p_draft;
  return v_at;
end $$;
revoke execute on function public.confirm_draft(uuid) from public, anon;
grant execute on function public.confirm_draft(uuid) to authenticated;
