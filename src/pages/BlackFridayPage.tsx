import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, ClipboardList, Globe2, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import LeadResponseCrowd from '@/components/ui/lead-response-crowd';
import { BLACK_FRIDAY_CLOSED_MESSAGE, BLACK_FRIDAY_DEADLINE } from '@/lib/blackFridayCampaign';
import { updateMetaDescription } from '@/lib/utils';

const offer = [
  {
    title: 'Custom-built law firm website',
    description: 'We design and build a website tailored to your firm and the cases you handle.',
    icon: Globe2,
  },
  {
    title: 'AI voice receptionist',
    description: 'Visitors can talk to your AI receptionist directly on your website.',
    icon: Mic,
  },
  {
    title: 'Consultation request form',
    description: 'Send consultation requests from your website straight to your intake inbox.',
    icon: ClipboardList,
  },
];

function BlackFridayApplicationForm({ closed, onClose }: { closed: boolean; onClose: () => void }) {
  const submissionId = useRef<string | null>(null);
  const [status, setStatus] = useState<'ready' | 'saving' | 'saved'>('ready');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== 'ready' || closed) return;
    if (Date.now() >= BLACK_FRIDAY_DEADLINE) {
      onClose();
      return;
    }

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
      if (response.status === 410) {
        setStatus('ready');
        onClose();
        return;
      }

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
      <h2>{closed ? 'Black Friday giveaway' : 'Apply for the giveaway'}</h2>
      <div role="status">
        {status === 'saved' ? (
          <p className="application-success">
            Application received. We’ll email you if your business is selected.
          </p>
        ) : closed ? (
          <p>{status === 'saving' ? 'Submitting…' : BLACK_FRIDAY_CLOSED_MESSAGE}</p>
        ) : null}
      </div>
      {!closed && status !== 'saved' && (
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
  const [applicationsClosed, setApplicationsClosed] = useState(
    () => Date.now() >= BLACK_FRIDAY_DEADLINE,
  );

  useEffect(() => {
    if (applicationsClosed) return;

    let deadlineTimer: number | undefined;
    const syncDeadline = () => {
      window.clearTimeout(deadlineTimer);
      const remaining = BLACK_FRIDAY_DEADLINE - Date.now();

      if (remaining <= 0) {
        setApplicationsClosed(true);
        return;
      }

      deadlineTimer = window.setTimeout(syncDeadline, Math.min(remaining, 2_147_483_647));
    };

    syncDeadline();
    document.addEventListener('visibilitychange', syncDeadline);
    return () => {
      window.clearTimeout(deadlineTimer);
      document.removeEventListener('visibilitychange', syncDeadline);
    };
  }, [applicationsClosed]);

  useEffect(() => {
    const title = '5 Free Websites for Black Friday | Boltcall';
    const previousTitle = document.title;
    document.title = title;
    updateMetaDescription(
      'Five personal injury firms get a free custom website with a built-in AI voice receptionist and a consultation form that sends inquiries to their intake inbox.',
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
      <main>
        <LeadResponseCrowd applicationsClosed={applicationsClosed} />
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
          <BlackFridayApplicationForm
            closed={applicationsClosed}
            onClose={() => setApplicationsClosed(true)}
          />
        </section>
      </main>
    </div>
  );
}
