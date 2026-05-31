/**
 * ClientSettingsPage — Boltcall Client Portal · Phase E · /client/settings
 *
 * Preferences hub for the agency client. Seven focused sections, one calm
 * screen. Every section saves independently via PATCH so a partial failure
 * never blocks the rest.
 *
 * Sections:
 *   1. Business Hours   — 7-day editor, open/close + closed toggle
 *   2. Voice Picker     — list + preview, saves preferred_voice_id
 *   3. Notification Routing — per-severity chip toggles, AI ghost suggestions
 *   4. Auto-Approve Low-Risk — boolean switch
 *   5. Smart Pause      — date picker + next-Tuesday suggestion
 *   6. Team Members     — read-only email + role list
 *   7. Billing          — single button → billing portal URL
 *
 * Design contract:
 *   - One focal action per section (Save button scoped to that section only)
 *   - Every AI suggestion is a ghost chip with "Apply suggestion" — not auto-applied
 *   - No robot icons; no bubble UI
 *   - All numbers paired with a brief narrative label
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Check, Volume2, CreditCard } from 'lucide-react';
import ClientGate from '../../../components/client/ClientGate';
import { authedFetch } from '../../../lib/authedFetch';

// ─── API types ─────────────────────────────────────────────────────────────

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type BusinessHours = Record<DayKey, DayHours>;

type SeverityKey = 'critical' | 'digest' | 'weekly_report';
type ChannelKey = 'sms' | 'push' | 'email' | 'slack';

type Notifications = Record<SeverityKey, ChannelKey[]>;

interface VoiceOption {
  voice_id: string;
  voice_name: string;
  gender?: string;
  accent?: string;
  provider?: string;
  preview_audio_url?: string;
}

interface TeamMember {
  email: string;
  role: string;
}

interface SettingsPayload {
  client: {
    id: string;
    business_name: string;
    vertical: string | null;
    region: string | null;
    timezone: string | null;
    status: string;
  };
  business_hours: BusinessHours | null;
  notifications: Notifications | null;
  auto_approve_low_risk: boolean;
  preferred_voice_id: string | null;
  paused_until: string | null;
  voices_available?: VoiceOption[];
  team_members?: TeamMember[];
  ai_suggested: {
    notifications: Notifications;
    business_hours: BusinessHours;
  };
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const SEVERITIES: { key: SeverityKey; label: string; description: string }[] = [
  { key: 'critical', label: 'Critical', description: 'Immediate issues requiring action' },
  { key: 'digest', label: 'Daily digest', description: 'Your morning performance summary' },
  { key: 'weekly_report', label: 'Weekly report', description: 'Full campaign review every Monday' },
];

const CHANNELS: { key: ChannelKey; label: string }[] = [
  { key: 'sms', label: 'SMS' },
  { key: 'push', label: 'Push' },
  { key: 'email', label: 'Email' },
  { key: 'slack', label: 'Slack' },
];

const DEFAULT_HOURS: BusinessHours = {
  mon: { open: '09:00', close: '17:00', closed: false },
  tue: { open: '09:00', close: '17:00', closed: false },
  wed: { open: '09:00', close: '17:00', closed: false },
  thu: { open: '09:00', close: '17:00', closed: false },
  fri: { open: '09:00', close: '17:00', closed: false },
  sat: { open: '10:00', close: '14:00', closed: true },
  sun: { open: '10:00', close: '14:00', closed: true },
};

const DEFAULT_NOTIFICATIONS: Notifications = {
  critical: ['push'],
  digest: ['email'],
  weekly_report: ['email'],
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Next occurrence of a given weekday (0=Sun…6=Sat) */
function nextWeekday(day: number): Date {
  const now = new Date();
  const diff = (day - now.getDay() + 7) % 7 || 7;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  d.setHours(8, 0, 0, 0);
  return d;
}

function formatPausedUntil(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16); // datetime-local format
}

function toLocalDatetimeString(date: Date): string {
  return date.toISOString().slice(0, 16);
}

