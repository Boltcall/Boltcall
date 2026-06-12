import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';

import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import Header from '../components/Header';
import { updateMetaDescription } from '../lib/utils';

type OfferSlug = 'after-hours-lead-rescue' | 'automatic-reviews-agent' | 'reminders-agent';

type FieldType = 'text' | 'email' | 'tel' | 'url' | 'number' | 'time' | 'select';

interface SetupField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface DoneForYouSetupOffer {
  slug: OfferSlug;
  path: string;
  eyebrow: string;
  offer: string;
  promise: string;
  cap: string;
  heroMetric: string;
  heroMetricLabel: string;
  bestFor: string[];
  installSteps: string[];
  fields: SetupField[];
  metaTitle: string;
  metaDescription: string;
}

const commonFields: SetupField[] = [
  { name: 'businessName', label: 'Business name', type: 'text', required: true, placeholder: 'Blue Star Plumbing' },
  { name: 'contactName', label: 'Contact name', type: 'text', required: true, placeholder: 'Jordan Lee' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'jordan@company.com' },
  { name: 'phone', label: 'Your mobile phone', type: 'tel', required: true, placeholder: '+1 555 123 4567' },
  { name: 'businessPhone', label: 'Business phone', type: 'tel', required: true, placeholder: '+1 555 987 6543' },
  { name: 'website', label: 'Website', type: 'url', placeholder: 'https://yourcompany.com' },
  { name: 'industry', label: 'Industry', type: 'text', required: true, placeholder: 'HVAC, dental, legal, med spa...' },
];

export const doneForYouSetupOffers: Record<OfferSlug, DoneForYouSetupOffer> = {
  'after-hours-lead-rescue': {
    slug: 'after-hours-lead-rescue',
    path: '/after-hours-lead-rescue',
    eyebrow: 'Missed-call SMS responder',
    offer: 'Free 7-Day After-Hours Lead Rescue Setup',
    promise: 'We install an instant missed-call SMS responder for local service businesses.',
    cap: 'First 100 SMS included',
    heroMetric: '<60 sec',
    heroMetricLabel: 'first reply target after a missed call',
    bestFor: [
      'Local service teams that miss evening, weekend, or lunch-break calls',
      'Owners who want every voicemail to get an instant text reply',
      'Teams that need one test message before importing contacts',
    ],
    installSteps: [
      'Confirm the missed-call source and after-hours window',
      'Install a short SMS responder with STOP opt-out language',
      'Run one test message, then turn on the first 100 SMS',
    ],
    fields: [
      ...commonFields,
      { name: 'currentPhoneSystem', label: 'Current phone system', type: 'text', required: true, placeholder: 'Twilio, RingCentral, OpenPhone, ServiceTitan...' },
      { name: 'timezone', label: 'Timezone', type: 'text', required: true, placeholder: 'America/New_York' },
      { name: 'afterHoursStart', label: 'After-hours start', type: 'time', required: true },
      { name: 'afterHoursEnd', label: 'After-hours end', type: 'time', required: true },
      { name: 'estimatedMissedCalls', label: 'Estimated missed calls per week', type: 'number', required: true, placeholder: '15' },
      {
        name: 'missedCallSource',
        label: 'Missed-call source',
        type: 'select',
        required: true,
        options: ['Main business line', 'Google Business Profile', 'Website number', 'Ads tracking number', 'Other'],
      },
    ],
    metaTitle: 'Free After-Hours Lead Rescue Setup | Boltcall',
    metaDescription: 'Free 7-day setup: Boltcall installs an instant missed-call SMS responder for local service businesses. First 100 SMS included.',
  },
  'automatic-reviews-agent': {
    slug: 'automatic-reviews-agent',
    path: '/automatic-reviews-agent',
    eyebrow: 'Review request SMS agent',
    offer: 'Free 7-Day Automatic Reviews Agent Setup',
    promise: 'We install an SMS review request agent that texts the first 100 customers.',
    cap: 'First 100 contacts included',
    heroMetric: '100',
    heroMetricLabel: 'customers queued for compliant review requests',
    bestFor: [
      'Businesses with happy customers but inconsistent review follow-up',
      'Teams that need a simple SMS review request workflow installed',
      'Owners who want the first test message approved before import',
    ],
    installSteps: [
      'Verify your Google review link and contact source',
      'Install the review request SMS with STOP opt-out language',
      'Send one test message, then import the first 100 contacts',
    ],
    fields: [
      ...commonFields,
      { name: 'googleReviewLink', label: 'Google review link', type: 'url', required: true, placeholder: 'https://g.page/r/...' },
      {
        name: 'contactSource',
        label: 'Contact source',
        type: 'select',
        required: true,
        options: ['Google Sheet', 'CSV export', 'CRM', 'Booking system', 'Point of sale', 'Other'],
      },
      { name: 'estimatedContacts', label: 'Estimated contacts ready to text', type: 'number', required: true, placeholder: '100' },
    ],
    metaTitle: 'Free Automatic Reviews Agent Setup | Boltcall',
    metaDescription: 'Free 7-day setup: Boltcall installs an SMS review request agent and texts the first 100 customers after approval.',
  },
  'reminders-agent': {
    slug: 'reminders-agent',
    path: '/reminders-agent',
    eyebrow: 'Customer reminder SMS agent',
    offer: 'Free 7-Day Reminders Agent Setup',
    promise: 'We install an SMS reminders agent for overdue/upcoming customers.',
    cap: 'First 100 contacts included',
    heroMetric: '7 days',
    heroMetricLabel: 'to install, test, and start the first reminder run',
    bestFor: [
      'Teams with overdue customers, upcoming appointments, or stale estimates',
      'Businesses that want reminder texts connected to a booking link',
      'Owners who need opt-out language and one test before import',
    ],
    installSteps: [
      'Confirm the reminder type, timing, and booking link',
      'Install the reminder SMS with STOP opt-out language',
      'Run one test message, then import the first 100 contacts',
    ],
    fields: [
      ...commonFields,
      {
        name: 'reminderType',
        label: 'Reminder type',
        type: 'select',
        required: true,
        options: ['Overdue follow-up', 'Upcoming appointment', 'Maintenance recall', 'Unbooked estimate', 'Other'],
      },
      { name: 'bookingLink', label: 'Booking link', type: 'url', required: true, placeholder: 'https://cal.com/your-company' },
      {
        name: 'contactSource',
        label: 'Contact source',
        type: 'select',
        required: true,
        options: ['Google Sheet', 'CSV export', 'CRM', 'Booking system', 'Point of sale', 'Other'],
      },
      { name: 'estimatedContacts', label: 'Estimated contacts ready to text', type: 'number', required: true, placeholder: '100' },
    ],
    metaTitle: 'Free Reminders Agent Setup | Boltcall',
    metaDescription: 'Free 7-day setup: Boltcall installs an SMS reminders agent for overdue or upcoming customers. First 100 contacts included.',
  },
};

