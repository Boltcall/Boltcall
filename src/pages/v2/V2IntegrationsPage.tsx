/**
 * V2IntegrationsPage — /v2/integrations
 *
 * V2 Integrations surface. Three slabs:
 *   1. "Next moves" — AI-suggested 2-3 integrations the workspace should
 *      connect next, based on vertical + recent usage gaps.
 *   2. Catalog — all available integrations grouped by category. Connected
 *      ones show a "Connected" pill + Manage; available ones show Connect.
 *   3. Embedded connect panel — Connect/Manage open the shared
 *      IntegrationHubTab (components/integrations) inline, inside the V2
 *      shell. V2 users never navigate into the V1 dashboard.
 *
 * Server endpoints:
 *   GET /.netlify/functions/saas-v2-integrations         → catalog + state
 *   GET /.netlify/functions/saas-v2-integration-suggest  → AI suggestions
 *
 * V1 invariant: this file is brand new under src/pages/v2/. It never imports
 * from src/pages/dashboard/ or src/components/dashboard/. The merge agent
 * registers the route inside the existing <Route path="/v2"> parent in
 * AppRoutes.tsx — DashboardLayoutV2 + V2OptInGate wrap is applied there.
 *
 * Cold-start guard: per the build rules, workspaces with <30 calls / <14
 * days of history get a "Unlock at 30 calls" placeholder INSIDE the
 * suggestions card only. The catalog itself always renders — connecting an
 * integration is useful from day zero.
 */
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plug,
  Check,
  Sparkles,
  ArrowRight,
  X,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card-shadcn';
import { Button } from '../../components/ui/button-shadcn';

// Shared connect/manage flows (OAuth, API keys, webhooks) — lives in the
// neutral components/integrations tree and renders inside the V2 shell, so
// connecting never drops the user into V1 chrome. Lazy: only loads when the
// user actually opens the connect panel.
const IntegrationHubTab = React.lazy(
  () => import('../../components/integrations/IntegrationHubTab'),
);

// ─── Types ─────────────────────────────────────────────────────────────────

type IntegrationCategory =
  | 'calendar'
  | 'phone'
  | 'crm'
  | 'marketing'
  | 'reviews';

interface IntegrationRow {
  id: string;
  name: string;
  category: IntegrationCategory;
  connected: boolean;
  description: string;
  manage_href?: string;
  connect_href?: string;
}

interface IntegrationsResponse {
  integrations: IntegrationRow[];
  cold_start?: boolean;
}

type Urgency = 'low' | 'medium' | 'high';

interface SuggestionRow {
  integration_id: string;
  headline: string;
  why: string;
  urgency: Urgency;
}

interface SuggestResponse {
  suggestions: SuggestionRow[];
  cold_start?: boolean;
}

// ─── Category metadata ─────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  calendar: 'Calendar',
  phone: 'Phone',
  crm: 'CRM',
  marketing: 'Marketing',
  reviews: 'Reviews',
};

// Render order — calendar + phone first because they're highest-leverage
// for speed-to-lead workspaces.
const CATEGORY_ORDER: IntegrationCategory[] = [
  'calendar',
  'phone',
  'crm',
  'marketing',
  'reviews',
];

const URGENCY_STYLES: Record<Urgency, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-zinc-50 text-zinc-600 border-zinc-200',
};

// ─── Page ──────────────────────────────────────────────────────────────────

