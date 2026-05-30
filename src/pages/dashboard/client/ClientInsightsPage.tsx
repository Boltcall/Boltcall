/**
 * ClientInsightsPage — /client/insights
 *
 * Narrative analytics surface. Every chart is paired with a one-line AI
 * reading underneath. No naked numbers. Sections:
 *   1. Pipeline forecast (next 7 days)
 *   2. Vertical benchmark (you vs same-vertical peers)
 *   3. Anomaly timeline (last 30 days + resolution status)
 *   4. Trends (sparklines for response time, booking rate, lead volume,
 *      and ad CPL if the client is on Bolt System)
 *
 * Voice rules: see design principle #3 — the founder is invisible. We say
 * "our team", "your strategist", "we". Never "Noam", never "Claude".
 *
 * Loads ALL data in a single request to /agency-client-insights so the
 * page reads as one coherent strategist memo, not a dashboard.
 */
import React, { useEffect, useState } from 'react';

import { authedFetch } from '../../../lib/authedFetch';
import PipelineForecast from '../../../components/client/PipelineForecast';
import VerticalBenchmark from '../../../components/client/VerticalBenchmark';
import AnomalyTimeline, {
  AnomalyEntry,
} from '../../../components/client/AnomalyTimeline';
import NarratedChart from '../../../components/client/NarratedChart';

interface InsightsResponse {
  client: {
    id: string;
    business_name: string | null;
    vertical: string;
    has_ads: boolean;
  };
  pipeline_forecast: {
    history_days: number;
    horizon_days: number;
    history: Array<{
      date: string;
      pipeline_value_usd: number;
      bookings: number;
    }>;
    forecast: Array<{
      date: string;
      pipeline_value_usd: number;
      lower_80: number;
      upper_80: number;
    }>;
    slope_per_day: number;
  };
  vertical_benchmark: {
    vertical: string;
    source: 'agency_knowledge' | 'computed_default';
    metrics: Array<{
      metric: string;
      you: number;
      vertical_median: number;
      top_quartile: number;
      unit: string;
      percentile_rank: number;
    }>;
  };
  anomaly_timeline: AnomalyEntry[];
  trends: Array<{
    metric: string;
    unit: string;
    days: string[];
    values: number[];
    current: number;
    prior: number;
    delta_pct: number;
  }>;
  narrative_readings: {
    pipeline_forecast: string;
    vertical_benchmark: string;
    anomaly_timeline: string;
    trends: Record<string, string>;
  };
}

const TREND_TITLE: Record<string, string> = {
  response_time: 'Response time',
  booking_rate: 'Booking rate',
  lead_volume: 'Lead volume',
  ad_cpl: 'Ad cost per lead',
};

const TREND_HIGHER_IS_BETTER: Record<string, boolean> = {
  response_time: false,
  booking_rate: true,
  lead_volume: true,
  ad_cpl: false,
};

const ClientInsightsPage: React.FC = () => {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await authedFetch('/.netlify/functions/agency-client-insights');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as InsightsResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(
            'We could not load your insights right now. Our team has been notified.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-6 lg:px-8">
        <div className="h-7 w-72 animate-pulse rounded bg-zinc-100" />
        <div className="mt-3 h-4 w-96 animate-pulse rounded bg-zinc-100" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />
          <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-6 lg:px-8">
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error || 'Insights are unavailable right now.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8">
      {/* Header — frames the page as a strategist memo, not a dashboard */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Your strategist's read
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
          {data.client.business_name
            ? `${data.client.business_name} · Insights`
            : 'Insights'}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          A weekly look at where your pipeline is heading, how you stack
          against other {prettyVertical(data.client.vertical)}, and what
          we've been quietly fixing in the background.
        </p>
      </div>

      {/* Section 1 — Pipeline forecast (always full width, headline metric) */}
      <PipelineForecast
        history={data.pipeline_forecast.history}
        forecast={data.pipeline_forecast.forecast}
        reading={data.narrative_readings.pipeline_forecast}
      />

      {/* Section 2 — Trends sparklines (2 or 3 across) */}
      <section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.trends.map((t) => (
            <NarratedChart
              key={t.metric}
              title={TREND_TITLE[t.metric] || t.metric}
              unit={t.unit}
              days={t.days}
              values={t.values}
              current={t.current}
              prior={t.prior}
              delta_pct={t.delta_pct}
              higherIsBetter={TREND_HIGHER_IS_BETTER[t.metric] ?? true}
              reading={
                data.narrative_readings.trends[t.metric] ||
                `Tracking ${t.delta_pct >= 0 ? 'up' : 'down'} ${Math.abs(
                  t.delta_pct,
                ).toFixed(1)}% vs prior week.`
              }
            />
          ))}
        </div>
      </section>

      {/* Section 3 — Vertical benchmark + Anomaly timeline side-by-side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <VerticalBenchmark
          vertical={data.vertical_benchmark.vertical}
          metrics={data.vertical_benchmark.metrics}
          source={data.vertical_benchmark.source}
          reading={data.narrative_readings.vertical_benchmark}
        />
        <AnomalyTimeline
          entries={data.anomaly_timeline}
          reading={data.narrative_readings.anomaly_timeline}
        />
      </div>

      <p className="pt-4 text-center text-[11px] italic text-zinc-400">
        Generated for you. The numbers refresh hourly; the narrative is rewritten
        each morning so it reflects how the week is actually shaping up.
      </p>
    </div>
  );
};

function prettyVertical(v: string): string {
  if (!v || v === 'other') return 'service businesses';
  return v.replace(/_/g, ' ') + (v.endsWith('s') ? '' : 's');
}

export default ClientInsightsPage;
