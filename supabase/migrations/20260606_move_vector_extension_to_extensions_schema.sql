-- Supabase recommends extension objects live outside the public API schema.
-- pgvector is relocatable, and all app RPCs now pin search_path to include
-- extensions, so moving it removes a public-schema advisor warning without
-- changing existing vector/halfvec columns.

CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION vector SET SCHEMA extensions;

ALTER ROLE anon SET search_path = "$user", public, extensions;
ALTER ROLE authenticated SET search_path = "$user", public, extensions;
ALTER ROLE service_role SET search_path = "$user", public, extensions;
