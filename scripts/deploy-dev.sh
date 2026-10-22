#!/usr/bin/env bash
# Deploy sparkle-api + sparkle-web to Cloudflare (dev on workers.dev). See SOP-02.
# Needs: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID in env; ~/.sparkle/keys.json (Supabase keys). Never echoes secrets.
set -euo pipefail
cd "$(dirname "$0")/.."
# Target Supabase project (DEC-70). Cutover to sparkle-dev: SPARKLE_SUPABASE_REF=wqfzzfggyirvgaxfqcts
# SPARKLE_KEYS=~/.sparkle/keys-dev.json (needs its secret key; SA-20). Default stays on the original project.
REF="${SPARKLE_SUPABASE_REF:-nklbdyezbsugkdvaidtt}"
KEYS="${SPARKLE_KEYS:-$HOME/.sparkle/keys.json}"
key() { python3 -c "import json,sys;print([x for x in json.load(open('$KEYS')) if x['type']=='$1'][0]['api_key'],end='')"; }
export NEXT_PUBLIC_API_URL=https://sparkle-api.crystal-iamrolan.workers.dev
export NEXT_PUBLIC_SITE_URL=https://sparkle-web.crystal-iamrolan.workers.dev
export SUPABASE_URL="https://$REF.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$(key publishable)"; export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
target="${1:-all}"
if [[ $target == all || $target == api ]]; then
  (cd apps/api && npx wrangler deploy --var "SUPABASE_URL:$SUPABASE_URL")
  # Keep Worker secrets in sync with the target project (piped, never echoed).
  if [[ ${SYNC_SECRETS:-1} == 1 ]]; then
    key publishable | (cd apps/api && npx wrangler secret put SUPABASE_PUBLISHABLE_KEY >/dev/null)
    if python3 -c "import json;exit(0 if any(x['type']=='secret' for x in json.load(open('$KEYS'))) else 1)"; then
      key secret | (cd apps/api && npx wrangler secret put SUPABASE_SECRET_KEY >/dev/null)
    fi
    echo "api secrets synced"
  fi
fi
if [[ $target == all || $target == web ]]; then
  (cd apps/web && npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy -- --var "SUPABASE_URL:$SUPABASE_URL")
fi
curl -fsS "$NEXT_PUBLIC_API_URL/health" >/dev/null && echo "api /health ok"
curl -fsS -o /dev/null "$NEXT_PUBLIC_SITE_URL/" && echo "web / ok"
