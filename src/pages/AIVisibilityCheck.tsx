import { AlertTriangle, CheckCircle2, RefreshCw, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import Header from '../components/Header';
import { authedFetch } from '../lib/authedFetch';
import { buildDailySeoHandoff, DEFAULT_ATP_TASKS, getTodayKey, type AtpTask } from '../lib/dailySeoWorkspace';
import { updateMetaDescription } from '../lib/utils';

interface ReviewResponse {
  date: string;
  run: null | {
    run_date: string;
    status: string;
    scorecard: string;
    warnings: string[];
    selected_action: Record<string, string>;
    updated_at: string;
  };
  atp: {
    entry_date: string;
    tasks: AtpTask[];
    last_saved_at: string | null;
    submitted_at: string | null;
  };
  weekly: null | {
    run_week_start: string;
    run_week_end: string;
    status: string;
    summary: string;
    warnings: string[];
    priority_queue: {
      page_fixes?: string[];
      content_candidates?: string[];
      citation_gaps?: string[];
    };
    updated_at: string;
  };
}

const DAILY_TOOL_MAP = [
  { tool: 'GSC + GA4', job: 'What moved', detail: 'Demand, engagement, key events, winners, losers, landing-page opportunity, and money-page movement.' },
  { tool: 'Clarity', job: 'Why users got stuck', detail: 'Dashboard insights, heatmaps, CTA misses, rage clicks, scroll depth, and 2-3 recordings only when needed.' },
  { tool: 'AnswerThePublic', job: 'What to write or answer next', detail: 'Tracked keywords, questions or ideas, AI Models wording, FAQ angles, ad hooks, and draft outlines rewritten into Boltcall voice.' },
];

const WEEKLY_QUEUE = [
  'Rank page fixes first from GSC, GA4 explorations, and repeated Clarity friction.',
  'Rank content candidates second from ATP questions, comparisons, prepositions, and AI Models after buyer-intent checks.',
  'Rank citation and AI-surface source gaps third, then clean up GA4 events and Clarity segments monthly.',
];

const AIVisibilityCheck: React.FC = () => {
  const [date, setDate] = useState(getTodayKey());
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [tasks, setTasks] = useState<AtpTask[]>(DEFAULT_ATP_TASKS);
  const [status, setStatus] = useState('Loading daily SEO run...');

  const loadReview = async (targetDate = date) => {
    setStatus('Loading daily SEO run...');
    const response = await authedFetch(`/.netlify/functions/daily-seo-aeo-review?date=${encodeURIComponent(targetDate)}`);
    if (!response.ok) throw new Error(`review:${response.status}`);
    const next = (await response.json()) as ReviewResponse;
    setReview(next);
    setTasks(next.atp.tasks?.length === 3 ? next.atp.tasks : DEFAULT_ATP_TASKS);
    setStatus(next.run ? 'Automatic daily SEO run loaded.' : 'No automatic run saved for this date yet.');
  };

  useEffect(() => {
    document.title = 'Daily SEO + AEO Review | Boltcall';
    updateMetaDescription('Review the automatic daily Boltcall SEO and AEO run powered by GSC, GA4, Clarity, and AnswerThePublic.');
    loadReview().catch(() => setStatus('Could not load the daily SEO run. Sign in and try again.'));
  }, []);

  const saveOverride = async () => {
    const response = await authedFetch('/.netlify/functions/daily-seo-atp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, tasks }),
    });
    if (!response.ok) {
      setStatus('Manual ATP override failed.');
      return;
    }
    setStatus('Manual ATP override saved.');
    await loadReview(date);
  };

  const warnings = review?.run?.warnings || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <GiveawayBar />
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <section className="grid gap-4 border-b border-slate-200 pb-6 lg:grid-cols-[1fr_auto]">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">SEO + AEO review</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Daily automation status, AnswerThePublic output, and the weekly review map for GSC, GA4, Clarity, and ATP.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => loadReview(date).catch(() => setStatus('Could not load that date.'))}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Load
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Run status
            </div>
            <p className="mt-2 text-2xl font-semibold">{review?.run?.status || 'Not run'}</p>
            <p className="mt-1 text-sm text-slate-500">{status}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Warnings
            </div>
            <p className="mt-2 text-2xl font-semibold">{warnings.length}</p>
            <p className="mt-1 text-sm text-slate-500">{warnings[0] || 'No warnings saved.'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-medium">Selected action</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {review?.run?.selected_action?.page || 'No page selected yet.'}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-medium">Weekly run</div>
            <p className="mt-2 text-2xl font-semibold">{review?.weekly?.status || 'Not run'}</p>
            <p className="mt-1 text-sm text-slate-500">
              {review?.weekly ? `${review.weekly.run_week_start} to ${review.weekly.run_week_end}` : 'No weekly queue saved yet.'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-medium">Top weekly page fix</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {review?.weekly?.priority_queue?.page_fixes?.[0] || 'No weekly page fix ranked yet.'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-medium">Top weekly content angle</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {review?.weekly?.priority_queue?.content_candidates?.[0] || 'No weekly content angle ranked yet.'}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Daily routine map</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {DAILY_TOOL_MAP.map((item) => (
                <div key={item.tool} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-950">{item.tool}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{item.job}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Weekly review output</h2>
            <div className="mt-4 space-y-3">
              {WEEKLY_QUEUE.map((item) => (
                <p key={item} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                  {item}
                </p>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">AnswerThePublic output</h2>
              <button
                type="button"
                onClick={saveOverride}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium"
              >
                <Save className="h-4 w-4" />
                Save override
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {tasks.map((task, index) => (
                <div key={task.id} className="space-y-2">
                  <textarea
                    value={task.prompt}
                    onChange={(event) => setTasks((current) => current.map((item, i) => i === index ? { ...item, prompt: event.target.value } : item))}
                    className="min-h-16 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={task.result}
                    onChange={(event) => setTasks((current) => current.map((item, i) => i === index ? { ...item, result: event.target.value } : item))}
                    className="min-h-36 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Automatic ATP result will appear here. Use this as fallback if the run failed."
                  />
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Scorecard</h2>
            <pre className="mt-4 max-h-[680px] overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
              {review?.run?.scorecard || buildDailySeoHandoff(tasks)}
            </pre>
          </article>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Weekly ranked queue</h2>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
              <div>
                <p className="font-medium text-slate-950">Page fixes</p>
                <div className="mt-2 space-y-2">
                  {(review?.weekly?.priority_queue?.page_fixes?.length ? review.weekly.priority_queue.page_fixes : ['No weekly page fixes saved.']).map((item) => (
                    <p key={item} className="rounded-md border border-slate-200 bg-slate-50 p-3">{item}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium text-slate-950">Content candidates</p>
                <div className="mt-2 space-y-2">
                  {(review?.weekly?.priority_queue?.content_candidates?.length ? review.weekly.priority_queue.content_candidates : ['No weekly content candidates saved.']).map((item) => (
                    <p key={item} className="rounded-md border border-slate-200 bg-slate-50 p-3">{item}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium text-slate-950">Citation gaps</p>
                <div className="mt-2 space-y-2">
                  {(review?.weekly?.priority_queue?.citation_gaps?.length ? review.weekly.priority_queue.citation_gaps : ['No weekly citation gaps saved.']).map((item) => (
                    <p key={item} className="rounded-md border border-slate-200 bg-slate-50 p-3">{item}</p>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Weekly summary</h2>
            <pre className="mt-4 max-h-[680px] overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-sm leading-6 text-slate-100">
              {review?.weekly?.summary || 'No weekly run saved yet.'}
            </pre>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AIVisibilityCheck;
