-- Add workspace_id to legacy user-owned tables used by V2 endpoints.
-- Keep user_id in place for older V1 paths; V2 functions should scope data
-- reads by server-derived workspace_id after this migration is applied.

CREATE OR REPLACE FUNCTION public.set_workspace_id_from_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT w.id
      INTO NEW.workspace_id
      FROM public.workspaces AS w
      WHERE w.user_id = NEW.user_id
      ORDER BY w.created_at ASC
      LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  target_table text;
  tables text[] := ARRAY[
    'leads',
    'chats',
    'callbacks',
    'scheduled_messages',
    'daily_metrics',
    'locations',
    'user_integrations',
    'whatsapp_settings',
    'call_logs',
    'calls',
    'messages',
    'user_oauth_tokens',
    'twilio_numbers',
    'acs_numbers',
    'calcom_integrations',
    'retell_agents',
    'retell_calls'
  ];
BEGIN
  FOREACH target_table IN ARRAY tables LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS workspace_id uuid',
        target_table
      );

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target_table
          AND column_name = 'user_id'
      ) THEN
        EXECUTE format(
          'UPDATE public.%I AS t
             SET workspace_id = w.id
            FROM public.workspaces AS w
           WHERE t.workspace_id IS NULL
             AND t.user_id = w.user_id',
          target_table
        );

        EXECUTE format(
          'DROP TRIGGER IF EXISTS trg_%I_set_workspace_id ON public.%I',
          target_table,
          target_table
        );

        EXECUTE format(
          'CREATE TRIGGER trg_%I_set_workspace_id
             BEFORE INSERT OR UPDATE OF user_id, workspace_id ON public.%I
             FOR EACH ROW
             EXECUTE FUNCTION public.set_workspace_id_from_user_id()',
          target_table,
          target_table
        );
      END IF;

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_workspace_id ON public.%I(workspace_id)',
        target_table,
        target_table
      );
    END IF;
  END LOOP;
END;
$$;
