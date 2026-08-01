import React, { useState, useEffect } from 'react';
import {
  Star, Loader2, AlertCircle, MessageSquare, ArrowRight, X,
  Globe, Smartphone, MousePointerClick, Clock, Pencil,
  Send, ExternalLink, ToggleLeft, ToggleRight
} from 'lucide-react';
import { PageSkeleton } from '../../components/ui/loading-skeleton';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTokens } from '../../contexts/TokenContext';
import { UnsavedChanges } from '../../components/ui/unsaved-changes';
import { PopButton } from '../../components/ui/pop-button';
import { motion, AnimatePresence } from 'framer-motion';

const inputClass =
  'w-full px-4 py-3 border border-gray-300 dark:border-[#2a2a32] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-white bg-white dark:bg-[#0e0e11]';

const SETUP_STEPS = [
  {
    icon: Globe,
    title: 'Google Review Link',
    description: 'Connect your Google Business Profile so customers can leave reviews with one click.',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    icon: MousePointerClick,
    title: 'Website Popup',
    description: 'Set up a review prompt that appears on your website — choose timing, message, and button text.',
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  {
    icon: Smartphone,
    title: 'SMS Review Requests',
    description: 'Automatically text clients after appointments to ask for a Google review.',
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
];

const ReputationPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { claimReward } = useTokens();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Settings
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [trigger, setTrigger] = useState<'delay' | 'scroll' | 'exit'>('delay');
  const [delaySeconds, setDelaySeconds] = useState(30);
  const [popupText, setPopupText] = useState('Enjoying our service? Leave us a Google review!');
  const [buttonText, setButtonText] = useState('Leave a Review');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState(
    'Hi {{client_name}}, thanks for visiting {{business_name}}! We\'d love your feedback: {{review_url}}'
  );
  const [smsDelay, setSmsDelay] = useState('24');

  // Review request history
  const [reviewRequests, setReviewRequests] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const dirty = () => setIsDirty(true);

  const triggerLabels: Record<string, string> = {
    delay: 'After a time delay',
    scroll: 'After 70% scroll',
    exit: 'When leaving the page',
  };

  const smsDelayLabels: Record<string, string> = {
    '1': '1 hour',
    '3': '3 hours',
    '24': 'Next day',
    '48': '2 days',
  };

  // ── Load saved config ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('business_features')
          .select('reputation_manager_config, reputation_manager_enabled')
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          setError('Failed to load settings. Using defaults.');
          setTimeout(() => setError(null), 4000);
        }

        if (data?.reputation_manager_config) {
          const cfg = data.reputation_manager_config as Record<string, any>;
          if (cfg.google_review_url) setGoogleReviewUrl(cfg.google_review_url);
          if (cfg.trigger) setTrigger(cfg.trigger);
          if (cfg.delay_seconds) setDelaySeconds(cfg.delay_seconds);
          if (cfg.popup_text) setPopupText(cfg.popup_text);
          if (cfg.button_text) setButtonText(cfg.button_text);
          if (cfg.sms_enabled !== undefined) setSmsEnabled(cfg.sms_enabled);
          if (cfg.sms_template) setSmsTemplate(cfg.sms_template);
          if (cfg.sms_delay) setSmsDelay(cfg.sms_delay);
        }

        if (data?.reputation_manager_enabled || data?.reputation_manager_config?.google_review_url) {
          setIsConfigured(true);
        }
      } catch {
        setError('Failed to load settings. Using defaults.');
        setTimeout(() => setError(null), 4000);
      }
      setLoading(false);
    })();
  }, [user]);

  // ── Load review request history ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('scheduled_messages')
          .select('id, recipient_phone, recipient_email, scheduled_for, status')
          .eq('user_id', user.id)
          .eq('type', 'review_request')
          .in('status', ['scheduled', 'sent', 'failed'])
          .order('scheduled_for', { ascending: false })
          .limit(10);

        if (data) setReviewRequests(data);
      } catch {
        // silent
      }
      setReviewsLoading(false);
    })();
  }, [user]);

  // ── Save ──
  const handleSave = async () => {
    if (!user) return;

    if (smsEnabled) {
      const missing = ['{{client_name}}', '{{review_url}}'].filter(v => !smsTemplate.includes(v));
      if (missing.length) {
        setError(`SMS template is missing: ${missing.join(', ')}`);
        showToast({ title: 'Missing variables', message: `Add ${missing.join(', ')} to your template`, variant: 'error', duration: 5000 });
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('business_features')
        .update({
          reputation_manager_config: {
            google_review_url: googleReviewUrl,
            trigger,
            delay_seconds: delaySeconds,
            popup_text: popupText,
            button_text: buttonText,
            sms_enabled: smsEnabled,
            sms_template: smsTemplate,
            sms_delay: smsDelay,
          },
          reputation_manager_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setSaveSuccess(true);
      setIsConfigured(true);
      setIsEditing(false);
      setTimeout(() => { setSaveSuccess(false); setIsDirty(false); }, 2000);

      const reward = await claimReward('enable_reputation');
      if (reward?.success && !reward?.alreadyClaimed) {
        showToast({ title: 'Bonus Tokens!', message: '+25 tokens for enabling reputation manager', variant: 'success', duration: 4000 });
      }
    } catch {
      setError('Failed to save. Please try again.');
      showToast({ title: 'Error', message: 'Failed to save reputation settings.', variant: 'error', duration: 4000 });
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    }
    setSaving(false);
  };

  if (loading) return <PageSkeleton />;

  const statusColor: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    sent: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    failed: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  };

  // ── Not Configured — Setup CTA ──
  if (!isConfigured && !isEditing) {
    return (
      <div className="space-y-6 max-w-5xl">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-sm">Dismiss</button>
          </div>
        )}

        <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] p-8 text-center">
          <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Set Up Your Reputation Manager
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            Collect more Google reviews automatically. Connect your profile, set up website popups, and enable SMS follow-ups after appointments.
          </p>
          <PopButton color="blue" onClick={() => setShowSetupModal(true)}>
            <span className="flex items-center gap-2">
              Start Setup
              <ArrowRight className="w-4 h-4" />
            </span>
          </PopButton>
        </div>

        {/* Setup Modal */}
        <AnimatePresence>
          {showSetupModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowSetupModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="bg-white dark:bg-[#111114] rounded-2xl border border-gray-200 dark:border-[#1e1e24] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-[#1e1e24]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl flex items-center justify-center">
                        <Star className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reputation Manager Setup</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Here's what we'll configure</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSetupModal(false)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] rounded-lg transition-colors duration-200 ease-out"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    {SETUP_STEPS.map((step, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl ${step.bg} flex items-center justify-center flex-shrink-0`}>
                          <step.icon className={`w-5 h-5 ${step.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-gray-400">Step {i + 1}</span>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{step.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 dark:border-[#1e1e24] flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-400">Takes about 3 minutes</p>
                    <button
                      onClick={() => { setShowSetupModal(false); setIsEditing(true); }}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors duration-200 ease-out"
                    >
                      Let's Go
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Configured — Details View ──
  if (isConfigured && !isEditing) {
    return (
      <div className="space-y-6 max-w-5xl">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-sm">Dismiss</button>
          </div>
        )}

        {/* Status + Edit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Active</span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium transition-colors duration-200 ease-out"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Settings
          </button>
        </div>

        {/* Google Review Link Card */}
        <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1e1e24] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <Globe className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Google Review Link</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Where customers leave reviews</p>
            </div>
          </div>
          <div className="p-5">
            {googleReviewUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0e0e11]">
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-900 dark:text-white truncate">{googleReviewUrl}</span>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not set</p>
            )}
          </div>
        </div>

        {/* Website Popup Card */}
        <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1e1e24] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
              <MousePointerClick className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Website Popup</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Review prompt on your website</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0e0e11]">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Trigger</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {triggerLabels[trigger]}{trigger === 'delay' ? ` (${delaySeconds}s)` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0e0e11]">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Message</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{popupText}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0e0e11] flex items-center gap-3">
              <div className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md">{buttonText}</div>
              <span className="text-xs text-gray-400">Button preview</span>
            </div>
          </div>
        </div>

        {/* SMS Review Requests Card */}
        <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1e1e24] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                <Smartphone className="w-4.5 h-4.5 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SMS Review Requests</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Auto-send after appointments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {smsEnabled ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full">
                  <ToggleRight className="w-3 h-3" /> Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 dark:bg-[#1a1a1f] px-2 py-1 rounded-full">
                  <ToggleLeft className="w-3 h-3" /> Disabled
                </span>
              )}
            </div>
          </div>
          {smsEnabled && (
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-[#0e0e11]">
                <Send className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Send after</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{smsDelayLabels[smsDelay] || smsDelay}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0e0e11]">
                <p className="text-xs text-gray-500 mb-1">Message template</p>
                <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{smsTemplate}</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Review Requests */}
        <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1e1e24] flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
              <MessageSquare className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Requests</h3>
          </div>
          <div className="p-5">
            {reviewsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : reviewRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No review requests yet. They will appear here after appointments.
              </p>
            ) : (
              <div className="space-y-2">
                {reviewRequests.map((msg) => (
                  <div key={msg.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#0e0e11] gap-1 sm:gap-0">
                    <span className="text-sm text-gray-900 dark:text-white truncate">
                      {msg.recipient_phone || msg.recipient_email || 'Unknown'}
                    </span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-500">
                        {new Date(msg.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[msg.status] || 'bg-gray-100 text-gray-600'}`}>
                        {msg.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Edit / Initial Setup Form ──
  return (
    <div className="space-y-6 max-w-5xl">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-sm">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isConfigured ? 'Edit Settings' : 'Set Up Reputation Manager'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Collect more Google reviews automatically</p>
          </div>
        </div>
        {isConfigured && (
          <button
            onClick={() => { setIsEditing(false); setIsDirty(false); }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Google Review URL */}
      <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] p-5 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Google Review Link</h3>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-2">Google Business Profile &gt; Share review form</p>
          <input
            type="url"
            value={googleReviewUrl}
            onChange={(e) => { setGoogleReviewUrl(e.target.value); dirty(); }}
            placeholder="https://g.page/r/..."
            className={inputClass}
          />
        </div>
      </div>

      {/* Website Popup Settings */}
      <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] p-5 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-purple-50 dark:bg-purple-950/30 rounded-lg flex items-center justify-center">
            <MousePointerClick className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Website Popup</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Show popup</label>
            <select
              value={trigger}
              onChange={(e) => { setTrigger(e.target.value as 'delay' | 'scroll' | 'exit'); dirty(); }}
              className={inputClass}
            >
              <option value="delay">After a time delay</option>
              <option value="scroll">After 70% scroll</option>
              <option value="exit">When leaving the page</option>
            </select>
          </div>

          {trigger === 'delay' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delay (seconds)</label>
              <input
                type="number"
                value={delaySeconds}
                onChange={(e) => { setDelaySeconds(parseInt(e.target.value) || 30); dirty(); }}
                min={5}
                max={300}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <input
              type="text"
              value={popupText}
              onChange={(e) => { setPopupText(e.target.value); dirty(); }}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Button label</label>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => { setButtonText(e.target.value); dirty(); }}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* SMS Review Requests */}
      <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-50 dark:bg-green-950/30 rounded-lg flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">SMS Review Requests</h3>
              <p className="text-xs text-gray-400">Auto-send after appointments</p>
            </div>
          </div>
          <button
            onClick={() => { setSmsEnabled(!smsEnabled); dirty(); }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-out ${smsEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-out ${smsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {smsEnabled && (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Send after</label>
              <select
                value={smsDelay}
                onChange={(e) => { setSmsDelay(e.target.value); dirty(); }}
                className={inputClass}
              >
                <option value="1">1 hour</option>
                <option value="3">3 hours</option>
                <option value="24">Next day</option>
                <option value="48">2 days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message template</label>
              <textarea
                value={smsTemplate}
                onChange={(e) => { setSmsTemplate(e.target.value); dirty(); }}
                rows={3}
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs text-gray-400 mt-1">
                Variables: <code className="text-gray-600 dark:text-gray-300">{'{{client_name}}'}</code>, <code className="text-gray-600 dark:text-gray-300">{'{{business_name}}'}</code>, <code className="text-gray-600 dark:text-gray-300">{'{{review_url}}'}</code>
              </p>
            </div>
          </div>
        )}
      </div>

      <UnsavedChanges
        open={isDirty}
        isSaving={saving}
        success={saveSuccess}
        error={saveError}
        onReset={() => { setIsDirty(false); if (isConfigured) setIsEditing(false); else window.location.reload(); }}
        onSave={handleSave}
      />
    </div>
  );
};

export default ReputationPage;
