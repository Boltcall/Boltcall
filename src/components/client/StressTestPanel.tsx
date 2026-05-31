/**
 * StressTestPanel — 6 pre-defined scenarios the client fires at their own agent.
 *
 * UX contract (the killer-feature surface on /client/agent):
 *   - 6 cards, each a tappable scenario.
 *   - On run, the card spinners for ~30-60s.
 *   - On complete, a side drawer opens with: transcript, qa_score with a
 *     short narrative reading, per-dimension scores, failure modes.
 *   - Never feels like a chatbot. The drawer reads like a QA report a
 *     senior teammate wrote — not a robot transcript.
 *
 * Each run = POST /api/agency-client-stress-test with {client_id, scenario_id}.
 * The parent page owns the client_id and a callback that returns the API
 * response, so the parent can swap to authedFetch directly while we focus on
 * rendering.
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  ShieldAlert,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';

import { cn } from '../../lib/utils';

export type StressScenarioId =
  | 'price_shopper'
  | 'emergency'
  | 'hostile_caller'
  | 'comparison_shopper'
  | 'non_english'
  | 'low_info';

export interface StressTestResult {
  status: 'completed' | 'failed' | 'running';
  scenario_id: StressScenarioId;
  scenario_label: string;
  persona: {
    intent: string;
    objection_pattern: string;
    accent_profile: string;
    sample_dialog_seed: string;
    difficulty?: string;
  };
  transcript: string;
  outcome: 'booked' | 'transferred' | 'lost' | 'hung_up' | 'unknown';
  qa_score: number;
  per_dim_scores: Record<string, number>;
  failure_modes: string[];
  duration_min: number;
  ran_at: string;
  error?: string;
}

interface ScenarioMeta {
  id: StressScenarioId;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const SCENARIOS: ScenarioMeta[] = [
  {
    id: 'price_shopper',
    label: 'Price shopper',
    description: 'Asks for a quote on the first sentence — no context, no patience.',
    icon: <PhoneIncoming className="h-4 w-4" />,
  },
  {
    id: 'emergency',
    label: 'After-hours emergency',
    description: 'Stressed caller, urgent problem, wants help right now.',
    icon: <ShieldAlert className="h-4 w-4" />,
  },
  {
    id: 'hostile_caller',
    label: 'Hostile caller',
    description: 'Frustrated, distrusts AI immediately, demands a human.',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    id: 'comparison_shopper',
    label: 'Comparison shopper',
    description: 'Names a competitor, asks why they should pick you.',
    icon: <PhoneCall className="h-4 w-4" />,
  },
  {
    id: 'non_english',
    label: 'Non-English-first caller',
    description: 'Heavy accent, switches languages mid-sentence.',
    icon: <Volume2 className="h-4 w-4" />,
  },
  {
    id: 'low_info',
    label: 'Low-info caller',
    description: 'Vague request, gives almost no detail, agent has to dig.',
    icon: <Sparkles className="h-4 w-4" />,
  },
];

interface StressTestPanelProps {
  /** Async runner — typically wraps authedFetch in the parent page. */
  onRun: (scenarioId: StressScenarioId) => Promise<StressTestResult>;
  className?: string;
}

function outcomeLabel(outcome: StressTestResult['outcome']): { label: string; tone: 'good' | 'neutral' | 'bad' } {
  switch (outcome) {
    case 'booked':
      return { label: 'Booked the caller', tone: 'good' };
    case 'transferred':
      return { label: 'Transferred to you', tone: 'neutral' };
    case 'lost':
      return { label: 'Lost the caller', tone: 'bad' };
    case 'hung_up':
      return { label: 'Caller hung up', tone: 'bad' };
    default:
      return { label: 'Outcome unclear', tone: 'neutral' };
  }
}

function scoreNarrative(score: number): string {
  if (score >= 8.5) return "Strong — your agent handled this cleanly. Nothing to fix.";
  if (score >= 7) return "Solid. Minor gaps worth a quick look in the transcript.";
  if (score >= 5) return "Mixed. A retrain is probably worth queueing for this scenario.";
  return "Weak. We'd flag this for an immediate prompt revision.";
}