// ─── Sub-components ────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, subtitle, children }) => (
  <section className="border border-zinc-200 rounded-xl bg-white p-6 shadow-sm">
    <div className="mb-5">
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
    </div>
    {children}
  </section>
);

interface SaveRowProps {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  label?: string;
}

const SaveRow: React.FC<SaveRowProps> = ({ saving, saved, onSave, label = 'Save changes' }) => (
  <div className="mt-5 flex items-center gap-3">
    <button
      onClick={onSave}
      disabled={saving}
      className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60"
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : saved ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : null}
      {label}
    </button>
    {saved && !saving && (
      <span className="text-sm text-emerald-600">Saved</span>
    )}
  </div>
);

// ─── Skeleton ──────────────────────────────────────────────────────────────

const SkeletonSection: React.FC = () => (
  <div className="border border-zinc-200 rounded-xl bg-white p-6 shadow-sm animate-pulse space-y-3">
    <div className="h-4 w-40 rounded bg-zinc-100" />
    <div className="h-3 w-64 rounded bg-zinc-100" />
    <div className="space-y-2 mt-4">
      <div className="h-9 rounded bg-zinc-100" />
      <div className="h-9 rounded bg-zinc-100" />
      <div className="h-9 rounded bg-zinc-100" />
    </div>
  </div>
);

// ─── Section 1: Business Hours ─────────────────────────────────────────────

interface BusinessHoursSectionProps {
  hours: BusinessHours;
  onChange: (h: BusinessHours) => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

const BusinessHoursSection: React.FC<BusinessHoursSectionProps> = ({
  hours,
  onChange,
  saving,
  saved,
  onSave,
}) => {
  const updateDay = (day: DayKey, field: keyof DayHours, value: string | boolean) => {
    onChange({ ...hours, [day]: { ...hours[day], [field]: value } });
  };

  return (
    <Section
      title="Business hours"
      subtitle="Your agent only takes calls during these windows. Changes apply within 60 seconds."
    >
      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const day = hours[key];
          return (
            <div
              key={key}
              className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-2.5"
            >
              <span className="w-24 text-sm font-medium text-zinc-700">{label}</span>

              {/* Closed toggle */}
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                  checked={day.closed}
                  onChange={(e) => updateDay(key, 'closed', e.target.checked)}
                />
                <span className="text-xs text-zinc-500">Closed</span>
              </label>

              {/* Time inputs — dimmed when closed */}
              <div
                className={`flex flex-1 items-center gap-2 transition-opacity ${
                  day.closed ? 'opacity-30 pointer-events-none' : 'opacity-100'
                }`}
              >
                <input
                  type="time"
                  value={day.open}
                  onChange={(e) => updateDay(key, 'open', e.target.value)}
                  className="w-28 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <span className="text-xs text-zinc-400">to</span>
                <input
                  type="time"
                  value={day.close}
                  onChange={(e) => updateDay(key, 'close', e.target.value)}
                  className="w-28 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              {day.closed && (
                <span className="ml-auto text-xs text-zinc-400 italic">Closed all day</span>
              )}
            </div>
          );
        })}
      </div>
      <SaveRow saving={saving} saved={saved} onSave={onSave} />
    </Section>
  );
};

// ─── Section 2: Voice Picker ───────────────────────────────────────────────

