import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Bot, Building2, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Zap, Shield, MessageSquare, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FUNCTIONS_BASE } from '../lib/api';
import { authedFetch } from '../lib/authedFetch';

// Voice-agent setup is a multi-step wizard that creates billable Retell and
// Twilio resources behind authenticated fetches. It is NOT an SEO landing
// page — it is a private user-action flow. Tell crawlers not to index it.
function useNoindex() {
  useEffect(() => {
    let tag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'robots';
      document.head.appendChild(tag);
    }
    const previous = tag.content;
    tag.content = 'noindex, nofollow';
    return () => { tag!.content = previous || ''; };
  }, []);
}

type FormData = {
  agentName: string;
  name: string;
  industry: string;
  location: string;
  website: string;
  phone: string;
  email: string;
  hours: string;
  timezone: string;
  tone: string;
  transfer_number: string;
  booking_url: string;
  services: { name: string; description: string; price: string }[];
  faq: { question: string; answer: string }[];
  additional_info: string;
  houseRule: string;
};

// Foot-in-the-door (P10): naming the agent is the tiniest possible first ask,
// and the name personalizes every later step (P8 endowment).
const SUGGESTED_NAMES = ['Alex', 'Sam', 'Riley'];

// Ovsiankina (P20): persist progress so an interrupted setup resumes at the
// exact step with answers intact. localStorage is per-browser — good enough.
const RESUME_KEY = 'voiceAgentOnboarding.v1';

type SavedState = { step: number; form: FormData; startedAt: number };

function loadSavedState(): SavedState | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    if (typeof parsed.step !== 'number' || !parsed.form) return null;
    return parsed;
  } catch {
    return null;
  }
}

const INDUSTRIES = [
  'Dental', 'Healthcare', 'Medical', 'Legal', 'Real Estate',
  'Restaurant', 'HVAC', 'Plumbing', 'Roofing', 'Solar',
  'Salon / Spa', 'Fitness', 'Auto / Mechanic', 'Home Services',
  'Professional Services', 'Other',
];

const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Clear, polished, trustworthy' },
  { value: 'friendly', label: 'Friendly', desc: 'Warm, approachable, casual' },
  { value: 'authoritative', label: 'Authoritative', desc: 'Confident, expert, commanding' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed, conversational, easygoing' },
];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Phoenix', 'Europe/London',
  'Europe/Paris', 'Asia/Jerusalem', 'Australia/Sydney',
];

const initialForm: FormData = {
  agentName: '', name: '', industry: '', location: '', website: '', phone: '',
  email: '', hours: '9am-5pm Mon-Fri', timezone: 'America/New_York',
  tone: 'professional', transfer_number: '', booking_url: '',
  services: [{ name: '', description: '', price: '' }],
  faq: [{ question: '', answer: '' }],
  additional_info: '',
  houseRule: '',
};

