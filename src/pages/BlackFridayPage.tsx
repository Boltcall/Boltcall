import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, Globe2, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import LeadResponseCrowd from '@/components/ui/lead-response-crowd';
import Header from '@/components/Header';
import { updateMetaDescription } from '@/lib/utils';

const offer = [
  {
    title: 'A website built for your business',
    description: 'Give customers a clear place to see what you do and request a quote or appointment.',
    icon: Globe2,
  },
  {
    title: 'Free speed-to-lead setup',
    description: 'Get Boltcall set up to follow up with new web leads and text back missed callers.',
    icon: Zap,
  },
];

function BlackFridayApplicationForm() {
  const submissionId = useRef<string | null>(null);
  const [status, setStatus] = useState<'ready' | 'saving' | 'saved'>('ready');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== 'ready') return;

    setStatus('saving');
    setError('');
    submissionId.current ??= crypto.randomUUID();
    const fields = Object.fromEntries(new FormData(event.currentTarget));

    try {
      const response = await fetch('/.netlify/functions/black-friday-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, submissionId: submissionId.current }),
        signal: AbortSignal.timeout(12_000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok !== true) {
        const message =
          typeof result?.error === 'string'
            ? result.error
            : 'We couldn’t save your application. Please try again.';
        throw new Error(message);
      }

      setStatus('saved');
    } catch (cause) {
      const message =
        cause instanceof Error && cause.name === 'Error'
          ? cause.message
          : 'We couldn’t save your application. Please try again.';
      setError(message);
      setStatus('ready');
    }
  }

  return (
    <div id="black-friday-application" className="giveaway-application" tabIndex={-1}>
      <h2>Apply for the giveaway</h2>
      <div role="status">
        {status === 'saved' && (
          <p className="application-success">
            Application received. We’ll email you if your business is selected.
          </p>
        )}
      </div>
      {status !== 'saved' && (
        <>
          <p>Tell us about your business. We’ll contact selected applicants by email.</p>
          <form className="application-form" onSubmit={submit} aria-busy={status === 'saving'}>
            <label>
              Full name
              <input name="name" autoComplete="name" minLength={2} maxLength={120} required />
            </label>
            <label>
              Business name
              <input
                name="companyName"
                autoComplete="organization"
                minLength={2}
                maxLength={150}
                required
              />
            </label>
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" maxLength={190} required />
            </label>
            <label>
              Current website <span>(optional)</span>
              <input
                name="website"
                inputMode="url"
                autoComplete="url"
                maxLength={500}
                placeholder="yourbusiness.com"
              />
            </label>
            <div hidden>
              <label>
                Fax <input name="fax" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            {error && (
              <p className="application-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="demo-button demo-button-primary"
              disabled={status === 'saving'}
            >
              {status === 'saving' ? 'Submitting…' : 'Submit application'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <Link className="application-privacy" to="/privacy-policy">
              Privacy policy
            </Link>
          </form>
        </>
      )}
    </div>
  );
}

export default function BlackFridayPage() {
  useEffect(() => {
    const title = '5 Free Websites for Black Friday | Boltcall';
    const previousTitle = document.title;
    document.title = title;
    updateMetaDescription(
      'Apply for one of five free websites from Boltcall this Black Friday. Each includes free setup for Boltcall’s speed-to-lead system.',
    );

    const shareMeta = [
      ['meta[property="og:title"]', title],
      ['meta[property="og:url"]', 'https://boltcall.org/black-friday'],
      ['meta[name="twitter:title"]', title],
    ];
    const restoreMeta = shareMeta.flatMap(([selector, value]) => {
      const tag = document.head.querySelector<HTMLMetaElement>(selector);
      if (!tag) return [];

      const previous = tag.content;
      tag.content = value;
      return [
        () => {
          tag.content = previous;
        },
      ];
    });
    return () => {
      document.title = previousTitle;
      restoreMeta.forEach((restore) => restore());
    };
  }, []);

  return (
    <div className="black-friday-page" dir="ltr" lang="en">
      <Header showPromotion={false} />
      <main className="pt-14">
        <LeadResponseCrowd />
        <section
          id="black-friday-offer"
          className="demo-flow"
          aria-labelledby="black-friday-offer-title"
        >
          <div>
            <h2 id="black-friday-offer-title">What’s included</h2>
            <ul className="demo-examples">
              {offer.map(({ title, description, icon: Icon }) => (
                <li key={title}>
                  <h3>
                    <Icon size={20} aria-hidden="true" /> {title}
                  </h3>
                  <p>{description}</p>
                </li>
              ))}
            </ul>
          </div>
          <BlackFridayApplicationForm />
        </section>
      </main>
    </div>
  );
}
