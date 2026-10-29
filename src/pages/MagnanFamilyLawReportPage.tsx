import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarCheck, Check, Clock3, FileCheck2, Fingerprint, Globe2, MailCheck, MessageSquareText, Scale, ShieldCheck } from 'lucide-react';
import Header from '../components/Header';
import { Button } from '../components/ui/Button';
import reportData from '../data/magnan-report.json';

type ReportBlock =
  | { type: 'heading'; text: string; level?: number }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'officeHoursChart'; title: string; source: string; days: { label: string; start: number; end: number }[] }
  | { type: 'contactRouteChart'; firms: { name: string; sourceId: number; url: string; route: string; context: string; opposingParty: string; replyWindow: string }[] }
  | { type: 'image'; file: string; alt: string; caption: string }
  | { type: 'sources'; items: { id: number; label: string; url: string }[] };

const report = reportData as Omit<typeof reportData, 'pages'> & {
  pages: { label: string; blocks: ReportBlock[] }[];
};
const linkClass = 'underline underline-offset-4 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600';

// Content is visible by default, including in prerendered HTML and without animation support.
function useReportReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!ref.current || typeof window.IntersectionObserver !== 'function') return;
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (media.matches || typeof entry.target.animate !== 'function') return;
        const animation = entry.target.animate([
          { opacity: 0, transform: 'translateY(16px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });
    ref.current.querySelectorAll('[data-report-reveal]').forEach(element => observer.observe(element));
    const stopMotion = () => { if (media.matches) animations.forEach(animation => animation.cancel()); };
    media.addEventListener('change', stopMotion);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', stopMotion);
      animations.forEach(animation => animation.cancel());
    };
  }, []);
  return ref;
}

const journey = [
  { icon: MessageSquareText, title: 'Enquiry received', detail: 'One safe way to contact you' },
  { icon: MailCheck, title: 'Receipt acknowledged', detail: 'Clear expectations, no case details' },
  { icon: ShieldCheck, title: 'Firm review', detail: 'Human ownership & conflict checks' },
  { icon: CalendarCheck, title: 'Consultation', detail: 'Scheduling after firm approval' },
];

