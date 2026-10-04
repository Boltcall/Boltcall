import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../lib/utils';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FinalCTA, { COMPARISON_CTA } from '../components/FinalCTA';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import AnswerBlock from '../components/seo/AnswerBlock';
import {
  CitedText,
  DataTable,
  SourceList,
} from '../components/compare/LegalComparisonPage';
import type { Cited } from '../data/legalComparisons/types';
import {
  ROUNDUP,
  SERVICES,
  HOW_TO_CHOOSE,
  FAQ,
  MENTIONS,
  METHODOLOGY,
  ROUNDUPS,
  RELATED,
  SOURCES,
} from '../data/legalComparisons/lawFirmRoundup';

const SITE = 'https://boltcall.org';

const textOf = (v: Cited) => (typeof v === 'string' ? v : v.text);

const H2: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2 id={id} className="scroll-mt-28 text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-4">
    {children}
  </h2>
);

const Bullets: React.FC<{ items: Cited[] }> = ({ items }) => (
  <ul className="list-disc pl-5 space-y-2 text-gray-700">
    {items.map((it, i) => (
      <li key={i}>
        <CitedText value={it} sources={SOURCES} />
      </li>
    ))}
  </ul>
);

const CompareBestLawFirmAnsweringServices: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = ROUNDUP.title;
    updateMetaDescription(ROUNDUP.description);
    const url = `${SITE}${ROUNDUP.path}`;

    const add = (id: string, json: object) => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = id;
      s.text = JSON.stringify(json);
      document.head.appendChild(s);
      return s;
    };

    const scripts = [
      add('law-roundup-article', {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: ROUNDUP.title,
        description: ROUNDUP.description,
        author: { '@type': 'Organization', name: 'Boltcall' },
        publisher: {
          '@type': 'Organization',
          name: 'Boltcall',
          logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` },
        },
        datePublished: ROUNDUP.publishDate,
        dateModified: ROUNDUP.modifiedDate,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      }),
      add('law-roundup-faq', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: textOf(f.a) },
        })),
      }),
      add('law-roundup-itemlist', {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        numberOfItems: SERVICES.length,
        itemListElement: SERVICES.map((svc, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: svc.name,
          url: `${url}#${svc.id}`,
        })),
      }),
    ];
    return () => scripts.forEach((s) => s.remove());
  }, []);

  return (
    <>
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      <main className="pt-24 min-h-screen bg-white">
        <div className="bg-gradient-to-b from-blue-50 to-white py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Comparisons', href: '/comparisons' },
                { label: 'Best law firm answering services', href: ROUNDUP.path },
              ]}
            />
            <h1 className="text-balance text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
              {ROUNDUP.h1}
            </h1>
            <p className="text-sm text-gray-600 mb-2">
              Prices and features verified <time dateTime={ROUNDUP.modifiedDate}>{ROUNDUP.verifiedLabel}</time>. Pricing
              changes often; check the vendor&apos;s page before buying.
            </p>
            <p className="text-sm text-gray-600">
              Boltcall makes this page. Boltcall is one of the 11 services below, listed last and not ranked first. Every
              competitor fact links to its source.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <AnswerBlock {...ROUNDUP.answer} className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-5 mb-8" />

          <div className="space-y-4 text-lg text-gray-700 mb-12">
            {ROUNDUP.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <section className="mb-14" aria-labelledby="jump-to">
            <H2 id="jump-to">The 11 services</H2>
            <p className="text-gray-700 mb-4">
              Jump to a service, or read the comparison table below for the whole set side by side.
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-blue-700">
              {SERVICES.map((svc) => (
                <li key={svc.id}>
                  <a href={`#${svc.id}`} className="hover:underline">
                    {svc.name}
                    {svc.ours ? ' (ours)' : ''}
                    <span className="text-gray-500"> &middot; {svc.bestFor.split(',')[0].toLowerCase()}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-14" aria-labelledby="compare">
            <H2 id="compare">Side-by-side comparison</H2>
            <p className="text-gray-700 mb-4">
              Entry price, billing unit, 24/7, Spanish, Clio and MyCase, and setup fees. Scroll horizontally on smaller
              screens.
            </p>
            <div
              className="overflow-x-auto rounded-xl border border-gray-200"
              role="region"
              aria-label="All services compared"
              tabIndex={0}
            >
              <table className="min-w-full text-sm tabular-nums">
                <caption className="sr-only">All 11 law firm answering services compared</caption>
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Service</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Entry price</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Billing unit</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">24/7</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Spanish</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Clio / MyCase</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Setup fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {SERVICES.map((svc) => (
                    <tr key={svc.id} className={svc.ours ? 'bg-blue-50/40' : undefined}>
                      <th scope="row" className="px-4 py-3 text-left align-top font-medium text-gray-900">
                        <a href={`#${svc.id}`} className="text-blue-700 hover:underline">
                          {svc.name}
                        </a>
                        {svc.ours && <span className="ml-1 text-xs text-blue-700">(ours)</span>}
                      </th>
                      <td className="px-4 py-3 align-top text-gray-700">{svc.type}</td>
                      <td className="px-4 py-3 align-top text-gray-700"><CitedText value={svc.row.price} sources={SOURCES} /></td>
                      <td className="px-4 py-3 align-top text-gray-700"><CitedText value={svc.row.unit} sources={SOURCES} /></td>
                      <td className="px-4 py-3 align-top text-gray-700"><CitedText value={svc.row.hours} sources={SOURCES} /></td>
                      <td className="px-4 py-3 align-top text-gray-700"><CitedText value={svc.row.spanish} sources={SOURCES} /></td>
                      <td className="px-4 py-3 align-top text-gray-700"><CitedText value={svc.row.pms} sources={SOURCES} /></td>
                      <td className="px-4 py-3 align-top text-gray-700"><CitedText value={svc.row.setup} sources={SOURCES} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Every citation links to the vendor page it came from. See the <a href="#sources" className="text-blue-700 underline">Sources</a> list.
            </p>
          </section>

          {SERVICES.map((svc) => (
            <section key={svc.id} id={svc.id} className="scroll-mt-28 mb-14" aria-labelledby={`${svc.id}-h`}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                <h2 id={`${svc.id}-h`} className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
                  {svc.name}
                  {svc.ours && <span className="ml-2 text-base font-medium text-blue-700">(our product)</span>}
                </h2>
                <span className="text-sm text-gray-500">{svc.type}</span>
                {typeof svc.mentions === 'number' && (
                  <span className="text-sm text-gray-500">· Named in {svc.mentions} of 24 roundups</span>
                )}
              </div>
              <p className="text-sm font-semibold text-blue-700 mb-3">Best for: {svc.bestFor}</p>
              <p className="text-gray-700 mb-5"><CitedText value={svc.summary} sources={SOURCES} /></p>

              {svc.pricingTables?.map((t) => (
                <DataTable key={t.title} table={t} sources={SOURCES} />
              ))}
              {svc.pricingNote && (
                <p className="text-sm text-gray-700 mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <CitedText value={svc.pricingNote} sources={SOURCES} />
                </p>
              )}

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Legal features</h3>
              <Bullets items={svc.features} />

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">Watch-outs</h3>
              <Bullets items={svc.watchOuts} />

              {svc.compareHref && (
                <p className="mt-5">
                  <Link to={svc.compareHref} className="text-blue-700 underline">
                    Head-to-head: Boltcall vs {svc.name}
                  </Link>
                </p>
              )}
            </section>
          ))}

          <section className="mb-14" aria-labelledby="how-to-choose">
            <H2 id="how-to-choose">How to choose</H2>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Human, AI or hybrid</h3>
            <dl className="space-y-4 mb-8">
              {HOW_TO_CHOOSE.models.map((m) => (
                <div key={m.term} className="rounded-xl border border-gray-200 p-4">
                  <dt className="font-semibold text-gray-900 mb-1">{m.term}</dt>
                  <dd className="text-gray-700"><CitedText value={m.body} sources={SOURCES} /></dd>
                </div>
              ))}
            </dl>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Per minute, per call or flat</h3>
            <dl className="space-y-4 mb-8">
              {HOW_TO_CHOOSE.units.map((u) => (
                <div key={u.term} className="rounded-xl border border-gray-200 p-4">
                  <dt className="font-semibold text-gray-900 mb-1">{u.term}</dt>
                  <dd className="text-gray-700"><CitedText value={u.body} sources={SOURCES} /></dd>
                </div>
              ))}
            </dl>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">Questions to ask before you sign</h3>
            <Bullets items={HOW_TO_CHOOSE.questions} />
            <p className="text-sm text-gray-600 mt-3">
              See also <Link to="/law-firm-security" className="text-blue-700 underline">law firm security</Link>. This is
              not legal advice. Your state bar rules decide what you may outsource and how.
            </p>
          </section>

          <section className="mb-14" aria-labelledby="faq">
            <H2 id="faq">Frequently asked questions</H2>
            <dl className="space-y-5">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold text-gray-900 mb-1">{f.q}</dt>
                  <dd className="text-gray-700"><CitedText value={f.a} sources={SOURCES} /></dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mb-14" aria-labelledby="method">
            <H2 id="method">How we picked the 11</H2>
            <div className="space-y-3 text-gray-700 mb-6">
              {METHODOLOGY.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <DataTable table={MENTIONS} sources={SOURCES} />
            <details className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <summary className="cursor-pointer font-semibold text-gray-900">The 24 roundups we counted</summary>
              <ul className="mt-3 list-disc pl-5 space-y-1 text-sm text-gray-700">
                {ROUNDUPS.map((r) => (
                  <li key={r.url}>
                    {r.publisher}:{' '}
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">
                      {r.url}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
            <p className="text-gray-700 mt-4">
              Questions or corrections: <Link to="/contact" className="text-blue-700 underline">contact us</Link>.
            </p>
          </section>

          <section className="mb-14" aria-labelledby="sources">
            <H2 id="sources">Sources</H2>
            <SourceList sources={SOURCES} accessed={ROUNDUP.verifiedLabel} />
          </section>

          <section className="mb-12 border-t border-gray-200 pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Related</h2>
            <ul className="grid sm:grid-cols-2 gap-2 text-blue-700">
              {RELATED.map((r) => (
                <li key={r.href}>
                  <Link className="hover:underline" to={r.href}>{r.label}</Link>
                </li>
              ))}
            </ul>
          </section>

          <FinalCTA {...COMPARISON_CTA} />
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CompareBestLawFirmAnsweringServices;
