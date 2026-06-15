import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import BlogClosingCta from '../components/blog/BlogClosingCta';
import BlogRelatedArticles from '../components/blog/BlogRelatedArticles';
import { useTableOfContents } from '../hooks/useTableOfContents';
import { updateMetaDescription } from '../lib/utils';
import { getAbsoluteBlogPreviewImage, updateBlogPreviewMeta } from '../lib/blogPreviewImages';
import { createArticleSchema, createFAQSchema, injectSchemas } from '../lib/schema';
import { type AeoFaq, getAeoArticleBySlug } from '../lib/aeoContent';

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <Link key={index} className="font-semibold text-blue-700 underline-offset-4 hover:underline" to={link[2]}>
          {link[1]}
        </Link>
      );
    }
    return part;
  });
}

function normalizeHeading(text: string) {
  const normalized = text.trim();
  if (/^faq$/i.test(normalized)) return 'FAQs';
  if (/^(cta|bottom line)$/i.test(normalized)) return 'Conclusion';
  return normalized;
}

function splitMarkdownBody(body: string) {
  const withoutTitle = body.replace(/^#\s+.+\r?\n+/, '').trim();
  const firstHeading = withoutTitle.search(/^##\s+/m);
  const introBlock = firstHeading >= 0 ? withoutTitle.slice(0, firstHeading).trim() : withoutTitle;
  const remaining = firstHeading >= 0 ? withoutTitle.slice(firstHeading).trim() : '';
  const intro = introBlock
    .split(/\r?\n\r?\n/)
    .map((part) => part.trim())
    .find(Boolean) || '';

  return {
    intro,
    remaining: remaining.replace(intro, '').trim(),
  };
}

function hasH2(body: string, label: string) {
  return new RegExp(`^##\\s+${label}\\s*$`, 'im').test(body);
}

function buildFaqs(articleTitle: string, originalFaqs: AeoFaq[]): AeoFaq[] {
  if (originalFaqs.length) return originalFaqs;

  return [
    {
      question: `What is the main point of ${articleTitle}?`,
      answer: 'The main point is that local service businesses win more booked jobs when they respond quickly, clearly, and consistently across calls, forms, texts, and after-hours inquiries.',
    },
    {
      question: 'Where should a local business improve first?',
      answer: 'Start with the highest-intent channels: phone calls, missed calls, contact forms, paid search leads, and after-hours inquiries. Those are the places where slow response usually costs the most revenue.',
    },
    {
      question: 'How does Boltcall help with this?',
      answer: 'Boltcall answers, qualifies, follows up, and helps book leads automatically so owners and teams do not have to manually chase every inquiry.',
    },
  ];
}

function buildKeyTakeaways(articleTitle: string, intro: string, targetQuery: string) {
  const cleanIntro = intro.replace(/\*\*/g, '').replace(/\[[^\]]+\]\([^)]+\)/g, '').trim();
  const firstSentence = cleanIntro.split(/(?<=[.!?])\s+/)[0] || `${articleTitle} is about turning faster response into more booked jobs.`;

  return [
    firstSentence,
    targetQuery
      ? `The search intent is practical: the reader wants a clear answer to "${targetQuery}" without digging through theory.`
      : 'The reader needs a practical answer, not a broad marketing lecture.',
    'The operational fix is simple: respond instantly, collect the right details, and move the lead toward a booked next step.',
  ];
}

