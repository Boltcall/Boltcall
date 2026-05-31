/**
 * VideoBriefPlayer — monthly narrated strategy video player.
 *
 * If a video URL is present, renders an HTML5 video player with poster.
 * If not, renders a "Coming next month" placeholder explaining the cadence.
 * Design principle #4: even the placeholder narrates what will be there
 * ("Your account strategist drops the May review on the 2nd…").
 */

interface Props {
  videoUrl: string | null;
  posterUrl?: string | null;
  title?: string;
  /** When videoUrl is null, the placeholder is shown. */
  status: 'available' | 'coming_next_month';
  /** Optional ISO date for the next expected video. */
  expectedAt?: string | null;
}

export default function VideoBriefPlayer({
  videoUrl,
  posterUrl,
  title,
  status,
  expectedAt,
}: Props) {
  if (status === 'coming_next_month' || !videoUrl) {
    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="relative aspect-video w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4l10 6-10 6V4z" />
              </svg>
            </div>
            <p className="text-sm font-semibold">Your monthly strategy video lands on the 2nd</p>
            <p className="mt-1 max-w-md text-xs text-white/70">
              Two to three minutes — your account strategist walks through the month, names the
              three biggest unlocks, and recommends two experiments for next month with
              predicted ROI.
            </p>
            {expectedAt && (
              <p className="mt-3 inline-flex items-center rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wide text-white/80">
                Next drop · {formatExpected(expectedAt)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      {title && (
        <div className="border-b border-zinc-100 bg-zinc-50/60 px-4 py-2">
          <p className="text-xs font-semibold text-zinc-800">{title}</p>
        </div>
      )}
      <div className="aspect-video w-full bg-black">
        <video
          src={videoUrl}
          poster={posterUrl ?? undefined}
          controls
          preload="metadata"
          className="h-full w-full"
        >
          Sorry, your browser doesn't support embedded videos.
        </video>
      </div>
    </div>
  );
}

function formatExpected(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
