-- Enables ROW LEVEL SECURITY on every table in the `public` schema.
--
-- Why this exists: the database is hosted on Supabase, which exposes the
-- `public` schema through PostgREST to the `anon` and `authenticated` roles.
-- This project does not use PostgREST at all — every read and write goes
-- through the API in `server/src`, which connects with the `postgres` role.
-- A table left without RLS is therefore readable by anyone holding the
-- project's publishable key, entirely outside the authorization this codebase
-- enforces. Enabling RLS closes that door.
--
-- No policies are created, and that is the whole design:
--
--   * With RLS enabled and no policy present, every ordinary role sees zero
--     rows and every write is refused. That is exactly what is wanted for the
--     PostgREST roles, which must reach nothing.
--   * The `postgres` role owns these tables and is a superuser, so it bypasses
--     RLS entirely. The application is unaffected — the API keeps reading and
--     writing exactly as before, and authorization stays where it already is:
--     session, role, and ownership checks in the service layer.
--
-- Consequence to keep in mind: if a future deployment ever connects the API
-- with a non-owner, non-BYPASSRLS role, it will read nothing until policies
-- are written. That is a deliberate fail-closed default.
--
-- `_prisma_migrations` is excluded on purpose. It is Prisma's own bookkeeping
-- table, it holds no application data, and Prisma must keep reading and
-- writing it during every future `migrate deploy`.
--
-- Hand-written: Prisma Schema has no syntax for row-level security, so this
-- lives in the database only and is intentionally absent from schema.prisma.
-- Future generated migrations will not propose dropping it, but a table added
-- later will NOT be covered automatically — re-run this block (or add the
-- ALTER by hand) whenever a new table is introduced.
--
-- Idempotent by construction: the loop only touches tables where
-- `relrowsecurity` is still false, so re-applying it to a database where RLS
-- was already enabled by hand is a genuine no-op that changes nothing and
-- locks nothing.

DO $$
DECLARE
  target text;
BEGIN
  FOR target IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      -- Ordinary and partitioned tables. Views, sequences, and indexes have no
      -- row-level security to enable.
      AND c.relkind IN ('r', 'p')
      AND c.relname <> '_prisma_migrations'
      AND NOT c.relrowsecurity
    ORDER BY c.relname
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      target
    );
  END LOOP;
END
$$;
