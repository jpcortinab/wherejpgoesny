#!/usr/bin/env python3
"""
Compares data/restaurants.json (the local source of truth) against the
LIVE Supabase 'restaurants' table and reports any differences.

This is what should have caught the bug where 13 restaurants' researched
descriptions never made it past a partial sync — instead of that only
turning up when someone happened to notice it on the live site.

Read-only: it only uses the public anon/publishable key (the same one
already committed in js/supabase-config.js), so it's safe to run anytime,
by anyone, with no secrets involved.

Usage:
    python3 supabase/check_drift.py
"""
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")

with open(os.path.join(ROOT, "js", "supabase-config.js")) as f:
    config_js = f.read()

url_match = re.search(r'SUPABASE_URL\s*=\s*"([^"]+)"', config_js)
key_match = re.search(r'SUPABASE_ANON_KEY\s*=\s*"([^"]+)"', config_js)
if not url_match or not key_match:
    print("Couldn't find SUPABASE_URL / SUPABASE_ANON_KEY in js/supabase-config.js")
    sys.exit(1)

SUPABASE_URL = url_match.group(1)
ANON_KEY = key_match.group(1)

# Fields that live in Supabase and should match restaurants.json exactly.
# (lat/lng/costLevel/recScore/rated are computed client-side and aren't
# stored in Supabase at all, so they're not checked here.)
FIELDS = {
    "borough": "borough", "hood": "hood", "name": "name", "type": "type",
    "stars": "stars", "cost": "cost", "mood": "mood", "rec": "rec",
    "dos": "dos", "donts": "donts", "rez": "rez", "misc": "misc",
    "topPick": "top_pick", "description": "description",
    "descriptionSource": "description_source", "closed": "closed",
}

with open(os.path.join(ROOT, "data", "restaurants.json")) as f:
    local = {r["id"]: r for r in json.load(f)}

req = urllib.request.Request(
    f"{SUPABASE_URL.rstrip('/')}/rest/v1/restaurants?select=*&order=id.asc&limit=2000",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"},
)
with urllib.request.urlopen(req) as resp:
    remote = {r["id"]: r for r in json.loads(resp.read())}

local_ids, remote_ids = set(local), set(remote)
only_local = sorted(local_ids - remote_ids)
only_remote = sorted(remote_ids - local_ids)

field_mismatches = {}
for rid in sorted(local_ids & remote_ids):
    l, r = local[rid], remote[rid]
    for local_key, remote_key in FIELDS.items():
        lv = l.get(local_key)
        rv = r.get(remote_key)
        if bool(lv) != bool(rv) if isinstance(lv, bool) or isinstance(rv, bool) else lv != rv:
            field_mismatches.setdefault(local_key, []).append((rid, l.get("name"), lv, rv))

print(f"Local restaurants.json: {len(local)} rows")
print(f"Live Supabase table:    {len(remote)} rows")
print()

drift_found = False

if only_local:
    drift_found = True
    print(f"IDs only in local ({len(only_local)}): {only_local}")
if only_remote:
    drift_found = True
    print(f"IDs only in Supabase ({len(only_remote)}): {only_remote}")

if field_mismatches:
    drift_found = True
    print("\nField mismatches (local vs. live):")
    for field, rows in field_mismatches.items():
        print(f"\n  {field}: {len(rows)} row(s)")
        for rid, name, lv, rv in rows[:10]:
            lv_s = (str(lv)[:60] + "...") if lv and len(str(lv)) > 60 else lv
            rv_s = (str(rv)[:60] + "...") if rv and len(str(rv)) > 60 else rv
            print(f"    id={rid} {name!r}: local={lv_s!r} live={rv_s!r}")
        if len(rows) > 10:
            print(f"    ... and {len(rows) - 10} more")

if not drift_found:
    print("No drift — local and live match exactly.")
else:
    print("\nTo push local fixes to Supabase, use sync_descriptions.py (or a similar")
    print("targeted script) — see the other files in supabase/ for the pattern.")

sys.exit(1 if drift_found else 0)
