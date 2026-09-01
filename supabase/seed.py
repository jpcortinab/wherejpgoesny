#!/usr/bin/env python3
"""
One-time migration: pushes the 505 restaurants already in data/restaurants.json
into your Supabase 'restaurants' table.

Run this yourself, locally, AFTER running supabase/schema.sql in the Supabase
SQL editor. It needs your project's service_role key (Settings -> API), which
is a real secret — set it as an env var in your own terminal, never share it
in chat, never commit it to git.

Usage:
    export SUPABASE_URL="https://xxxx.supabase.co"
    export SUPABASE_SERVICE_KEY="eyJ..."
    python3 supabase/seed.py
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

rows = []
for r in restaurants:
    rows.append({
        "id": r["id"],
        "borough": r["borough"],
        "hood": r["hood"],
        "name": r["name"],
        "type": r["type"],
        "stars": r["stars"],
        "cost": r["cost"],
        "mood": r["mood"],
        "rec": r["rec"],
        "dos": r["dos"],
        "donts": r["donts"],
        "rez": r["rez"],
        "misc": r["misc"],
        "top_pick": r["topPick"],
        "description": r["description"],
        "description_source": r["descriptionSource"],
    })

url = SUPABASE_URL.rstrip("/") + "/rest/v1/restaurants"
body = json.dumps(rows).encode("utf-8")
req = urllib.request.Request(url, data=body, method="POST", headers={
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
})

try:
    with urllib.request.urlopen(req) as resp:
        print(f"Inserted {len(rows)} restaurants. Status: {resp.status}")
except urllib.error.HTTPError as e:
    print(f"Failed: {e.code} {e.reason}")
    print(e.read().decode())
    sys.exit(1)

print()
print("One more step: the ids above were inserted explicitly (preserving the")
print("originals), so the table's auto-increment counter doesn't know about them")
print("yet. In the Supabase SQL editor, run:")
print()
print("  select setval(pg_get_serial_sequence('restaurants', 'id'), (select max(id) from restaurants));")
print()
print("Otherwise the next restaurant you ADD through the editor could collide")
print("with an existing id.")
