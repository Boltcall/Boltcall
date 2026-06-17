// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { PageSkeleton } from '../../components/ui/loading-skeleton';
import {
  RotateCw,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  X,
  ChevronDown,
  GripVertical,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Wand2,
  Users,
  UserPlus,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import FeatureOnboarding from '../../components/dashboard/FeatureOnboarding';
import { PopButton } from '../../components/ui/pop-button';
import {
  FOLLOWUP_LIMITS,
  FOLLOWUP_PRESET_META,
  getFollowupPresetSteps,
  summarizeFollowupSteps,
  validateFollowupSteps,
} from '../../lib/followupPresets';
import type { FollowupPresetId } from '../../lib/followupPresets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Sequence {
  id: string;
  user_id: string;
  workspace_id: string | null;
  name: string;
  trigger_event: 'missed_call' | 'website_no_answer' | 'ad_no_answer' | 'appointment_completed' | 'lead_created' | 'manual';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  step_count?: number;
  enrollment_count?: number;
}

interface SequenceStep {
  id?: string;
  sequence_id?: string;
  step_order: number;
  channel: 'sms' | 'email' | 'call';
  delay_minutes: number;
  template: string;
  subject: string;
  is_active: boolean;
}

interface Enrollment {
  id: string;
  sequence_id: string;
  user_id: string;
  lead_id: string | null;
  contact_name: string;
  contact_phone: string | null;
  contact_email: string | null;
  current_step: number;
  status: 'active' | 'completed' | 'cancelled' | 'unsubscribed';
  enrolled_at: string;
  next_step_at: string | null;
  completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIGGER_OPTIONS: { value: Sequence['trigger_event']; label: string }[] = [
  { value: 'missed_call', label: 'Missed Call' },
  { value: 'website_no_answer', label: 'Website No Answer' },
  { value: 'ad_no_answer', label: 'Ad No Answer' },
  { value: 'appointment_completed', label: 'Appointment Completed' },
  { value: 'lead_created', label: 'Lead Created' },
  { value: 'manual', label: 'Manual' },
];

const TRIGGER_BADGE_COLORS: Record<Sequence['trigger_event'], string> = {
  missed_call: 'bg-amber-100 text-amber-700',
  website_no_answer: 'bg-purple-100 text-purple-700',
  ad_no_answer: 'bg-blue-100 text-blue-700',
  appointment_completed: 'bg-green-100 text-green-700',
  lead_created: 'bg-blue-100 text-blue-700',
  manual: 'bg-gray-100 text-gray-600',
};

const STATUS_BADGE_COLORS: Record<Enrollment['status'], string> = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  unsubscribed: 'bg-red-100 text-red-700',
};

const DELAY_UNITS = [
  { label: 'minutes', multiplier: 1 },
  { label: 'hours', multiplier: 60 },
  { label: 'days', multiplier: 1440 },
];

// Missed call: lead called you, you missed it — call back fast, then SMS, then one final SMS
const NO_ANSWER_TEMPLATE_STEPS: Omit<SequenceStep, 'id' | 'sequence_id'>[] = [
  { step_order: 1, channel: 'call', delay_minutes: 5,    template: '', subject: '', is_active: true },
  { step_order: 2, channel: 'sms',  delay_minutes: 20,   template: "Hi {{client_name}}, we tried reaching you. We're still here when you're ready — just reply to this text!", subject: '', is_active: true },
  { step_order: 3, channel: 'call', delay_minutes: 90,   template: '', subject: '', is_active: true },
  { step_order: 4, channel: 'sms',  delay_minutes: 1440, template: "Hi {{client_name}}, still here if you need us! Feel free to reply anytime.", subject: '', is_active: true },
];