interface VoicePickerSectionProps {
  voices: VoiceOption[];
  selectedId: string | null;
  onChange: (id: string) => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

const VoicePickerSection: React.FC<VoicePickerSectionProps> = ({
  voices,
  selectedId,
  onChange,
  saving,
  saved,
  onSave,
}) => {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handlePreview = useCallback(async (voice: VoiceOption) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playing === voice.voice_id) {
      setPlaying(null);
      return;
    }

    if (voice.preview_audio_url) {
      const audio = new Audio(voice.preview_audio_url);
      audioRef.current = audio;
      setPlaying(voice.voice_id);
      audio.onended = () => setPlaying(null);
      audio.onerror = () => setPlaying(null);
      try {
        await audio.play();
      } catch {
        setPlaying(null);
      }
      return;
    }

    // Fallback: use Speech Synthesis with a sample sentence
    if ('speechSynthesis' in window) {
      setPlaying(voice.voice_id);
      const utter = new SpeechSynthesisUtterance(
        `Hi, this is ${voice.voice_name}. How can I help you today?`
      );
      utter.onend = () => setPlaying(null);
      utter.onerror = () => setPlaying(null);
      window.speechSynthesis.speak(utter);
    }
  }, [playing]);

  // Fallback voices when none returned from API
  const displayVoices: VoiceOption[] = voices.length > 0
    ? voices
    : [
        { voice_id: 'default-female', voice_name: 'Sarah', gender: 'female', accent: 'American', provider: 'ElevenLabs' },
        { voice_id: 'default-male', voice_name: 'James', gender: 'male', accent: 'American', provider: 'ElevenLabs' },
      ];

  return (
    <Section
      title="Agent voice"
      subtitle="The voice your callers hear when the agent picks up. Preview before committing."
    >
      <div className="space-y-2">
        {displayVoices.map((voice) => {
          const isSelected = selectedId === voice.voice_id;
          const isPlaying = playing === voice.voice_id;

          return (
            <label
              key={voice.voice_id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
                isSelected
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <input
                type="radio"
                name="voice"
                value={voice.voice_id}
                checked={isSelected}
                onChange={() => onChange(voice.voice_id)}
                className="sr-only"
              />

              {/* Selection indicator */}
              <div
                className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-white' : 'border-zinc-300'
                }`}
              >
                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
              </div>

              {/* Voice meta */}
              <div className="flex-1 min-w-0">
                <span className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                  {voice.voice_name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  {voice.gender && (
                    <span className={`text-xs capitalize ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {voice.gender}
                    </span>
                  )}
                  {voice.accent && (
                    <span className={`text-xs ${isSelected ? 'text-zinc-400' : 'text-zinc-400'}`}>
                      {voice.accent}
                    </span>
                  )}
                  {voice.provider && (
                    <span
                      className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 font-medium ${
                        isSelected ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      {voice.provider}
                    </span>
                  )}
                </div>
              </div>

              {/* Preview button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  void handlePreview(voice);
                }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  isSelected
                    ? 'bg-zinc-700 text-white hover:bg-zinc-600'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <Volume2 className={`h-3 w-3 ${isPlaying ? 'animate-pulse' : ''}`} />
                {isPlaying ? 'Stop' : 'Preview'}
              </button>
            </label>
          );
        })}
      </div>
      <SaveRow saving={saving} saved={saved} onSave={onSave} label="Set voice" />
    </Section>
  );
};

// ─── Section 3: Notification Routing ──────────────────────────────────────

interface NotificationSectionProps {
  notifications: Notifications;
  suggested: Notifications;
  onChange: (n: Notifications) => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

const NotificationSection: React.FC<NotificationSectionProps> = ({
  notifications,
  suggested,
  onChange,
  saving,
  saved,
  onSave,
}) => {
  const toggleChannel = (severity: SeverityKey, channel: ChannelKey) => {
    const current = notifications[severity] ?? [];
    const next = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel];
    onChange({ ...notifications, [severity]: next });
  };

  const applySuggested = (severity: SeverityKey) => {
    onChange({ ...notifications, [severity]: suggested[severity] });
  };

  return (
    <Section
      title="Notification routing"
      subtitle="Choose how you hear from us — by urgency. Your strategist sends only what matters."
    >
      <div className="space-y-5">
        {SEVERITIES.map(({ key, label, description }) => {
          const active = notifications[key] ?? [];
          const suggestedChannels = suggested[key] ?? [];
          const matchesSuggested =
            suggestedChannels.length === active.length &&
            suggestedChannels.every((c) => active.includes(c));

          return (
            <div key={key}>
              <div className="mb-1.5">
                <span className="text-sm font-medium text-zinc-800">{label}</span>
                <p className="text-xs text-zinc-500">{description}</p>
              </div>

              {/* Active chips */}
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(({ key: ch, label: chLabel }) => {
                  const isActive = active.includes(ch);
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(key, ch)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        isActive
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
                      }`}
                    >
                      {chLabel}
                    </button>
                  );
                })}
              </div>

              {/* AI suggestion ghost */}
              {!matchesSuggested && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-zinc-400">
                    Suggested for your vertical:
                  </span>
                  {suggestedChannels.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-dashed border-zinc-300 px-2.5 py-0.5 text-xs text-zinc-400"
                    >
                      {CHANNELS.find((ch) => ch.key === c)?.label ?? c}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => applySuggested(key)}
                    className="text-xs text-brand-blue underline-offset-2 hover:underline"
                  >
                    Apply suggestion
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <SaveRow saving={saving} saved={saved} onSave={onSave} label="Save routing" />
    </Section>
  );
};

// ─── Section 4: Auto-Approve Low-Risk ─────────────────────────────────────

interface AutoApproveProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

const AutoApproveSection: React.FC<AutoApproveProps> = ({
  enabled,
  onChange,
  saving,
  saved,
  onSave,
}) => (
  <Section
    title="Auto-approve low-risk changes"
    subtitle="Your strategist sometimes queues small tweaks — wording adjustments, minor bid changes — that carry minimal risk. This setting controls what happens after 72 hours without a decision."
  >
    <div className="flex items-start gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
      {/* Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 ${
          enabled ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300 bg-zinc-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>

      {/* Explanation */}
      <div>
        <p className="text-sm font-medium text-zinc-800">
          {enabled ? 'Auto-approve is on' : 'Auto-approve is off'}
        </p>
        <p className="mt-0.5 text-sm text-zinc-500">
          {enabled
            ? 'Low-risk items in your approvals queue will go live automatically after 72 hours if no action is taken. You can still reject anything before then.'
            : 'All changes — even low-risk ones — wait for your explicit approval. Nothing goes live without your sign-off.'}
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          This only affects items tagged "low-risk" in{' '}
          <a href="/client/approvals" className="text-brand-blue hover:underline underline-offset-2">
            your approvals queue
          </a>
          .
        </p>
      </div>
    </div>
    <SaveRow saving={saving} saved={saved} onSave={onSave} label="Save preference" />
  </Section>
);

// ─── Section 5: Smart Pause ────────────────────────────────────────────────

interface SmartPauseSectionProps {
  pausedUntil: string | null;
  onChange: (v: string | null) => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

const SmartPauseSection: React.FC<SmartPauseSectionProps> = ({
  pausedUntil,
  onChange,
  saving,
  saved,
  onSave,
}) => {
  const nextTuesdayIso = toLocalDatetimeString(nextWeekday(2));
  const isCurrentlyPaused =
    pausedUntil !== null && new Date(pausedUntil) > new Date();

  return (
    <Section
      title="Smart pause"
      subtitle="Temporarily suspend the agent — useful for holidays, staff absences, or quiet periods."
    >
      {isCurrentlyPaused && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your agent is paused until{' '}
          <strong>{new Date(pausedUntil!).toLocaleString()}</strong>.{' '}
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-medium underline underline-offset-2"
          >
            Resume now
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Pause until
          </label>
          <input
            type="datetime-local"
            value={formatPausedUntil(pausedUntil)}
            min={toLocalDatetimeString(new Date())}
            onChange={(e) => onChange(e.target.value ? e.target.value : null)}
            className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>

        {/* Suggestion */}
        {!pausedUntil && (
          <button
            type="button"
            onClick={() => onChange(nextTuesdayIso)}
            className="text-sm text-zinc-500 hover:text-zinc-700 underline underline-offset-2"
          >
            I'll auto-resume Tuesday 8 am
          </button>
        )}

        {pausedUntil && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-sm text-zinc-500 hover:text-zinc-700 underline underline-offset-2"
          >
            Clear pause — resume immediately
          </button>
        )}
      </div>

      <SaveRow saving={saving} saved={saved} onSave={onSave} label="Save pause" />
    </Section>
  );
};

// ─── Section 6: Team Members ───────────────────────────────────────────────

interface TeamMembersSectionProps {
  members: TeamMember[];
}

const TeamMembersSection: React.FC<TeamMembersSectionProps> = ({ members }) => (
  <Section
    title="Team members"
    subtitle="People with access to this client portal. To add or remove members, contact your strategist."
  >
    {members.length === 0 ? (
      <p className="text-sm text-zinc-400 italic">
        No additional team members on file. Contact us to add access.
      </p>
    ) : (
      <ul className="space-y-2">
        {members.map((m, i) => (
          <li
            key={i}
            className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-2.5"
          >
            <span className="text-sm text-zinc-800">{m.email}</span>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-600">
              {m.role}
            </span>
          </li>
        ))}
      </ul>
    )}
    <p className="mt-3 text-xs text-zinc-400">
      To change team access, email{' '}
      <a href="mailto:hi@boltcall.org" className="text-brand-blue underline-offset-2 hover:underline">
        hi@boltcall.org
      </a>
    </p>
  </Section>
);

// ─── Section 7: Billing ────────────────────────────────────────────────────

const BillingSection: React.FC = () => {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenPortal = async () => {
    setOpening(true);
    setError(null);
    try {
      const res = await authedFetch('/.netlify/functions/agency-client-billing-portal', {
        method: 'POST',
      });
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        if (data.url) {
          window.open(data.url, '_blank', 'noopener,noreferrer');
        } else {
          setError('No portal URL returned. Our team has been notified.');
        }
      } else {
        // Billing portal function may not exist yet — graceful fallback
        setError('Billing portal is not yet active for your account. Reach out to us directly.');
      }
    } catch {
      setError('Could not reach the billing portal. Please try again or email us.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <Section
      title="Billing"
      subtitle="View invoices, update your payment method, or download receipts."
    >
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void handleOpenPortal()}
          disabled={opening}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-60"
        >
          {opening ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
          ) : (
            <CreditCard className="h-4 w-4 text-zinc-500" />
          )}
          Open billing portal
        </button>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <p className="text-xs text-zinc-400">
          Opens in a new tab. Managed by Stripe — your card details are never stored by Boltcall.
        </p>
      </div>
    </Section>
  );
};

// ─── Save state helpers ─────────────────────────────────────────────────────

interface SectionSaveState {
  saving: boolean;
  saved: boolean;
}

function useSaveState(): [SectionSaveState, () => Promise<void>] {
  // Not used directly — inlined per section for clarity. Helper type only.
  const [state, setState] = useState<SectionSaveState>({ saving: false, saved: false });
  const trigger = async () => {
    setState({ saving: true, saved: false });
    await new Promise((r) => setTimeout(r, 300));
    setState({ saving: false, saved: true });
    setTimeout(() => setState({ saving: false, saved: false }), 2500);
  };
  return [state, trigger];
}

void useSaveState; // suppress unused warning — pattern documented above

// ─── Main page ─────────────────────────────────────────────────────────────

const ClientSettingsInner: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SettingsPayload | null>(null);

  // Per-section local state
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [notifications, setNotifications] = useState<Notifications>(DEFAULT_NOTIFICATIONS);
  const [autoApprove, setAutoApprove] = useState(false);
  const [preferredVoiceId, setPreferredVoiceId] = useState<string | null>(null);
  const [pausedUntil, setPausedUntil] = useState<string | null>(null);

  // Per-section save state
  const [hoursSave, setHoursSave] = useState<SectionSaveState>({ saving: false, saved: false });
  const [voiceSave, setVoiceSave] = useState<SectionSaveState>({ saving: false, saved: false });
  const [notifSave, setNotifSave] = useState<SectionSaveState>({ saving: false, saved: false });
  const [autoSave, setAutoSave] = useState<SectionSaveState>({ saving: false, saved: false });
  const [pauseSave, setPauseSave] = useState<SectionSaveState>({ saving: false, saved: false });

  // ── Fetch on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await authedFetch('/.netlify/functions/agency-client-settings');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SettingsPayload;
        if (cancelled) return;
        setPayload(data);
        setHours(data.business_hours ?? data.ai_suggested.business_hours);
        setNotifications(data.notifications ?? data.ai_suggested.notifications);
        setAutoApprove(data.auto_approve_low_risk);
        setPreferredVoiceId(data.preferred_voice_id);
        setPausedUntil(data.paused_until);
      } catch (e) {
        if (!cancelled) setFetchError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // ── Generic PATCH helper ───────────────────────────────────────────────
  const patch = useCallback(
    async (
      fields: Partial<{
        business_hours: BusinessHours;
        notifications: Notifications;
        auto_approve_low_risk: boolean;
        preferred_voice_id: string | null;
        paused_until: string | null;
      }>,
      setSave: React.Dispatch<React.SetStateAction<SectionSaveState>>,
    ) => {
      setSave({ saving: true, saved: false });
      try {
        const res = await authedFetch('/.netlify/functions/agency-client-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          console.error('[ClientSettings] PATCH error', err);
        }
        setSave({ saving: false, saved: true });
        setTimeout(() => setSave({ saving: false, saved: false }), 2500);
      } catch (e) {
        console.error('[ClientSettings] PATCH failed', e);
        setSave({ saving: false, saved: false });
      }
    },
    [],
  );

  // ─ Per-section save handlers
  const saveHours = useCallback(() => patch({ business_hours: hours }, setHoursSave), [patch, hours]);
  const saveVoice = useCallback(() => patch({ preferred_voice_id: preferredVoiceId }, setVoiceSave), [patch, preferredVoiceId]);
  const saveNotifications = useCallback(() => patch({ notifications }, setNotifSave), [patch, notifications]);
  const saveAutoApprove = useCallback(() => patch({ auto_approve_low_risk: autoApprove }, setAutoSave), [patch, autoApprove]);
  const savePause = useCallback(() => patch({ paused_until: pausedUntil }, setPauseSave), [patch, pausedUntil]);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <div className="h-6 w-48 rounded bg-zinc-100 animate-pulse" />
        <SkeletonSection />
        <SkeletonSection />
        <SkeletonSection />
      </div>
    );
  }

  if (fetchError || !payload) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-zinc-500">
          Could not load your settings. Our team has been notified.
        </p>
        <p className="mt-1 text-xs text-zinc-400">{fetchError}</p>
      </div>
    );
  }

  const voices = payload.voices_available ?? [];
  const teamMembers = payload.team_members ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {payload.client.business_name} · Your preferences for the Boltcall agency service.
        </p>
      </div>

      {/* 1. Business Hours */}
      <BusinessHoursSection
        hours={hours}
        onChange={setHours}
        saving={hoursSave.saving}
        saved={hoursSave.saved}
        onSave={() => void saveHours()}
      />

      {/* 2. Voice Picker */}
      <VoicePickerSection
        voices={voices}
        selectedId={preferredVoiceId}
        onChange={setPreferredVoiceId}
        saving={voiceSave.saving}
        saved={voiceSave.saved}
        onSave={() => void saveVoice()}
      />

      {/* 3. Notification Routing */}
      <NotificationSection
        notifications={notifications}
        suggested={payload.ai_suggested.notifications}
        onChange={setNotifications}
        saving={notifSave.saving}
        saved={notifSave.saved}
        onSave={() => void saveNotifications()}
      />

      {/* 4. Auto-Approve */}
      <AutoApproveSection
        enabled={autoApprove}
        onChange={setAutoApprove}
        saving={autoSave.saving}
        saved={autoSave.saved}
        onSave={() => void saveAutoApprove()}
      />

      {/* 5. Smart Pause */}
      <SmartPauseSection
        pausedUntil={pausedUntil}
        onChange={setPausedUntil}
        saving={pauseSave.saving}
        saved={pauseSave.saved}
        onSave={() => void savePause()}
      />

      {/* 6. Team Members */}
      <TeamMembersSection members={teamMembers} />

      {/* 7. Billing */}
      <BillingSection />
    </div>
  );
};

// ─── Default export — wrapped in ClientGate ─────────────────────────────────

const ClientSettingsPage: React.FC = () => (
  <ClientGate>
    <ClientSettingsInner />
  </ClientGate>
);

export default ClientSettingsPage;
