#!/usr/bin/env python3
"""
Pushes the freshly-researched mood/cost/closed values to the LIVE Supabase
'restaurants' table — a plain UPDATE per row, so there's no risk of tripping
a NOT NULL constraint on unrelated columns.

IMPORTANT: run supabase/add_closed_column.sql in the Supabase SQL editor
FIRST (one time) — this script will fail on every row otherwise, since the
"closed" column won't exist yet.

Run this yourself, locally — it needs your project's service_role key
(Settings -> API), which is a real secret. Set it as an env var in your own
terminal, never share it in chat, never commit it to git.

Usage:
    export SUPABASE_URL="https://jsiywcbaxsposhusslsm.supabase.co"
    export SUPABASE_SERVICE_KEY="sb_secret_..."
    python3 supabase/update_price_research.py
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
        "mood": r["mood"], "cost": r["cost"], "closed": r["closed"], "misc": r["misc"],
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
