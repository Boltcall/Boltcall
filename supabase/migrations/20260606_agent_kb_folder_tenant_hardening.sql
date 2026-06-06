-- Harden agent-folder links so both sides of the relationship must belong to
-- the same authenticated user. The original policies checked only agent
-- ownership, which allowed a cross-tenant folder id to be attached if the API
-- path used a privileged client.

DELETE FROM agent_kb_folders akf
USING agents a, kb_folders kf
WHERE akf.agent_id = a.id
  AND akf.kb_folder_id = kf.id
  AND a.user_id <> kf.user_id;

DROP POLICY IF EXISTS "Users can view their agent-folder links" ON agent_kb_folders;
DROP POLICY IF EXISTS "Users can insert their agent-folder links" ON agent_kb_folders;
DROP POLICY IF EXISTS "Users can delete their agent-folder links" ON agent_kb_folders;

CREATE POLICY "Users can view their agent-folder links" ON agent_kb_folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM agents
      WHERE agents.id = agent_kb_folders.agent_id
        AND agents.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM kb_folders
      WHERE kb_folders.id = agent_kb_folders.kb_folder_id
        AND kb_folders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their agent-folder links" ON agent_kb_folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM agents
      WHERE agents.id = agent_kb_folders.agent_id
        AND agents.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM kb_folders
      WHERE kb_folders.id = agent_kb_folders.kb_folder_id
        AND kb_folders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their agent-folder links" ON agent_kb_folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM agents
      WHERE agents.id = agent_kb_folders.agent_id
        AND agents.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM kb_folders
      WHERE kb_folders.id = agent_kb_folders.kb_folder_id
        AND kb_folders.user_id = auth.uid()
    )
  );
