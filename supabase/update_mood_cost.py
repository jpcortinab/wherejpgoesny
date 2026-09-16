#!/usr/bin/env python3
"""
One-time push: applies the mood/cost values just filled in locally to the
LIVE Supabase 'restaurants' table (only touches the rows that changed, and
only the mood/cost columns on each — a plain UPDATE per row, not an upsert,
so there's no risk of tripping a NOT NULL constraint on unrelated columns).

Run this yourself, locally — it needs your project's service_role key
(Settings -> API), which is a real secret. Set it as an env var in your own
terminal, never share it in chat, never commit it to git.

Usage:
    export SUPABASE_URL="https://jsiywcbaxsposhusslsm.supabase.co"
    export SUPABASE_SERVICE_KEY="sb_secret_..."
    python3 supabase/update_mood_cost.py
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

# The exact ids touched by the mood/cost research pass.
CHANGED_IDS = {
    21, 81, 85, 94, 103, 105, 106, 109, 111, 130, 149, 185, 190, 195, 196, 197,
    198, 243, 249, 251, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376,
    377, 378, 379, 380, 381, 382, 383, 387, 388, 389, 390, 391, 392, 393, 394,
    395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 407, 413, 414, 415, 416,
    419, 421, 422, 423, 425, 426, 427, 428, 429, 431, 432, 433, 435, 443, 444,
    445, 446, 451, 453, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466,
    467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481,
    482, 483, 484, 485, 486, 487, 488, 489, 494, 495, 496, 497, 498, 499, 500,
    501, 502, 503, 504, 505, 93, 95, 96, 99, 100, 101, 440,
}

by_id = {r["id"]: r for r in restaurants if r["id"] in CHANGED_IDS}

ok = 0
failed = []
for i, (rid, r) in enumerate(sorted(by_id.items()), 1):
    url = f"{SUPABASE_URL.rstrip('/')}/rest/v1/restaurants?id=eq.{rid}"
    body = json.dumps({"mood": r["mood"], "cost": r["cost"]}).encode("utf-8")
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
        failed.append((rid, r["name"], e.code, e.read().decode()[:200]))
    if i % 25 == 0:
        print(f"...{i}/{len(by_id)}")

print(f"\nUpdated {ok} of {len(by_id)} restaurants.")
if failed:
    print(f"{len(failed)} failed:")
    for rid, name, code, msg in failed:
        print(f"  - {rid} {name}: HTTP {code} {msg}")
    sys.exit(1)
