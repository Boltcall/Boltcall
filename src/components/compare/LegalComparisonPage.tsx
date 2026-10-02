import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { updateMetaDescription } from '../../lib/utils';
import Header from '../Header';
import Footer from '../Footer';
import FinalCTA, { COMPARISON_CTA } from '../FinalCTA';
import GiveawayBar from '../GiveawayBar';
import ReadingProgress from '../ReadingProgress';
import Breadcrumbs from '../Breadcrumbs';
import AnswerBlock from '../seo/AnswerBlock';
import type { Cited, LegalComparisonData, Source, TableData } from '../../data/legalComparisons/types';

const SITE = 'https://boltcall.org';

type Sources = Record<string, Source>;

const textOf = (v: Cited) => (typeof v === 'string' ? v : v.text);

/** Renders text plus numbered footnote markers that link to the Sources list. */
export const CitedText: React.FC<{ value: Cited; sources: Sources }> = ({ value, sources }) => {
  if (typeof value === 'string') return <>{value}</>;
  const ids = Object.keys(sources);
  return (
    <>
      {value.text}
      {value.src
        .map((id) => ids.indexOf(id) + 1)
        .sort((x, y) => x - y)
        .map((n) => (
          <sup key={n} className="ml-0.5">
            <a href={`#src-${n}`} aria-label={`Source ${n}`} className="text-blue-700 hover:underline">
              [{n}]
            </a>
          </sup>
        ))}
    </>
  );
};

