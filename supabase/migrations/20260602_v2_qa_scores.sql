-- 20260602_v2_qa_scores.sql
-- V2 QA storage — single-tenant, workspace-scoped call quality scores.
--
-- One row per scored call. Distinct from the multi-tenant agency QA artifacts
-- (which live in agency_artifacts with ship_target='qa_review') and from the
-- legacy retell_call_scores (per-dim long table). V2 QA is a flat per-call
-- rubric + one-line verdict so the dashboard can render it without joining
-- five rows per call.
--
-- Rubric dimensions (0-10 integer): empathy, accuracy, intent_capture,
-- transfer_handled. The overall score is the mean of the four.

CREATE TABLE IF NOT EXISTS saas_v2_qa_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  call_id text NOT NULL,
  scored_at timestamptz NOT NULL DEFAULT now(),
  -- Per-dimension scores (0-10 integer; null means the judge couldn't score it)
  rubric_empathy integer CHECK (rubric_empathy IS NULL OR (rubric_empathy >= 0 AND rubric_empathy <= 10)),
  rubric_accuracy integer CHECK (rubric_accuracy IS NULL OR (rubric_accuracy >= 0 AND rubric_accuracy <= 10)),
  rubric_intent_capture integer CHECK (rubric_intent_capture IS NULL OR (rubric_intent_capture >= 0 AND rubric_intent_capture <= 10)),
  rubric_transfer_handled integer CHECK (rubric_transfer_handled IS NULL OR (rubric_transfer_handled >= 0 AND rubric_transfer_handled <= 10)),
  -- Overall: mean of the four dims (precomputed for fast list queries)
  overall numeric(4,2) NOT NULL CHECK (overall >= 0 AND overall <= 10),
  -- 1-line plain-English verdict from the judge
  verdict_oneliner text NOT NULL DEFAULT '',
  -- Model id for cost/quality observability (e.g. 'claude-sonnet-4-5')
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, call_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_v2_qa_scores_workspace
  ON saas_v2_qa_scores(workspace_id, scored_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_v2_qa_scores_overall
  ON saas_v2_qa_scores(workspace_id, overall);

-- RLS: only the workspace owner can read or write their workspace's scores.
-- The Netlify functions use the service role, which bypasses RLS — RLS is
-- the second line of defense if a workspace_id ever leaks to a user-token query.
ALTER TABLE saas_v2_qa_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can read v2 qa scores" ON saas_v2_qa_scores;
CREATE POLICY "Owner can read v2 qa scores"
  ON saas_v2_qa_scores FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owner can write v2 qa scores" ON saas_v2_qa_scores;
CREATE POLICY "Owner can write v2 qa scores"
  ON saas_v2_qa_scores FOR ALL
  TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()))
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
