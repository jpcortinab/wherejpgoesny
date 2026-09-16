-- Run this once in the Supabase SQL editor (same place as before).
-- Adds a "closed" flag so permanently-closed spots can be marked instead
-- of silently recommended to someone planning a trip there.

alter table restaurants add column if not exists closed boolean not null default false;
