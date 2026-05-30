/**
 * LiveCreativeGrid — currently running ad creatives with live CPL/CTR + AI commentary.
 *
 * Each tile shows:
 *  - The creative image
 *  - Headline + first line of primary text
 *  - Live KPIs (impressions, leads, CTR, CPL) with vertical-median comparison
 *  - One-line AI commentary written by the backend (design principle #4: every
 *    number paired with a narrative).
 *
 * Empty state explicitly names what's happening ("Your first creatives will
 * appear here within 48 hours…") — never a blank grid.
 */

export interface LiveCreative {
  ad_id: string;
  image_url: string;
  headline: string;
  primary_text: string;
  angle: string;
  impressions: number;
  ctr: number;
  cpl_usd: number;
  leads: number;
  shipped_at: string;
  ai_commentary: string;
  vertical_median_cpl_usd: number | null;
  vertical_median_ctr: number | null;
  source_artifact_id: string;
}

interface Props {
  creatives: LiveCreative[];
}

export default function LiveCreativeGrid({ creatives }: Props) {
  if (creatives.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-zinc-700">
          Your first creatives will appear here within 48 hours of go-live.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Your creative team is queuing the first batch right now. Each variant gets
          a predicted CTR / CPL and a strategist's note before it reaches you.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {creatives.map((c) => (
        <LiveCreativeCard key={c.ad_id} creative={c} />
      ))}
    </div>
  );
}

function LiveCreativeCard({ creative }: { creative: LiveCreative }) {
  const performanceState = derivePerformanceState(creative);
  const cplStr = creative.cpl_usd > 0 ? `$${creative.cpl_usd.toFixed(2)}` : '—';
  const ctrStr = creative.ctr > 0 ? `${(creative.ctr * 100).toFixed(2)}%` : '—';

  return (
    <article className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="relative aspect-square w-full bg-zinc-100">
        {creative.image_url ? (
          <img
            src={creative.image_url}
            alt={creative.headline}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            (no preview)
          </div>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <PerformanceBadge state={performanceState} />
          <span className="inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
            {creative.angle}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">
          {creative.headline || '(no headline)'}
        </h3>
        {creative.primary_text && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-600">
            {creative.primary_text}
          </p>
        )}

        <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-zinc-100 pt-3 text-center">
          <Stat label="Impr." value={fmtNum(creative.impressions)} />
          <Stat label="Leads" value={fmtNum(creative.leads)} />
          <Stat label="CTR" value={ctrStr} />
          <Stat label="CPL" value={cplStr} />
        </dl>

        <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-xs italic text-zinc-700">
          {creative.ai_commentary}
        </p>

        <p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-400">
          Live since {formatDate(creative.shipped_at)}
        </p>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="text-sm font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}

type PerformanceState = 'leading' | 'steady' | 'watching' | 'unknown';

function PerformanceBadge({ state }: { state: PerformanceState }) {
  const map: Record<PerformanceState, { label: string; classes: string }> = {
    leading: { label: 'Leading', classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    steady: { label: 'Steady', classes: 'bg-sky-100 text-sky-800 border-sky-200' },
    watching: { label: 'Watching', classes: 'bg-amber-100 text-amber-900 border-amber-200' },
    unknown: { label: 'New', classes: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  };
  const { label, classes } = map[state];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classes}`}
    >
      {label}
    </span>
  );
}

function derivePerformanceState(creative: LiveCreative): PerformanceState {
  if (creative.impressions < 100) return 'unknown';
  if (creative.vertical_median_cpl_usd && creative.cpl_usd > 0) {
    const pct = (creative.vertical_median_cpl_usd - creative.cpl_usd) / creative.vertical_median_cpl_usd;
    if (pct >= 0.15) return 'leading';
    if (pct <= -0.25) return 'watching';
  }
  if (creative.vertical_median_ctr && creative.ctr > 0) {
    const pct = (creative.ctr - creative.vertical_median_ctr) / creative.vertical_median_ctr;
    if (pct >= 0.20) return 'leading';
    if (pct <= -0.25) return 'watching';
  }
  return 'steady';
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
