-- 20260531 — fix business_features trigger user_id conflict handling
--
-- The on_workspace_created_business_features trigger fired after INSERT on
-- workspaces and called create_business_features_for_new_user(), which did:
--   INSERT INTO business_features (...)
--   ON CONFLICT (workspace_id) DO NOTHING;
--
-- But business_features has TWO unique constraints — UNIQUE(workspace_id)
-- AND UNIQUE(user_id) (named unique_user_features). The ON CONFLICT clause
-- only handled workspace_id, so any attempt to create a second workspace for
-- an existing user raised:
--   "duplicate key value violates unique constraint 'unique_user_features'"
-- and rolled the whole workspace INSERT back. This blocked every retry-after-
-- partial-failure during onboarding (see bug-duplicate-workspace.png from
-- the 2026-05-31 pre-ship QA).
--
-- Fix: change ON CONFLICT to (user_id) and DO UPDATE to re-point the existing
-- features row at the newest workspace. This preserves the per-user-singleton
-- invariant the rest of the codebase relies on (FeatureHub.tsx,
-- ai-assistant.ts, etc. all query business_features by user_id with .single())
-- while letting onboarding retries succeed.

CREATE OR REPLACE FUNCTION public.create_business_features_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.business_features (user_id, workspace_id, embed_token)
  VALUES (NEW.user_id, NEW.id, md5(gen_random_uuid()::text))
  ON CONFLICT (user_id) DO UPDATE
    SET workspace_id = EXCLUDED.workspace_id,
        updated_at   = now();
  RETURN NEW;
END;
$function$;
