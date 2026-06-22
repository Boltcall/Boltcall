import { useEffect } from 'react';

import OverviewMetricCard from '@/components/dashboard/OverviewMetricCard';
import ProgressMetricCard, { type SeriesPoint } from '@/components/ui/progress-metric-card';

const leadsSeries: SeriesPoint[] = [
  { value: 28, date: 'May 01' },
  { value: 34, date: 'May 04' },
  { value: 31, date: 'May 07' },
  { value: 42, date: 'May 10' },
  { value: 51, date: 'May 13' },
  { value: 48, date: 'May 16' },
  { value: 64, date: 'May 19' },
];

const bookedSeries: SeriesPoint[] = [
  { value: 6, date: 'May 01' },
  { value: 8, date: 'May 04' },
  { value: 7, date: 'May 07' },
  { value: 10, date: 'May 10' },
  { value: 12, date: 'May 13' },
  { value: 11, date: 'May 16' },
  { value: 15, date: 'May 19' },
];

const responseSeries: SeriesPoint[] = [
  { value: 71, date: 'May 01' },
  { value: 76, date: 'May 04' },
  { value: 79, date: 'May 07' },
  { value: 82, date: 'May 10' },
  { value: 84, date: 'May 13' },
  { value: 88, date: 'May 16' },
  { value: 91, date: 'May 19' },
];

export default function MetricCardsDemoPage() {
  useEffect(() => {
    document.title = 'Metric Cards Demo - Boltcall';
  }, []);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f3ea_0%,#fffdfa_45%,#f3efe6_100%)] text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Prototype
          </p>
          <h1 className="mt-4 font-serif text-4xl tracking-tight md:text-5xl">
            Smaller metric card containers
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            ponytail: preview the updated card density with fake dashboard data before we ship more styling changes.
          </p>
        </div>

        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold tracking-tight">Dashboard cards</h2>
            <p className="mt-2 text-sm text-slate-500">
              These are the V1 and V2 style wrappers using mock data and one empty state.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <OverviewMetricCard
              label="Total Leads"
              value={128}
              period="Past 7 days"
              badge="18.4%"
              badgeTone="positive"
              chartData={leadsSeries.map((point) => point.value)}
              caption="up from last week"
            />
            <OverviewMetricCard
              label="Booked Jobs"
              value={32}
              period="Past 7 days"
              badge="11.7%"
              badgeTone="positive"
              chartData={bookedSeries.map((point) => point.value)}
              caption="appointments confirmed"
            />
            <OverviewMetricCard
              label="Response Rate"
              value="91%"
              period="Past 7 days"
              badge="7.2%"
              badgeTone="positive"
              chartData={responseSeries.map((point) => point.value)}
              caption="leads answered inside 5 min"
            />
            <OverviewMetricCard
              label="Total Leads"
              value={0}
              period="Past 7 days"
              badgeTone="neutral"
              chartData={[]}
            />
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold tracking-tight">Base component sizes</h2>
            <p className="mt-2 text-sm text-slate-500">
              Direct previews of the reusable card in `sm`, `md`, and `lg`.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[0.85fr_1fr_1.1fr]">
            <ProgressMetricCard
              title="Leads Captured"
              total={128}
              percent="18.4%"
              delta="+16"
              deltaLabel="vs last week"
              data={leadsSeries}
              size="sm"
              accent="blue"
            />
            <ProgressMetricCard
              title="Appointments Booked"
              total={32}
              percent="11.7%"
              delta="+4"
              deltaLabel="vs last week"
              data={bookedSeries}
              size="md"
              accent="emerald"
            />
            <ProgressMetricCard
              title="Contact Rate"
              total="91%"
              percent="7.2%"
              delta="+6%"
              deltaLabel="last 7 days"
              data={responseSeries}
              size="lg"
              accent="emerald"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
