#!/usr/bin/env bash
# Self-test for check-migrations.mjs (SOP-15): good migrations pass, unsafe ones fail.
set -euo pipefail
root=$(pwd); t=$(mktemp -d); trap 'rm -rf $t' EXIT
mkdir -p $t/supabase/migrations && cp supabase/migrations/*.sql $t/supabase/migrations/ && cd $t
M=supabase/migrations
run() { node $root/scripts/check-migrations.mjs >/dev/null 2>&1; }
pass() { printf -- "$2" > $M/$1; run || { echo "FAIL (should pass): $1"; node $root/scripts/check-migrations.mjs; exit 1; }; rm $M/$1; }
fail() { printf -- "$2" > $M/$1; if run; then echo "FAIL (should reject): $1"; exit 1; fi; rm $M/$1; }

pass 20991231000000_int_ok.sql '-- rollback: drop column nickname in a follow-up CR\nalter table public.students add column if not exists nickname text;\n'
pass 20991231000001_int_repolicy.sql '-- rollback: restore previous policy text from git\ndrop policy if exists p_read on public.tasks;\ncreate policy p_read on public.tasks for select using (true);\n'
fail 20991231000002_int_drop.sql '-- rollback: recreate table from backup\ndrop table public.students;\n'
fail 20991231000003_int_droppol.sql '-- rollback: recreate policy\ndrop policy if exists p_read on public.tasks;\n'
fail 20991231000004_x_name.sql '-- rollback: nothing to undo here\nselect 1;\n'
fail 20991231000005_int_upd.sql '-- rollback: no-op restore\nupdate public.students set display_name = null;\n'
fail 20991231000006_int_blank.sql '-- rollback:\nselect 1;\n'
fail 20991231000007_int_na.sql '-- rollback: n/a\nselect 1;\n'
fail 20991231000008_int_fn.sql '-- rollback: restore previous body from git\ncreate or replace function public.can_view_student(p uuid, s text) returns boolean language sql as $$ select true $$;\n'
fail 20991231000009_int_alterpol.sql '-- rollback: restore previous policy\nalter policy p_read on public.tasks using (true);\n'
pass 20991231000010_int_signed.sql '-- rollback: restore previous body from git\n-- integration-signoff: #60 (RLS tests in supabase/tests)\ncreate or replace function public.student_age(p uuid) returns int language sql as $$ select 1 $$;\n'
printf -- '-- rollback: x\n' > $M/20261021000000_int_dup.sql; if run; then echo "FAIL: duplicate timestamp"; exit 1; fi; rm $M/20261021000000_int_dup.sql
echo "check-migrations self-test ok (12 cases)"
