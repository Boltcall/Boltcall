/**
 * V2MessagesPage — V2 Messages inbox.
 *
 * Two-pane layout (calmer density, narrative-first):
 *   - LEFT (one-third): thread list with Haiku-generated 1-line AI summary
 *     per row + filters (channel, status, assignee, "Needs reply").
 *   - RIGHT (two-thirds): selected thread — full message history followed by
 *     an AI-suggested reply draft (regeneratable). The user can edit and "Send"
 *     (POST stub — no live wire-up yet; this surface is for the dialogue UX).
 *
 * Empty state nudges the user to connect a messaging channel.
 *
 * V1 invariant: never imports from src/pages/dashboard/ or src/components/dashboard/.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  Mail,
  Plug,
  RefreshCw,
  Send,
  Sparkles,
  Filter,
  Inbox,
  AlertCircle,
} from 'lucide-react';
import { authedFetch } from '../../lib/authedFetch';
import { FUNCTIONS_BASE } from '../../lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card-shadcn';
import { Button } from '../../components/ui/button-shadcn';

// ─── Types ──────────────────────────────────────────────────────────────────

type Channel = 'sms' | 'chat' | 'email';
type Status = 'open' | 'closed';

interface ThreadRow {
  id: string;
  contact_name: string;
  channel: Channel;
  last_msg_at: string;
  ai_summary: string;
  needs_reply: boolean;
  unread_count: number;
  assignee?: string | null;
}

interface ThreadsResponse {
  threads: ThreadRow[];
  total: number;
  cold_start?: boolean;
  cold_start_reason?: string;
}

interface ThreadMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  sent_at: string;
}

interface ThreadDetail {
  thread: ThreadRow;
  messages: ThreadMessage[];
  context?: {
    lead?: { id: string; name?: string; phone?: string; email?: string };
    customer_history?: { thread_count?: number; last_seen?: string };
  };
}

interface ReplyDraft {
  draft: string;
  tone: 'friendly' | 'professional';
  reasoning_oneliner: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const channelLabel: Record<Channel, string> = {
  sms: 'SMS',
  chat: 'Chat',
  email: 'Email',
};

const channelIcon: Record<Channel, React.ReactNode> = {
  sms: <MessageSquare className="w-3.5 h-3.5" />,
  chat: <MessageSquare className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
};

function formatRelative(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Component ──────────────────────────────────────────────────────────────

const V2MessagesPage: React.FC = () => {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);
  const [coldStart, setColdStart] = useState<{ cold: boolean; reason?: string }>({ cold: false });

  const [channelFilter, setChannelFilter] = useState<'all' | Channel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('open');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [needsReplyOnly, setNeedsReplyOnly] = useState<boolean>(false);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [loadingThread, setLoadingThread] = useState<boolean>(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  const [draft, setDraft] = useState<ReplyDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState<boolean>(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  // ─── List fetch ────────────────────────────────────────────────────────────
  const fetchThreads = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      if (channelFilter !== 'all') params.set('channel', channelFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (needsReplyOnly) params.set('needs_reply', 'true');
      if (assigneeFilter !== 'all') params.set('assignee', assigneeFilter);
      params.set('limit', '50');
      params.set('page', '1');

      const res = await authedFetch(
        `${FUNCTIONS_BASE}/saas-v2-messages?${params.toString()}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to load threads (${res.status})`);
      }
      const json = (await res.json()) as ThreadsResponse;
      setThreads(json.threads || []);
      setColdStart({ cold: Boolean(json.cold_start), reason: json.cold_start_reason });
      if (!selectedThreadId && (json.threads || []).length > 0) {
        setSelectedThreadId(json.threads[0].id);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingList(false);
    }
  }, [channelFilter, statusFilter, needsReplyOnly, assigneeFilter, selectedThreadId]);

  useEffect(() => {
    void fetchThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelFilter, statusFilter, needsReplyOnly, assigneeFilter]);

  // ─── Thread + draft fetch ─────────────────────────────────────────────────
  const fetchThread = useCallback(async (id: string) => {
    setLoadingThread(true);
    setThreadError(null);
    setThreadDetail(null);
    try {
      const res = await authedFetch(
        `${FUNCTIONS_BASE}/saas-v2-message-thread?thread_id=${encodeURIComponent(id)}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to load thread (${res.status})`);
      }
      const json = (await res.json()) as ThreadDetail;
      setThreadDetail(json);
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const fetchDraft = useCallback(
    async (threadId: string, hint?: string) => {
      setDraftLoading(true);
      setDraftError(null);
      try {
        const res = await authedFetch(`${FUNCTIONS_BASE}/saas-v2-message-draft-reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: threadId, hint }),
        });
        if (!res.ok) {
          throw new Error(`Failed to generate reply (${res.status})`);
        }
        const json = (await res.json()) as ReplyDraft;
        setDraft(json);
        setReplyText(json.draft || '');
      } catch (err) {
        setDraftError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setDraftLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedThreadId) {
      setThreadDetail(null);
      setDraft(null);
      setReplyText('');
      return;
    }
    void fetchThread(selectedThreadId);
    void fetchDraft(selectedThreadId);
  }, [selectedThreadId, fetchThread, fetchDraft]);

  // ─── Send (stub) ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      // Stub: no live wiring — log to console + clear the draft area.
      // The user explicitly asked for "POST stub — no live send wiring."
      console.info('[V2MessagesPage] (stub) send', {
        thread_id: selectedThreadId,
        body: replyText,
      });
      await new Promise((resolve) => setTimeout(resolve, 400));
      setReplyText('');
      setDraft(null);
    } finally {
      setSending(false);
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const assignees = useMemo(() => {
    const set = new Set<string>();
    threads.forEach((t) => {
      if (t.assignee) set.add(t.assignee);
    });
    return Array.from(set);
  }, [threads]);

  const needsReplyCount = useMemo(
    () => threads.filter((t) => t.needs_reply).length,
    [threads],
  );

  const channelBreakdown = useMemo(() => {
    const counts: Record<Channel, number> = { sms: 0, chat: 0, email: 0 };
    threads.forEach((t) => {
      counts[t.channel] = (counts[t.channel] || 0) + 1;
    });
    return counts;
  }, [threads]);

  // ─── Render ───────────────────────────────────────────────────────────────

  // Narrative header (always present — V2 calmer-density rule).
  const narrative = useMemo(() => {
    if (loadingList) return 'Loading your conversations…';
    if (coldStart.cold) {
      return (
        coldStart.reason ||
        'You haven\'t accumulated enough conversation history yet. Unlock at 30 calls or 14 days of activity.'
      );
    }
    if (threads.length === 0) {
      return 'Inbox is empty right now. Once SMS, chat, or email leads come in, you\'ll see them organized here with a one-line AI summary and a suggested reply ready to send.';
    }
    if (needsReplyCount > 0) {
      return `You have ${needsReplyCount} ${needsReplyCount === 1 ? 'thread' : 'threads'} waiting on a response. We've drafted replies for each — review, tweak, and send.`;
    }
    return `All ${threads.length} active ${threads.length === 1 ? 'conversation is' : 'conversations are'} caught up. We'll surface anything that needs you here as soon as it lands.`;
  }, [loadingList, coldStart, threads.length, needsReplyCount]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Messages</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Unified inbox across SMS, chat, and email — with AI-drafted replies.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchThreads()}
          disabled={loadingList}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingList ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Narrative slot — V2 calmer-density: prose above any chart/table. */}
      <Card className="border-border">
        <CardContent className="py-4 px-5">
          <p className="text-sm text-text-main leading-relaxed">{narrative}</p>
        </CardContent>
      </Card>

      {/* Cold-start placeholder takes over the workspace. */}
      {coldStart.cold ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Inbox className="w-5 h-5 text-zinc-400" />
              Unlock at 30 calls
            </CardTitle>
            <CardDescription>
              The AI-summarized inbox kicks in once your workspace has enough conversation data
              to learn your tone and triage signals.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : threads.length === 0 && !loadingList && !listError ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-zinc-400" />
              Connect your first messaging channel
            </CardTitle>
            <CardDescription>
              No inbound SMS, chat, or email threads yet. Wire up Twilio/ACS, the website chat
              widget, or your inbox to start seeing leads here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href="/v2/integrations">
                  <Plug className="w-3.5 h-3.5 mr-1.5" />
                  Open integrations
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[60vh]">
          {/* Left pane: thread list + filters */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <Filter className="w-3 h-3" />
                    Filter
                  </div>
                  <button
                    type="button"
                    onClick={() => setNeedsReplyOnly((v) => !v)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${
                      needsReplyOnly
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {needsReplyOnly ? '✓ Needs reply' : 'Needs reply'}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="py-3 px-4 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'sms', 'chat', 'email'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setChannelFilter(c)}
                      className={`text-xs px-2 py-1 rounded-md capitalize transition-colors ${
                        channelFilter === c
                          ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/30'
                          : 'bg-zinc-50 text-zinc-600 border border-transparent hover:bg-zinc-100'
                      }`}
                    >
                      {c === 'all' ? 'All' : channelLabel[c]}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['open', 'closed', 'all'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`text-xs px-2 py-1 rounded-md capitalize transition-colors ${
                        statusFilter === s
                          ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/30'
                          : 'bg-zinc-50 text-zinc-600 border border-transparent hover:bg-zinc-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {assignees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAssigneeFilter('all')}
                      className={`text-xs px-2 py-1 rounded-md transition-colors ${
                        assigneeFilter === 'all'
                          ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/30'
                          : 'bg-zinc-50 text-zinc-600 border border-transparent hover:bg-zinc-100'
                      }`}
                    >
                      All assignees
                    </button>
                    {assignees.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAssigneeFilter(a)}
                        className={`text-xs px-2 py-1 rounded-md transition-colors ${
                          assigneeFilter === a
                            ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/30'
                            : 'bg-zinc-50 text-zinc-600 border border-transparent hover:bg-zinc-100'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}
                <div className="pt-1 text-[10px] text-zinc-400 flex gap-3">
                  <span>SMS {channelBreakdown.sms}</span>
                  <span>Chat {channelBreakdown.chat}</span>
                  <span>Email {channelBreakdown.email}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 overflow-hidden">
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
                {loadingList ? (
                  <div className="p-6 text-center text-sm text-zinc-500">
                    Loading threads…
                  </div>
                ) : listError ? (
                  <div className="p-6 text-center text-sm text-red-600">
                    {listError}
                  </div>
                ) : threads.length === 0 ? (
                  <div className="p-6 text-center text-sm text-zinc-500">
                    No threads match these filters.
                  </div>
                ) : (
                  threads.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedThreadId(t.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors ${
                        selectedThreadId === t.id ? 'bg-brand-blue/5 border-l-2 border-brand-blue' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex-shrink-0 text-zinc-400">
                            {channelIcon[t.channel]}
                          </span>
                          <span className="text-sm font-medium text-text-main truncate">
                            {t.contact_name || 'Unknown contact'}
                          </span>
                          {t.unread_count > 0 && (
                            <span className="flex-shrink-0 text-[10px] bg-brand-blue text-white rounded-full px-1.5 py-px font-semibold">
                              {t.unread_count}
                            </span>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-[10px] text-zinc-400">
                          {formatRelative(t.last_msg_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-600 line-clamp-2">
                        {t.ai_summary || 'No summary yet.'}
                      </p>
                      {t.needs_reply && (
                        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Needs reply
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right pane: selected thread */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {!selectedThreadId ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-zinc-500">
                  Select a thread to see its history and reply.
                </CardContent>
              </Card>
            ) : loadingThread ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-zinc-500">
                  Loading thread…
                </CardContent>
              </Card>
            ) : threadError ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-red-600">
                  {threadError}
                </CardContent>
              </Card>
            ) : threadDetail ? (
              <>
                {/* History */}
                <Card className="flex-1 overflow-hidden">
                  <CardHeader className="py-3 px-5 border-b border-border">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-400">
                          {channelIcon[threadDetail.thread.channel]}
                        </span>
                        <span className="font-medium text-text-main truncate">
                          {threadDetail.thread.contact_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-zinc-400">
                          · {channelLabel[threadDetail.thread.channel]}
                        </span>
                      </div>
                      {threadDetail.context?.customer_history?.thread_count !== undefined && (
                        <span className="text-[10px] text-zinc-500">
                          {threadDetail.context.customer_history.thread_count} prior thread
                          {threadDetail.context.customer_history.thread_count === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <div className="max-h-[45vh] overflow-y-auto p-5 space-y-3">
                    {threadDetail.messages.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center">
                        No messages in this thread yet.
                      </p>
                    ) : (
                      threadDetail.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${
                            m.direction === 'outbound' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                              m.direction === 'outbound'
                                ? 'bg-brand-blue text-white'
                                : 'bg-zinc-100 text-text-main'
                            }`}
                          >
                            <div className="whitespace-pre-wrap break-words">{m.body}</div>
                            <div
                              className={`text-[10px] mt-1 ${
                                m.direction === 'outbound' ? 'text-white/70' : 'text-zinc-400'
                              }`}
                            >
                              {formatRelative(m.sent_at)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                {/* AI-suggested reply */}
                <Card>
                  <CardHeader className="py-3 px-5 border-b border-border">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                        <span className="text-sm font-medium text-text-main">
                          AI-suggested reply
                        </span>
                        {draft?.tone && (
                          <span className="text-[10px] uppercase tracking-wide text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {draft.tone}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selectedThreadId && void fetchDraft(selectedThreadId)}
                        disabled={draftLoading}
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 mr-1.5 ${draftLoading ? 'animate-spin' : ''}`}
                        />
                        Regenerate
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {draft?.reasoning_oneliner && (
                      <p className="text-xs italic text-zinc-500">
                        {draft.reasoning_oneliner}
                      </p>
                    )}
                    {draftError ? (
                      <p className="text-xs text-red-600">{draftError}</p>
                    ) : null}
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={
                        draftLoading
                          ? 'Drafting reply…'
                          : 'Write a reply or accept the AI draft…'
                      }
                      rows={5}
                      className="w-full text-sm rounded-md border border-border bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] text-zinc-400">
                        Sending is stubbed — wiring lands in a later wave.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSend}
                        disabled={!replyText.trim() || sending}
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        {sending ? 'Sending…' : 'Send'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default V2MessagesPage;
