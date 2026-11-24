import { useEffect } from 'react';
import { ArrowRight, Globe2, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import LeadResponseCrowd from '@/components/ui/lead-response-crowd';
import { CAL_BOOKING_URL } from '@/lib/booking';
import { updateMetaDescription } from '@/lib/utils';

const bookingUrl = new URL(CAL_BOOKING_URL);
bookingUrl.search = new URLSearchParams({
  utm_source: 'boltcall',
  utm_medium: 'website',
  utm_campaign: 'black-friday-2026',
}).toString();
const applicationUrl = bookingUrl.href;

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
      <header className="demo-nav">
        <Link className="demo-brand" to="/" aria-label="Boltcall home">
          <img src="/boltcall_full_logo.webp" width="138" height="68" alt="" />
        </Link>
        <nav className="demo-nav-actions" aria-label="Black Friday">
          <a href="#black-friday-offer">What’s included</a>
          <a className="demo-button demo-button-primary" href={applicationUrl}>
            Apply now
          </a>
        </nav>
      </header>
      <main>
        <LeadResponseCrowd applicationUrl={applicationUrl} />
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
          <div className="giveaway-application">
            <h2>Apply for the giveaway</h2>
            <p>Book a short call to tell us about your business and the website you need.</p>
            <a className="demo-button demo-button-primary" href={applicationUrl}>
              Book an application call <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
