/**
 * ReportArchive — searchable list of weekly + monthly reports.
 *
 * Each row shows the title, period, AI-written summary, share button, and
 * "Open report" which renders an inline PDF viewer in the parent page.
 * Design principle #4: summary is narrative, not a chart dump.
 */
import { useMemo, useState } from 'react';
import ShareableLinkGenerator from './ShareableLinkGenerator';

export interface ReportEntry {
  artifact_id: string;
  type: 'weekly_report' | 'optimization_brief';
  created_at: string;
  shipped_at: string | null;
  period_start: string | null;
  period_end: string | null;
  title: string;
  summary: string;
  pdf_url: string | null;
  video_url: string | null;
  predicted_open_rate: number | null;
  next_week_ask: string | null;
}

interface Props {
  reports: ReportEntry[];
  selectedId: string | null;
  onSelect: (artifactId: string) => void;
}

export default function ReportArchive({ reports, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'weekly' | 'monthly'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (filter === 'weekly' && r.type !== 'weekly_report') return false;
      if (filter === 'monthly' && r.type !== 'optimization_brief') return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        (r.next_week_ask?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [reports, query, filter]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <header className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, summary, or ask…"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div className="inline-flex rounded-md border border-zinc-200 p-0.5 text-xs">
          {(['all', 'weekly', 'monthly'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 capitalize ${
                filter === f
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-500">
          {reports.length === 0
            ? 'Your first weekly report lands Friday at 8am local. It will appear here automatically.'
            : 'No reports match your search.'}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {filtered.map((r) => (
            <ReportRow
              key={r.artifact_id}
              report={r}
              selected={r.artifact_id === selectedId}
              onSelect={() => onSelect(r.artifact_id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportRow({
  report,
  selected,
  onSelect,
}: {
  report: ReportEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const typeLabel = report.type === 'weekly_report' ? 'Weekly' : 'Monthly brief';

  return (
    <li className={selected ? 'bg-zinc-50' : ''}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              {typeLabel}
            </span>
            {report.shipped_at && (
              <span className="text-[11px] text-zinc-500">
                Shipped {formatDate(report.shipped_at)}
              </span>
            )}
            {report.predicted_open_rate != null && (
              <span className="inline-flex items-center text-[11px] text-zinc-500">
                Predicted open · {(report.predicted_open_rate * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-zinc-900">{report.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-zinc-600">{report.summary}</p>
          {report.next_week_ask && (
            <p className="mt-1 text-xs italic text-zinc-500">
              <span className="font-medium not-italic text-zinc-600">Next week's ask:</span>{' '}
              {report.next_week_ask}
            </p>
          )}
        </button>

        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          {report.pdf_url && (
            <a
              href={report.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-zinc-600 underline hover:text-zinc-900"
            >
              Open in new tab
            </a>
          )}
          <ShareableLinkGenerator artifactId={report.artifact_id} />
        </div>
      </div>
    </li>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}
