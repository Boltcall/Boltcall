/**
 * WelcomeVideo — the personalized cloned-voice greeting on /client/welcome.
 *
 * UX contract (per the customer-UX design principles):
 *   - The video IS the moment the client believes the 20-person team illusion.
 *   - First-paint must feel intentional: skeleton with progress copy that
 *     reads like a strategist taking 30 seconds to assemble the briefing.
 *   - No "loading…" or animated ellipsis. No bubble UI. No robot.
 *   - We never block the page on this — if generation fails, we surface the
 *     script as readable text with the founder's signature so the moment is
 *     still personal even when TTS is degraded.
 *
 * Implementation notes:
 *   - Calls GET /api/agency-client-welcome-video?client_id=<uuid> on mount.
 *   - Idempotent — the server returns the cached artifact when one exists.
 *   - When status === 'generating' on first call, the client polls every 4s
 *     up to 30s before falling back to the script-only view.
 *   - The actual media is mp3 today (audio over cover) — when the ffmpeg
 *     pipeline lands the same endpoint will return mp4 and this component
 *     transparently swaps to <video>.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

import { authedFetch } from '../../lib/authedFetch';
import { cn } from '../../lib/utils';

const ENDPOINT = '/.netlify/functions/agency-client-welcome-video';
const MAX_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 4_000;

interface WelcomeVideoApiResponse {
  status: 'ready' | 'generating' | 'error';
  video_url: string | null;
  duration_sec: number | null;
  script: string;
  business_name: string | null;
  vertical: string | null;
  cached: boolean;
  artifact_id: string | null;
  error?: string;
}

interface WelcomeVideoProps {
  clientId: string;
  /**
   * Optional cover-image URL — rendered behind the audio player as a still
   * background. Falls back to a soft gradient if absent.
   */
  coverUrl?: string;
}

type LoadState =
  | { kind: 'loading'; startedAt: number }
  | { kind: 'ready'; data: WelcomeVideoApiResponse }
  | { kind: 'error'; message: string; script?: string };

const WelcomeVideo: React.FC<WelcomeVideoProps> = ({ clientId, coverUrl }) => {
  const [state, setState] = useState<LoadState>({ kind: 'loading', startedAt: Date.now() });
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const startedAt = Date.now();
    setState({ kind: 'loading', startedAt });

    const fetchOnce = async (): Promise<WelcomeVideoApiResponse | null> => {
      try {
        const res = await authedFetch(`${ENDPOINT}?client_id=${encodeURIComponent(clientId)}`);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Welcome video request failed (${res.status}): ${text.slice(0, 200)}`);
        }
        return (await res.json()) as WelcomeVideoApiResponse;
      } catch (err) {
        console.warn('[WelcomeVideo] fetch failed', err);
        return null;
      }
    };

    const run = async () => {
      const first = await fetchOnce();
      if (!aliveRef.current) return;
      if (!first) {
        setState({ kind: 'error', message: 'We could not load your welcome right now.' });
        return;
      }
      if (first.status === 'ready' && first.video_url) {
        setState({ kind: 'ready', data: first });
        return;
      }
      if (first.status === 'error') {
        setState({ kind: 'error', message: first.error || 'Welcome unavailable', script: first.script });
        return;
      }
      // Poll until we either get a ready response or hit MAX_WAIT_MS.
      while (aliveRef.current && Date.now() - startedAt < MAX_WAIT_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (!aliveRef.current) return;
        const next = await fetchOnce();
        if (!next) continue;
        if (next.status === 'ready' && next.video_url) {
          setState({ kind: 'ready', data: next });
          return;
        }
      }
      if (aliveRef.current) {
        // Graceful degrade: show script-only view.
        setState({
          kind: 'error',
          message: 'Your welcome is still being assembled. Here is the script the team prepared.',
          script: first.script,
        });
      }
    };

    void run();
    return () => {
      aliveRef.current = false;
    };
  }, [clientId]);

  // Auto-play once ready. Browsers block autoplay with sound — we attempt
  // play() and surface the button if the browser refuses.
  useEffect(() => {
    if (state.kind !== 'ready') return;
    const el = audioRef.current;
    if (!el) return;
    el.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [state]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const cover = (
    <div
      className="absolute inset-0"
      style={
        coverUrl
          ? { backgroundImage: `url(${coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : {
              background:
                'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 40%), linear-gradient(135deg, #0b1f3a 0%, #112b56 50%, #050b1a 100%)',
            }
      }
    />
  );

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 text-white shadow-lg">
      {/* 16:9 aspect frame */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        {cover}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Loading state */}
        {state.kind === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
              <Volume2 className="h-6 w-6 text-white/80" />
            </div>
            <p className="max-w-md text-center text-base text-white/90">
              Building your welcome from your business profile…
            </p>
            <p className="mt-1 max-w-md text-center text-xs text-white/50">
              Your strategist is recording it now. Usually under 30 seconds.
            </p>
          </div>
        )}

        {/* Ready state */}
        {state.kind === 'ready' && (
          <>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause welcome video' : 'Play welcome video'}
              className={cn(
                'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                'flex h-20 w-20 items-center justify-center rounded-full',
                'border border-white/30 bg-white/10 backdrop-blur-sm',
                'transition hover:scale-105 hover:bg-white/20',
              )}
            >
              {playing ? (
                <Pause className="h-9 w-9 text-white" />
              ) : (
                <Play className="ml-1 h-9 w-9 text-white" />
              )}
            </button>
            <audio
              ref={audioRef}
              src={state.data.video_url ?? undefined}
              preload="auto"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
          </>
        )}

        {/* Error / degraded state — script-only view, still personal */}
        {state.kind === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <p className="max-w-lg text-center text-sm text-white/80">{state.message}</p>
          </div>
        )}

        {/* Bottom caption — visible on all states once we have business_name */}
        {state.kind === 'ready' && state.data.business_name && (
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-xs uppercase tracking-widest text-white/60">A note from the team</p>
            <p className="text-sm text-white/90">Welcome, {state.data.business_name}</p>
          </div>
        )}
      </div>

      {/* Script transcript below — always visible so the message lands even without sound */}
      {(state.kind === 'ready' || state.kind === 'error') && (
        <div className="border-t border-zinc-800 bg-zinc-950/95 p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-white/40">Transcript</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
            {state.kind === 'ready' ? state.data.script : state.script || ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default WelcomeVideo;
