/**
 * TranscriptViewer — speaker-labelled, timestamped transcript with optional
 * click-to-seek into the call recording audio player.
 *
 * Design principle #8 — every claim auditable. The transcript IS the
 * receipt; the explanation panel above it points to specific moments.
 * Clicking a turn scrolls audio to that point (best-effort — depends on
 * having word-level timestamps from Retell).
 *
 * Layout note: this is rendered INSIDE the per-call drawer. Height is
 * constrained by the parent container; the transcript scrolls
 * independently while the QA panel stays pinned above the audio bar.
 */
import React, { useMemo, useRef, useState, useEffect } from 'react';

interface TranscriptTurn {
  role: string;
  content: string;
  timestamp_sec?: number;
}

interface TranscriptViewerProps {
  transcript: string;
  recording_url?: string;
}

/**
 * Parse Retell's flattened transcript ("role: content\nrole: content")
 * into an array of turns. Best-effort: if a line doesn't match
 * "<role>: <content>" we treat it as a continuation of the prior turn.
 */
function parseTranscript(raw: string): TranscriptTurn[] {
  if (!raw) return [];
  const lines = raw.split('\n');
  const turns: TranscriptTurn[] = [];
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][\w-]{0,32}):\s*(.*)$/);
    if (m) {
      turns.push({ role: m[1], content: m[2] });
    } else if (turns.length > 0 && line.trim().length > 0) {
      turns[turns.length - 1].content += '\n' + line;
    }
  }
  return turns;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  transcript,
  recording_url,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const turns = useMemo(() => parseTranscript(transcript), [transcript]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const handler = () => setCurrentTime(el.currentTime);
    el.addEventListener('timeupdate', handler);
    return () => el.removeEventListener('timeupdate', handler);
  }, []);

  const seekTo = (turnIndex: number) => {
    const t = turns[turnIndex]?.timestamp_sec;
    const el = audioRef.current;
    if (el && typeof t === 'number') {
      el.currentTime = t;
      el.play().catch(() => {
        /* user gesture required — ignore */
      });
    }
  };

  if (turns.length === 0) {
    return (
      <p className="text-sm text-zinc-500 italic">
        Transcript wasn't captured for this call. The recording is still
        available above if you want to listen.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {recording_url && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Call recording
          </p>
          <audio
            ref={audioRef}
            controls
            src={recording_url}
            className="w-full"
            preload="metadata"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      <div className="rounded-md border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Transcript
          </p>
        </div>
        <ol className="divide-y divide-zinc-100">
          {turns.map((turn, i) => {
            const isAgent = /agent|assistant|ai|bot/i.test(turn.role);
            const isActive =
              typeof turn.timestamp_sec === 'number' &&
              currentTime >= turn.timestamp_sec &&
              (i === turns.length - 1 ||
                (typeof turns[i + 1].timestamp_sec === 'number' &&
                  currentTime < (turns[i + 1].timestamp_sec as number)));
            const seekable = typeof turn.timestamp_sec === 'number' && !!recording_url;
            return (
              <li
                key={i}
                onClick={() => seekable && seekTo(i)}
                className={`flex gap-3 px-3 py-2.5 ${
                  seekable ? 'cursor-pointer hover:bg-zinc-50' : ''
                } ${isActive ? 'bg-amber-50/60' : ''}`}
              >
                <div className="flex w-16 shrink-0 flex-col items-start text-[11px] tabular-nums leading-tight">
                  <span
                    className={`font-medium uppercase tracking-wider ${
                      isAgent ? 'text-brand-blue' : 'text-zinc-500'
                    }`}
                  >
                    {isAgent ? 'Agent' : titleCase(turn.role)}
                  </span>
                  {typeof turn.timestamp_sec === 'number' && (
                    <span className="text-zinc-400">{fmtTs(turn.timestamp_sec)}</span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                  {turn.content}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

function fmtTs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default TranscriptViewer;
