#!/usr/bin/env python3
"""
Pushes the finished description/description_source/hood fields to the LIVE
Supabase 'restaurants' table. A previous run of this script missed 13 rows
(a mid-run failure), so their live descriptions were still the generic
placeholder — this re-run fixes those, picks up a handful of small wording
touch-ups, and corrects Milos's neighborhood (it was tagged Upper East Side;
its actual locations are Midtown and Hudson Yards).

Run this yourself, locally — it needs your project's service_role key
(Settings -> API), which is a real secret. Set it as an env var in your own
terminal, never share it in chat, never commit it to git.

Usage:
    export SUPABASE_URL="https://jsiywcbaxsposhusslsm.supabase.co"
    export SUPABASE_SERVICE_KEY="sb_secret_..."
    python3 supabase/sync_descriptions.py
"""
import json
import os
import sys
import urllib.request

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("Set SUPABASE_URL and SUPABASE_SERVICE_KEY as env vars first (see the docstring above).")
    sys.exit(1)

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "..", "data", "restaurants.json")

with open(DATA_PATH) as f:
    restaurants = json.load(f)

ok = 0
failed = []
for i, r in enumerate(restaurants, 1):
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/restaurants?id=eq.{r['id']}"
    body = json.dumps({
        "description": r["description"], "description_source": r["descriptionSource"],
        "hood": r["hood"],
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="PATCH", headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            ok += 1
    except urllib.error.HTTPError as e:
        failed.append((r["id"], r["name"], e.code, e.read().decode()[:200]))
    if i % 50 == 0:
        print(f"...{i}/{len(restaurants)}")

print(f"\nUpdated {ok} of {len(restaurants)} restaurants.")
if failed:
    print(f"{len(failed)} failed:")
    for rid, name, code, msg in failed:
        print(f"  - {rid} {name}: HTTP {code} {msg}")
    sys.exit(1)
