#!/usr/bin/env bash
# Self-test for check-migrations.mjs: good migration passes, destructive one fails.
set -euo pipefail
root=$(pwd); t=$(mktemp -d); trap 'rm -rf $t' EXIT
mkdir -p $t/supabase/migrations && cp supabase/migrations/*.sql $t/supabase/migrations/ && cd $t
printf -- '-- rollback: drop the column\nalter table public.students add column if not exists nickname text;\n' > supabase/migrations/20991231000000_int_ok.sql
node $root/scripts/check-migrations.mjs >/dev/null
printf -- '-- rollback: n/a\ndrop table public.students;\n' > supabase/migrations/20991231000001_int_bad.sql
if node $root/scripts/check-migrations.mjs >/dev/null 2>&1; then echo "expected DROP to fail"; exit 1; fi
rm supabase/migrations/20991231000001_int_bad.sql
printf 'update public.students set display_name = null;\n' > supabase/migrations/20991231000002_x_bad.sql
if node $root/scripts/check-migrations.mjs >/dev/null 2>&1; then echo "expected bad name/update to fail"; exit 1; fi
echo "check-migrations self-test ok"
