CREATE TABLE IF NOT EXISTS public.provisioning_locks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provisioning_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisioning_locks FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.provisioning_locks FROM PUBLIC;
REVOKE ALL ON TABLE public.provisioning_locks FROM anon;
REVOKE ALL ON TABLE public.provisioning_locks FROM authenticated;
GRANT ALL ON TABLE public.provisioning_locks TO service_role;

-- Acquires an advisory lock for a user's in-flight retell-agents create_full
-- request, so two concurrent requests (double-click, two tabs) can't both
-- provision a Retell agent for the same user. Locks older than 10 minutes
-- are treated as abandoned (crashed function, no release) and reacquired,
-- so a user is never permanently stuck.
CREATE OR REPLACE FUNCTION public.acquire_provisioning_lock(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.provisioning_locks (user_id, locked_at)
  VALUES (p_user_id, now())
  ON CONFLICT (user_id) DO UPDATE
    SET locked_at = now()
    WHERE public.provisioning_locks.locked_at < now() - interval '10 minutes'
  RETURNING true;
$$;

REVOKE ALL ON FUNCTION public.acquire_provisioning_lock(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_provisioning_lock(uuid) TO service_role;
