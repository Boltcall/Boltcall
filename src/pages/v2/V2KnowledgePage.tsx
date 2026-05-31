import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Sparkles,
  AlertCircle,
  ArrowRight,
  X,
  RefreshCw,
  ChevronRight,
  PenLine,
  CheckCircle2,
} from 'lucide-react';
import { authedFetch } from '../../lib/authedFetch';

/**
 * V2KnowledgePage — /v2/knowledge
 *
 * Narrative-first knowledge management for the V2 dashboard.
 *
 * Layout (top → bottom):
 *   1. Header + AI-curated category strip (server clusters titles into 4-8 topical buckets).
 *   2. "Missing FAQs from your calls" panel — server-detected gaps from last 30 days
 *      of transcripts. Each gap → question + frequency + sample snippet + "Draft an answer".
 *   3. Searchable read-only list of existing KB entries. Click → side drawer with full body.
 *
 * Empty / cold-start: nudges the user to run the website KB import flow
 * (ai-extract-kb.ts) which already exists in V1.
 *
 * NOTE: This page is mounted by the merge agent inside the /v2 route block in
 * AppRoutes.tsx, wrapped in <V2OptInGate>. It assumes DashboardLayoutV2's
 * <Outlet /> container provides max-width + padding, so it emits plain
 * content — no shell, no wrapper, no max-width container.
 */

interface KBEntry {
  id: string;
  title: string;
  body_preview: string;
  category: string;
  updated_at: string | null;
}

interface CategoryLabel {
  label: string;
  count: number;
}

interface ListResponse {
  entries: KBEntry[];
  categories: CategoryLabel[];
  total: number;
  cold_start: boolean;
}

interface Gap {
  question: string;
  frequency: number;
  sample_call_id: string;
  sample_snippet: string;
}

interface GapsResponse {
  gaps: Gap[];
  cold_start: boolean;
  window_days: number;
  calls_analyzed: number;
}

interface Draft {
  draft_title: string;
  draft_body: string;
  suggested_category: string;
}

const ALL_CATEGORIES = '__all__';

