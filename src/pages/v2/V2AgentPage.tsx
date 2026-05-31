/**
 * V2 Agent Page — /v2/agent
 *
 * Renders inside the /v2 shell (DashboardLayoutV2 + V2OptInGate are provided
 * by the parent Route in AppRoutes.tsx). This file owns only the page content.
 *
 * Layout (top → bottom):
 *   1. Narrative card: "Your agent in plain language" — 3-4 sentence summary
 *      from Sonnet (saas-v2-agent-summary), plus capabilities + gaps lists.
 *   2. Stress-test panel: 6 hardcoded scenarios with per-scenario Run buttons.
 *      Results show pass/fail + AI verdict (red border on fail).
 *   3. Suggested-edits drawer trigger button. Right-side Drawer lists 3-5
 *      Sonnet-suggested improvements with severity pills and a stubbed Apply
 *      button per suggestion.
 *   4. Raw Retell prompt — collapsed by default behind "Show raw prompt".
 *
 * All data flows through JWT-scoped Netlify functions:
 *   GET  /.netlify/functions/saas-v2-agent-summary
 *   POST /.netlify/functions/saas-v2-agent-stress-test  body: { scenario_id }
 *   GET  /.netlify/functions/saas-v2-agent-suggest-edits
 *
 * Cold-start guard: when summary.cold_start === true (no prompt configured),
 * we render a single "Set up your agent first" placeholder for the whole page.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Lightbulb,
  Loader2,
  RefreshCcw,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';

import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';

// ─────────────────────────────────────────────────────────────────────────
//   Types
// ─────────────────────────────────────────────────────────────────────────

type SummaryResponse = {
  plain_language_summary: string;
  capabilities: string[];
  gaps: string[];
  raw_prompt: string;
  prompt_version: number;
  agent_id: string | null;
  last_synced_at: string | null;
  cold_start: boolean;
};

type ScenarioId =
  | 'caller-emergency'
  | 'caller-pricing-objection'
  | 'caller-wants-callback'
  | 'caller-asks-about-insurance'
  | 'caller-difficult-spelling'
  | 'caller-wrong-number';

type Rubric = {
  empathy: number;
  accuracy: number;
  intent_capture: number;
  next_step: number;
};

type StressTestResult = {
  scenario_id: ScenarioId;
  scenario_label: string;
  passed: boolean;
  verdict: string;
  rubric: Rubric;
  hypothetical_response: string;
  ran_at: string;
};

type Suggestion = {
  title: string;
  body: string;
  why: string;
  severity: 'low' | 'medium' | 'high';
};

type SuggestionsResponse = {
  suggestions: Suggestion[];
  used_qa_failures: boolean;
  failed_call_count: number;
  cold_start: boolean;
};

// ─────────────────────────────────────────────────────────────────────────
//   Static scenario catalog (mirrors saas-v2-agent-stress-test.ts SCENARIOS)
// ─────────────────────────────────────────────────────────────────────────

const SCENARIO_CATALOG: Array<{ id: ScenarioId; label: string; blurb: string }> = [
  {
    id: 'caller-emergency',
    label: 'Emergency caller',
    blurb: 'Stressed caller, needs help tonight. Does the agent escalate or recite hours?',
  },
  {
    id: 'caller-pricing-objection',
    label: 'Pricing objection',
    blurb: 'Caller says a competitor is half the price. Does the agent collapse or restate value?',
  },
  {
    id: 'caller-wants-callback',
    label: 'Wants a callback',
    blurb: "Can't talk now. Does the agent capture a callback number + time window?",
  },
  {
    id: 'caller-asks-about-insurance',
    label: 'Insurance question',
    blurb: 'Caller asks if BlueCross is accepted. Does the agent fabricate, or escalate honestly?',
  },
  {
    id: 'caller-difficult-spelling',
    label: 'Hard-to-spell name',
    blurb: 'Caller has an unusual name. Does the agent read back the spelling?',
  },
  {
    id: 'caller-wrong-number',
    label: 'Wrong number',
    blurb: 'Caller misdialed. Does the agent let them go gracefully or try to convert?',
  },
];

// ─────────────────────────────────────────────────────────────────────────
//   Tiny helpers
// ─────────────────────────────────────────────────────────────────────────

function severityClasses(sev: Suggestion['severity']): string {
  switch (sev) {
    case 'high':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'medium':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'low':
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function rubricBadge(score: number): string {
  if (score >= 8) return 'bg-emerald-100 text-emerald-800';
  if (score >= 6) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
}

// ─────────────────────────────────────────────────────────────────────────
//   Page
// ─────────────────────────────────────────────────────────────────────────

const V2AgentPage: React.FC = () => {
  // ── Narrative summary ────────────────────────────────────────────────
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // ── Raw prompt collapse ──────────────────────────────────────────────
  const [showRawPrompt, setShowRawPrompt] = useState(false);

  // ── Stress test state — per-scenario ─────────────────────────────────
  const [stressResults, setStressResults] = useState<
    Partial<Record<ScenarioId, StressTestResult>>
  >({});
  const [stressRunning, setStressRunning] = useState<
    Partial<Record<ScenarioId, boolean>>
  >({});
  const [stressErrors, setStressErrors] = useState<
    Partial<Record<ScenarioId, string>>
  >({});

  // ── Suggestions drawer ───────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(
    new Set(),
  );

  // ── Fetch summary on mount ───────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-agent-summary`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`summary failed (${res.status}): ${txt.slice(0, 160)}`);
      }
      const json = (await res.json()) as SummaryResponse;
      setSummary(json);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  // ── Run a single scenario ────────────────────────────────────────────
  const runScenario = useCallback(async (scenarioId: ScenarioId) => {
    setStressRunning((s) => ({ ...s, [scenarioId]: true }));
    setStressErrors((s) => ({ ...s, [scenarioId]: undefined }));
    try {
      const res = await authedFetch(
        `${FUNCTIONS_BASE}/saas-v2-agent-stress-test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario_id: scenarioId }),
        },
      );
      const json = (await res.json()) as StressTestResult | { error: string };
      if (!res.ok) {
        const msg =
          (json as { error?: string }).error || `request failed (${res.status})`;
        throw new Error(msg);
      }
      setStressResults((r) => ({ ...r, [scenarioId]: json as StressTestResult }));
    } catch (err) {
      setStressErrors((s) => ({
        ...s,
        [scenarioId]: err instanceof Error ? err.message : 'Run failed',
      }));
    } finally {
      setStressRunning((s) => ({ ...s, [scenarioId]: false }));
    }
  }, []);

  // ── Drawer: load suggestions on open ─────────────────────────────────
  const openDrawer = useCallback(async () => {
    setDrawerOpen(true);
    if (suggestions) return; // already loaded
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const res = await authedFetch(
        `${FUNCTIONS_BASE}/saas-v2-agent-suggest-edits`,
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`suggestions failed (${res.status}): ${txt.slice(0, 160)}`);
      }
      const json = (await res.json()) as SuggestionsResponse;
      setSuggestions(json);
    } catch (err) {
      setSuggestionsError(
        err instanceof Error ? err.message : 'Failed to load suggestions',
      );
    } finally {
      setSuggestionsLoading(false);
    }
  }, [suggestions]);

  const reloadSuggestions = useCallback(async () => {
    setSuggestions(null);
    setAppliedSuggestions(new Set());
    await openDrawer();
  }, [openDrawer]);

  // ── Derived ──────────────────────────────────────────────────────────
  const passCount = useMemo(
    () => Object.values(stressResults).filter((r) => r?.passed).length,
    [stressResults],
  );
  const failCount = useMemo(
    () => Object.values(stressResults).filter((r) => r && !r.passed).length,
    [stressResults],
  );

  // ── Cold-start short-circuit ─────────────────────────────────────────
  if (!summaryLoading && summary?.cold_start) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Set up your agent first
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Your agent doesn&apos;t have a prompt yet. Once you configure one in
            the agent setup, this page will show a plain-language summary,
            stress tests, and suggested improvements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── 1. Narrative card ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h1 className="text-2xl font-semibold text-slate-900">Agent</h1>
          <button
            type="button"
            onClick={() => void loadSummary()}
            disabled={summaryLoading}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
            title="Refresh summary"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${summaryLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Sparkles className="w-3.5 h-3.5" />
            Your agent in plain language
          </div>

          {summaryLoading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading your agent&apos;s prompt…
            </div>
          )}

          {summaryError && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {summaryError}
            </div>
          )}

          {summary && !summaryLoading && (
            <>
              <p className="text-base leading-relaxed text-slate-800 mb-5">
                {summary.plain_language_summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                    What it does
                  </div>
                  {summary.capabilities.length > 0 ? (
                    <ul className="space-y-1.5">
                      {summary.capabilities.map((cap, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-1 flex-shrink-0" />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">
                      No specific capabilities detected.
                    </p>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
                    What&apos;s missing
                  </div>
                  {summary.gaps.length > 0 ? (
                    <ul className="space-y-1.5">
                      {summary.gaps.map((gap, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-1 flex-shrink-0" />
                          <span>{gap}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">
                      No obvious gaps detected.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── 2. Stress test panel ──────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Stress test</h2>
          {(passCount > 0 || failCount > 0) && (
            <div className="text-xs text-slate-500">
              <span className="text-emerald-700 font-medium">{passCount} passed</span>
              {failCount > 0 && (
                <>
                  {' · '}
                  <span className="text-rose-700 font-medium">{failCount} failed</span>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Six hardcoded scenarios that catch common agent failure modes. Run
          each one to see how your agent would handle it.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SCENARIO_CATALOG.map((scenario) => {
            const result = stressResults[scenario.id];
            const running = !!stressRunning[scenario.id];
            const error = stressErrors[scenario.id];

            const borderClass = result
              ? result.passed
                ? 'border-emerald-200'
                : 'border-rose-200'
              : 'border-slate-200';

            return (
              <div
                key={scenario.id}
                className={`bg-white border ${borderClass} rounded-xl p-4 flex flex-col gap-3`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">
                      {scenario.label}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {scenario.blurb}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void runScenario(scenario.id)}
                    disabled={running || summary?.cold_start}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {running ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Running…
                      </>
                    ) : result ? (
                      <>
                        <RefreshCcw className="w-3 h-3" />
                        Re-run
                      </>
                    ) : (
                      'Run'
                    )}
                  </button>
                </div>

                {error && (
                  <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1.5">
                    {error}
                  </div>
                )}

                {result && (
                  <div className="border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      {result.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          result.passed ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {result.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>

                    {result.verdict && (
                      <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                        {result.verdict}
                      </p>
                    )}

                    {/* Rubric strip */}
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      {(['empathy', 'accuracy', 'intent_capture', 'next_step'] as const).map(
                        (dim) => (
                          <div
                            key={dim}
                            className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-center"
                          >
                            <div className="text-[10px] uppercase tracking-wide text-slate-500">
                              {dim.replace('_', ' ')}
                            </div>
                            <div
                              className={`mt-0.5 inline-block px-1.5 rounded text-xs font-semibold ${rubricBadge(
                                result.rubric[dim],
                              )}`}
                            >
                              {result.rubric[dim].toFixed(0)}
                            </div>
                          </div>
                        ),
                      )}
                    </div>

                    {result.hypothetical_response && (
                      <details className="text-xs text-slate-600">
                        <summary className="cursor-pointer text-slate-500 hover:text-slate-900">
                          See predicted agent response
                        </summary>
                        <div className="mt-2 bg-slate-50 border border-slate-200 rounded p-2 italic">
                          {result.hypothetical_response}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. Suggested edits button ────────────────────────────────── */}
      <section>
        <button
          type="button"
          onClick={() => void openDrawer()}
          disabled={summary?.cold_start}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-900 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Show suggested prompt edits
        </button>
      </section>

      {/* ── 4. Raw prompt (collapsed) ─────────────────────────────────── */}
      <section>
        <button
          type="button"
          onClick={() => setShowRawPrompt((v) => !v)}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          {showRawPrompt ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          <Code2 className="w-3.5 h-3.5" />
          {showRawPrompt ? 'Hide raw prompt' : 'Show raw prompt'}
          {summary?.prompt_version ? (
            <span className="text-slate-400">· v{summary.prompt_version}</span>
          ) : null}
        </button>

        {showRawPrompt && summary && (
          <div className="mt-3 bg-slate-950 text-slate-200 rounded-xl p-4 overflow-auto max-h-96">
            <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono">
              {summary.raw_prompt || '(no prompt configured)'}
            </pre>
          </div>
        )}
      </section>

      {/* ── Suggestions drawer ────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Suggested prompt edits"
        >
          {/* Backdrop */}
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex-1 bg-slate-900/40"
            aria-label="Close suggestions"
          />

          {/* Right panel */}
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Suggested prompt edits
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-900"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {suggestionsLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Looking for improvements…
                </div>
              )}

              {suggestionsError && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                  {suggestionsError}
                </div>
              )}

              {suggestions && !suggestionsLoading && (
                <>
                  {suggestions.used_qa_failures ? (
                    <p className="text-xs text-slate-500 mb-3">
                      Grounded in {suggestions.failed_call_count} recent failed
                      call{suggestions.failed_call_count === 1 ? '' : 's'}.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mb-3">
                      No recent failed calls — these are based on gaps in your
                      current prompt.
                    </p>
                  )}

                  {suggestions.suggestions.length === 0 ? (
                    <div className="text-sm text-slate-500 italic">
                      No suggestions right now. Your prompt looks solid.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {suggestions.suggestions.map((s, i) => {
                        const applied = appliedSuggestions.has(i);
                        return (
                          <li
                            key={i}
                            className={`border rounded-lg p-3 ${severityClasses(
                              s.severity,
                            )}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="text-sm font-semibold text-slate-900">
                                {s.title}
                              </div>
                              <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-white border border-current/20">
                                {s.severity}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 mb-2 leading-relaxed">
                              {s.body}
                            </p>
                            <p className="text-xs text-slate-600 italic mb-2 leading-relaxed">
                              Why: {s.why}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setAppliedSuggestions((prev) => {
                                  const next = new Set(prev);
                                  next.add(i);
                                  return next;
                                })
                              }
                              disabled={applied}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-default"
                              title={
                                applied
                                  ? 'Marked as applied (write-back coming soon)'
                                  : 'Apply suggestion (stub — does not write back yet)'
                              }
                            >
                              {applied ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Marked
                                </>
                              ) : (
                                'Apply'
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => void reloadSuggestions()}
                disabled={suggestionsLoading}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                <RefreshCcw className={`w-3 h-3 ${suggestionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default V2AgentPage;