function EnquiryJourney() {
  return (
    <aside data-report-reveal aria-label="Proposed enquiry journey" className="relative rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.24)] sm:p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">A clearer first step</span>
        <Scale aria-hidden="true" className="h-5 w-5 text-slate-500" />
      </div>
      <ol className="relative space-y-6">
        {journey.map(({ icon: Icon, title, detail }, index) => (
          <li key={title} className="relative flex gap-4">
            {index < journey.length - 1 && <span aria-hidden="true" className="absolute left-[23px] top-12 h-6 border-l border-dashed border-slate-300" />}
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200"><Icon aria-hidden="true" className="h-5 w-5 text-slate-700" /></span>
            <div className="pt-1"><p className="text-base font-semibold text-slate-950">{title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p></div>
          </li>
        ))}
      </ol>
      <p className="mt-8 flex items-start gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500"><FileCheck2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />Proposed path — not a test of your current intake.</p>
    </aside>
  );
}

function OfficeHoursChart({ block }: { block: Extract<ReportBlock, { type: 'officeHoursChart' }> }) {
  const total = block.days.reduce((sum, day) => sum + day.end - day.start, 0);
  const maximum = Math.max(...block.days.map(day => day.end - day.start));
  const formatHour = (hour: number) => `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'pm' : 'am'}`;
  return <figure data-report-reveal aria-labelledby="office-hours-title" className="my-9 rounded-2xl border border-slate-200 p-6 sm:p-8">
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Published hours · Source [2]</p><h3 id="office-hours-title" className="scroll-mt-40 text-xl font-semibold tracking-tight">{block.title}</h3></div>
      <div className="text-right"><p className="text-3xl font-semibold tracking-tight">{total}<span className="ml-1 text-sm font-normal text-slate-500">hours</span></p><p className="mt-1 text-[10px] text-slate-500">Total across listed weekdays</p></div>
    </div>
    <ol aria-label="Published weekday office hours" className="space-y-5">
      {block.days.map(day => <li key={day.label} className="grid grid-cols-[80px_minmax(0,1fr)_30px] items-center gap-3 sm:grid-cols-[100px_minmax(0,1fr)_36px] sm:gap-5">
        <div><p className="text-sm font-medium text-slate-800">{day.label}</p><p className="mt-1 whitespace-nowrap text-[10px] text-slate-500">{formatHour(day.start)}–{formatHour(day.end)}</p></div>
        <div aria-hidden="true" className="relative h-7 overflow-hidden rounded-md bg-slate-100"><div data-office-hours={day.end - day.start} className={`h-full rounded-md ${day.label === 'Friday' ? 'bg-amber-500' : 'bg-slate-800'}`} style={{ width: `${(day.end - day.start) / maximum * 100}%` }} /></div>
        <span className="text-right font-mono text-sm text-slate-600">{day.end - day.start}<span className="sr-only"> hours</span></span>
      </li>)}
    </ol>
    <div aria-hidden="true" className="ml-[92px] mr-[42px] mt-4 flex justify-between font-mono text-[10px] text-slate-400 sm:ml-[120px] sm:mr-[56px]">{[0, 2, 4, 6, 8].map(hours => <span key={hours}>{hours}{hours === 8 ? 'h' : ''}</span>)}</div>
    <figcaption className="mt-7 border-t border-slate-200 pt-5 text-xs leading-6 text-slate-500">Calculated from <a href={block.source} target="_blank" rel="noopener noreferrer" className={linkClass}>published office hours [2]</a>. Friday ends at noon. These bars do not measure enquiry coverage or response speed; weekend hours are not charted.</figcaption>
  </figure>;
}

function ContactRouteChart({ block }: { block: Extract<ReportBlock, { type: 'contactRouteChart' }> }) {
  return <figure data-report-reveal aria-labelledby="contact-routes-title" className="my-8 overflow-hidden rounded-2xl border border-slate-200">
    <div className="px-6 pt-6 sm:px-8"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Public contact-page comparison</p><h3 id="contact-routes-title" className="scroll-mt-40 text-xl font-semibold tracking-tight">What a new enquiry sees</h3><p className="mt-2 text-sm leading-6 text-slate-500">Published entry points, not a service-quality or speed ranking.</p></div>
    <div role="region" aria-label="Enquiry route comparison chart" tabIndex={0} className="mt-6 overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600">
      <table className="w-full min-w-[600px] border-collapse text-left text-sm">
        <thead><tr>{['Firm', 'Phone', 'Online form', 'Other party’s name', 'Reply window'].map(label => <th scope="col" key={label} className="border-y border-slate-200 px-5 py-4 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead>
        <tbody>{block.firms.map(firm => <tr key={firm.name}>
          <th scope="row" className="border-b border-slate-200 px-5 py-5 font-medium text-slate-900"><a href={firm.url} target="_blank" rel="noopener noreferrer" className={linkClass}>{firm.name} <span className="text-xs text-slate-500">[{firm.sourceId}]</span></a></th>
          {['phone', 'form'].map(channel => <td key={channel} className="border-b border-slate-200 px-5 py-5"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-800"><Check aria-hidden="true" className="h-3.5 w-3.5 text-white" /><span className="sr-only">Published</span></span></td>)}
          <td className="border-b border-slate-200 px-5 py-5"><span className="inline-flex items-center gap-2 text-xs text-slate-600"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${firm.opposingParty === 'Requested' ? 'bg-slate-800' : 'border border-slate-400'}`} />{firm.opposingParty}</span></td>
          <td className="border-b border-slate-200 px-5 py-5"><span className="inline-flex items-center gap-2 text-xs text-slate-500"><span aria-hidden="true" className="font-mono text-slate-400">—</span>{firm.replyWindow}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="grid gap-5 px-6 py-6 sm:grid-cols-3 sm:px-8">{block.firms.map(firm => <div key={firm.name}><p className="mb-2 text-xs font-semibold text-slate-800">{firm.name}</p><p className="mb-2 text-xs leading-5 text-slate-600">{firm.route}</p><p className="text-xs leading-5 text-slate-500">{firm.context}</p></div>)}</div>
    <figcaption className="border-t border-slate-200 px-6 py-4 text-xs leading-6 text-slate-500 sm:px-8">“Not listed” and “Not stated” describe the reviewed public page, not the firm's internal process. Actual reply times remain unknown. Sources [2]–[4].</figcaption>
  </figure>;
}

function ReportContent({ block }: { block: ReportBlock }) {
  switch (block.type) {
    case 'officeHoursChart':
      return <OfficeHoursChart block={block} />;
    case 'contactRouteChart':
      return <ContactRouteChart block={block} />;
    case 'heading':
      return block.level === 3
        ? <h3 className="mb-3 mt-8 text-xl font-semibold leading-snug text-slate-950">{block.text}</h3>
        : <h2 className="mb-6 mt-10 text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl"><span className="mb-3 block font-mono text-xs tracking-widest text-slate-400">{block.text.match(/^\d+/)?.[0]}</span>{block.text.replace(/^\d+\s+/, '')}</h2>;
    case 'paragraph':
      return <p className="mb-5 max-w-3xl text-base leading-7 text-slate-600">{block.text}</p>;
    case 'list':
      return <ol className="my-8 space-y-0">{block.items.map((item, index) => <li data-report-reveal key={item} className="relative flex gap-5 pb-7 last:pb-0">{index < block.items.length - 1 && <span aria-hidden="true" className="absolute left-[19px] top-10 bottom-0 border-l border-dashed border-slate-300" />}<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white font-mono text-sm text-slate-500">{String(index + 1).padStart(2, '0')}</span><p className="pt-1 text-base leading-7 text-slate-600">{item}</p></li>)}</ol>;
    case 'image':
      return <figure data-report-reveal className="my-9 overflow-hidden rounded-2xl border border-slate-200 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.25)]"><div aria-hidden="true" className="flex items-center gap-3 border-b border-slate-200 px-5 py-3"><div className="flex gap-1.5">{[1, 2, 3].map(dot => <span key={dot} className="h-2 w-2 rounded-full border border-slate-300" />)}</div><span className="truncate text-xs text-slate-500">magnanfamilylaw.com/contact-us</span><Globe2 className="ml-auto h-3.5 w-3.5 text-slate-400" /></div><img src="/images/reports/magnan-contact-evidence.png" alt={block.alt} width={1050} height={300} loading="lazy" className="h-auto w-full" /><figcaption className="border-t border-slate-200 px-5 py-4 text-xs leading-6 text-slate-500">{block.caption}</figcaption></figure>;
    case 'table':
      return (
        <div data-report-reveal tabIndex={0} role="region" aria-label={`${block.headers[0]} comparison`} className="my-8 overflow-x-auto rounded-2xl border border-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm leading-6">
            <thead><tr>{block.headers.map(header => <th scope="col" key={header} className="border-b border-slate-200 px-5 py-5 text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>)}</tr></thead>
            <tbody>{block.rows.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0
              ? <th scope="row" key={index} className="border-b border-slate-200 px-5 py-5 align-top font-medium text-slate-950">{cell}</th>
              : <td key={index} className="border-b border-slate-200 px-5 py-5 align-top text-slate-600">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case 'sources':
      return <ol className="mb-7 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-700">{block.items.map(source => <li key={source.id} className="pl-1"><a className={linkClass} href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ol>;
  }
}

function Findings({ blocks }: { blocks: ReportBlock[] }) {
  const cards: { heading: string; blocks: ReportBlock[] }[] = [];
  blocks.slice(1).forEach(block => {
    if (block.type === 'heading') cards.push({ heading: block.text, blocks: [] });
    else cards[cards.length - 1]?.blocks.push(block);
  });
  const icons = [Clock3, Fingerprint, CalendarCheck];
  return <>
    <ReportContent block={blocks[0]} />
    <div className="mt-8 space-y-5">{cards.map((card, index) => {
      const Icon = icons[index];
      return <article data-report-reveal key={card.heading} className="rounded-2xl border border-slate-200 p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200"><Icon aria-hidden="true" className="h-5 w-5 text-slate-600" /></span><h3 className="text-xl font-semibold leading-snug tracking-tight">{card.heading.replace(/^\d+\s+/, '')}</h3><span aria-hidden="true" className="ml-auto hidden font-mono text-sm text-slate-400 sm:block">0{index + 1}</span></div>
        {card.blocks.map((block, blockIndex) => block.type === 'paragraph' ? <div key={blockIndex} className={`py-4 ${blockIndex ? 'border-t border-slate-100' : ''}`}><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{block.text.split(': ')[0]}</p><p className="text-sm leading-7 text-slate-600">{block.text.slice(block.text.indexOf(': ') + 2)}</p></div> : <ReportContent key={blockIndex} block={block} />)}
      </article>;
    })}</div>
  </>;
}

export default function MagnanFamilyLawReportPage() {
  const revealRef = useReportReveal();
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
    <div ref={revealRef} className="min-h-screen bg-white text-slate-950">
      <a href="#report" className="sr-only z-[150] rounded bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline focus:outline-2 focus:outline-blue-600">Skip to report</a>
      <Header showPromotion={false} />
      <main id="report" lang="en" dir="ltr" className="mx-auto max-w-7xl scroll-mt-20 px-6 pb-20 pt-28 sm:px-10 sm:pt-36">
        <section aria-labelledby="report-title" className="pb-12 sm:pb-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
            <div data-report-reveal>
              <div className="mb-7 flex items-center gap-5"><img src={report.logo.file} alt={report.logo.alt} width={130} height={167} className="h-24 w-auto shrink-0 object-contain" /><div className="border-l border-slate-200 py-2 pl-5"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Prepared for your firm</p><p className="max-w-[200px] text-sm font-medium leading-6 text-slate-800">Personalised<br />speed-to-lead report</p></div></div>
              <h1 id="report-title" className="mb-5 text-5xl font-semibold leading-[1.03] tracking-[-0.055em] sm:text-7xl">{report.title}</h1>
              <p className="mb-5 max-w-lg text-2xl font-medium leading-snug tracking-tight text-slate-800 sm:text-3xl">{report.subtitle}</p>
              <p className="max-w-lg text-base leading-7 text-slate-500">{report.intro}</p>
              <div className="mt-7 flex items-center gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 font-serif text-sm">JM</span><div className="text-sm"><p className="font-medium">{report.recipient}</p><p className="mt-0.5 text-xs text-slate-500"><time dateTime="2026-10-21">{report.date}</time><span className="mx-2">·</span>By Noam at Boltcall</p></div></div>
              <a href="#report-section-1" className={`mt-8 inline-flex min-h-11 items-center gap-3 text-sm font-semibold ${linkClass}`}>Explore your report<ArrowDown aria-hidden="true" className="h-4 w-4" /></a>
            </div>
            <EnquiryJourney />
          </div>
          <dl data-report-reveal className="mt-14 grid gap-6 border-y border-slate-200 py-8 sm:grid-cols-3 sm:gap-8 sm:py-10">
            <div className="sm:border-r sm:border-slate-200"><dd className="text-4xl font-semibold tracking-tight">03<span className="ml-3 text-sm font-normal tracking-normal text-slate-500">practical changes</span></dd><dt className="mt-2 text-sm text-slate-500">Clarity, safe contact, handoff</dt></div>
            <div className="sm:border-r sm:border-slate-200"><dd className="text-4xl font-semibold tracking-tight">02<span className="ml-3 text-sm font-normal tracking-normal text-slate-500">local comparisons</span></dd><dt className="mt-2 text-sm text-slate-500">Public website review</dt></div>
            <div><dd className="text-4xl font-semibold tracking-tight">—<span className="ml-3 text-sm font-normal tracking-normal text-slate-500">not a speed grade</span></dd><dt className="mt-2 text-sm text-slate-500">Actual response speed: unmeasured</dt></div>
          </dl>
        </section>
        <div className="grid items-start gap-10 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-16">
          <aside className="lg:sticky lg:top-24">
            <nav aria-label="Report sections"><p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Inside your report</p><ol className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">{report.pages.map((page, index) => <li key={page.label}><a href={`#report-section-${index + 1}`} className="group flex min-h-12 items-start gap-3 rounded-lg py-3 text-sm leading-5 text-slate-600 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span className="pt-0.5 font-mono text-[10px] text-slate-400">0{index + 1}</span><span>{page.label}</span><ArrowUpRight aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100" /></a></li>)}</ol></nav>
            <p className="mt-6 hidden items-start gap-2 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500 lg:flex"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />Public evidence only.<br />No enquiry submitted.</p>
          </aside>
          <div className="min-w-0">
            {report.pages.map((page, index) => <section data-report-reveal key={page.label} id={`report-section-${index + 1}`} aria-label={page.label} className="scroll-mt-24 border-b border-slate-200 pb-12 pt-4 first:pt-0 sm:pb-16">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{page.label}</p>
              {index === 1 ? <Findings blocks={page.blocks} /> : page.blocks.map((block, blockIndex) => <ReportContent key={blockIndex} block={block} />)}
            </section>)}
            <section data-report-reveal aria-labelledby="next-step" className="mt-12 rounded-3xl border border-slate-200 p-7 sm:p-10">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200"><Check aria-hidden="true" className="h-5 w-5 text-slate-600" /></div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">One practical next step</p>
              <h2 id="next-step" className="mb-4 text-3xl font-semibold tracking-tight">Make the first reply feel<br className="hidden sm:block" /> as personal as your practice.</h2>
              <p className="mb-7 max-w-xl text-base leading-7 text-slate-500">Reply to Noam with the part of your intake process you want to examine first. If you prefer to explore independently, Boltcall also offers a website audit.</p>
              <Button asChild variant="ghost" className="min-h-12 rounded-xl bg-blue-600 px-6 font-semibold text-white hover:bg-blue-700"><Link to="/seo-audit">Explore the website audit<ArrowRight aria-hidden="true" /></Link></Button>
              <p className="mt-4 text-xs text-slate-500">No client data needed for an initial conversation.</p>
            </section>
          </div>
        </div>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t border-slate-200 px-6 py-8 text-xs leading-6 text-slate-500 sm:px-10"><div><p>Prepared independently by Noam at Boltcall</p><p className="mt-1 text-[10px]">Magnan's <a href={report.logo.source} target="_blank" rel="noopener noreferrer" className={linkClass}>official logo</a> identifies the subject of this review, not a partnership or endorsement.</p></div><Link to="/" className={linkClass}>BOLTCALL.ORG</Link></footer>
    </div>
  );
}
