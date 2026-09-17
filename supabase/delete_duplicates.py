#!/usr/bin/env python3
"""
Deletes 6 rows from the LIVE Supabase 'restaurants' table that were
duplicate entries (same restaurant listed twice, from the original
spreadsheet). For each pair you told me which copy to keep:

    Milos              -> kept id 76, deleting id 56
    Jua                -> kept id 125, deleting id 92
    Hamburger America  -> kept id 94, deleting id 149
    Bar Primi          -> kept id 325, deleting id 229
    Aska (identical)   -> kept id 384, deleting id 393
    Jungsik (identical)-> kept id 440, deleting id 459

data/restaurants.json has already had these 6 ids removed locally —
this just brings the live database in line with it.

Run this yourself, locally — it needs your project's service_role key
(Settings -> API), which is a real secret. Set it as an env var in your
own terminal, never share it in chat, never commit it to git.

Usage:
    export SUPABASE_URL="https://jsiywcbaxsposhusslsm.supabase.co"
    export SUPABASE_SERVICE_KEY="sb_secret_..."
    python3 supabase/delete_duplicates.py
"""
import os
import sys
import urllib.request

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    print("Set SUPABASE_URL and SUPABASE_SERVICE_KEY as env vars first (see the docstring above).")
    sys.exit(1)

IDS_TO_DELETE = [56, 92, 149, 229, 393, 459]

ok = 0
failed = []
for rid in IDS_TO_DELETE:
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/restaurants?id=eq.{rid}"
    req = urllib.request.Request(url, method="DELETE", headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Prefer": "return=minimal",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            ok += 1
            print(f"deleted id {rid}")
    except urllib.error.HTTPError as e:
        failed.append((rid, e.code, e.read().decode()[:200]))

print(f"\nDeleted {ok} of {len(IDS_TO_DELETE)} rows.")
if failed:
    print(f"{len(failed)} failed:")
    for rid, code, msg in failed:
        print(f"  - {rid}: HTTP {code} {msg}")
    sys.exit(1)
