#!/usr/bin/env bash
# Deploys every edge function from the repo to the NEW project.
# Source of truth = supabase/functions/* in this repo (no need to download from OLD).
# Requires: supabase CLI logged into an account with access to the NEW project.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
# shellcheck disable=SC1091
source "$HERE/.env"

cd "$REPO"
for dir in supabase/functions/*/; do
  fn="$(basename "$dir")"
  # _shared is a shared-code folder, not a deployable function
  [ "$fn" = "_shared" ] && continue
  echo "==> Deploying $fn"
  supabase functions deploy "$fn" --project-ref "$NEW_REF"
done

echo "==> All functions deployed to $NEW_REF."
echo "    Reminder: re-add the function SECRETS in the NEW project dashboard"
echo "    (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, BREVO_API_KEY, APIFY_API_TOKEN, etc.)."
