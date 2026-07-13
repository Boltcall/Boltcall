-- Task 7 (batch3-10x-plan): scenario-based transfer routing.
--
-- agents.transfer_phone_number was already read/written by AgentDetailPage.tsx
-- but the column never existed, so every save silently no-op'd on that field.
ALTER TABLE agents ADD COLUMN IF NOT EXISTS transfer_phone_number TEXT;

CREATE TABLE IF NOT EXISTS transfer_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL DEFAULT 'keyword' CHECK (condition_type IN ('keyword', 'default')),
  condition_value TEXT,
  destination_number TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_rules_agent ON transfer_rules(agent_id, priority);

ALTER TABLE transfer_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_access_transfer_rules" ON transfer_rules;
CREATE POLICY "owner_access_transfer_rules" ON transfer_rules FOR ALL USING (user_id = auth.uid());
