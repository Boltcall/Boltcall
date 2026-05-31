/**
 * BuildProgressTimeline — the 6-stage build status card on /client/welcome.
 *
 * Stages (in order):
 *   1. Intake call scheduled
 *   2. Intake done
 *   3. Agent prompt drafted
 *   4. Agent live
 *   5. Meta campaign launched      (Bolt System SKU only)
 *   6. First calls received
 *
 * Visual contract:
 *   - Each row is a single line with a status circle + label + timestamp.
 *   - Completed stages are quietly checked off — no celebration confetti.
 *   - The current in-flight stage gets a soft pulse ring so the eye lands
 *     on it without anything bouncing.
 *   - Future stages render muted.
 *
 * Stage detection is driven by the timestamps we get on the agency_clients
 * row (intake_done_at, live_at, signed_up_at) joined with simple presence
 * checks on counts the parent page passes in. We DO NOT do the joins here —
 * the parent page owns data fetching.
 */

import React from 'react';
import { Check, Circle, Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils';

export type StageStatus = 'done' | 'in_progress' | 'pending';

export interface BuildStage {
  id: string;
  label: string;
  /** ISO timestamp shown next to the label once the stage is done. */
  completed_at: string | null;
  status: StageStatus;
  /** Optional one-line description rendered under the label when in_progress. */
  detail?: string;
}

export interface BuildProgressInputs {
  sku: string;
  signed_up_at: string;
  intake_scheduled_at: string | null;
  intake_done_at: string | null;
  agent_drafted_at: string | null;
  agent_live_at: string | null;
  meta_campaign_launched_at: string | null;
  first_call_received_at: string | null;
}

/**
 * Map raw timestamps to the 6 stage rows. SKU determines whether the Meta
 * campaign stage is included at all — SaaS-only SKUs skip it.
 */
export function deriveStages(inputs: BuildProgressInputs): BuildStage[] {
  const sku = (inputs.sku || '').toLowerCase();
  const isBoltSystem = sku.includes('bolt') || sku.includes('system');

  const base: BuildStage[] = [
    {
      id: 'intake_scheduled',
      label: 'Intake call scheduled',
      completed_at: inputs.intake_scheduled_at,
      status: inputs.intake_scheduled_at ? 'done' : 'in_progress',
      detail: inputs.intake_scheduled_at
        ? undefined
        : 'Pick a 20-minute slot below — your strategist will run the call.',
    },
    {
      id: 'intake_done',
      label: 'Intake done',
      completed_at: inputs.intake_done_at,
      status: inputs.intake_done_at ? 'done' : inputs.intake_scheduled_at ? 'in_progress' : 'pending',
      detail: inputs.intake_scheduled_at && !inputs.intake_done_at
        ? 'Your intake is on the calendar — we will extract your Business Brief automatically.'
        : undefined,
    },
    {
      id: 'agent_drafted',
      label: 'Agent prompt drafted',
      completed_at: inputs.agent_drafted_at,
      status: inputs.agent_drafted_at ? 'done' : inputs.intake_done_at ? 'in_progress' : 'pending',
      detail: inputs.intake_done_at && !inputs.agent_drafted_at
        ? 'Your agent architect is generating a first draft from your intake.'
        : undefined,
    },
    {
      id: 'agent_live',
      label: 'Agent live on your phone number',
      completed_at: inputs.agent_live_at,
      status: inputs.agent_live_at ? 'done' : inputs.agent_drafted_at ? 'in_progress' : 'pending',
      detail: inputs.agent_drafted_at && !inputs.agent_live_at
        ? 'Final QA pass running. Your number will be live within hours.'
        : undefined,
    },
  ];

  if (isBoltSystem) {
    base.push({
      id: 'meta_campaign_launched',
      label: 'Meta campaign launched',
      completed_at: inputs.meta_campaign_launched_at,
      status: inputs.meta_campaign_launched_at
        ? 'done'
        : inputs.agent_live_at
        ? 'in_progress'
        : 'pending',
      detail:
        inputs.agent_live_at && !inputs.meta_campaign_launched_at
          ? 'Your creative team is staging the first ad set — you will approve before it goes live.'
          : undefined,
    });
  }

  base.push({
    id: 'first_call_received',
    label: 'First calls received',
    completed_at: inputs.first_call_received_at,
    status: inputs.first_call_received_at
      ? 'done'
      : inputs.agent_live_at
      ? 'in_progress'
      : 'pending',
    detail:
      inputs.agent_live_at && !inputs.first_call_received_at
        ? 'Waiting on your first inbound. It usually lands within 24 hours of going live.'
        : undefined,
  });

  return base;
}

function relativeOrAbsolute(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const deltaMs = Date.now() - then;
  const mins = Math.round(deltaMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface BuildProgressTimelineProps {
  inputs: BuildProgressInputs;
  /**
   * If supplied, the caller has pre-computed the stages (e.g. for a Storybook
   * fixture). When omitted we derive from `inputs`.
   */
  stages?: BuildStage[];
  className?: string;
}

const BuildProgressTimeline: React.FC<BuildProgressTimelineProps> = ({
  inputs,
  stages,
  className,
}) => {
  const rows = stages ?? deriveStages(inputs);

  return (
    <div className={cn('rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm', className)}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-zinc-900">Building your AI receptionist</h2>
        <p className="text-xs text-zinc-500">
          Started {relativeOrAbsolute(inputs.signed_up_at) || 'recently'}
        </p>
      </div>

      <ol className="relative space-y-4">
        {/* Vertical guideline */}
        <span
          aria-hidden
          className="absolute left-[11px] top-3 h-[calc(100%-1.5rem)] w-px bg-zinc-200"
        />
        {rows.map((stage) => {
          const isDone = stage.status === 'done';
          const isInProgress = stage.status === 'in_progress';
          return (
            <li key={stage.id} className="relative flex gap-3 pl-1">
              <span
                className={cn(
                  'relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  isDone && 'border-emerald-600 bg-emerald-600 text-white',
                  isInProgress && 'border-blue-600 bg-white text-blue-600',
                  !isDone && !isInProgress && 'border-zinc-300 bg-white text-zinc-300',
                )}
              >
                {isDone && <Check className="h-3 w-3" strokeWidth={3} />}
                {isInProgress && <Loader2 className="h-3 w-3 animate-spin" />}
                {!isDone && !isInProgress && <Circle className="h-2 w-2 fill-current" />}
                {isInProgress && (
                  <span
                    aria-hidden
                    className="absolute -inset-1 -z-10 animate-ping rounded-full bg-blue-400/40"
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isDone && 'text-zinc-900',
                      isInProgress && 'text-zinc-900',
                      !isDone && !isInProgress && 'text-zinc-400',
                    )}
                  >
                    {stage.label}
                  </p>
                  {stage.completed_at && (
                    <span className="text-xs text-zinc-500">
                      {relativeOrAbsolute(stage.completed_at)}
                    </span>
                  )}
                </div>
                {stage.detail && (
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{stage.detail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default BuildProgressTimeline;
