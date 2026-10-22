-- CR-0007: wrap auth.uid() in a sub-select in class_materials_insert (same semantics) + index its 3 unindexed FKs.
-- rollback: re-run the class_materials_insert policy from 20261022160000_e_classes_materials.sql (bare auth.uid()). Indexes: drop index if exists class_materials_{class_id,unit_id,created_by}_idx.
drop policy if exists class_materials_insert on public.class_materials;
create policy class_materials_insert on public.class_materials for insert to authenticated
  with check (public.can_write_tasks(student_id) and created_by = (select auth.uid())
    and exists (select 1 from public.classes c where c.id = class_id and c.student_id = class_materials.student_id));
create index if not exists class_materials_class_id_idx on public.class_materials (class_id);
create index if not exists class_materials_unit_id_idx on public.class_materials (unit_id);
create index if not exists class_materials_created_by_idx on public.class_materials (created_by);
