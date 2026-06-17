import React, { useState } from 'react';
import {
  Phone,
  MessageSquare,
  BarChart2,
  PhoneCall,
  Settings,
  Sparkles,
  CheckCircle,
  ChevronDown,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type Category = 'general' | 'bug' | 'feature';

type Topic =
  | 'AI Receptionist'
  | 'SMS Agent'
  | 'Dashboard & Analytics'
  | 'Calls & Phone'
  | 'Onboarding & Setup'
  | 'Other';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'general', label: 'General feedback' },
  { value: 'bug', label: 'Bug report' },
  { value: 'feature', label: 'Feature request' },
];

const TOPICS: { value: Topic; icon: React.ReactNode }[] = [
  { value: 'AI Receptionist', icon: <Phone className="w-4 h-4" /> },
  { value: 'SMS Agent', icon: <MessageSquare className="w-4 h-4" /> },
  { value: 'Dashboard & Analytics', icon: <BarChart2 className="w-4 h-4" /> },
  { value: 'Calls & Phone', icon: <PhoneCall className="w-4 h-4" /> },
  { value: 'Onboarding & Setup', icon: <Settings className="w-4 h-4" /> },
  { value: 'Other', icon: <Sparkles className="w-4 h-4" /> },
];

const NPS_LABELS: Record<number, string> = {
  1: 'Very unlikely',
  5: 'Neutral',
  10: 'Very likely',
};

const STEP_LABELS = ['Feedback on', 'Details', 'Rating'];

export function getFeedbackSubmittedStorageKey(userId = 'anonymous') {
  return `boltcall_feedback_submitted:${userId}`;
}

const FeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [nps, setNps] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const categoryLabel = CATEGORIES.find(c => c.value === category)?.label ?? category;
    const npsLine = nps !== null ? `\n\nLikelihood to recommend (1-10): ${nps}` : '';
    const topicLine = topic ? `Topic: ${topic}\n` : '';
    const bodyText = `${topicLine}Category: ${categoryLabel}\n\n${feedback.trim()}${npsLine}`;

    window.localStorage.setItem(getFeedbackSubmittedStorageKey(user?.id ?? 'anonymous'), 'true');

    const subject = encodeURIComponent(`Boltcall Feedback - ${categoryLabel}`);
    const body = encodeURIComponent(bodyText);
    window.open(`mailto:noam@boltcall.org?subject=${subject}&body=${body}`, '_blank');
    setSubmitted(true);
  };

  const resetForm = () => {
    setStep(1);
    setTopic(null);
    setFeedback('');
    setNps(null);
    setCategory('general');
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-16 flex flex-col items-center gap-4 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-green-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Thanks for your feedback!
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          We read every submission. If you need a response, reach us directly at{' '}
          <a href="mailto:noam@boltcall.org" className="text-blue-600 hover:underline">
            noam@boltcall.org
          </a>
        </p>
        <button
          onClick={resetForm}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 px-4 py-5">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Share Your Feedback</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Help us improve Boltcall. Your feedback shapes the product.
        </p>
      </div>

      <div className="flex items-center">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = (idx + 1) as 1 | 2 | 3;
          const isCurrent = stepNum === step;
          const isDone = stepNum < step;

          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${isDone ? 'bg-blue-600 text-white' : isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-200 dark:ring-blue-900' : 'bg-gray-100 dark:bg-[#1a1a20] text-gray-400 dark:text-gray-500'}`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : stepNum}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isDone ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}
                >
                  {label}
                </span>
              </div>
              {idx < STEP_LABELS.length - 1 && (
                <div
                  className={`h-px flex-1 mb-4 mx-1 transition-colors ${stepNum < step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-[#2a2a30]'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="bg-white dark:bg-[#111114] rounded-lg border border-gray-200 dark:border-[#1e1e24] p-4 space-y-4">
        {step === 1 && (
          <>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                What is your feedback about?
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {TOPICS.map(({ value, icon }) => {
                const selected = topic === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTopic(value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-xs font-medium transition-colors ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-[#1e1e24] bg-gray-50 dark:bg-[#0e0e11] text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'}`}
                  >
                    <span className={selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}>
                      {icon}
                    </span>
                    {value}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!topic}
              onClick={() => setStep(2)}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              Next
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Tell us more
              </h2>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                  className="w-full appearance-none px-3 py-2 pr-8 text-xs bg-gray-50 dark:bg-[#0e0e11] border border-gray-200 dark:border-[#1e1e24] rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <MessageSquare className="w-3 h-3" />
                Your feedback
              </label>
              <textarea
                aria-label="Your feedback"
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="What's working? What could be better?"
                rows={4}
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#0e0e11] border border-gray-200 dark:border-[#1e1e24] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2 px-3 rounded-lg border border-gray-200 dark:border-[#1e1e24] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>
              <button
                type="button"
                disabled={!feedback.trim()}
                onClick={() => setStep(3)}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Rate your experience
              </h2>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                How likely are you to recommend Boltcall?
                <span className="normal-case tracking-normal bg-gray-100 dark:bg-[#1a1a20] text-gray-400 dark:text-gray-500 text-[10px] px-1.5 py-0.5 rounded-full font-normal">
                  Optional
                </span>
              </label>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNps(nps === n ? null : n)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors border ${nps === n ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 dark:bg-[#0e0e11] border-gray-200 dark:border-[#1e1e24] text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {nps !== null && (
                <p className="text-xs text-gray-400">
                  {NPS_LABELS[nps] ?? (nps <= 3 ? 'Unlikely' : nps <= 7 ? 'Somewhat likely' : 'Likely')}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 py-2 px-3 rounded-lg border border-gray-200 dark:border-[#1e1e24] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Send Feedback
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
