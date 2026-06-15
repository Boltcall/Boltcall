import { ArrowRight } from 'lucide-react';

export interface BlogRelatedArticle {
  href: string;
  label: string;
  title: string;
  description: string;
}

interface BlogRelatedArticlesProps {
  articles?: BlogRelatedArticle[];
}

const defaultArticles: BlogRelatedArticle[] = [
  {
    href: '/blog/speed-to-lead-local-business',
    label: 'Speed',
    title: 'Speed to Lead for Local Businesses',
    description: 'The complete guide to faster lead response.',
  },
  {
    href: '/blog/ai-receptionist-cost-pricing',
    label: 'Pricing',
    title: 'AI Receptionist Cost and Pricing',
    description: 'Understand the costs, trade-offs, and ROI.',
  },
  {
    href: '/blog/best-after-hours-answering-service',
    label: 'Coverage',
    title: 'Best After-Hours Answering Service',
    description: 'Compare options for 24/7 call coverage.',
  },
];

export default function BlogRelatedArticles({ articles = defaultArticles }: BlogRelatedArticlesProps) {
  return (
    <section className="mb-14 border-t border-gray-200 pt-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Keep reading</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900">Related articles</h3>
        </div>
        <a href="/blog" className="hidden text-sm font-semibold text-gray-700 transition-colors hover:text-blue-600 md:inline-flex">
          All articles
        </a>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {articles.map((article) => (
          <a
            key={article.href}
            href={article.href}
            className="group flex min-h-[170px] flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">{article.label}</p>
              <p className="mt-3 text-base font-semibold leading-snug text-gray-900">{article.title}</p>
              <p className="mt-2 text-sm leading-5 text-gray-500">{article.description}</p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
              Read next <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