export default function VoiceAgentOnboarding() {
  useNoindex();
  const saved = React.useMemo(loadSavedState, []);
  const [step, setStep] = useState(saved?.step ?? 0);
  const [form, setForm] = useState<FormData>(saved?.form ? { ...initialForm, ...saved.form } : initialForm);
  const [startedAt] = useState<number>(saved?.startedAt ?? Date.now());
  const [status, setStatus] = useState<'idle' | 'submitting' | 'provisioning' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Agent name for copy — fallback keeps strings readable before naming
  const agentName = form.agentName.trim() || 'your agent';

  // Persist progress on every change (P20); cleared on successful launch
  useEffect(() => {
    if (status === 'done') {
      localStorage.removeItem(RESUME_KEY);
      return;
    }
    try {
      localStorage.setItem(RESUME_KEY, JSON.stringify({ step, form, startedAt } satisfies SavedState));
    } catch { /* storage full/blocked — resume is best-effort */ }
  }, [step, form, startedAt, status]);

  // Peak-end (P9): celebrate the launch
  useEffect(() => {
    if (status !== 'done') return;
    confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
  }, [status]);

  const update = (field: keyof FormData, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const updateService = (i: number, field: string, value: string) => {
    const services = [...form.services];
    services[i] = { ...services[i], [field]: value };
    setForm(prev => ({ ...prev, services }));
  };

  const updateFaq = (i: number, field: string, value: string) => {
    const faq = [...form.faq];
    faq[i] = { ...faq[i], [field]: value };
    setForm(prev => ({ ...prev, faq }));
  };

  const addService = () =>
    setForm(prev => ({ ...prev, services: [...prev.services, { name: '', description: '', price: '' }] }));

  const addFaq = () =>
    setForm(prev => ({ ...prev, faq: [...prev.faq, { question: '', answer: '' }] }));

  const removeService = (i: number) =>
    setForm(prev => ({ ...prev, services: prev.services.filter((_, idx) => idx !== i) }));

  const removeFaq = (i: number) =>
    setForm(prev => ({ ...prev, faq: prev.faq.filter((_, idx) => idx !== i) }));

  const canProceed = () => {
    if (step === 0) return form.agentName.trim().length > 0;
    if (step === 1) return form.name && form.industry;
    return true;
  };

  const handleSubmit = async () => {
    setStatus('submitting');
    setError('');

    try {
      // Clean up empty services and FAQs
      const payload = {
        ...form,
        services: form.services.filter(s => s.name),
        faq: form.faq.filter(f => f.question),
      };

      // Step 1: Create knowledge base + agent via Retell
      const kbText = [
        `Business: ${payload.name}`,
        `Industry: ${payload.industry}`,
        `Location: ${payload.location}`,
        `Hours: ${payload.hours}`,
        `Tone: ${payload.tone}`,
        payload.services.length > 0
          ? `Services:\n${payload.services.map(s => `- ${s.name}${s.price ? ` ($${s.price})` : ''}${s.description ? `: ${s.description}` : ''}`).join('\n')}`
          : '',
        payload.faq.length > 0
          ? `FAQ:\n${payload.faq.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
          : '',
        payload.houseRule.trim() ? `House Rule (must always be followed): ${payload.houseRule.trim()}` : '',
        payload.additional_info ? `Additional Info: ${payload.additional_info}` : '',
      ].filter(Boolean).join('\n\n');

      // Bound the request so a hung backend surfaces a clear error instead of
      // an indefinite spinner — well above the "usually 30-60s" UI copy.
      const agentRes = await authedFetch(`${FUNCTIONS_BASE}/retell-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_full',
          business_name: payload.name,
          agent_name: payload.agentName.trim() || undefined,
          website_url: payload.website || undefined,
          language: 'en-US',
          knowledge_base_texts: [{ title: `${payload.name} Knowledge Base`, text: kbText }],
        }),
        signal: AbortSignal.timeout(90000),
      });

      if (!agentRes.ok) {
        const errBody = await agentRes.json().catch(() => ({} as any));
        if (agentRes.status === 409 && errBody.code === 'provisioning_in_progress') {
          throw new Error('Setup is already in progress for your account. Please wait a moment and refresh.');
        }
        throw new Error(errBody.error || 'Failed to create AI agent');
      }
      const agentData = await agentRes.json();
      if (!agentData.success) throw new Error(agentData.error || 'Agent creation failed');

      setStatus('provisioning');

      // Step 2: Search and purchase a phone number via Twilio
      const searchRes = await authedFetch(`${FUNCTIONS_BASE}/twilio-numbers?action=available&country=US`, {
        method: 'GET',
      });

      let phoneNumber = null;
      if (searchRes.ok) {
        const numbers = await searchRes.json();
        if (numbers.length > 0) {
          // Purchase the first available number
          const purchaseRes = await authedFetch(`${FUNCTIONS_BASE}/twilio-numbers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'purchase',
              phone_number: numbers[0].phone_number,
            }),
          });
          if (purchaseRes.ok) {
            const purchased = await purchaseRes.json();
            phoneNumber = purchased.phone_number || numbers[0].friendly_name;
          }
        }
      }

      setResult({
        phone_number: phoneNumber || 'Number pending — configure in dashboard',
        inbound_agent: { agent_id: agentData.agent_id },
        outbound_agent: { agent_id: 'Configure in dashboard' },
      });
      setStatus('done');
    } catch (err: any) {
      const message = err?.name === 'AbortError' || err?.name === 'TimeoutError'
        ? 'This is taking longer than expected. Please try again in a minute.'
        : err.message || 'Something went wrong';
      setError(message);
      setStatus('error');
    }
  };

  const steps = [
    { title: 'Name your agent', icon: Sparkles },
    { title: 'Your business', icon: Building2 },
    { title: `Teach ${form.agentName.trim() || 'it'}`, icon: MessageSquare },
    { title: 'Preferences', icon: Zap },
    { title: 'Launch', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-gray-950/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Bot className="w-8 h-8 text-blue-400" />
          <span className="text-xl font-bold">Boltcall Voice Agent Setup</span>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-12">
          {/* Endowed progress (P6): account step pre-checked so the meter never starts empty */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500/20 text-green-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-white">Account</span>
          </div>
          <div className="flex-1 h-px mx-4 mt-[-20px] bg-green-500/40" />
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  i < step ? 'bg-green-500/20 text-green-400' :
                  i === step ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-400/50' :
                  'bg-white/5 text-gray-500'
                }`}>
                  {i < step ? <CheckCircle2 className="w-6 h-6" /> : <s.icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-medium ${i <= step ? 'text-white' : 'text-gray-500'}`}>
                  {s.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-4 mt-[-20px] ${i < step ? 'bg-green-500/40' : 'bg-white/10'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 0: Name your agent (P10 tiniest first ask, P8 endowment) */}
            {step === 0 && (
              <div className="space-y-6 max-w-xl mx-auto text-center">
                <h2 className="text-2xl font-bold">First, give your AI a name</h2>
                <p className="text-gray-400">This is who answers your calls. You can change it anytime.</p>

                <input
                  type="text"
                  value={form.agentName}
                  onChange={e => update('agentName', e.target.value)}
                  autoFocus
                  className="w-full px-4 py-4 text-center text-xl bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="e.g., Alex"
                />

                <div className="flex items-center justify-center gap-3">
                  {SUGGESTED_NAMES.map(n => (
                    <button
                      key={n}
                      onClick={() => update('agentName', n)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        form.agentName === n
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/25'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Tell us about your business</h2>
                <p className="text-gray-400">{form.agentName.trim() ? `${form.agentName.trim()} will represent your business on every call.` : "We'll tailor your AI to your business."}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Business Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => update('name', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="e.g., Smith Dental Clinic"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Industry *</label>
                    <select
                      value={form.industry}
                      onChange={e => update('industry', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select industry</option>
                      {INDUSTRIES.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={e => update('location', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="e.g., New York, NY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
                    <input
                      type="url"
                      value={form.website}
                      onChange={e => update('website', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => update('phone', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="contact@business.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Teach it your business (P7 IKEA — the labor) */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">What should {agentName} know?</h2>
                <p className="text-gray-400">{form.agentName.trim() ? `${form.agentName.trim()} is learning your business — the more you teach, the better the answers.` : 'Your AI will use this to answer caller questions.'}</p>

                {/* Services */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Services you offer</h3>
                  {form.services.map((svc, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-3 mb-3">
                      <input
                        type="text"
                        value={svc.name}
                        onChange={e => updateService(i, 'name', e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                        placeholder="Service name"
                      />
                      <input
                        type="text"
                        value={svc.price}
                        onChange={e => updateService(i, 'price', e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                        placeholder="Price (e.g., $99)"
                      />
                      <input
                        type="text"
                        value={svc.description}
                        onChange={e => updateService(i, 'description', e.target.value)}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none col-span-2"
                        placeholder="Brief description (optional)"
                      />
                      {form.services.length > 1 && (
                        <button onClick={() => removeService(i)} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                      )}
                    </div>
                  ))}
                  <button onClick={addService} className="text-blue-400 hover:text-blue-300 text-sm font-medium">+ Add service</button>
                </div>

                {/* FAQ */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Frequently Asked Questions</h3>
                  {form.faq.map((faq, i) => (
                    <div key={i} className="space-y-2 mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
                      <input
                        type="text"
                        value={faq.question}
                        onChange={e => updateFaq(i, 'question', e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                        placeholder="Question callers often ask"
                      />
                      <textarea
                        value={faq.answer}
                        onChange={e => updateFaq(i, 'answer', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none resize-none"
                        placeholder="How the agent should answer"
                      />
                      {form.faq.length > 1 && (
                        <button onClick={() => removeFaq(i)} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                      )}
                    </div>
                  ))}
                  <button onClick={addFaq} className="text-blue-400 hover:text-blue-300 text-sm font-medium">+ Add FAQ</button>
                </div>
              </div>
            )}

            {/* Step 3: Preferences + house rule */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">How should {agentName} behave?</h2>
                <p className="text-gray-400">Set the hours, tone, and rules {agentName} follows.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Business Hours</label>
                    <input
                      type="text"
                      value={form.hours}
                      onChange={e => update('hours', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                      placeholder="9am-5pm Mon-Fri"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Timezone</label>
                    <select
                      value={form.timezone}
                      onChange={e => update('timezone', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500 outline-none"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Transfer Number</label>
                    <input
                      type="tel"
                      value={form.transfer_number}
                      onChange={e => update('transfer_number', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                      placeholder="Number to transfer to if AI can't help"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Booking URL</label>
                    <input
                      type="url"
                      value={form.booking_url}
                      onChange={e => update('booking_url', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                      placeholder="https://cal.com/yourbusiness"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Agent Tone</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TONES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => update('tone', t.value)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          form.tone === t.value
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/20'
                        }`}
                      >
                        <div className="font-medium text-sm">{t.label}</div>
                        <div className="text-xs text-gray-400 mt-1">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* House rule (P11 commitment): user-authored rule the UI can reference later */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Write one house rule for {agentName}</label>
                  <textarea
                    value={form.houseRule}
                    onChange={e => update('houseRule', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none resize-none"
                    placeholder={'e.g., "Never quote prices over $500 — offer to transfer instead"'}
                  />
                  <p className="text-xs text-gray-500 mt-1">{agentName ? `${form.agentName.trim() || 'Your agent'} will always follow this.` : ''}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Additional Info</label>
                  <textarea
                    value={form.additional_info}
                    onChange={e => update('additional_info', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 outline-none resize-none"
                    placeholder="Anything else your AI agent should know? Special policies, seasonal hours, etc."
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review & Launch */}
            {step === 4 && (
              <div className="space-y-6">
                {status === 'idle' && (
                  <>
                    <h2 className="text-2xl font-bold">{form.agentName.trim() ? `${form.agentName.trim()} is ready to go live` : 'Review & Launch'}</h2>
                    <p className="text-gray-400">We'll create 2 AI voice agents and assign a phone number.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                          <Phone className="w-5 h-5 text-green-400" />
                          <span className="font-semibold">Inbound Agent</span>
                        </div>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>Answers incoming calls 24/7</li>
                          <li>Books appointments</li>
                          <li>Answers FAQs from your info</li>
                          <li>Transfers to human when needed</li>
                        </ul>
                      </div>
                      <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                          <Bot className="w-5 h-5 text-blue-400" />
                          <span className="font-semibold">Outbound Agent</span>
                        </div>
                        <ul className="text-sm text-gray-400 space-y-1">
                          <li>Appointment reminders</li>
                          <li>Follow-up after service</li>
                          <li>Google review collection</li>
                          <li>Re-engagement calls</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-5 bg-white/5 rounded-xl border border-white/10">
                      <h3 className="font-semibold mb-3">Your Info</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-400">Agent name:</div><div>{form.agentName.trim() || '—'}</div>
                        <div className="text-gray-400">Business:</div><div>{form.name}</div>
                        <div className="text-gray-400">Industry:</div><div>{form.industry}</div>
                        <div className="text-gray-400">Location:</div><div>{form.location || '—'}</div>
                        <div className="text-gray-400">Tone:</div><div className="capitalize">{form.tone}</div>
                        <div className="text-gray-400">Services:</div><div>{form.services.filter(s => s.name).length} listed</div>
                        <div className="text-gray-400">FAQs:</div><div>{form.faq.filter(f => f.question).length} listed</div>
                        <div className="text-gray-400">House rule:</div><div>{form.houseRule.trim() ? '1 set' : '—'}</div>
                      </div>
                    </div>
                  </>
                )}

                {status === 'submitting' && (
                  <div className="text-center py-16">
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold">Saving your business info...</h2>
                    <p className="text-gray-400 mt-2">This takes just a moment.</p>
                  </div>
                )}

                {status === 'provisioning' && (
                  <div className="text-center py-16">
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-bold">Bringing {agentName} to life...</h2>
                    <p className="text-gray-400 mt-2">
                      Generating prompts, deploying agents, and provisioning your phone number.
                      <br />This usually takes 30-60 seconds.
                    </p>
                    <div className="mt-6 space-y-2 text-sm text-gray-500">
                      <p>1. Generating AI prompts with Claude...</p>
                      <p>2. Creating inbound agent on Retell...</p>
                      <p>3. Creating outbound agent on Retell...</p>
                      <p>4. Provisioning phone number via Twilio...</p>
                      <p>5. Connecting everything together...</p>
                    </div>
                  </div>
                )}

                {status === 'done' && result && (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">
                      You built {form.agentName.trim() || 'your agent'} in {Math.max(1, Math.round((Date.now() - startedAt) / 60000))} minute{Math.max(1, Math.round((Date.now() - startedAt) / 60000)) !== 1 ? 's' : ''}.
                    </h2>
                    <p className="text-gray-400 mb-8">
                      {form.agentName.trim() || 'Your agent'} is now answering for {form.name || 'your business'}.
                    </p>

                    <div className="max-w-md mx-auto space-y-4">
                      {/* The peak (P9): make the test call the first thing they do */}
                      <div className="p-5 bg-green-500/10 rounded-xl border border-green-500/20">
                        <div className="text-green-400 font-semibold mb-2">Call {form.agentName.trim() || 'your agent'} right now</div>
                        <div className="text-3xl font-bold">{result.phone_number}</div>
                        <p className="text-sm text-gray-400 mt-2">Dial from your phone and hear {form.agentName.trim() || 'your agent'} answer for {form.name || 'your business'}</p>
                      </div>

                      <a
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors"
                      >
                        Go to your dashboard <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {status === 'error' && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-red-400 text-3xl">!</span>
                    </div>
                    <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-red-400 mb-6">{error}</p>
                    <button
                      onClick={() => { setStatus('idle'); setError(''); }}
                      className="px-6 py-3 bg-white/10 hover:bg-white/15 rounded-xl font-medium transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {status === 'idle' && (
          <div className="flex justify-between mt-10">
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                step === 0 ? 'opacity-0 pointer-events-none' : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {step < 4 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  canProceed()
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-semibold transition-all"
              >
                <Zap className="w-5 h-5" /> Launch AI Agents
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
