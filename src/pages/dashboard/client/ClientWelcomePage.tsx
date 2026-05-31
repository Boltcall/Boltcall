/**
 * ClientWelcomePage — Boltcall Agency OS · Client Portal · Phase E · /client/welcome
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 * First-visit experience for a newly-onboarded agency client.
 *
 * Layout (top → bottom, single column, calm):
 *   1. WelcomeVideo hero — personalized founder-clone voice greeting, plays on
 *      first mount. Audio is auto-played (browser permitting); the transcript
 *      is always visible below so the message lands even without sound.
 *   2. BuildProgressTimeline — 6-stage build status. Derived from the home
 *      payload's client metadata fields.
 *   3. PhoneNumberReveal — the auto-provisioned Retell number, tap-to-call.
 *   4. IntakeScheduler — inline Cal.com iframe. Fires onBookingConfirmed which
 *      redirects to /client once the slot is locked.
 *
 * Data:
 *   - GET /.netlify/functions/agency-client-home  → HomePayload (stage detection
 *     + phone number). We do NOT call agency-client-welcome-video here; that is
 *     WelcomeVideo's own responsibility (it polls itself).
 *
 * Auto-redirect: if intake is already done (intake_done_at present), we push
 * the client to /client immediately so they never see the welcome screen twice.
 *
 * Design rules:
 *   - One screen, one focal action: scheduling the intake.
 *   - No robot icons, no bubble UI, no bouncing loaders.
 *   - Every skeleton copy reads like a person, not a spinner.
 *   - The founder is invisible — "your strategist", "our team".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { authedFetch } from '../../../lib/authedFetch';
import WelcomeVideo from '../../../components/client/WelcomeVideo';
import BuildProgressTimeline, {
  type BuildProgressInputs,
} from '../../../components/client/BuildProgressTimeline';
import PhoneNumberReveal from '../../../components/client/PhoneNumberReveal';
import IntakeScheduler from '../../../components/client/IntakeScheduler';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Subset of the agency-client-home payload we care about on the welcome screen.
 * The full ClientHomePage type lives in ClientHomePage.tsx — we keep ours
 * minimal so the welcome page stays thin and independent.
 */
interface WelcomeHomePayload {
  hero: {
    agent_online: boolean;
    agent_phone_number: string | null;
    today_pipeline_value_usd: number;
    today_bookings: number;
    today_calls: number;
  };
  client_meta: {
    client_id: string;
    business_name: string | null;
    sku: string;
    signed_up_at: string;
    intake_scheduled_at: string | null;
    intake_done_at: string | null;
    agent_drafted_at: string | null;
    agent_live_at: string | null;
    meta_campaign_launched_at: string | null;
    first_call_received_at: string | null;
    scheduler_url: string | null;
  };
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: WelcomeHomePayload }
  | { kind: 'error'; message: string };

const HOME_ENDPOINT = '/.netlify/functions/agency-client-home';

// ─── Component ────────────────────────────────────────────────────────────────

const ClientWelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  // ── Data load ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const res = await authedFetch(HOME_ENDPOINT);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const json = (() => {
          try {
            return JSON.parse(text) as { error?: string };
          } catch {
            return {} as { error?: string };
          }
        })();
        // If the server says there's no client at all, bail gracefully.
        setState({
          kind: 'error',
          message: json.error || `Could not load your portal (${res.status}).`,
        });
        return;
      }

      const raw = (await res.json()) as {
        hero: WelcomeHomePayload['hero'];
        // The home endpoint exposes client_meta on the agency-client-home
        // response when the caller has the "new client" flag set. Until
        // the backend explicitly includes it we fall back to safe defaults.
        client_meta?: WelcomeHomePayload['client_meta'];
      };

      // Build a WelcomeHomePayload from whatever the server returned.
      // client_meta may or may not be present depending on server version —
      // we default gracefully so the page never hard-crashes.
      const payload: WelcomeHomePayload = {
        hero: raw.hero,
        client_meta: raw.client_meta ?? {
          client_id: '',
          business_name: null,
          sku: '',
          signed_up_at: new Date().toISOString(),
          intake_scheduled_at: null,
          intake_done_at: null,
          agent_drafted_at: null,
          agent_live_at: null,
          meta_campaign_launched_at: null,
          first_call_received_at: null,
          scheduler_url: null,
        },
      };

      // Auto-redirect: if intake is already done, the client has no business
      // on the welcome screen — push them to the main portal.
      if (payload.client_meta.intake_done_at) {
        navigate('/client', { replace: true });
        return;
      }

      setState({ kind: 'ready', data: payload });
    } catch (err) {
      setState({
        kind: 'error',
        message: 'We could not connect. Please refresh in a moment.',
      });
      console.error('[ClientWelcomePage] load failed', err);
    }
  }, [navigate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ── Booking confirmation — advance to /client ─────────────────────────────
  const handleBookingConfirmed = useCallback(
    (_payload: { source: 'cal_com'; raw: unknown }) => {
      // Give the iframe a breath before navigating so the Cal.com confirmation
      // screen doesn't vanish mid-animation.
      setTimeout(() => navigate('/client', { replace: true }), 1200);
    },
    [navigate],
  );

  // ── Derive BuildProgressInputs from payload ───────────────────────────────
  const buildProgressInputs = (meta: WelcomeHomePayload['client_meta']): BuildProgressInputs => ({
    sku: meta.sku,
    signed_up_at: meta.signed_up_at,
    intake_scheduled_at: meta.intake_scheduled_at,
    intake_done_at: meta.intake_done_at,
    agent_drafted_at: meta.agent_drafted_at,
    agent_live_at: meta.agent_live_at,
    meta_campaign_launched_at: meta.meta_campaign_launched_at,
    first_call_received_at: meta.first_call_received_at,
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  // Loading skeleton — copy reads like a person, not a spinner.
  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md text-center">
          <p className="text-base font-medium text-zinc-800">
            Pulling up your portal…
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Your strategist has everything ready. Just a second.
          </p>
        </div>
      </div>
    );
  }

  // Error state — calm, action-paired.
  if (state.kind === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-zinc-800">{state.message}</p>
          <button
            type="button"
            onClick={() => {
              setState({ kind: 'loading' });
              void loadData();
            }}
            className="mt-4 inline-flex items-center rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Try again
          </button>
          <p className="mt-4 text-xs text-zinc-400">
            If this persists, reach out to{' '}
            <a
              href="mailto:team@boltcall.org"
              className="font-medium text-blue-700 hover:underline"
            >
              team@boltcall.org
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  // Ready — compose the four components in a calm, single-column layout.
  const { hero, client_meta } = state.data;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/*
       * Narrow, centered column. The welcome page is intentionally not
       * full-width — a 720px column feels like a letter, not a dashboard.
       * Breathing room is part of the "20-person team" illusion.
       */}
      <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10">

        {/* ── 1. Welcome Video hero ─────────────────────────────────── */}
        {client_meta.client_id ? (
          <WelcomeVideo clientId={client_meta.client_id} />
        ) : (
          /*
           * Fallback when client_id is absent (server not yet returning
           * client_meta). Render the timeline + scheduler so the page is
           * still useful — the video is a nice-to-have, not a gate.
           */
          <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-8 text-center text-white/60">
            <p className="text-sm">
              Your welcome is being prepared. Check back in a moment.
            </p>
          </div>
        )}

        {/* ── 2. Build Progress Timeline ────────────────────────────── */}
        <BuildProgressTimeline
          inputs={buildProgressInputs(client_meta)}
          className="mt-6"
        />

        {/*
         * ── 3. Phone Number Reveal ──────────────────────────────────
         * Only render when we have something useful to show. If the agent
         * is online we show the live number; otherwise we fall through to
         * the "reserving" pending state (PhoneNumberReveal handles null).
         */}
        <PhoneNumberReveal
          phoneNumber={hero.agent_phone_number}
          reservingMessage="Your number is being reserved — it will appear here within the hour."
          className="mt-6"
        />

        {/*
         * ── 4. Intake Scheduler ─────────────────────────────────────
         * This is the only call-to-action on the page. Everything above
         * it builds context and trust; this is the moment we ask for
         * something. Keep it at the bottom so it doesn't compete with
         * the video.
         */}
        <div className="mt-8">
          {/*
           * Soft section header — keeps the page scannable without making
           * the scheduler feel like a form.
           */}
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Next step
          </p>
          <p className="mb-4 text-sm text-zinc-700">
            Pick a 20-minute slot and your strategist will run the call.
            That is all you need to do today.
          </p>
          <IntakeScheduler
            schedulerUrl={client_meta.scheduler_url}
            onBookingConfirmed={handleBookingConfirmed}
            fallbackContactEmail="team@boltcall.org"
          />
        </div>

      </div>
    </div>
  );
};

export default ClientWelcomePage;