function prepareBody(body: string, faqs: AeoFaq[]) {
  let prepared = body
    .replace(/^##\s+FAQ\s*$/gim, '## FAQs')
    .replace(/^##\s+(CTA|Bottom Line)\s*$/gim, '## Conclusion')
    .trim();

  if (!hasH2(prepared, 'FAQs')) {
    prepared += `\n\n## FAQs\n\n${faqs.map((faq) => `### ${faq.question}\n\n${faq.answer}`).join('\n\n')}`;
  }

  if (!hasH2(prepared, 'Conclusion')) {
    prepared += '\n\n## Conclusion\n\nFast response is no longer a nice-to-have for local service businesses. It is the difference between a lead that books and a lead that quietly chooses someone else.\n\nThe best next step is to fix the first response. Make every call, form, and message easier to answer immediately, then improve the rest of the funnel from there.';
  }

  const faqIndex = prepared.search(/^##\s+FAQs\s*$/im);
  const conclusionIndex = prepared.search(/^##\s+Conclusion\s*$/im);

  if (faqIndex >= 0 && conclusionIndex >= 0 && conclusionIndex < faqIndex) {
    const beforeConclusion = prepared.slice(0, conclusionIndex).trim();
    const conclusionBlock = prepared.slice(conclusionIndex, faqIndex).trim();
    const faqBlock = prepared.slice(faqIndex).trim();
    prepared = `${beforeConclusion}\n\n${faqBlock}\n\n${conclusionBlock}`;
  }

  return prepared;
}

function MarkdownBody({ body, initialSectionNumber = 0 }: { body: string; initialSectionNumber?: number }) {
  const lines = body.split(/\r?\n/);
  const nodes = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];
  let sectionNumber = initialSectionNumber;

  const flushList = () => {
    if (listItems.length) {
      nodes.push(
        <ul key={`list-${nodes.length}`} className="list-disc pl-6 space-y-2 text-gray-700">
          {listItems.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      listItems = [];
    }

    if (orderedItems.length) {
      nodes.push(
        <ol key={`ordered-${nodes.length}`} className="list-decimal pl-6 space-y-2 text-gray-700">
          {orderedItems.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      orderedItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith('- ')) {
      orderedItems = [];
      listItems.push(trimmed.slice(2));
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      listItems = [];
      orderedItems.push(ordered[1]);
      continue;
    }

    flushList();

    if (trimmed.startsWith('# ')) {
      continue;
    }

    if (trimmed.startsWith('## ')) {
      const text = normalizeHeading(trimmed.slice(3));
      sectionNumber += 1;
      nodes.push(
        <h2 key={nodes.length} id={slugify(text)} className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 mt-14 flex items-start gap-3">
          <span aria-hidden="true" className="toc-index text-blue-600 font-mono text-sm mr-1 pt-2">{String(sectionNumber).padStart(2, '0')}</span>
          <span>{text}</span>
        </h2>,
      );
    } else if (trimmed.startsWith('### ')) {
      nodes.push(
        <h3 key={nodes.length} className="text-xl md:text-2xl font-semibold text-gray-900 mt-8 mb-3">
          {renderInline(trimmed.slice(4))}
        </h3>,
      );
    } else {
      nodes.push(
        <p key={nodes.length} className="text-lg leading-8 text-gray-700">
          {renderInline(trimmed)}
        </p>,
      );
    }
  }

  flushList();
  return <div className="space-y-5">{nodes}</div>;
}

export default function AeoMarkdownArticlePage() {
  const { slug = '' } = useParams();
  const article = getAeoArticleBySlug(slug);
  const headings = useTableOfContents();

  const prepared = useMemo(() => {
    if (!article) return null;
    const { intro, remaining } = splitMarkdownBody(article.body);
    const faqs = buildFaqs(article.title, article.faqs);
    const body = prepareBody(remaining, faqs);
    const keyTakeaways = buildKeyTakeaways(article.title, intro, article.targetQuery);

    return { intro, body, faqs, keyTakeaways };
  }, [article]);

  useEffect(() => {
    if (!article || !prepared) return undefined;
    window.scrollTo(0, 0);
    document.title = `${article.title} | Boltcall`;
    const description = (prepared.intro || article.body)
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 155);
    updateMetaDescription(description);
    const cleanupMeta = updateBlogPreviewMeta(article.route, article.title, description);
    const cleanupSchemas = injectSchemas([

      createArticleSchema({
        headline: article.title,
        description,
        datePublished: article.created || new Date().toISOString().slice(0, 10),
        dateModified: article.created || new Date().toISOString().slice(0, 10),
        url: article.route.replace(/\/$/, ''),
        image: getAbsoluteBlogPreviewImage(article.route),
      }),
      createFAQSchema(prepared.faqs),
    ]);

    return () => {
      cleanupMeta();
      cleanupSchemas();
    };
  }, [article, prepared]);

  if (!article || !prepared) {
    return (
      <main className="min-h-screen bg-white px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-blue-700">Boltcall</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">Article not found</h1>
          <p className="mt-4 text-lg text-slate-600">This Boltcall guide is not published yet.</p>
          <Link className="mt-8 inline-flex text-blue-700 font-semibold" to="/blog">
            Back to blog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />

      <section className="relative pt-32 pb-8 bg-white">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: article.title, href: article.route.replace(/\/$/, '') },
            ]}
          />
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            {article.created && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{article.created}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>5 min read</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">
            {prepared.intro && (
              <div className="mb-12">
                <p className="speakable-intro text-xl text-gray-700 leading-relaxed font-medium">
                  {renderInline(prepared.intro)}
                </p>
              </div>
            )}

            <section className="mb-12">
              <h2 id="key-takeaways" className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
                <span aria-hidden="true" className="toc-index text-blue-600 font-mono text-sm mr-1 pt-2">01</span>
                <span>Key Takeaways</span>
              </h2>
              <ul className="list-disc pl-6 space-y-3 text-lg leading-8 text-gray-700">
                {prepared.keyTakeaways.map((takeaway) => (
                  <li key={takeaway}>{takeaway}</li>
                ))}
              </ul>
            </section>

            <MarkdownBody body={prepared.body} initialSectionNumber={1} />

            <BlogClosingCta />
            <BlogRelatedArticles />
          </article>

          <aside className="hidden xl:block w-64 shrink-0">
            <div className="sticky top-32">
              <TableOfContents
                headings={headings}
                socialLinks={[
                  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61582307818752' },
                  { label: 'X', href: 'https://x.com/boltcallteam' },
                  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/boltcall' },
                ]}
                cta={{
                  title: 'Missed jobs?',
                  href: '/signup',
                  label: 'Start for free',
                }}
              />
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
