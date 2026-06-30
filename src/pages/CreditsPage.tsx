import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Coins, MessageSquare, Phone, Zap } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA from '../components/FinalCTA';
import { updateMetaDescription } from '../lib/utils';
import { SITE_DATE_MODIFIED } from '../lib/seoConstants';
import {
  TOKEN_COSTS,
  TOKEN_PLANS,
  tokensToMessages,
  tokensToMinutes,
  tokensToSms,
} from '../lib/tokens';

const TITLE = 'Boltcall Credits Explained: One Shared Pool Across Phone, SMS, and Website';
const DESCRIPTION =
  'How Boltcall credits work: one shared pool across phone, SMS, website chat, and AI follow-up. See the credit table and real conversion examples.';

const actionRows = [
  {
    label: 'Website chat message',
    credits: TOKEN_COSTS.ai_chat_message,
    detail: 'Every chat message pulls from the same shared pool.',
  },
  {
    label: 'SMS sent',
    credits: TOKEN_COSTS.sms_sent,
    detail: 'Texts use credits from the same balance as voice and chat.',
  },
  {
    label: 'AI phone minute',
    credits: TOKEN_COSTS.ai_voice_minute,
    detail: 'Longer call volume burns more of the shared pool.',
  },
  {
    label: 'Lead processed',
    credits: TOKEN_COSTS.lead_processed,
    detail: 'Automations still count against the same balance.',
  },
];

const planRows = [
  {
    name: 'Starter',
    credits: TOKEN_PLANS.starter.monthlyTokens,
  },
  {
    name: 'Pro',
    credits: TOKEN_PLANS.pro.monthlyTokens,
  },
  {
    name: 'Ultimate',
    credits: TOKEN_PLANS.ultimate.monthlyTokens,
  },
];

export default function CreditsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = TITLE;
    updateMetaDescription(DESCRIPTION);
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white pt-24">
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              <Coins className="h-3.5 w-3.5" />
              Credits System
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900 md:text-6xl">
              One shared credit pool across phone, SMS, website chat, and follow-up.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
              Boltcall does not split usage into separate phone, SMS, and website buckets. Your plan gives
              you one pool of credits. Spend it where the business needs it most.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 p-5">
              <Phone className="h-6 w-6 text-blue-600" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">Use it on phone</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                If you burn the whole pool on voice, that same pool is no longer available for SMS or website chat.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">Use it on SMS</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Texts pull from the exact same balance. No separate SMS wallet to manage.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5">
              <Zap className="h-6 w-6 text-blue-600" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">Use it on web leads</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Website chat, AI replies, and lead automations all come from that same shared pool.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr,1.2fr]">
            <div className="rounded-3xl border border-gray-200 p-6">
              <h2 className="text-2xl font-semibold text-gray-900">How spend works</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                The pool is collective. There is no "unused phone bucket" or "unused SMS bucket" carried separately.
              </p>
              <ul className="mt-6 space-y-4">
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <span className="text-sm leading-6 text-gray-700">
                    Use all your credits on phone and you will have nothing left for SMS, website chat, or AI follow-up until reset.
                  </span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <span className="text-sm leading-6 text-gray-700">
                    Use fewer call minutes and the leftover credits stay available for texts, chat, and automations.
                  </span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <span className="text-sm leading-6 text-gray-700">
                    The same balance keeps budgeting simple for owners: one number to track, not five different channel limits.
                  </span>
                </li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-5">
                <h2 className="text-2xl font-semibold text-gray-900">Credit table</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  These examples show both the action cost and what a full monthly pool could become if spent entirely in one channel.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Action
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                        Credits
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                        What It Means
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {actionRows.map((row) => (
                      <tr key={row.label}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.label}</td>
                        <td className="px-6 py-4 text-sm text-blue-700">{row.credits}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="overflow-hidden rounded-3xl border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-5">
              <h2 className="text-2xl font-semibold text-gray-900">What one monthly pool looks like</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Spend the full pool on one channel or mix it across channels. The credits stay collective either way.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Plan</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Monthly Credits</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">If All On Phone</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">If All On SMS</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">If All On Website Chat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {planRows.map((row) => (
                    <tr key={row.name}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.credits.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{tokensToMinutes(row.credits).toLocaleString()} minutes</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{tokensToSms(row.credits).toLocaleString()} SMS</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{tokensToMessages(row.credits).toLocaleString()} messages</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Enterprise</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Custom</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Custom</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Custom</td>
                    <td className="px-6 py-4 text-sm text-gray-700">Custom</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="rounded-3xl border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900">Simple rule to remember</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
              Boltcall credits are flexible, not siloed. That means one shared monthly pool across every metered feature.
              If your team needs more phone this month, spend more on phone. If next month needs more SMS and website chat,
              spend there instead.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                View Plans <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/book-a-call"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                Talk It Through
              </Link>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-gray-400">Updated {SITE_DATE_MODIFIED}</p>
          </div>
        </section>

        <FinalCTA
          headline="Want to see how many leads Boltcall could save?"
          description="See the math behind faster response, fewer missed jobs, and a cleaner follow-up system."
          buttonText="Run Your Revenue Audit"
          buttonHref="/ai-revenue-audit"
        />
      </main>
      <Footer />
    </>
  );
}