export const DataTable: React.FC<{ table: TableData; sources: Sources }> = ({ table, sources }) => (
  <div className="mb-8">
    <h3 className="text-lg font-semibold text-gray-900 mb-1">{table.title}</h3>
    {table.note && (
      <p className="text-sm text-gray-600 mb-3">
        <CitedText value={table.note} sources={sources} />
      </p>
    )}
    <div className="overflow-x-auto rounded-xl border border-gray-200" role="region" aria-label={table.title} tabIndex={0}>
      <table className="min-w-full text-sm tabular-nums">
        <caption className="sr-only">{table.title}</caption>
        <thead className="bg-gray-50">
          <tr>
            {table.columns.map((col) => (
              <th key={col} scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-3 align-top ${j === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                  <CitedText value={cell} sources={sources} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const SourceList: React.FC<{ sources: Sources; accessed: string }> = ({ sources, accessed }) => (
  <ol className="list-decimal pl-6 space-y-2 text-sm text-gray-700">
    {Object.values(sources).map((s, i) => (
      <li key={s.url} id={`src-${i + 1}`} className="scroll-mt-28">
        {s.title}.{' '}
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">
          {s.url}
        </a>
        . Accessed {accessed}.
      </li>
    ))}
  </ol>
);

const H2: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => (
  <h2 id={id} className="scroll-mt-28 text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-4">
    {children}
  </h2>
);

const Bullets: React.FC<{ items: Cited[]; sources: Sources }> = ({ items, sources }) => (
  <ul className="list-disc pl-5 space-y-2 text-gray-700">
    {items.map((it, i) => (
      <li key={i}>
        <CitedText value={it} sources={sources} />
      </li>
    ))}
  </ul>
);

const LegalComparisonPage: React.FC<{ data: LegalComparisonData }> = ({ data }) => {
  const { sources } = data;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = data.title;
    updateMetaDescription(data.description);
    const url = `${SITE}${data.path}`;

    const add = (id: string, json: object) => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = id;
      s.text = JSON.stringify(json);
      document.head.appendChild(s);
      return s;
    };

    const scripts = [
      add(`legal-compare-${data.slug}-article`, {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: data.title,
        description: data.description,
        author: { '@type': 'Organization', name: 'Boltcall' },
        publisher: {
          '@type': 'Organization',
          name: 'Boltcall',
          logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` },
        },
        datePublished: data.publishDate,
        dateModified: data.modifiedDate,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      }),
      add(`legal-compare-${data.slug}-faq`, {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: data.faq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: textOf(f.a) },
        })),
      }),
    ];
    return () => scripts.forEach((s) => s.remove());
  }, [data]);

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
                { label: `Boltcall vs ${data.competitor}`, href: data.path },
              ]}
            />
            <h1 className="text-balance text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">{data.h1}</h1>
            <p className="text-sm text-gray-600 mb-2">
              Prices and features verified <time dateTime={data.modifiedDate}>{data.verifiedLabel}</time>. Pricing changes often; check the vendor&apos;s page before buying.
            </p>
            <p className="text-sm text-gray-600">
              Boltcall makes this page. We are one of the two products compared, so every {data.competitor} fact below links
              to its source.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <AnswerBlock {...data.answer} className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-5 mb-8" />

          <div className="space-y-4 text-lg text-gray-700 mb-12">
            {data.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <section className="mb-14" aria-labelledby="glance">
            <H2 id="glance">At a glance</H2>
            <div className="overflow-x-auto rounded-xl border border-gray-200" role="region" aria-label="At a glance comparison" tabIndex={0}>
              <table className="min-w-full text-sm tabular-nums">
                <caption className="sr-only">Boltcall and {data.competitor} at a glance</caption>
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Feature</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-blue-700">Boltcall</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">{data.competitor}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.glance.map((r) => (
                    <tr key={r.label}>
                      <th scope="row" className="px-4 py-3 text-left align-top font-medium text-gray-900">{r.label}</th>
                      <td className="px-4 py-3 align-top text-gray-700"><CitedText value={r.boltcall} sources={sources} /></td>
                      <td className="px-4 py-3 align-top text-gray-700"><CitedText value={r.competitor} sources={sources} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-14" aria-labelledby="pricing">
            <H2 id="pricing">Pricing, with the real units</H2>
            <p className="text-gray-700 mb-6">{data.pricing.intro}</p>
            {data.pricing.competitorTables.map((t) => (
              <DataTable key={t.title} table={t} sources={sources} />
            ))}
            <DataTable table={data.pricing.boltcallTable} sources={sources} />
            {data.pricing.illustration && (
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{data.pricing.illustration.title}</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mb-4">
                  {data.pricing.illustration.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
                <DataTable table={data.pricing.illustration.table} sources={sources} />
                <p className="text-gray-700">{data.pricing.illustration.takeaway}</p>
              </div>
            )}
          </section>

          <section className="mb-14 rounded-xl border border-gray-200 bg-gray-50 p-5 sm:p-6" aria-labelledby="competitor-wins">
            <H2 id="competitor-wins">Where {data.competitor} wins</H2>
            <Bullets items={data.competitorWins} sources={sources} />
          </section>

          <section className="mb-14" aria-labelledby="boltcall-wins">
            <H2 id="boltcall-wins">Where Boltcall wins</H2>
            <Bullets items={data.boltcallWins} sources={sources} />
            <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Where Boltcall is limited</h3>
            <Bullets items={data.boltcallLimits} sources={sources} />
          </section>

          <section className="mb-14" aria-labelledby="who">
            <H2 id="who">Who should choose which</H2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose {data.competitor} if</h3>
                <Bullets items={data.whoShouldChoose.competitor} sources={sources} />
              </div>
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Choose Boltcall if</h3>
                <Bullets items={data.whoShouldChoose.boltcall} sources={sources} />
              </div>
            </div>
          </section>

          <section className="mb-14" aria-labelledby="legal">
            <H2 id="legal">Law firm specifics</H2>
            <div className="overflow-x-auto rounded-xl border border-gray-200" role="region" aria-label="Law firm specifics" tabIndex={0}>
              <table className="min-w-full text-sm tabular-nums">
                <caption className="sr-only">Law firm specifics for Boltcall and {data.competitor}</caption>
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">Topic</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-blue-700">Boltcall</th>
                    <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-700">{data.competitor}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.legalSpecifics.map((r) => (
                    <tr key={r.topic}>
                      <th scope="row" className="px-4 py-3 text-left align-top font-medium text-gray-900">{r.topic}</th>
                      <td className="px-4 py-3 align-top text-gray-700"><CitedText value={r.boltcall} sources={sources} /></td>
                      <td className="px-4 py-3 align-top text-gray-700"><CitedText value={r.competitor} sources={sources} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Boltcall security details: <Link to="/law-firm-security" className="text-blue-700 underline">law firm security</Link>. This is
              not legal advice. Your state bar rules decide what you may outsource and how.
            </p>
          </section>

          <section className="mb-14" aria-labelledby="faq">
            <H2 id="faq">Frequently asked questions</H2>
            <dl className="space-y-5">
              {data.faq.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold text-gray-900 mb-1">{f.q}</dt>
                  <dd className="text-gray-700"><CitedText value={f.a} sources={sources} /></dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mb-14" aria-labelledby="method">
            <H2 id="method">How we made this page</H2>
            <div className="space-y-3 text-gray-700">
              {data.methodology.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <p>
                Questions or corrections: <Link to="/contact" className="text-blue-700 underline">contact us</Link>.
              </p>
            </div>
          </section>

          <section className="mb-14" aria-labelledby="sources">
            <H2 id="sources">Sources</H2>
            <SourceList sources={sources} accessed={data.verifiedLabel} />
          </section>

          <section className="mb-12 border-t border-gray-200 pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Related</h2>
            <ul className="grid sm:grid-cols-2 gap-2 text-blue-700">
              {data.related.map((r) => (
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

export default LegalComparisonPage;
