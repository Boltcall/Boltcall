import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Languages,
  Bell,
  Bot,
  Users,
  Trash2,
  Sparkles,
  Check,
  X,
  Loader2,
  AlertTriangle,
  Phone,
  Clock,
  Mic,
} from 'lucide-react';
import { authedFetch } from '../../lib/authedFetch';

/**
 * V2 Settings — Wave 3 Page 5.
 *
 * Wrapped externally in AppRoutes.tsx as:
 *   <Route path="settings" element={<V2OptInGate><V2SettingsPage /></V2OptInGate>} />
 *
 * The parent DashboardLayoutV2 already supplies the centered container
 * (max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10) — this component starts
 * directly with its narrative content.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'normal' | 'digest';
type RoutingChannel = 'sms' | 'email' | 'push' | 'none';

interface NotificationRoutingMap {
  critical?: RoutingChannel;
  normal?: RoutingChannel;
  digest?: RoutingChannel;
}

interface Workspace {
  id: string;
  name: string;
  vertical: string | null;
  default_timezone: string;
  default_language: string;
  business_hours_start: string | null;
  business_hours_end: string | null;
  notification_routing: NotificationRoutingMap | null;
  agent_voice: string | null;
  agent_transfer_phone: string | null;
  agent_paused_until: string | null;
  v2_enabled?: boolean;
}

interface Suggestion {
  column: keyof Workspace | string;
  suggested_value: unknown;
  headline: string;
  why: string;
}

interface MemberRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
}

interface SettingsGetResponse {
  workspace: Workspace;
  current_user_role: string;
  team?: MemberRow[];
  cold_start?: boolean;
  signals?: { calls_total?: number; days_active?: number };
}

interface SettingsUpdateResponse {
  workspace: Workspace;
}

interface SettingsSuggestResponse {
  suggestions: Suggestion[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VERTICALS = [
  'plumbing',
  'hvac',
  'dental',
  'medspa',
  'law',
  'real_estate',
  'roofing',
  'auto_repair',
  'cleaning',
  'landscaping',
  'solar',
  'veterinary',
  'other',
] as const;

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'he', label: 'Hebrew' },
  { code: 'fr', label: 'French' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Jerusalem',
];

const SEVERITIES: Array<{ key: Severity; label: string; hint: string }> = [
  { key: 'critical', label: 'Critical', hint: 'Booking failures, agent crashes, payment issues' },
  { key: 'normal', label: 'Normal', hint: 'New leads, completed calls, daily activity' },
  { key: 'digest', label: 'Digest', hint: 'Weekly summary, low-priority metrics' },
];

const ROUTING_CHANNELS: Array<{ key: RoutingChannel; label: string }> = [
  { key: 'sms', label: 'SMS' },
  { key: 'email', label: 'Email' },
  { key: 'push', label: 'Push' },
  { key: 'none', label: 'None' },
];

// ─── Saved pip ────────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const SavedPip: React.FC<{ state: SaveState }> = ({ state }) => {
  if (state === 'idle') return null;
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
        <Check className="w-3 h-3" />
        Saved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-rose-600">
      <AlertTriangle className="w-3 h-3" />
      Couldn't save
    </span>
  );
};

// ─── Suggestion banner ────────────────────────────────────────────────────────

const renderSuggestedValue = (val: unknown): string => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  try {
    return JSON.stringify(val);
  } catch {
    return '[value]';
  }
};

const SuggestionBanner: React.FC<{
  loading: boolean;
  suggestions: Suggestion[];
  onApply: (s: Suggestion) => Promise<void>;
  onDismiss: (s: Suggestion) => void;
  vertical: string | null;
}> = ({ loading, suggestions, onApply, onDismiss, vertical }) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Looking at how other {vertical || 'similar'} workspaces are configured…
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-lg bg-amber-100 p-2 flex-shrink-0">
          <Sparkles className="w-4 h-4 text-amber-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            AI-suggested defaults for your vertical
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Based on patterns from similar workspaces — apply or dismiss each one.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {suggestions.map((s, idx) => (
          <div
            key={`${s.column}-${idx}`}
            className="flex items-start gap-3 p-3 rounded-xl bg-white border border-amber-100"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900">{s.headline}</div>
              <div className="text-xs text-slate-600 mt-0.5">{s.why}</div>
              <div className="text-xs text-slate-500 mt-1.5">
                <span className="font-medium text-slate-700">Suggested:</span>{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                  {String(s.column)}
                </code>{' '}
                →{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                  {renderSuggestedValue(s.suggested_value)}
                </code>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => onApply(s)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white text-xs px-3 py-1.5 hover:bg-slate-800 transition"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => onDismiss(s)}
                className="inline-flex items-center gap-1 rounded-lg bg-white text-slate-700 text-xs px-3 py-1.5 border border-slate-200 hover:bg-slate-50 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Section primitives ───────────────────────────────────────────────────────

const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
    <header className="flex items-start gap-3 mb-5">
      <div className="rounded-lg bg-slate-100 p-2 flex-shrink-0">{icon}</div>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="text-xs text-slate-600 mt-0.5">{description}</p>
        ) : null}
      </div>
    </header>
    <div className="space-y-4">{children}</div>
  </section>
);

const FieldRow: React.FC<{
  label: string;
  hint?: string;
  saveState: SaveState;
  children: React.ReactNode;
}> = ({ label, hint, saveState, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-slate-800">{label}</label>
      <SavedPip state={saveState} />
    </div>
    {children}
    {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
  </div>
);

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400';

// ─── Cold-start placeholder ───────────────────────────────────────────────────

const ColdStartPlaceholder: React.FC<{
  signals?: { calls_total?: number; days_active?: number };
}> = ({ signals }) => (
  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
      <Sparkles className="w-5 h-5 text-slate-500" />
    </div>
    <h2 className="text-lg font-semibold text-slate-900 mb-1">
      Unlock at 30 calls
    </h2>
    <p className="text-sm text-slate-600 max-w-md mx-auto">
      We need at least 30 calls or 14 days of activity before V2 can suggest
      meaningful settings tuned to your vertical.
    </p>
    {signals ? (
      <p className="text-xs text-slate-500 mt-3">
        Currently: {signals.calls_total ?? 0} calls · {signals.days_active ?? 0} days
        active.
      </p>
    ) : null}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const V2SettingsPage: React.FC = () => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [currentRole, setCurrentRole] = useState<string>('owner');
  const [team, setTeam] = useState<MemberRow[]>([]);
  const [coldStart, setColdStart] = useState(false);
  const [signals, setSignals] = useState<{ calls_total?: number; days_active?: number } | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const savedTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const setFieldSaveState = useCallback((field: string, state: SaveState) => {
    setSaveStates((prev) => ({ ...prev, [field]: state }));
    if (state === 'saved') {
      if (savedTimersRef.current[field]) clearTimeout(savedTimersRef.current[field]);
      savedTimersRef.current[field] = setTimeout(() => {
        setSaveStates((prev) => ({ ...prev, [field]: 'idle' }));
      }, 1800);
    }
  }, []);

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await authedFetch('/.netlify/functions/saas-v2-settings-get');
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as SettingsGetResponse;
        if (cancelled) return;
        setWorkspace(data.workspace);
        setCurrentRole(data.current_user_role || 'owner');
        setTeam(data.team || []);
        setColdStart(Boolean(data.cold_start));
        setSignals(data.signals);
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Suggestions load (after workspace is known) ──────────────────────────
  useEffect(() => {
    if (!workspace) return;
    if (coldStart) return;
    let cancelled = false;
    const loadSuggestions = async () => {
      try {
        setSuggestionLoading(true);
        const res = await authedFetch('/.netlify/functions/saas-v2-settings-suggest');
        if (!res.ok) {
          setSuggestionLoading(false);
          return;
        }
        const data = (await res.json()) as SettingsSuggestResponse;
        if (cancelled) return;
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch {
        // soft-fail — banner just won't show
      } finally {
        if (!cancelled) setSuggestionLoading(false);
      }
    };
    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [workspace, coldStart]);

  // ─── Persist change ───────────────────────────────────────────────────────
  const persist = useCallback(
    async (patch: Record<string, unknown>, fieldKey: string) => {
      setFieldSaveState(fieldKey, 'saving');
      try {
        const res = await authedFetch('/.netlify/functions/saas-v2-settings-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as SettingsUpdateResponse;
        setWorkspace(data.workspace);
        setFieldSaveState(fieldKey, 'saved');
      } catch {
        setFieldSaveState(fieldKey, 'error');
      }
    },
    [setFieldSaveState],
  );

  // ─── Apply suggestion ─────────────────────────────────────────────────────
  const applySuggestion = useCallback(
    async (s: Suggestion) => {
      const fieldKey = `suggest:${s.column}`;
      await persist({ [s.column as string]: s.suggested_value }, String(s.column));
      // remove suggestion from banner once applied
      setSuggestions((prev) => prev.filter((x) => x !== s));
      setFieldSaveState(fieldKey, 'saved');
    },
    [persist, setFieldSaveState],
  );

  const dismissSuggestion = useCallback((s: Suggestion) => {
    setDismissedSuggestions((prev) => {
      const next = new Set(prev);
      next.add(`${s.column}:${renderSuggestedValue(s.suggested_value)}`);
      return next;
    });
    setSuggestions((prev) => prev.filter((x) => x !== s));
  }, []);

  // ─── Field handlers ───────────────────────────────────────────────────────
  const onBlurString = (field: keyof Workspace) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!workspace) return;
    const next = e.target.value;
    if (String(workspace[field] ?? '') === next) return;
    setWorkspace({ ...workspace, [field]: next } as Workspace);
    persist({ [field]: next }, String(field));
  };

  const onChangeSelect = (field: keyof Workspace) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!workspace) return;
    const next = e.target.value;
    if (String(workspace[field] ?? '') === next) return;
    setWorkspace({ ...workspace, [field]: next } as Workspace);
    persist({ [field]: next }, String(field));
  };

  const setRouting = (sev: Severity, channel: RoutingChannel) => {
    if (!workspace) return;
    const nextRouting: NotificationRoutingMap = {
      ...(workspace.notification_routing || {}),
      [sev]: channel,
    };
    setWorkspace({ ...workspace, notification_routing: nextRouting });
    persist({ notification_routing: nextRouting }, `notification_routing.${sev}`);
  };

  const pauseAgent = (minutes: number) => {
    if (!workspace) return;
    const until = new Date(Date.now() + minutes * 60_000).toISOString();
    setWorkspace({ ...workspace, agent_paused_until: until });
    persist({ agent_paused_until: until }, 'agent_paused_until');
  };

  const resumeAgent = () => {
    if (!workspace) return;
    setWorkspace({ ...workspace, agent_paused_until: null });
    persist({ agent_paused_until: null }, 'agent_paused_until');
  };

  // ─── Visible suggestions (filter dismissed) ───────────────────────────────
  const visibleSuggestions = useMemo(
    () =>
      suggestions.filter(
        (s) =>
          !dismissedSuggestions.has(`${s.column}:${renderSuggestedValue(s.suggested_value)}`),
      ),
    [suggestions, dismissedSuggestions],
  );

  // ─── Render states ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <div className="flex items-center gap-2 font-medium mb-1">
          <AlertTriangle className="w-4 h-4" />
          Couldn't load settings
        </div>
        <p className="text-rose-700/80">{loadError}</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        No workspace found for your account.
      </div>
    );
  }

  if (coldStart) {
    return <ColdStartPlaceholder signals={signals} />;
  }

  const isOwner = currentRole === 'owner';
  const pausedUntilDate = workspace.agent_paused_until
    ? new Date(workspace.agent_paused_until)
    : null;
  const isPaused = !!(pausedUntilDate && pausedUntilDate.getTime() > Date.now());

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Workspace Settings</h1>
          <p className="text-sm text-slate-600 mt-1">
            Tuned for your vertical. Changes save automatically.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {currentRole}
        </span>
      </header>

      {/* AI suggestion banner */}
      <SuggestionBanner
        loading={suggestionLoading && visibleSuggestions.length === 0}
        suggestions={visibleSuggestions}
        onApply={applySuggestion}
        onDismiss={dismissSuggestion}
        vertical={workspace.vertical}
      />

      {/* Workspace identity */}
      <SectionCard
        icon={<Building2 className="w-4 h-4 text-slate-600" />}
        title="Workspace identity"
        description="Name, vertical, timezone, and business hours used across every agent."
      >
        <FieldRow label="Workspace name" saveState={saveStates.name || 'idle'}>
          <input
            type="text"
            defaultValue={workspace.name || ''}
            className={inputCls}
            onBlur={onBlurString('name')}
            disabled={!isOwner}
          />
        </FieldRow>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldRow label="Vertical" saveState={saveStates.vertical || 'idle'}>
            <select
              value={workspace.vertical || ''}
              onChange={onChangeSelect('vertical')}
              className={inputCls}
              disabled={!isOwner}
            >
              <option value="">Select vertical…</option>
              {VERTICALS.map((v) => (
                <option key={v} value={v}>
                  {v.replace('_', ' ')}
                </option>
              ))}
            </select>
          </FieldRow>

          <FieldRow label="Default timezone" saveState={saveStates.default_timezone || 'idle'}>
            <select
              value={workspace.default_timezone || 'America/New_York'}
              onChange={onChangeSelect('default_timezone')}
              className={inputCls}
              disabled={!isOwner}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </FieldRow>

          <FieldRow label="Default language" saveState={saveStates.default_language || 'idle'}>
            <select
              value={workspace.default_language || 'en'}
              onChange={onChangeSelect('default_language')}
              className={inputCls}
              disabled={!isOwner}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Languages className="w-3 h-3" />
              Used for outbound voice + SMS by default.
            </p>
          </FieldRow>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Business hours start" saveState={saveStates.business_hours_start || 'idle'}>
              <input
                type="time"
                defaultValue={workspace.business_hours_start || '09:00'}
                className={inputCls}
                onBlur={onBlurString('business_hours_start')}
                disabled={!isOwner}
              />
            </FieldRow>
            <FieldRow label="Business hours end" saveState={saveStates.business_hours_end || 'idle'}>
              <input
                type="time"
                defaultValue={workspace.business_hours_end || '17:00'}
                className={inputCls}
                onBlur={onBlurString('business_hours_end')}
                disabled={!isOwner}
              />
            </FieldRow>
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        icon={<Bell className="w-4 h-4 text-slate-600" />}
        title="Notifications"
        description="Route each severity tier to the channel that fits — critical events should never get buried."
      >
        <div className="space-y-3">
          {SEVERITIES.map((sev) => (
            <div
              key={sev.key}
              className="flex items-start justify-between gap-4 p-3 rounded-xl border border-slate-200"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 capitalize">{sev.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{sev.hint}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={(workspace.notification_routing?.[sev.key] as RoutingChannel) || 'none'}
                  onChange={(e) => setRouting(sev.key, e.target.value as RoutingChannel)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                  disabled={!isOwner}
                >
                  {ROUTING_CHANNELS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <SavedPip state={saveStates[`notification_routing.${sev.key}`] || 'idle'} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Agent defaults */}
      <SectionCard
        icon={<Bot className="w-4 h-4 text-slate-600" />}
        title="Agent defaults"
        description="Defaults applied to new agents — and the global pause switch."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldRow label="Default voice" hint="Voice ID from your Retell library." saveState={saveStates.agent_voice || 'idle'}>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                defaultValue={workspace.agent_voice || ''}
                placeholder="e.g. 11labs-Adrian"
                className={inputCls}
                onBlur={onBlurString('agent_voice')}
                disabled={!isOwner}
              />
            </div>
          </FieldRow>

          <FieldRow
            label="Transfer phone"
            hint="Fallback number when the agent escalates to a human."
            saveState={saveStates.agent_transfer_phone || 'idle'}
          >
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="tel"
                defaultValue={workspace.agent_transfer_phone || ''}
                placeholder="+1 555 123 4567"
                className={inputCls}
                onBlur={onBlurString('agent_transfer_phone')}
                disabled={!isOwner}
              />
            </div>
          </FieldRow>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Pause all agents
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {isPaused && pausedUntilDate
                  ? `Paused until ${pausedUntilDate.toLocaleString()}`
                  : 'Agents are currently live and answering.'}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isPaused ? (
                <button
                  type="button"
                  onClick={resumeAgent}
                  className="rounded-lg bg-emerald-600 text-white text-xs px-3 py-1.5 hover:bg-emerald-700 transition"
                  disabled={!isOwner}
                >
                  Resume
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => pauseAgent(60)}
                    className="rounded-lg bg-slate-900 text-white text-xs px-3 py-1.5 hover:bg-slate-800 transition"
                    disabled={!isOwner}
                  >
                    Pause 1h
                  </button>
                  <button
                    type="button"
                    onClick={() => pauseAgent(60 * 24)}
                    className="rounded-lg bg-white text-slate-700 text-xs px-3 py-1.5 border border-slate-200 hover:bg-slate-50 transition"
                    disabled={!isOwner}
                  >
                    Pause 24h
                  </button>
                </>
              )}
              <SavedPip state={saveStates.agent_paused_until || 'idle'} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Team (read-only nudge) */}
      <SectionCard
        icon={<Users className="w-4 h-4 text-slate-600" />}
        title="Team"
        description="Members with access to this workspace."
      >
        {team.length === 0 ? (
          <div className="text-sm text-slate-600">
            No teammates yet — invite from the Members page.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 -mt-1">
            {team.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {m.name || m.email}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{m.email}</div>
                </div>
                <span className="text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-2.5 py-0.5 capitalize">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500">
          Inviting and removing members from this dashboard is coming soon —
          ask Boltcall AI in Help if you need a member changed today.
        </p>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard
        icon={<Trash2 className="w-4 h-4 text-rose-600" />}
        title="Danger zone"
        description="Workspace deletion is permanent and removes every agent, call log, and integration."
      >
        {!showDelete ? (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm px-4 py-2 hover:bg-rose-100 transition disabled:opacity-50"
            disabled={!isOwner}
          >
            Delete workspace…
          </button>
        ) : (
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
            <p className="text-sm text-rose-800">
              Type <code className="px-1 py-0.5 rounded bg-rose-100 text-rose-900">DELETE</code>{' '}
              to confirm. This action is irreversible.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className={inputCls}
              placeholder="DELETE"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || !isOwner}
                onClick={() => {
                  // Stub: deletion endpoint is wired in a later milestone.
                  // For now, log + show a saved pip so the UI doesn't fail silently.
                  setFieldSaveState('delete', 'error');
                  setTimeout(() => setFieldSaveState('delete', 'idle'), 2400);
                }}
                className="rounded-lg bg-rose-600 text-white text-sm px-4 py-2 hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Permanently delete
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDelete(false);
                  setDeleteConfirmText('');
                }}
                className="rounded-lg bg-white text-slate-700 text-sm px-4 py-2 border border-slate-200 hover:bg-slate-50 transition inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <SavedPip state={saveStates.delete || 'idle'} />
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default V2SettingsPage;
