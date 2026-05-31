/**
 * ShareableLinkGenerator — one-tap "Share with partner" for any report.
 *
 * Hits POST /.netlify/functions/agency-client-report-share-link, receives a
 * 30-day signed URL, copies it to the clipboard, and shows a confirmation
 * with the expiry date. Matches design principle #9 — supervision, not work.
 */
import { useState } from 'react';
import { authedFetch } from '../../lib/authedFetch';

interface Props {
  artifactId: string;
}

interface ShareResponse {
  share_url: string;
  expires_at: string;
}

export default function ShareableLinkGenerator({ artifactId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [share, setShare] = useState<ShareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setState('loading');
    setError(null);
    try {
      const res = await authedFetch('/.netlify/functions/agency-client-report-share-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact_id: artifactId }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `Share link failed (HTTP ${res.status})`);
      }
      const body = (await res.json()) as ShareResponse;
      setShare(body);
      setState('ready');
      // Best-effort: auto-copy on generation.
      try {
        await navigator.clipboard.writeText(body.share_url);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Share link failed');
      setState('error');
    }
  };

  const handleCopy = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore — manual copy still possible
    }
  };

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={handleGenerate}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
      >
        Share with partner
      </button>
    );
  }

  if (state === 'loading') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500">
        Creating link…
      </span>
    );
  }

  if (state === 'error') {
    return (
      <div className="inline-flex max-w-xs flex-col gap-1">
        <span className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-800">
          {error ?? 'Share link failed'}
        </span>
        <button
          type="button"
          onClick={handleGenerate}
          className="self-start text-[11px] font-medium text-zinc-600 underline hover:text-zinc-900"
        >
          Try again
        </button>
      </div>
    );
  }

  // ready
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <code className="max-w-[220px] truncate rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-700">
          {share?.share_url}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-[10px] text-zinc-500">
        Read-only link · expires {formatExpiry(share?.expires_at)}
      </p>
    </div>
  );
}

function formatExpiry(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}
