export interface AeoFaq {
  question: string;
  answer: string;
}

export interface AeoArticle {
  title: string;
  slug: string;
  targetQuery: string;
  status: string;
  created: string;
  schemaType: string;
  route: string;
  body: string;
  raw: string;
  faqs: AeoFaq[];
}

type RawModules = Record<string, string>;

const rawModules = import.meta.glob('../content/aeo/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as RawModules;

function parseFrontmatter(raw: string): { frontmatter: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: {}, body: raw.trim() };

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    frontmatter[key] = value;
  }
  return { frontmatter, body: raw.slice(match[0].length).trim() };
}

function slugFromPath(filePath: string): string {
  return filePath.split('/').pop()?.replace(/\.mdx?$/i, '') || 'aeo-page';
}

function titleFromBody(body: string): string {
  return body.match(/^#\s+(.+)$/m)?.[1]?.trim() || 'Boltcall AEO Guide';
}

function extractFaqs(body: string): AeoFaq[] {
  const faqStart = body.search(/^##\s+FAQ\s*$/im);
  const faqBody = faqStart >= 0 ? body.slice(faqStart) : body;
  const matches = [...faqBody.matchAll(/^###\s+(.+?)\s*\r?\n+([\s\S]*?)(?=^###\s+|\n##\s+|\s*$)/gim)];
  return matches
    .map((match) => ({
      question: match[1].trim(),
      answer: match[2]
        .replace(/^#+\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim(),
    }))
    .filter((faq) => faq.question && faq.answer);
}

export function parseAeoArticle(filePath: string, raw: string): AeoArticle {
  const { frontmatter, body } = parseFrontmatter(raw);
  const slug = frontmatter.slug || slugFromPath(filePath);
  const title = frontmatter.title || titleFromBody(body);
  return {
    title,
    slug,
    targetQuery: frontmatter.target_query || frontmatter.question || '',
    status: frontmatter.status || 'draft',
    created: frontmatter.created || '',
    schemaType: frontmatter.schema_type || 'Article',
    route: `/blog/${slug}/`,
    body,
    raw,
    faqs: extractFaqs(body),
  };
}

export function loadAeoArticlesFromModules(modules: RawModules = rawModules): AeoArticle[] {
  return Object.entries(modules)
    .map(([filePath, raw]) => parseAeoArticle(filePath, raw))
    .filter((article) => article.status === 'published')
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function listPublishedAeoArticles(): AeoArticle[] {
  return loadAeoArticlesFromModules(rawModules);
}

export function getAeoArticleBySlug(slug = ''): AeoArticle | null {
  return listPublishedAeoArticles().find((article) => article.slug === slug) || null;
}