// Website form: they submitted a form — warm up with SMS first, then call
const WEBSITE_NO_ANSWER_TEMPLATE_STEPS: Omit<SequenceStep, 'id' | 'sequence_id'>[] = [
  { step_order: 1, channel: 'sms',   delay_minutes: 5,   template: "Hi {{client_name}}, thanks for reaching out! We'll give you a call shortly.", subject: '', is_active: true },
  { step_order: 2, channel: 'call',  delay_minutes: 30,  template: '', subject: '', is_active: true },
  { step_order: 3, channel: 'call',  delay_minutes: 120, template: '', subject: '', is_active: true },
  { step_order: 4, channel: 'email', delay_minutes: 1440, template: "Hi {{client_name}},\n\nWe received your inquiry and tried to reach you — we'd love to help!\n\nReply here or call us back at your convenience.\n\nBest,\nThe Team", subject: 'Re: Your inquiry', is_active: true },
];

// Ad lead: similar to website but copy reflects ad context
const AD_NO_ANSWER_TEMPLATE_STEPS: Omit<SequenceStep, 'id' | 'sequence_id'>[] = [
  { step_order: 1, channel: 'sms',   delay_minutes: 5,   template: "Hi {{client_name}}, we saw your interest and wanted to reach out! We'll give you a call shortly.", subject: '', is_active: true },
  { step_order: 2, channel: 'call',  delay_minutes: 30,  template: '', subject: '', is_active: true },
  { step_order: 3, channel: 'call',  delay_minutes: 120, template: '', subject: '', is_active: true },
  { step_order: 4, channel: 'email', delay_minutes: 1440, template: "Hi {{client_name}},\n\nWe saw your interest and tried to reach you — we'd love to help!\n\nReply here or call us back at your convenience.\n\nBest,\nThe Team", subject: 'We tried to reach you', is_active: true },
];

function parseDelay(totalMinutes: number): { value: number; unit: string } {
  if (totalMinutes >= 1440 && totalMinutes % 1440 === 0) {
    return { value: totalMinutes / 1440, unit: 'days' };
  }
  if (totalMinutes >= 60 && totalMinutes % 60 === 0) {
    return { value: totalMinutes / 60, unit: 'hours' };
  }
  return { value: totalMinutes, unit: 'minutes' };
}

function buildDelay(value: number, unit: string): number {
  const found = DELAY_UNITS.find((u) => u.label === unit);
  return value * (found?.multiplier ?? 1);
}

