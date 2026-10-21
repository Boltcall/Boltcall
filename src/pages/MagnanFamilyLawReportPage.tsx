import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import reportData from '../data/magnan-report.json';

type ReportBlock =
  | { type: 'heading'; text: string; level?: number }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'image'; file: string; alt: string; caption: string }
  | { type: 'sources'; items: { id: number; label: string; url: string }[] };

const report = reportData as Omit<typeof reportData, 'pages'> & {
  pages: { label: string; blocks: ReportBlock[] }[];
};
const linkClass = 'underline underline-offset-4 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600';

function ReportContent({ block }: { block: ReportBlock }) {
  switch (block.type) {
    case 'heading':
      return block.level === 3
        ? <h3 className="mb-3 mt-8 text-xl font-semibold leading-snug text-slate-950">{block.text}</h3>
        : <h2 className="mb-6 mt-10 text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl">{block.text}</h2>;
    case 'paragraph':
      return <p className="mb-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">{block.text}</p>;
    case 'list':
      return <ol className="mb-6 max-w-3xl list-decimal space-y-4 pl-6 text-base leading-7 text-slate-700 sm:text-lg">{block.items.map(item => <li key={item} className="pl-2">{item}</li>)}</ol>;
    case 'image':
      return <figure className="my-8"><img src="/images/reports/magnan-contact-evidence.png" alt={block.alt} width={1050} height={300} loading="lazy" className="h-auto w-full rounded-lg border border-slate-200" /><figcaption className="mt-3 text-sm leading-6 text-slate-600">{block.caption}</figcaption></figure>;
    case 'table':
      return (
        <div tabIndex={0} role="region" aria-label={`${block.headers[0]} comparison`} className="my-7 overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm leading-6">
            <thead><tr>{block.headers.map(header => <th scope="col" key={header} className="border border-slate-300 bg-slate-100 px-5 py-4 font-semibold text-slate-950">{header}</th>)}</tr></thead>
            <tbody>{block.rows.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0
              ? <th scope="row" key={index} className="border border-slate-200 px-5 py-4 align-top font-medium text-slate-950">{cell}</th>
              : <td key={index} className="border border-slate-200 px-5 py-4 align-top text-slate-700">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case 'sources':
      return <ol className="mb-7 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-700">{block.items.map(source => <li key={source.id} className="pl-1"><a className={linkClass} href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ol>;
  }
}

export default function MagnanFamilyLawReportPage() {
  useEffect(() => {
    const oldTitle = document.title;
    document.title = 'Magnan Family Law Enquiry Response Report | Boltcall';
    const values = {
      robots: 'noindex, nofollow',
      description: 'A personalised enquiry-response review for Jordan Magnan with sourced observations and practical intake improvements.',
    };
    const restore = Object.entries(values).map(([name, content]) => {
      const existing = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      const meta = existing ?? document.createElement('meta');
      const previous = meta.getAttribute('content');
      meta.name = name;
      meta.content = content;
      if (!existing) document.head.appendChild(meta);
      return () => {
        if (!existing) meta.remove();
        else if (previous === null) meta.removeAttribute('content');
        else meta.content = previous;
      };
    });
    return () => { document.title = oldTitle; restore.forEach(reset => reset()); };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <a href="#report" className="sr-only z-50 rounded bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline focus:outline-2 focus:outline-blue-600">Skip to report</a>
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-6 py-6 sm:px-10">
        <Link to="/" aria-label="Boltcall home" className={`text-xl font-bold tracking-tight ${linkClass}`}>Boltcall</Link>
        <span className="text-right text-xs font-medium uppercase tracking-widest text-slate-500">Personalised report</span>
      </header>
      <main id="report" className="mx-auto max-w-5xl px-6 pb-16 sm:px-10">
        <section aria-labelledby="report-title" className="pb-10 pt-10 sm:pb-12 sm:pt-16">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Enquiry response review</p>
          <h1 id="report-title" className="mb-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">{report.title}</h1>
          <p className="mb-6 max-w-3xl text-2xl font-medium leading-snug text-slate-800 sm:text-3xl">{report.subtitle}</p>
          <p className="max-w-3xl text-lg leading-8 text-slate-600">{report.intro}</p>
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-600"><span>{report.recipient}</span><time dateTime="2026-10-21">{report.date}</time><span>By Noam at Boltcall</span></div>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3 border-y border-slate-200 py-5 text-sm font-medium"><span>3 practical changes</span><span>Public website review</span><span>Actual response speed: unmeasured</span></div>
          <nav aria-label="Report sections" className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-700">{report.pages.map((page, index) => <a key={page.label} href={`#report-section-${index + 1}`} className={`${linkClass} inline-flex min-h-11 items-center`}>{page.label}</a>)}</nav>
        </section>
        {report.pages.map((page, index) => (
          <section key={page.label} id={`report-section-${index + 1}`} aria-label={page.label} className="scroll-mt-6 border-t border-slate-200 py-9 sm:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{page.label}</p>
            {page.blocks.map((block, blockIndex) => <ReportContent key={blockIndex} block={block as ReportBlock} />)}
          </section>
        ))}
        <section aria-labelledby="next-step" className="border-t border-slate-200 pt-10">
          <h2 id="next-step" className="mb-4 text-2xl font-semibold tracking-tight">Review your next step</h2>
          <p className="mb-6 max-w-2xl text-base leading-7 text-slate-600">Reply to Noam with the part of your intake process you want to examine first. If you prefer to explore independently, Boltcall also offers a website audit.</p>
          <Link to="/seo-audit" className="inline-flex min-h-12 items-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Explore the website audit</Link>
        </section>
      </main>
      <footer className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-6 pb-8 text-xs leading-6 text-slate-500 sm:px-10"><span>Prepared independently by Noam at Boltcall</span><span>BOLTCALL.ORG</span></footer>
    </div>
  );
}
