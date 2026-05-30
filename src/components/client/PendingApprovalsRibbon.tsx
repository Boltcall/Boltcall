/**
 * PendingApprovalsRibbon — Boltcall Client Portal · Phase E
 *
 * A slim ribbon that appears ONLY when there are pending approvals.
 * Hidden completely when count===0, per "one screen, one action".
 *
 * Per the design contract: approvals feel like supervision, not work.
 * The ribbon doesn't repeat the full diff — it just surfaces the count
 * + the freshest item and routes to the queue.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ListChecks } from 'lucide-react';

export interface PendingApprovalsRibbonProps {
  count: number;
  mostRecent: {
    artifact_id: string;
    type: string;
    client_facing_note: string | null;
    created_at: string;
  } | null;
}

// Map raw artifact types to human-readable categories the client recognizes.
const FRIENDLY_TYPE: Record<string, string> = {
  prompt_revision: 'Agent prompt update',
  knowledge_base: 'Knowledge base addition',
  ad_creative: 'New ad creative',
  ad_copy: 'New ad copy',
  optimization_brief: 'Strategy update',
  agent_prompt: 'New agent version',
  experiment_plan: 'Experiment ready',
  client_outreach: 'Outreach draft',
};

const PendingApprovalsRibbon: React.FC<PendingApprovalsRibbonProps> = ({
  count,
  mostRecent,
}) => {
  if (count <= 0) return null;

  const friendly = mostRecent
    ? FRIENDLY_TYPE[mostRecent.type] ?? mostRecent.type.replace(/_/g, ' ')
    : '';

  return (
    <Link
      to="/client/approvals"
      className="group flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-3 transition hover:border-amber-300 hover:bg-amber-50"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <ListChecks className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-amber-900">
            {count === 1
              ? '1 item ready for your review'
              : `${count} items ready for your review`}
          </div>
          {mostRecent ? (
            <div className="mt-0.5 truncate text-xs text-amber-800/80">
              Latest: {friendly}
              {mostRecent.client_facing_note
                ? ` — ${mostRecent.client_facing_note}`
                : ''}
            </div>
          ) : null}
        </div>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-amber-700 transition group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
};

export default PendingApprovalsRibbon;
