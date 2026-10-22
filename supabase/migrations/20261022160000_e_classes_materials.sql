-- Grades & Classes module (approved mockup sparkle-classes): richer class/unit data, category weights,
-- per-unit student materials (table + private storage bucket). All reads gated by can_view_student;
-- materials writes by can_write_tasks (student self or active guardian).
-- rollback: drop the two new tables, the added columns and the materials bucket:
--   drop table if exists public.class_materials, public.class_categories;
--   alter table public.classes drop column if exists room, drop column if exists syllabus_url, drop column if exists ebook_url;
--   alter table public.units drop column if exists topics, drop column if exists week_label;
--   alter table public.assignments drop column if exists category;
--   delete from storage.buckets where id = 'materials';

alter table public.classes add column if not exists room text;
alter table public.classes add column if not exists syllabus_url text;
alter table public.classes add column if not exists ebook_url text;
alter table public.units add column if not exists topics text[] not null default '{}';
alter table public.units add column if not exists week_label text;
alter table public.assignments add column if not exists category text;

create table if not exists public.class_categories (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  weight numeric not null check (weight >= 0 and weight <= 100),
  score numeric check (score >= 0 and score <= 200),
  created_at timestamptz not null default now(),
  unique (class_id, name)
);
create index if not exists class_categories_student_idx on public.class_categories (student_id, class_id);
alter table public.class_categories enable row level security;
drop policy if exists class_categories_select on public.class_categories;
create policy class_categories_select on public.class_categories for select to authenticated
  using (public.can_view_student(student_id, 'grades'));

create table if not exists public.class_materials (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  kind text not null check (kind in ('file', 'link')),
  name text not null check (char_length(name) between 1 and 200),
  url text check (url is null or (url ~* '^https?://' and char_length(url) <= 2000)),
  storage_path text check (storage_path is null or char_length(storage_path) <= 500),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  check ((kind = 'link' and url is not null) or (kind = 'file' and storage_path is not null))
);
create index if not exists class_materials_class_idx on public.class_materials (student_id, class_id, created_at desc);
alter table public.class_materials enable row level security;
drop policy if exists class_materials_select on public.class_materials;
create policy class_materials_select on public.class_materials for select to authenticated
  using (public.can_view_student(student_id, 'assignments'));
drop policy if exists class_materials_insert on public.class_materials;
create policy class_materials_insert on public.class_materials for insert to authenticated
  with check (public.can_write_tasks(student_id) and created_by = auth.uid()
    and exists (select 1 from public.classes c where c.id = class_id and c.student_id = class_materials.student_id));
drop policy if exists class_materials_delete on public.class_materials;
create policy class_materials_delete on public.class_materials for delete to authenticated
  using (public.can_write_tasks(student_id));
grant select, insert, delete on public.class_materials to authenticated;
grant select on public.class_categories to authenticated;

-- Private bucket; object path = <student_id>/<class_id>/<uuid>-<filename>. 10 MB, docs/images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 10485760,
  array['application/pdf','image/png','image/jpeg','image/webp','image/heic','text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do nothing;
drop policy if exists materials_read on storage.objects;
create policy materials_read on storage.objects for select to authenticated
  using (bucket_id = 'materials' and public.can_view_student(((storage.foldername(name))[1])::uuid, 'assignments'));
drop policy if exists materials_write on storage.objects;
create policy materials_write on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and public.can_write_tasks(((storage.foldername(name))[1])::uuid));
drop policy if exists materials_delete on storage.objects;
create policy materials_delete on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and public.can_write_tasks(((storage.foldername(name))[1])::uuid));