const StressTestPanel: React.FC<StressTestPanelProps> = ({ onRun, className }) => {
  const [running, setRunning] = useState<StressScenarioId | null>(null);
  const [drawerResult, setDrawerResult] = useState<StressTestResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const runScenario = async (scenarioId: StressScenarioId) => {
    setRunning(scenarioId);
    setLastError(null);
    try {
      const result = await onRun(scenarioId);
      setDrawerResult(result);
      if (result.status !== 'completed') {
        setLastError(result.error || 'Run did not complete successfully');
      }
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Stress test failed');
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className={cn('rounded-2xl border border-zinc-200 bg-white shadow-sm', className)}>
      <div className="border-b border-zinc-100 px-6 py-4">
        <h2 className="text-base font-semibold text-zinc-900">Stress-test your agent</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Fire one of these callers at your live agent. Results land in under a minute.
        </p>
        {lastError && (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {lastError}
          </div>
        )}
      </div>

      <ul className="grid divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
        {SCENARIOS.map((scenario, idx) => {
          const isRunning = running === scenario.id;
          const isAnyRunning = running !== null;
          return (
            <li
              key={scenario.id}
              className={cn(
                'p-5',
                idx >= 2 && 'sm:border-t sm:border-zinc-100',
                idx >= 4 && 'sm:border-t sm:border-zinc-100',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2 text-zinc-700">
                    {scenario.icon}
                    <p className="text-sm font-medium text-zinc-900">{scenario.label}</p>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-500">{scenario.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => runScenario(scenario.id)}
                  disabled={isAnyRunning}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Running…
                    </>
                  ) : (
                    <>
                      Run
                      <ChevronRight className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Drawer */}
      {drawerResult && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-zinc-950/40 backdrop-blur-[2px]"
            onClick={() => setDrawerResult(null)}
            aria-hidden
          />
          <aside className="flex h-full w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                  Stress test result
                </p>
                <h3 className="mt-1 text-base font-semibold text-zinc-900">
                  {drawerResult.scenario_label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerResult(null)}
                aria-label="Close drawer"
                className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Headline */}
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Score
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-2xl font-semibold',
                      drawerResult.qa_score >= 8.5 && 'text-emerald-700',
                      drawerResult.qa_score >= 6 && drawerResult.qa_score < 8.5 && 'text-zinc-900',
                      drawerResult.qa_score < 6 && 'text-rose-700',
                    )}
                  >
                    {drawerResult.qa_score.toFixed(1)}
                    <span className="ml-1 text-sm font-normal text-zinc-500">/ 10</span>
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Outcome
                  </p>
                  {(() => {
                    const o = outcomeLabel(drawerResult.outcome);
                    return (
                      <p
                        className={cn(
                          'mt-1 inline-flex items-center gap-1.5 text-sm font-medium',
                          o.tone === 'good' && 'text-emerald-700',
                          o.tone === 'bad' && 'text-rose-700',
                          o.tone === 'neutral' && 'text-zinc-700',
                        )}
                      >
                        {o.tone === 'good' && <CheckCircle2 className="h-4 w-4" />}
                        {o.tone === 'bad' && <PhoneOff className="h-4 w-4" />}
                        {o.label}
                      </p>
                    );
                  })()}
                </div>
              </div>

              <p className="mb-5 rounded-lg border border-zinc-100 bg-white p-3 text-sm leading-relaxed text-zinc-700">
                <strong className="font-medium text-zinc-900">Reading:</strong>{' '}
                {scoreNarrative(drawerResult.qa_score)}
              </p>

              {/* Per-dim scores */}
              {Object.keys(drawerResult.per_dim_scores).length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Dimension scores
                  </p>
                  <ul className="space-y-2">
                    {Object.entries(drawerResult.per_dim_scores).map(([dim, val]) => (
                      <li key={dim} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 text-xs capitalize text-zinc-700">
                          {dim.replace(/_/g, ' ')}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={cn(
                              'h-full',
                              val >= 8 && 'bg-emerald-500',
                              val >= 5 && val < 8 && 'bg-amber-400',
                              val < 5 && 'bg-rose-500',
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, (val / 10) * 100))}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-xs text-zinc-600">
                          {val.toFixed(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Failure modes */}
              {drawerResult.failure_modes.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    What broke
                  </p>
                  <ul className="space-y-1">
                    {drawerResult.failure_modes.map((mode) => (
                      <li
                        key={mode}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-800"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {mode.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transcript */}
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Transcript
                </p>
                <pre className="whitespace-pre-wrap rounded-lg border border-zinc-100 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-700">
                  {drawerResult.transcript || 'No transcript captured.'}
                </pre>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default StressTestPanel;