const V2IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationRow[] | null>(
    null,
  );
  const [integrationsErr, setIntegrationsErr] = useState<string | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(true);

  const [suggestions, setSuggestions] = useState<SuggestionRow[] | null>(null);
  const [suggestionsColdStart, setSuggestionsColdStart] = useState(false);
  const [suggestionsErr, setSuggestionsErr] = useState<string | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  // Locally-dismissed suggestion integration_ids so the user can dismiss
  // without a round-trip. Dismissals are session-local (refresh re-shows).
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  // ── Load catalog ─────────────────────────────────────────────────────────
  const loadIntegrations = useCallback(async () => {
    setIntegrationsLoading(true);
    setIntegrationsErr(null);
    try {
      const res = await authedFetch(
        `${FUNCTIONS_BASE}/saas-v2-integrations`,
        { method: 'GET' },
      );
      if (!res.ok) {
        throw new Error(`Failed to load integrations (${res.status})`);
      }
      const data = (await res.json()) as IntegrationsResponse;
      setIntegrations(
        Array.isArray(data.integrations) ? data.integrations : [],
      );
    } catch (err) {
      setIntegrationsErr(
        err instanceof Error ? err.message : 'Unknown error',
      );
      setIntegrations([]);
    } finally {
      setIntegrationsLoading(false);
    }
  }, []);

  // ── Load AI suggestions ──────────────────────────────────────────────────
  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    setSuggestionsErr(null);
    try {
      const res = await authedFetch(
        `${FUNCTIONS_BASE}/saas-v2-integration-suggest`,
        { method: 'GET' },
      );
      if (!res.ok) {
        throw new Error(`Failed to load suggestions (${res.status})`);
      }
      const data = (await res.json()) as SuggestResponse;
      setSuggestionsColdStart(Boolean(data.cold_start));
      setSuggestions(
        Array.isArray(data.suggestions) ? data.suggestions : [],
      );
    } catch (err) {
      setSuggestionsErr(
        err instanceof Error ? err.message : 'Unknown error',
      );
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIntegrations();
    void loadSuggestions();
  }, [loadIntegrations, loadSuggestions]);

  // ── Group catalog by category ────────────────────────────────────────────
  const byCategory = useMemo(() => {
    const grouped: Record<IntegrationCategory, IntegrationRow[]> = {
      calendar: [],
      phone: [],
      crm: [],
      marketing: [],
      reviews: [],
    };
    for (const row of integrations ?? []) {
      if (grouped[row.category]) grouped[row.category].push(row);
    }
    // Stable sort: connected first within each category, then alpha.
    for (const cat of CATEGORY_ORDER) {
      grouped[cat].sort((a, b) => {
        if (a.connected !== b.connected) return a.connected ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    return grouped;
  }, [integrations]);

  const visibleSuggestions = useMemo(() => {
    return (suggestions ?? []).filter((s) => !dismissed.has(s.integration_id));
  }, [suggestions, dismissed]);

  // ── Connect / manage — embedded hub panel ────────────────────────────────
  // The full connect flows (OAuth, API keys, webhooks) render right here in
  // the V2 shell via the shared IntegrationHubTab — never in the V1 dashboard.
  const [hubOpen, setHubOpen] = useState(false);
  const hubRef = useRef<HTMLDivElement>(null);

  const openHub = useCallback(() => {
    setHubOpen(true);
    window.setTimeout(() => {
      hubRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, []);

  const handleConnect = (_row: { id: string; connect_href?: string }) => {
    openHub();
  };

  const handleManage = (_row: { id: string; manage_href?: string }) => {
    openHub();
  };

  const handleDismiss = (integration_id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(integration_id);
      return next;
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8">
      {/* Page header — narrative slot before any grid (V2 convention) */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider">
          <Plug className="w-3.5 h-3.5" />
          Integrations
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-text-main">
          Connect the tools you already use
        </h1>
        <p className="text-sm md:text-base text-zinc-600 max-w-2xl">
          Every connected tool turns into another lever for speed-to-lead.
          Boltcall watches for gaps and tells you what to wire up next.
        </p>
      </header>

      {/* ── Suggested next ──────────────────────────────────────────────── */}
      <section aria-labelledby="suggested-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2
            id="suggested-heading"
            className="flex items-center gap-2 text-sm font-semibold text-text-main"
          >
            <Sparkles className="w-4 h-4 text-brand-blue" />
            AI-suggested next
          </h2>
          {suggestionsLoading && (
            <span className="text-xs text-zinc-400 inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking…
            </span>
          )}
        </div>

        <Card className="border-zinc-200">
          <CardContent className="p-4 md:p-6">
            {suggestionsLoading && !suggestions && (
              <div className="flex items-center gap-2 text-sm text-zinc-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Reading your workspace…
              </div>
            )}

            {suggestionsErr && (
              <div className="flex items-start gap-2 text-sm text-red-600 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{suggestionsErr}</span>
              </div>
            )}

            {!suggestionsLoading && suggestionsColdStart && (
              <div className="flex flex-col items-start gap-2 py-2">
                <div className="text-sm font-medium text-text-main">
                  Unlock at 30 calls
                </div>
                <p className="text-sm text-zinc-600 max-w-lg">
                  Suggestions read your recent activity to spot the highest-leverage
                  tool to wire up next. Once you&apos;ve had 30+ calls (or 14 days of
                  activity), we&apos;ll surface the moves with the biggest impact.
                </p>
              </div>
            )}

            {!suggestionsLoading &&
              !suggestionsColdStart &&
              !suggestionsErr &&
              visibleSuggestions.length === 0 && (
                <p className="text-sm text-zinc-500 py-2">
                  Nothing urgent. Your stack looks well-connected.
                </p>
              )}

            {!suggestionsLoading && visibleSuggestions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {visibleSuggestions.slice(0, 3).map((s) => {
                  const target = (integrations ?? []).find(
                    (i) => i.id === s.integration_id,
                  );
                  return (
                    <div
                      key={s.integration_id}
                      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${URGENCY_STYLES[s.urgency] ?? URGENCY_STYLES.low}`}
                        >
                          {s.urgency}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDismiss(s.integration_id)}
                          className="text-zinc-400 hover:text-zinc-600 -mt-0.5 -mr-1 p-1 rounded"
                          aria-label="Dismiss suggestion"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <h3 className="text-sm font-semibold text-text-main leading-snug">
                          {s.headline}
                        </h3>
                        <p className="text-xs text-zinc-600 leading-relaxed">
                          {s.why}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-auto pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleConnect({ id: s.integration_id, connect_href: target?.connect_href })}
                          className="text-xs h-8"
                        >
                          Connect
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleDismiss(s.integration_id)}
                          className="text-xs text-zinc-500 hover:text-zinc-700 px-2 py-1"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Catalog ────────────────────────────────────────────────────── */}
      <section aria-labelledby="catalog-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2
            id="catalog-heading"
            className="text-sm font-semibold text-text-main"
          >
            All integrations
          </h2>
          {integrationsLoading && (
            <span className="text-xs text-zinc-400 inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading…
            </span>
          )}
        </div>

        {integrationsErr && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{integrationsErr}</span>
            </CardContent>
          </Card>
        )}

        {!integrationsLoading &&
          !integrationsErr &&
          (integrations?.length ?? 0) === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-zinc-500">
                No integrations are configured for your account yet.
              </CardContent>
            </Card>
          )}

        {CATEGORY_ORDER.map((cat) => {
          const rows = byCategory[cat];
          if (!rows || rows.length === 0) return null;
          return (
            <div key={cat} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-1">
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rows.map((row) => (
                  <IntegrationCard
                    key={row.id}
                    row={row}
                    onConnect={() => handleConnect(row)}
                    onManage={() => handleManage(row)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Embedded connect & manage panel ──────────────────────────────── */}
      <section ref={hubRef} className="flex flex-col gap-3 scroll-mt-6">
        {hubOpen ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-main">
                Connect &amp; manage
              </h2>
              <button
                type="button"
                onClick={() => setHubOpen(false)}
                className="text-xs text-zinc-500 hover:text-zinc-900"
              >
                Hide
              </button>
            </div>
            <Suspense
              fallback={
                <div className="flex items-center gap-2 text-sm text-zinc-500 py-6 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading connect flows…
                </div>
              }
            >
              <IntegrationHubTab />
            </Suspense>
          </>
        ) : (
          <button
            type="button"
            onClick={openHub}
            className="inline-flex items-center gap-2 self-start text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            <Plug className="w-4 h-4" />
            Open connect &amp; manage panel
          </button>
        )}
      </section>
    </div>
  );
};

// ─── IntegrationCard ───────────────────────────────────────────────────────

interface IntegrationCardProps {
  row: IntegrationRow;
  onConnect: () => void;
  onManage: () => void;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  row,
  onConnect,
  onManage,
}) => {
  return (
    <Card className="border-zinc-200 hover:border-zinc-300 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <CardTitle className="text-sm font-semibold text-text-main truncate">
              {row.name}
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              {CATEGORY_LABELS[row.category]}
            </CardDescription>
          </div>
          {row.connected && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex-shrink-0">
              <Check className="w-3 h-3" />
              Connected
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3 min-h-[3rem]">
          {row.description}
        </p>
        <div className="flex items-center gap-2">
          {row.connected ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onManage}
              className="text-xs h-8"
            >
              Manage
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onConnect}
              className="text-xs h-8"
            >
              Connect
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default V2IntegrationsPage;
