-- One-time fix for "duplicate key value violates unique constraint
-- restaurants_pkey" when adding a new restaurant.
--
-- Why this happens: the original import set each row's id explicitly
-- (1, 2, 3, ... 505) instead of letting Postgres generate them, so the
-- auto-numbering counter for the id column was never advanced past its
-- starting point. Every new insert (which lets Postgres pick the id)
-- tries id=1 first, which is already taken — hence the error.
--
-- This tells Postgres "the next auto-generated id should come after the
-- highest id currently in the table." Safe to run anytime — it only
-- moves the counter forward, never touches existing rows.
--
-- Run this once in Supabase's SQL editor (Project -> SQL Editor -> New
-- query -> paste -> Run), the same way you ran schema.sql.

select setval(
  pg_get_serial_sequence('restaurants', 'id'),
  (select max(id) from restaurants)
);
