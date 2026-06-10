import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createArticleSchema, createFAQSchema, injectSchemas } from '../lib/schema';
import { getAeoArticleBySlug } from '../lib/aeoContent';

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

function MarkdownBody({ body }: { body: string }) {
  const lines = body.split(/\r?\n/);
  const nodes = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`list-${nodes.length}`} className="list-disc pl-6 space-y-2">
        {listItems.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      continue;
    }
    flushList();
    if (trimmed.startsWith('# ')) {
      nodes.push(<h1 key={nodes.length} className="text-4xl font-bold tracking-tight text-slate-950">{trimmed.slice(2)}</h1>);
    } else if (trimmed.startsWith('## ')) {
      nodes.push(<h2 key={nodes.length} className="text-2xl font-semibold text-slate-950 pt-6">{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith('### ')) {
      nodes.push(<h3 key={nodes.length} className="text-xl font-semibold text-slate-900 pt-4">{trimmed.slice(4)}</h3>);
    } else {
      nodes.push(<p key={nodes.length} className="text-lg leading-8 text-slate-700">{renderInline(trimmed)}</p>);
    }
  }
  flushList();
  return <>{nodes}</>;
}

export default function AeoMarkdownArticlePage() {
  const { slug = '' } = useParams();
  const article = getAeoArticleBySlug(slug);

  useEffect(() => {
    if (!article) return undefined;
    document.title = `${article.title} | Boltcall`;
    const description = article.body
      .replace(/^#+\s+/gm, '')
      .replace(/\s+/g, ' ')
      .slice(0, 155);
    return injectSchemas([
      createArticleSchema({
        headline: article.title,
        description,
        datePublished: article.created || new Date().toISOString().slice(0, 10),
        url: article.route,
      }),
      ...(article.faqs.length ? [createFAQSchema(article.faqs)] : []),
    ]);
  }, [article]);

  if (!article) {
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
    <main className="min-h-screen bg-white px-6 py-24">
      <article className="mx-auto max-w-3xl space-y-6">
        <Link to="/blog" className="text-sm font-semibold text-blue-700">
          Boltcall Blog
        </Link>
        <MarkdownBody body={article.body} />
      </article>
    </main>
  );
}
