/**
 * ClientReportsPage — /client/reports
 * ====================================
 *
 * The report archive. Two zones:
 *   1. Monthly narrated video brief (top — biggest, most premium feeling)
 *   2. Searchable list of Friday weekly reports (auto-generated PDFs)
 *
 * Picking a report opens it in an inline PDF viewer below the list. A
 * "Share with partner" button on each row generates a 30-day signed URL via
 * agency-client-report-share-link.
 *
 * Design principles in play:
 *  - #6 One screen at a time — the inline PDF viewer scrolls below the list,
 *    we don't shove the user to a separate route.
 *  - #4 Every entry has a one-line narrative summary, not just a date.
 *  - #9 Sharing is one tap. The reader audit trail (who clicked the link, when
 *    it was generated) lives in agency_artifacts.content.payload.share_links.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { authedFetch } from '../../../lib/authedFetch';
import ReportArchive, { type ReportEntry } from '../../../components/client/ReportArchive';
import VideoBriefPlayer from '../../../components/client/VideoBriefPlayer';

interface ReportsResponse {
  reports: ReportEntry[];
  monthly_video_status: 'available' | 'coming_next_month';
}

export default function ClientReportsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setState('loading');
    setError(null);
    try {
      const res = await authedFetch('/.netlify/functions/agency-client-reports', { method: 'GET' });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `Request failed (HTTP ${res.status})`);
      }
      const body = (await res.json()) as ReportsResponse;
      setData(body);
      // Auto-select most recent on first load.
      if (body.reports.length > 0 && !selectedId) {
        setSelectedId(body.reports[0].artifact_id);
      }
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      setState('error');
    }
    // selectedId intentionally NOT a dep — we only want to set it once on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const selectedReport = useMemo(() => {
    if (!data || !selectedId) return null;
    return data.reports.find((r) => r.artifact_id === selectedId) ?? null;
  }, [data, selectedId]);

  // Pick the most recent shipped optimization_brief for the video player.
  const latestVideoBrief = useMemo(() => {
    if (!data) return null;
    return data.reports.find((r) => r.type === 'optimization_brief' && r.video_url) ?? null;
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Report archive</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Your reports</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Every Friday narrative report and monthly strategy video your team has shipped.
          Searchable, shareable, exportable.
        </p>
      </header>

      {state === 'loading' && (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          Loading your reports…
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold text-red-900">We couldn't load your reports.</p>
          <p className="mt-1 text-xs text-red-800">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {state === 'ready' && data && (
        <>
          <section>
            <SectionHeading
              title="This month's strategy video"
              hint="Your account strategist walks through the month's wins and recommends what to test next."
            />
            <VideoBriefPlayer
              videoUrl={latestVideoBrief?.video_url ?? null}
              posterUrl={null}
              title={latestVideoBrief?.title}
              status={data.monthly_video_status}
              expectedAt={nextMonthFirst()}
            />
          </section>

          <section>
            <SectionHeading
              title="Weekly reports"
              count={data.reports.length}
              hint="Friday auto-generated PDFs — opening narrative, KPIs with captions, next-week ask."
            />
            <ReportArchive
              reports={data.reports}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </section>

          {selectedReport && (
            <section>
              <SectionHeading
                title="Inline preview"
                hint={selectedReport.title}
              />
              <PdfInlineViewer report={selectedReport} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  count,
  hint,
}: {
  title: string;
  count?: number;
  hint: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold text-zinc-900">
        {title}
        {count != null && (
          <span className="ml-2 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
            {count}
          </span>
        )}
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function PdfInlineViewer({ report }: { report: ReportEntry }) {
  if (!report.pdf_url) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
        This report has no inline preview yet. Try "Open in new tab" on the row above.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <iframe
        src={report.pdf_url}
        title={report.title}
        className="h-[80vh] w-full"
        style={{ border: 0 }}
      />
    </div>
  );
}

function nextMonthFirst(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}