function defaultStep(order: number): SequenceStep {
  return {
    step_order: order,
    channel: 'sms',
    delay_minutes: 1440,
    template: '',
    subject: '',
    is_active: true,
  };
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const FollowUpsPage: React.FC = () => {
  return (
    <FeatureOnboarding
      featureKey="followUps"
      icon={RotateCw}
      title="Follow Ups"
      description="Automate your follow-up communications to keep conversations warm and nurture leads. Set up automated follow-up sequences that engage your clients at the right time."
      onActivate={() => {}}
    >
      <FollowUpsContent />
    </FeatureOnboarding>
  );
};

// ---------------------------------------------------------------------------
// Content (rendered after feature is activated)
// ---------------------------------------------------------------------------

const FollowUpsContent: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
  const [templateType, setTemplateType] = useState<'missed_call' | 'website_no_answer' | 'ad_no_answer' | null>(null);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);

  // Enrollments panel state
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // -------------------------------------------------------------------
  // Fetch sequences
  // -------------------------------------------------------------------

  const fetchSequences = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: seqData, error: seqErr } = await supabase
        .from('followup_sequences')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (seqErr) throw seqErr;
      const seqs: Sequence[] = seqData ?? [];

      // Fetch step counts
      const { data: stepCounts } = await supabase
        .from('followup_sequence_steps')
        .select('sequence_id')
        .in(
          'sequence_id',
          seqs.map((s) => s.id)
        );

      // Fetch enrollment counts (only active)
      const { data: enrollCounts } = await supabase
        .from('followup_enrollments')
        .select('sequence_id')
        .in(
          'sequence_id',
          seqs.map((s) => s.id)
        )
        .eq('status', 'active');

      const stepMap: Record<string, number> = {};
      (stepCounts ?? []).forEach((r: { sequence_id: string }) => {
        stepMap[r.sequence_id] = (stepMap[r.sequence_id] || 0) + 1;
      });

      const enrollMap: Record<string, number> = {};
      (enrollCounts ?? []).forEach((r: { sequence_id: string }) => {
        enrollMap[r.sequence_id] = (enrollMap[r.sequence_id] || 0) + 1;
      });

      setSequences(
        seqs.map((s) => ({
          ...s,
          step_count: stepMap[s.id] || 0,
          enrollment_count: enrollMap[s.id] || 0,
        }))
      );
    } catch (err) {
      console.error('Error fetching sequences:', err);
      showToast({ variant: 'error', message: 'Failed to load sequences.' });
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  // -------------------------------------------------------------------
  // Toggle active
  // -------------------------------------------------------------------

  const toggleActive = async (seq: Sequence) => {
    const newVal = !seq.is_active;
    setSequences((prev) =>
      prev.map((s) => (s.id === seq.id ? { ...s, is_active: newVal } : s))
    );
    const { error } = await supabase
      .from('followup_sequences')
      .update({ is_active: newVal, updated_at: new Date().toISOString() })
      .eq('id', seq.id);
    if (error) {
      setSequences((prev) =>
        prev.map((s) => (s.id === seq.id ? { ...s, is_active: !newVal } : s))
      );
      showToast({ variant: 'error', message: 'Failed to update sequence.' });
    } else {
      showToast({
        variant: 'success',
        message: `Sequence ${newVal ? 'activated' : 'paused'}.`,
      });
    }
  };

  // -------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------

  const deleteSequence = async (id: string) => {
    setDeletingId(id);
    // Delete steps and enrollments first, then the sequence
    await supabase.from('followup_sequence_steps').delete().eq('sequence_id', id);
    await supabase.from('followup_enrollments').delete().eq('sequence_id', id);
    const { error } = await supabase.from('followup_sequences').delete().eq('id', id);
    setDeletingId(null);
    if (error) {
      showToast({ variant: 'error', message: 'Failed to delete sequence.' });
    } else {
      setSequences((prev) => prev.filter((s) => s.id !== id));
      if (selectedSequence?.id === id) setSelectedSequence(null);
      showToast({ variant: 'success', message: 'Sequence deleted.' });
    }
  };

  // -------------------------------------------------------------------
  // Fetch enrollments
  // -------------------------------------------------------------------

  const fetchEnrollments = useCallback(
    async (seqId: string) => {
      if (!user) return;
      setEnrollmentsLoading(true);
      try {
        const { data, error } = await supabase
          .from('followup_enrollments')
          .select('*')
          .eq('sequence_id', seqId)
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false });
        if (error) throw error;
        setEnrollments(data ?? []);
      } catch {
        showToast({ variant: 'error', message: 'Failed to load enrollments.' });
      } finally {
        setEnrollmentsLoading(false);
      }
    },
    [user, showToast]
  );

  const openEnrollments = (seq: Sequence) => {
    setSelectedSequence(seq);
    fetchEnrollments(seq.id);
  };

  const cancelEnrollment = async (enrollment: Enrollment) => {
    const { error } = await supabase
      .from('followup_enrollments')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', enrollment.id);
    if (error) {
      showToast({ variant: 'error', message: 'Failed to cancel enrollment.' });
    } else {
      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollment.id ? { ...e, status: 'cancelled' } : e
        )
      );
      showToast({ variant: 'success', message: 'Enrollment cancelled.' });
      fetchSequences();
    }
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  if (selectedSequence) {
    return (
      <>
        <EnrollmentsPanel
          sequence={selectedSequence}
          enrollments={enrollments}
          loading={enrollmentsLoading}
          onBack={() => {
            setSelectedSequence(null);
            fetchSequences();
          }}
          onCancel={cancelEnrollment}
          onEnrollNew={() => setEnrollModalOpen(true)}
        />
        <AnimatePresence>
          {enrollModalOpen && (
            <EnrollModal
              sequenceId={selectedSequence.id}
              userId={user?.id ?? ''}
              onClose={() => setEnrollModalOpen(false)}
              onEnrolled={() => {
                setEnrollModalOpen(false);
                fetchEnrollments(selectedSequence.id);
                fetchSequences();
              }}
              showToast={showToast}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <RotateCw className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Follow-Up Sequences</h2>
            <p className="text-sm text-gray-600">
              Automate SMS and email follow-ups for your leads
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Template dropdown */}
          <div className="relative">
            <PopButton
              size="sm"
              onClick={() => setTemplateDropdownOpen((v) => !v)}
              className="gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Use Template
              <ChevronDown className="w-3 h-3" />
            </PopButton>
            {templateDropdownOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
                {[
                  { type: 'missed_call' as const, label: 'Missed Call', icon: '📞' },
                  { type: 'website_no_answer' as const, label: 'Website Form', icon: '🌐' },
                  { type: 'ad_no_answer' as const, label: 'Ad Lead', icon: '📣' },
                ].map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => {
                      setEditingSequence(null);
                      setTemplateType(type);
                      setModalOpen(true);
                      setTemplateDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <PopButton
            color="blue"
            size="sm"
            onClick={() => {
              setEditingSequence(null);
              setTemplateType(null);
              setModalOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Sequence
          </PopButton>
        </div>
      </div>

      {/* Loading */}
      {loading && <PageSkeleton />}

      {/* Empty state */}
      {!loading && sequences.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm"
        >
          <div className="text-center py-16 px-6">
            <RotateCw className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              No follow-up sequences yet
            </p>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Create your first sequence to automatically follow up with leads via
              SMS or email after missed calls, completed appointments, or new lead
              events.
            </p>
            <PopButton
              color="blue"
              onClick={() => {
                setEditingSequence(null);
                setModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Sequence
            </PopButton>
          </div>
        </motion.div>
      )}

      {/* Sequence cards */}
      {!loading && sequences.length > 0 && (
        <div className="grid gap-4">
          {sequences.map((seq, idx) => (
            <motion.div
              key={seq.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openEnrollments(seq)}
            >
              <div className="p-4 sm:p-5 flex items-center justify-between gap-2">
                {/* Left side */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <RotateCw className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {seq.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          TRIGGER_BADGE_COLORS[seq.trigger_event]
                        }`}
                      >
                        {TRIGGER_OPTIONS.find((t) => t.value === seq.trigger_event)?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{seq.step_count ?? 0} step{seq.step_count !== 1 ? 's' : ''}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {seq.enrollment_count ?? 0} active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side */}
                <div
                  className="flex items-center gap-2 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(seq)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      seq.is_active ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    title={seq.is_active ? 'Active — click to pause' : 'Paused — click to activate'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        seq.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => {
                      setEditingSequence(seq);
                      setTemplateType(null);
                      setModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit sequence"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this sequence and all its steps and enrollments?')) {
                        deleteSequence(seq.id);
                      }
                    }}
                    disabled={deletingId === seq.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete sequence"
                  >
                    {deletingId === seq.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <AnimatePresence>
        {modalOpen && (
          <SequenceModal
            sequence={editingSequence}
            userId={user?.id ?? ''}
            templateType={templateType}
            onClose={() => setModalOpen(false)}
            onSaved={() => {
              setModalOpen(false);
              fetchSequences();
            }}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

// ---------------------------------------------------------------------------
// Sequence Create / Edit Modal
// ---------------------------------------------------------------------------

interface SequenceModalProps {
  sequence: Sequence | null;
  userId: string;
  templateType?: 'missed_call' | 'website_no_answer' | 'ad_no_answer' | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (p: { variant: 'success' | 'error'; message: string }) => void;
}

const TEMPLATE_DEFAULTS: Record<
  'missed_call' | 'website_no_answer' | 'ad_no_answer',
  { name: string; steps: Omit<SequenceStep, 'id' | 'sequence_id'>[] }
> = {
  missed_call:      { name: 'Missed Call Follow-Up',   steps: getFollowupPresetSteps('missed_call', 'standard') },
  website_no_answer: { name: 'Website No-Answer Follow-Up', steps: getFollowupPresetSteps('website_no_answer', 'standard') },
  ad_no_answer:     { name: 'Ad Lead Follow-Up',        steps: getFollowupPresetSteps('ad_no_answer', 'standard') },
};

const GUIDED_TRIGGERS: Sequence['trigger_event'][] = ['missed_call', 'website_no_answer', 'ad_no_answer'];

const DEFAULT_SEQUENCE_NAMES: Record<Sequence['trigger_event'], string> = {
  missed_call: 'Missed Call Follow-Up',
  website_no_answer: 'Website No-Answer Follow-Up',
  ad_no_answer: 'Ad Lead Follow-Up',
  appointment_completed: 'Appointment Follow-Up',
  lead_created: 'New Lead Follow-Up',
  manual: 'Manual Follow-Up',
};

const PRESET_CARD_TONE: Record<FollowupPresetId, { badge: string; className: string; selectedClassName: string }> = {
  gentle: {
    badge: 'Light touch',
    className: 'border-emerald-100 bg-emerald-50/50 hover:border-emerald-300',
    selectedClassName: 'border-emerald-400 bg-white shadow-sm ring-2 ring-emerald-100',
  },
  standard: {
    badge: 'Recommended',
    className: 'border-blue-100 bg-blue-50/50 hover:border-blue-300',
    selectedClassName: 'border-blue-400 bg-white shadow-sm ring-2 ring-blue-100',
  },
  aggressive: {
    badge: 'Hot leads',
    className: 'border-amber-100 bg-amber-50/60 hover:border-amber-300',
    selectedClassName: 'border-amber-400 bg-white shadow-sm ring-2 ring-amber-100',
  },
};

const SequenceModal: React.FC<SequenceModalProps> = ({
  sequence,
  userId,
  templateType = null,
  onClose,
  onSaved,
  showToast,
}) => {
  const isEdit = !!sequence;
  const tpl = templateType ? TEMPLATE_DEFAULTS[templateType] : null;

  const [name, setName] = useState(tpl ? tpl.name : (sequence?.name ?? ''));
  const [trigger, setTrigger] = useState<Sequence['trigger_event']>(
    templateType ?? (sequence?.trigger_event ?? 'missed_call')
  );
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [preset, setPreset] = useState<FollowupPresetId>('standard');
  const [advancedOpen, setAdvancedOpen] = useState(isEdit);
  const guidedMode = GUIDED_TRIGGERS.includes(trigger);

  // Load steps when editing
  useEffect(() => {
    if (!sequence) {
      setSteps(tpl ? tpl.steps : [defaultStep(1)]);
      return;
    }
    (async () => {
      setLoadingSteps(true);
      const { data, error } = await supabase
        .from('followup_sequence_steps')
        .select('*')
        .eq('sequence_id', sequence.id)
        .order('step_order', { ascending: true });
      if (error) {
        showToast({ variant: 'error', message: 'Failed to load steps.' });
      }
      setSteps(data && data.length > 0 ? data : [defaultStep(1)]);
      setLoadingSteps(false);
    })();
  }, [sequence, showToast]);

  const applyPreset = (nextPreset: FollowupPresetId, nextTrigger = trigger) => {
    setPreset(nextPreset);
    setSteps(getFollowupPresetSteps(nextTrigger, nextPreset));
  };

  const handleTriggerChange = (nextTrigger: Sequence['trigger_event']) => {
    setTrigger(nextTrigger);
    if (!name.trim() || name === DEFAULT_SEQUENCE_NAMES[trigger]) {
      setName(DEFAULT_SEQUENCE_NAMES[nextTrigger]);
    }
    if (GUIDED_TRIGGERS.includes(nextTrigger)) {
      setSteps(getFollowupPresetSteps(nextTrigger, preset));
    }
  };

  const updateStep = (idx: number, patch: Partial<SequenceStep>) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((s, i) => ({ ...s, step_order: i + 1 }));
    });
  };

  const addStep = () => {
    if (steps.length >= FOLLOWUP_LIMITS.maxSteps) {
      showToast({
        variant: 'error',
        message: `Use ${FOLLOWUP_LIMITS.maxSteps} steps or fewer to keep follow-up safe.`,
      });
      return;
    }
    setSteps((prev) => [...prev, defaultStep(prev.length + 1)]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast({ variant: 'error', message: 'Sequence name is required.' });
      return;
    }
    if (steps.length === 0) {
      showToast({ variant: 'error', message: 'Add at least one step.' });
      return;
    }
    const validationError = validateFollowupSteps(steps);
    if (validationError) {
      showToast({ variant: 'error', message: validationError });
      return;
    }
    for (let i = 0; i < steps.length; i++) {
      // Call steps don't need a template — the AI agent script handles the conversation
      if (steps[i].channel !== 'call' && !steps[i].template.trim()) {
        showToast({ variant: 'error', message: `Step ${i + 1} template is empty.` });
        return;
      }
      if (steps[i].channel === 'email' && !steps[i].subject.trim()) {
        showToast({ variant: 'error', message: `Step ${i + 1} needs a subject line.` });
        return;
      }
    }

    setSaving(true);
    try {
      let seqId = sequence?.id;

      if (isEdit && seqId) {
        // Update sequence
        const { error } = await supabase
          .from('followup_sequences')
          .update({
            name: name.trim(),
            trigger_event: trigger,
            updated_at: new Date().toISOString(),
          })
          .eq('id', seqId);
        if (error) throw error;

        // Delete old steps and re-insert
        await supabase
          .from('followup_sequence_steps')
          .delete()
          .eq('sequence_id', seqId);
      } else {
        // Create sequence
        const { data, error } = await supabase
          .from('followup_sequences')
          .insert({
            user_id: userId,
            name: name.trim(),
            trigger_event: trigger,
            is_active: true,
          })
          .select()
          .single();
        if (error) throw error;
        seqId = data.id;
      }

      // Insert steps
      const stepsToInsert = steps.map((s, i) => ({
        sequence_id: seqId,
        step_order: i + 1,
        channel: s.channel,
        delay_minutes: s.delay_minutes,
        template: s.template.trim(),
        subject: s.channel === 'email' ? s.subject.trim() : '',
        is_active: s.is_active,
      }));

      const { error: stepsErr } = await supabase
        .from('followup_sequence_steps')
        .insert(stepsToInsert);
      if (stepsErr) throw stepsErr;

      showToast({
        variant: 'success',
        message: isEdit ? 'Sequence updated.' : 'Sequence created.',
      });
      onSaved();
    } catch (err: any) {
      console.error('Save error:', err);
      showToast({ variant: 'error', message: err.message || 'Failed to save sequence.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10 px-4"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Edit Sequence' : 'Create Sequence'}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sequence Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Missed Call Follow-Up"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Event
              </label>
              <div className="relative">
                <select
                  value={trigger}
                  onChange={(e) => handleTriggerChange(e.target.value as Sequence['trigger_event'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
                >
                  {TRIGGER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {guidedMode && (
              <div className="border border-blue-100 bg-blue-50/80 rounded-xl p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-blue-100">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Guided setup</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Pick a safe preset first. Customize timing and messages when you want exact control.
                    </p>
                    <p className="mt-2 inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 border border-blue-100">
                      This sequence owns the text-back, so Boltcall will not send a duplicate no-answer SMS.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(Object.keys(FOLLOWUP_PRESET_META) as FollowupPresetId[]).map((presetId) => {
                    const meta = FOLLOWUP_PRESET_META[presetId];
                    const preview = summarizeFollowupSteps(getFollowupPresetSteps(trigger, presetId));
                    const selected = preset === presetId;
                    const tone = PRESET_CARD_TONE[presetId];
                    return (
                      <button
                        key={presetId}
                        type="button"
                        onClick={() => applyPreset(presetId)}
                        className={`text-left rounded-xl border p-3.5 transition-all ${
                          selected ? tone.selectedClassName : tone.className
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">{meta.label}</span>
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-gray-600 border border-white">
                            {tone.badge}
                          </span>
                        </span>
                        <span className="block text-xs text-gray-600 mt-2 min-h-[34px]">{meta.description}</span>
                        <span className="block text-[11px] text-gray-800 mt-3 leading-snug">{preview}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl bg-white border border-blue-100 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700">Current timeline</p>
                    <p className="text-sm text-gray-900 leading-relaxed mt-1">{summarizeFollowupSteps(steps)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((value) => !value)}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {advancedOpen ? 'Hide customization' : 'Customize timing & messages'}
                  </button>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className={guidedMode && !advancedOpen ? 'hidden' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advanced Steps
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Max {FOLLOWUP_LIMITS.maxSteps} steps, max {FOLLOWUP_LIMITS.maxCallSteps} AI call retries, SMS under {FOLLOWUP_LIMITS.maxSmsChars} characters.
              </p>

              {loadingSteps ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {steps.map((step, idx) => (
                    <StepEditor
                      key={`${idx}-${step.channel}-${step.delay_minutes}`}
                      step={step}
                      index={idx}
                      canRemove={steps.length > 1}
                      onChange={(patch) => updateStep(idx, patch)}
                      onRemove={() => removeStep(idx)}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={addStep}
                disabled={steps.length >= FOLLOWUP_LIMITS.maxSteps}
                className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Step
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <PopButton
              onClick={onClose}
              size="sm"
            >
              Cancel
            </PopButton>
            <PopButton
              color="blue"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Sequence'}
            </PopButton>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Step Editor
// ---------------------------------------------------------------------------

interface StepEditorProps {
  step: SequenceStep;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<SequenceStep>) => void;
  onRemove: () => void;
}

const StepEditor: React.FC<StepEditorProps> = ({
  step,
  index,
  canRemove,
  onChange,
  onRemove,
}) => {
  const parsed = parseDelay(step.delay_minutes);
  const [delayValue, setDelayValue] = useState(parsed.value);
  const [delayUnit, setDelayUnit] = useState(parsed.unit);

  const handleDelayChange = (val: number, unit: string) => {
    setDelayValue(val);
    setDelayUnit(unit);
    onChange({ delay_minutes: buildDelay(val, unit) });
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative">
      {/* Step header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-300" />
          <span className="text-sm font-semibold text-gray-700">Step {index + 1}</span>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Remove step"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        {/* Channel */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Channel</label>
          <div className="flex gap-2">
            <button
              onClick={() => onChange({ channel: 'sms' })}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                step.channel === 'sms'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              SMS
            </button>
            <button
              onClick={() => onChange({ channel: 'email' })}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                step.channel === 'email'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Email
            </button>
            <button
              onClick={() => onChange({ channel: 'call', template: '' })}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                step.channel === 'call'
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              AI Call
            </button>
          </div>
        </div>

        {/* Delay */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Wait before sending
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={delayValue}
              onChange={(e) =>
                handleDelayChange(Math.max(0, parseInt(e.target.value) || 0), delayUnit)
              }
              className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <select
              value={delayUnit}
              onChange={(e) => handleDelayChange(delayValue, e.target.value)}
              className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
            >
              {DELAY_UNITS.map((u) => (
                <option key={u.label} value={u.label}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Subject (email only) */}
      {step.channel === 'email' && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Subject Line
          </label>
          <input
            type="text"
            value={step.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            placeholder="e.g. We missed you today, {{client_name}}"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      )}

      {/* Template — hidden for call steps */}
      {step.channel === 'call' ? (
        <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
          <Phone className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-700">
            Your AI agent will call this contact automatically. The agent's configured script and knowledge base handle the conversation — no template needed here.
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Message Template
          </label>
          <textarea
            value={step.template}
            onChange={(e) => onChange({ template: e.target.value })}
            rows={3}
            placeholder={
              step.channel === 'sms'
                ? 'Hi {{client_name}}, we noticed we missed your call. Would you like to reschedule? — {{business_name}}'
                : 'Hi {{client_name}},\n\nThank you for contacting {{business_name}}. We wanted to follow up...'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
          <p className="mt-1 text-xs text-gray-400">
            Placeholders: {'{{client_name}}'}, {'{{business_name}}'}, {'{{appointment_date}}'}
          </p>
          {step.channel === 'sms' && (
            <p className={`mt-1 text-xs ${
              step.template.length > FOLLOWUP_LIMITS.maxSmsChars ? 'text-red-500' : 'text-gray-400'
            }`}>
              {step.template.length}/{FOLLOWUP_LIMITS.maxSmsChars} SMS characters
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Enrollments Panel
// ---------------------------------------------------------------------------

interface EnrollmentsPanelProps {
  sequence: Sequence;
  enrollments: Enrollment[];
  loading: boolean;
  onBack: () => void;
  onCancel: (enrollment: Enrollment) => void;
  onEnrollNew: () => void;
}

const EnrollmentsPanel: React.FC<EnrollmentsPanelProps> = ({
  sequence,
  enrollments,
  loading,
  onBack,
  onCancel,
  onEnrollNew,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 truncate">{sequence.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  TRIGGER_BADGE_COLORS[sequence.trigger_event]
                }`}
              >
                {TRIGGER_OPTIONS.find((t) => t.value === sequence.trigger_event)?.label}
              </span>
              <span className="text-sm text-gray-500">
                {enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        <PopButton
          color="blue"
          size="sm"
          onClick={onEnrollNew}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Manual Enroll
        </PopButton>
      </div>

      {/* Loading */}
      {loading && <PageSkeleton />}

      {/* Empty */}
      {!loading && enrollments.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm"
        >
          <div className="text-center py-16 px-6">
            <Users className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-700 mb-2">No enrollments yet</p>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Contacts will appear here when they are enrolled in this sequence — either
              automatically via the trigger or manually by you.
            </p>
          </div>
        </motion.div>
      )}

      {/* Enrollment list */}
      {!loading && enrollments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Contact</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Phone / Email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Step</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Enrolled</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enrollments.map((en) => (
                <motion.tr
                  key={en.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {en.contact_name || '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {en.contact_phone || en.contact_email || '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{en.current_step}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_BADGE_COLORS[en.status]
                      }`}
                    >
                      {en.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(en.enrolled_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {en.status === 'active' && (
                      <button
                        onClick={() => onCancel(en)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancel enrollment"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Manual Enroll Modal
// ---------------------------------------------------------------------------

interface EnrollModalProps {
  sequenceId: string;
  userId: string;
  onClose: () => void;
  onEnrolled: () => void;
  showToast: (p: { variant: 'success' | 'error'; message: string }) => void;
}

const EnrollModal: React.FC<EnrollModalProps> = ({
  sequenceId,
  userId,
  onClose,
  onEnrolled,
  showToast,
}) => {
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEnroll = async () => {
    if (!contactName.trim()) {
      showToast({ variant: 'error', message: 'Contact name is required.' });
      return;
    }
    if (!contactPhone.trim() && !contactEmail.trim()) {
      showToast({ variant: 'error', message: 'Provide a phone number or email.' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('followup_enrollments').insert({
        sequence_id: sequenceId,
        user_id: userId,
        contact_name: contactName.trim(),
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        current_step: 1,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        next_step_at: new Date().toISOString(),
      });
      if (error) throw error;
      showToast({ variant: 'success', message: 'Contact enrolled.' });
      onEnrolled();
    } catch (err: any) {
      console.error('Enroll error:', err);
      showToast({ variant: 'error', message: err.message || 'Failed to enroll contact.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Manual Enroll</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name *
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <PopButton
              onClick={onClose}
              size="sm"
            >
              Cancel
            </PopButton>
            <PopButton
              color="blue"
              size="sm"
              onClick={handleEnroll}
              disabled={saving}
              className="gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Enroll Contact
            </PopButton>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default FollowUpsPage;