const V2KnowledgePage: React.FC = () => {
  const [list, setList] = useState<ListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [gaps, setGaps] = useState<GapsResponse | null>(null);
  const [gapsLoading, setGapsLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const [search, setSearch] = useState('');

  const [drawerEntry, setDrawerEntry] = useState<KBEntry | null>(null);

  const [draftingFor, setDraftingFor] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});

  // ── Data loads ─────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await authedFetch('/.netlify/functions/saas-v2-knowledge-list');
      if (!res.ok) throw new Error(`Failed to load knowledge base (${res.status})`);
      const data: ListResponse = await res.json();
      setList(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadGaps = useCallback(async () => {
    setGapsLoading(true);
    try {
      const res = await authedFetch('/.netlify/functions/saas-v2-knowledge-detect-gaps');
      if (!res.ok) {
        setGaps({ gaps: [], cold_start: true, window_days: 30, calls_analyzed: 0 });
        return;
      }
      const data: GapsResponse = await res.json();
      setGaps(data);
    } catch {
      setGaps({ gaps: [], cold_start: true, window_days: 30, calls_analyzed: 0 });
    } finally {
      setGapsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
    void loadGaps();
  }, [loadList, loadGaps]);

  // ── Filtering ──────────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    if (!list) return [];
    const q = search.trim().toLowerCase();
    return list.entries.filter(e => {
      if (selectedCategory !== ALL_CATEGORIES && e.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.body_preview.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    });
  }, [list, selectedCategory, search]);

  // ── Draft handler ──────────────────────────────────────────────────────
  const draftAnswer = useCallback(async (gap: Gap) => {
    setDraftingFor(gap.question);
    setDraftErrors(prev => {
      const next = { ...prev };
      delete next[gap.question];
      return next;
    });
    try {
      const res = await authedFetch('/.netlify/functions/saas-v2-knowledge-draft-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: gap.question,
          workspace_context: gap.sample_snippet,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Draft failed (${res.status})`);
      }
      const data: Draft = await res.json();
      setDrafts(prev => ({ ...prev, [gap.question]: data }));
    } catch (err) {
      setDraftErrors(prev => ({
        ...prev,
        [gap.question]: err instanceof Error ? err.message : 'Draft failed',
      }));
    } finally {
      setDraftingFor(null);
    }
  }, []);

  const totalEntries = list?.total ?? 0;
  const isEmpty = !listLoading && !listError && totalEntries === 0;

  // ── Narrative slot (computed client-side; calm, specific, < 60 words) ──
  const narrative = useMemo(() => {
    if (listLoading) return 'Loading your knowledge base…';
    if (isEmpty) {
      return 'No knowledge base entries yet. Run the website scan below to seed your agent with services, FAQs, and policies in under a minute.';
    }
    if (!list) return '';
    const catCount = list.categories.length;
    const gapCount = gaps?.gaps.length ?? 0;
    const gapClause = gapCount > 0
      ? ` ${gapCount} caller question${gapCount === 1 ? '' : 's'} from the last 30 days isn't covered yet — drafting answers below takes a click.`
      : ' No fresh gaps detected in the last 30 days — your agent is well-equipped.';
    return `Your agent draws from ${totalEntries} entries grouped into ${catCount} topical area${catCount === 1 ? '' : 's'}.${gapClause}`;
  }, [list, gaps, listLoading, isEmpty, totalEntries]);

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-slate-500" />
            Knowledge
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
            {narrative}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadList();
            void loadGaps();
          }}
          className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </header>

      {/* ── Categories strip (AI-curated) ──────────────────────────── */}
      {!listLoading && list && list.categories.length > 0 && (
        <section aria-label="Knowledge categories">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
              AI-curated topics
            </h2>
            <span className="text-xs text-slate-400">
              {list.categories.length} buckets · clustered from your titles
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory(ALL_CATEGORIES)}
              className={[
                'px-3 py-1.5 text-sm rounded-full border transition-colors',
                selectedCategory === ALL_CATEGORIES
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300',
              ].join(' ')}
            >
              All <span className="ml-1.5 text-xs opacity-70">{totalEntries}</span>
            </button>
            {list.categories.map(cat => {
              const active = selectedCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setSelectedCategory(active ? ALL_CATEGORIES : cat.label)}
                  className={[
                    'px-3 py-1.5 text-sm rounded-full border transition-colors',
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300',
                  ].join(' ')}
                >
                  {cat.label}
                  <span className="ml-1.5 text-xs opacity-70">{cat.count}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Gaps panel ─────────────────────────────────────────────── */}
      <section
        aria-label="Missing FAQs from your calls"
        className="rounded-xl border border-amber-200 bg-amber-50/40"
      >
        <div className="px-5 py-4 border-b border-amber-200/60 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <h2 className="text-sm font-semibold text-slate-900">
            Missing FAQs from your calls
          </h2>
          {gaps && !gapsLoading && (
            <span className="ml-auto text-xs text-slate-500">
              {gaps.calls_analyzed} calls · last {gaps.window_days} days
            </span>
          )}
        </div>

        <div className="p-5">
          {gapsLoading && (
            <p className="text-sm text-slate-500">Scanning recent transcripts…</p>
          )}

          {!gapsLoading && gaps?.cold_start && (
            <div className="flex items-start gap-3 text-sm text-slate-600">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Unlock at 5 calls</p>
                <p className="mt-1">
                  We need a handful of recent calls before we can surface knowledge gaps.
                  Keep your agent answering — this panel fills in automatically.
                </p>
              </div>
            </div>
          )}

          {!gapsLoading && gaps && !gaps.cold_start && gaps.gaps.length === 0 && (
            <div className="flex items-start gap-3 text-sm text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p>
                No gaps detected in the last {gaps.window_days} days. Your agent is
                handling caller questions well.
              </p>
            </div>
          )}

          {!gapsLoading && gaps && gaps.gaps.length > 0 && (
            <ul className="space-y-3">
              {gaps.gaps.map(gap => {
                const draft = drafts[gap.question];
                const err = draftErrors[gap.question];
                const isDrafting = draftingFor === gap.question;
                return (
                  <li
                    key={gap.question}
                    className="rounded-lg border border-amber-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {gap.question}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Asked {gap.frequency}× ·{' '}
                          <span className="italic">"{gap.sample_snippet}"</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void draftAnswer(gap)}
                        disabled={isDrafting}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        {isDrafting ? 'Drafting…' : draft ? 'Re-draft' : 'Draft an answer'}
                      </button>
                    </div>

                    {err && (
                      <p className="mt-3 text-xs text-rose-600">
                        {err}
                      </p>
                    )}

                    {draft && (
                      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50/70 p-3">
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                          Suggested draft · {draft.suggested_category}
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {draft.draft_title}
                        </p>
                        <p className="mt-1 text-sm text-slate-700 leading-relaxed">
                          {draft.draft_body}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-400">
                          Not yet saved — review and add to your knowledge base when ready.
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* ── Search + existing entries ──────────────────────────────── */}
      <section aria-label="Knowledge base entries">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900">
            Your knowledge base
            {selectedCategory !== ALL_CATEGORIES && (
              <span className="ml-2 text-xs font-normal text-slate-500">
                · filtered to <span className="font-medium">{selectedCategory}</span>
              </span>
            )}
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search titles, content, categories…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300"
            />
          </div>
        </div>

        {listLoading && (
          <p className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-lg">
            Loading entries…
          </p>
        )}

        {listError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-700">
            <p className="font-medium">Couldn't load your knowledge base.</p>
            <p className="mt-1 text-xs">{listError}</p>
          </div>
        )}

        {isEmpty && <EmptyState />}

        {!isEmpty && !listLoading && !listError && filteredEntries.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            No entries match your filter.
          </div>
        )}

        {filteredEntries.length > 0 && (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
            {filteredEntries.map(entry => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setDrawerEntry(entry)}
                  className="w-full text-left px-4 py-3.5 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition-colors flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                        {entry.category}
                      </span>
                      {entry.updated_at && (
                        <span className="text-xs text-slate-400">
                          · {formatRelative(entry.updated_at)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 truncate">
                      {entry.title}
                    </h3>
                    {entry.body_preview && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                        {entry.body_preview}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Drawer for full entry view ─────────────────────────────── */}
      {drawerEntry && (
        <EntryDrawer entry={drawerEntry} onClose={() => setDrawerEntry(null)} />
      )}
    </div>
  );
};

// ── Empty state ─────────────────────────────────────────────────────────
const EmptyState: React.FC = () => (
  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center">
    <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
    <h3 className="text-base font-semibold text-slate-900">
      Your knowledge base is empty
    </h3>
    <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
      Point Boltcall at your website and we'll extract services, FAQs, and policies
      automatically. Takes about 30 seconds.
    </p>
    <Link
      to="/dashboard/knowledge-base?import=website"
      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
    >
      Import from your website
      <ArrowRight className="w-3.5 h-3.5" />
    </Link>
  </div>
);

// ── Drawer ──────────────────────────────────────────────────────────────
const EntryDrawer: React.FC<{ entry: KBEntry; onClose: () => void }> = ({ entry, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="flex-1 bg-slate-900/30 backdrop-blur-[1px]"
      />
      <aside className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">
              {entry.category}
            </div>
            <h2 className="mt-1 text-base font-semibold text-slate-900 break-words">
              {entry.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 -mr-1 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {entry.body_preview || <span className="text-slate-400 italic">No preview available.</span>}
          </p>
        </div>

        <footer className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between flex-shrink-0">
          <span>{entry.updated_at ? `Updated ${formatRelative(entry.updated_at)}` : 'No timestamp'}</span>
          <Link
            to="/dashboard/knowledge-base"
            className="text-slate-700 hover:text-slate-900 font-medium inline-flex items-center gap-1"
          >
            Edit in full editor
            <ArrowRight className="w-3 h-3" />
          </Link>
        </footer>
      </aside>
    </div>
  );
};

// ── Helpers ─────────────────────────────────────────────────────────────
function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'today';
  if (diff < 2 * day) return 'yesterday';
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}w ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default V2KnowledgePage;