const successMessage = "Setup created. Next: we'll run one test message before importing the first 100 contacts.";

function initialValues(fields: SetupField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = '';
    return acc;
  }, {});
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateUrl(url: string) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function firstValidationError(fields: SetupField[], values: Record<string, string>, smsConsent: boolean) {
  for (const field of fields) {
    const value = values[field.name]?.trim() ?? '';
    if (field.required && !value) return `${field.label} is required.`;
    if (field.type === 'email' && value && !validateEmail(value)) return 'Please enter a valid email address.';
    if (field.type === 'url' && value && !validateUrl(value)) return `${field.label} must be a valid http or https URL.`;
    if (field.type === 'number' && value && Number(value) < 0) return `${field.label} must be zero or higher.`;
  }

  if (!smsConsent) {
    return 'SMS consent is required.';
  }

  return '';
}

const fieldClass =
  'mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

const labelClass = 'text-sm font-semibold text-slate-800';

function SetupFieldInput({
  field,
  value,
  onChange,
}: {
  field: SetupField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={labelClass}>
      {field.label}
      {field.required ? <span className="text-blue-600"> *</span> : null}
      {field.type === 'select' ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClass}
          aria-label={field.label}
        >
          <option value="">Select one</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClass}
          placeholder={field.placeholder}
          aria-label={field.label}
        />
      )}
    </label>
  );
}

