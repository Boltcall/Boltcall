import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
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

interface AeoContent {
  whatItDoes: string[];
  whatWeNeed: string[];
  faq: Array<{ question: string; answer: string }>;
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

function getAeoContent(offer: DoneForYouSetupOffer): AeoContent {
  if (offer.slug === 'automatic-reviews-agent') {
    return {
      whatItDoes: [
        'Creates a simple SMS review request workflow for customers who are already allowed to receive messages from your business.',
        'Uses your Google review link and contact source to prepare the first 100 customer texts.',
        'Waits for your approval on one test message before any customer list is imported.',
      ],
      whatWeNeed: [
        'Your Google review link.',
        'Where the first 100 contacts will come from, such as a CSV, CRM, booking system, or Google Sheet.',
        'A business contact who can approve the test SMS before launch.',
      ],
      faq: [
        {
          question: 'What is the Automatic Reviews Agent setup?',
          answer:
            'It is a done-for-you setup where Boltcall installs an SMS review request agent, sends one test message for approval, and then prepares the first 100 customer texts.',
        },
        {
          question: 'Does Boltcall import all of my customer contacts right away?',
          answer:
            'No. Boltcall runs one test message first. The first 100 contacts are imported only after the message and contact source are approved.',
        },
        {
          question: 'What compliance language is included?',
          answer:
            'The SMS flow includes STOP opt-out language, and the business must confirm it can message the contacts it provides.',
        },
      ],
    };
  }

  if (offer.slug === 'reminders-agent') {
    return {
      whatItDoes: [
        'Creates an SMS reminder workflow for overdue customers, upcoming appointments, recalls, or unbooked estimates.',
        'Connects the reminder message to your booking link or next-step instruction.',
        'Runs one test message before Boltcall imports the first 100 contacts.',
      ],
      whatWeNeed: [
        'The type of reminder you want to send.',
        'Your booking link or preferred next step.',
        'The source for the first 100 contacts, such as a CRM, CSV, booking system, or Google Sheet.',
      ],
      faq: [
        {
          question: 'What is the Reminders Agent setup?',
          answer:
            'It is a done-for-you SMS reminder setup for overdue or upcoming customers. Boltcall prepares the reminder flow, tests it, and then imports the first 100 contacts after approval.',
        },
        {
          question: 'Can this be used for overdue customers and upcoming appointments?',
          answer:
            'Yes. The setup supports overdue follow-up, upcoming appointment reminders, maintenance recalls, unbooked estimates, and similar local service reminders.',
        },
        {
          question: 'Can customers opt out?',
          answer:
            'Yes. The reminder text includes STOP opt-out language, and the business confirms it has permission to message the contacts.',
        },
      ],
    };
  }

  return {
    whatItDoes: [
      'Creates an instant SMS response for missed calls that happen after hours or during periods your team cannot answer.',
      'Uses your phone system, missed-call source, timezone, and after-hours window to prepare the responder.',
      'Runs one test message before Boltcall turns on the first 100 included SMS.',
    ],
    whatWeNeed: [
      'The phone system or missed-call source you use today.',
      'Your timezone and after-hours start and end times.',
      'A business contact who can approve the test SMS before launch.',
    ],
    faq: [
      {
        question: 'What is the After-Hours Lead Rescue setup?',
        answer:
          'It is a done-for-you missed-call SMS responder for local service businesses. Boltcall installs the response flow, tests one message, and then turns on the first 100 included SMS.',
      },
      {
        question: 'What happens when a lead calls after hours?',
        answer:
          'The goal is to send an instant SMS reply so the lead knows the business received the call and has a next step instead of waiting for a voicemail callback.',
      },
      {
        question: 'Does Boltcall send messages before testing?',
        answer:
          'No. Boltcall runs one test message first. The setup goes live only after the test is approved.',
      },
    ],
  };
}

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
  const aeo = getAeoContent(offer);
  const json = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
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
        },
        {
          '@type': 'FAQPage',
          mainEntity: aeo.faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        },
      ],
    }),
    [aeo.faq, offer],
  );

  return <script type="application/ld+json">{JSON.stringify(json)}</script>;
}

function DoneForYouSetupOfferPage({ offer }: { offer: DoneForYouSetupOffer }) {
  const aeo = getAeoContent(offer);

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
        <section className="border-b border-slate-200 bg-white pt-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,520px)] lg:items-start lg:px-8 lg:pb-16">
            <div className="pt-4">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">{offer.eyebrow}</p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
                {offer.offer}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">{offer.promise}</p>

              <ul className="mt-8 space-y-3 text-base leading-7 text-slate-800">
                <li><strong>{offer.cap}.</strong></li>
                <li>One test message is approved before any import or rollout.</li>
                <li>Contacts can opt out with STOP, and your business confirms it can message them.</li>
              </ul>
            </div>

            <OfferForm offer={offer} />
          </div>
        </section>

        <section className="bg-white py-14">
          <div className="mx-auto max-w-5xl divide-y divide-slate-200 px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 py-8 md:grid-cols-[0.45fr_0.55fr]">
              <h2 className="text-2xl font-black text-slate-950">What this setup does</h2>
              <ul className="space-y-4 text-base leading-7 text-slate-700">
                {aeo.whatItDoes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-6 py-8 md:grid-cols-[0.45fr_0.55fr]">
              <h2 className="text-2xl font-black text-slate-950">How the 7-day setup works</h2>
              <ol className="space-y-4 text-base leading-7 text-slate-700">
                {offer.installSteps.map((step, index) => (
                  <li key={step}>
                    <span className="font-bold text-slate-950">Step {index + 1}: </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-6 py-8 md:grid-cols-[0.45fr_0.55fr]">
              <h2 className="text-2xl font-black text-slate-950">What we need from you</h2>
              <ul className="space-y-4 text-base leading-7 text-slate-700">
                {aeo.whatWeNeed.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="grid gap-6 py-8 md:grid-cols-[0.45fr_0.55fr]">
              <h2 className="text-2xl font-black text-slate-950">Compliance and consent</h2>
              <div className="space-y-4 text-base leading-7 text-slate-700">
                <p>
                  The setup includes STOP opt-out language. Your business confirms it can message the contacts it provides.
                </p>
                <p>
                  Boltcall does not import the first 100 contacts or send a live batch until one test message has been approved.
                </p>
              </div>
            </div>

            <div className="grid gap-6 py-8 md:grid-cols-[0.45fr_0.55fr]">
              <h2 className="text-2xl font-black text-slate-950">Questions local businesses ask</h2>
              <div className="space-y-6">
                {aeo.faq.map((item) => (
                  <section key={item.question}>
                    <h3 className="text-lg font-bold text-slate-950">{item.question}</h3>
                    <p className="mt-2 text-base leading-7 text-slate-700">{item.answer}</p>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default DoneForYouSetupOfferPage;