function OfferForm({ offer }: { offer: DoneForYouSetupOffer }) {
  const [values, setValues] = useState(() => initialValues(offer.fields));
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setValues(initialValues(offer.fields));
    setSmsConsent(false);
    setError('');
    setIsSuccess(false);
    setIsSubmitting(false);
  }, [offer]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const validationError = firstValidationError(offer.fields, values, smsConsent);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/.netlify/functions/setup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerSlug: offer.slug,
          pagePath: offer.path,
          fields: Object.fromEntries(
            Object.entries(values).map(([key, value]) => [key, value.trim()]),
          ),
          smsConsent,
        }),
      });

      if (!response.ok) {
        throw new Error('Setup request failed');
      }

      setIsSuccess(true);
    } catch {
      setError('Something went wrong creating the setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6" role="status">
        <CheckCircle2 className="mb-4 h-9 w-9 text-emerald-600" aria-hidden="true" />
        <h2 className="text-xl font-bold text-slate-950">Setup created</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{successMessage}</p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Done-for-you setup</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Create your setup request</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tell us where to install it. We will confirm the test message before any live import.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {offer.fields.map((field) => (
          <SetupFieldInput
            key={field.name}
            field={field}
            value={values[field.name] ?? ''}
            onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
          />
        ))}
      </div>

      <label className="mt-5 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={smsConsent}
          onChange={(event) => setSmsConsent(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span>
          I confirm this business can message these contacts, and I understand recipients can opt out with STOP.
          <span className="text-blue-600"> *</span>
        </span>
      </label>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-slate-950 bg-blue-600 px-5 py-3 text-base font-bold text-white shadow-[4px_4px_0_0_#020617] transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
        {isSubmitting ? 'Creating setup...' : 'Create my free setup'}
        {!isSubmitting ? <ArrowRight className="h-5 w-5" aria-hidden="true" /> : null}
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        No list import happens until you approve the first test message.
      </p>
    </form>
  );
}

function JsonLd({ offer }: { offer: DoneForYouSetupOffer }) {
  const json = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: offer.offer,
      provider: {
        '@type': 'Organization',
        name: 'Boltcall',
        url: 'https://boltcall.org',
      },
      areaServed: 'US',
      description: offer.promise,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: offer.cap,
      },
    }),
    [offer],
  );

  return <script type="application/ld+json">{JSON.stringify(json)}</script>;
}

function DoneForYouSetupOfferPage({ offer }: { offer: DoneForYouSetupOffer }) {
  useEffect(() => {
    document.title = offer.metaTitle;
    updateMetaDescription(offer.metaDescription);
  }, [offer]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <JsonLd offer={offer} />
      <GiveawayBar />
      <Header />

      <main>
        <section className="bg-white pt-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:px-8 lg:pb-20">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {offer.eyebrow}
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {offer.offer}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">{offer.promise}</p>

              <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-3xl font-black text-blue-600">{offer.heroMetric}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-600">{offer.heroMetricLabel}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-lg font-black text-slate-950">{offer.cap}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-600">included before any larger rollout</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <Clock3 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  7-day install
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <MessageSquareText className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  SMS test first
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  STOP opt-out language
                </span>
              </div>
            </div>

            <OfferForm offer={offer} />
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-950 py-10 text-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {offer.installSteps.map((step, index) => (
              <div key={step} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-sm font-black">
                  {index + 1}
                </div>
                <p className="text-sm font-medium leading-6 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-50 py-14">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Built for local operators</p>
              <h2 className="mt-3 text-3xl font-black text-slate-950">A setup request, not another checklist</h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                This is for businesses that want the thing installed. Boltcall collects the exact routing,
                consent, and source details fulfillment needs to run a safe first test.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {offer.bestFor.map((item) => (
                <div key={item} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-12">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
              {offer.slug === 'automatic-reviews-agent' ? (
                <Star className="h-7 w-7 text-blue-600" aria-hidden="true" />
              ) : offer.slug === 'reminders-agent' ? (
                <CalendarClock className="h-7 w-7 text-blue-600" aria-hidden="true" />
              ) : (
                <PhoneCall className="h-7 w-7 text-blue-600" aria-hidden="true" />
              )}
            </div>
            <h2 className="mt-5 text-3xl font-black text-slate-950">Ready to install the first test?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Create the setup request above. You will see the test message before Boltcall imports the first 100 contacts.
            </p>
            <Link
              to={offer.path}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Back to setup form
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default DoneForYouSetupOfferPage;
