// Shared post discovery for blog image generator scripts. A "post" is any
// canonical route, AEO markdown article, or BlogCenter card — deduped by
// path so every generator (preview cards, body images, ...) sees the same
// set without re-deriving it from three different source files.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function stripHtml(value) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((word) => {
      if (['ai', 'seo', 'roi', 'sms', 'crm', 'hvac', 'faq'].includes(word)) return word.toUpperCase();
      if (word === 'vs') return 'vs';
      return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
    })
    .join(' ');
}

export function keyFromPath(pathname) {
  return pathname
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/\/$/, '')
    .replace(/^\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function titleFromPath(pathname) {
  const slug = pathname.replace(/\/$/, '').split('/').filter(Boolean).at(-1) || 'blog';
  return titleCase(slug);
}

function extractBlogCenterPosts() {
  const source = readFileSync(join('src', 'pages', 'BlogCenter.tsx'), 'utf8');
  const posts = [];
  const entryMatches = source.matchAll(/\{\s*title:\s*'([\s\S]*?)',\s*slug:\s*'([^']+)'/g);
  for (const match of entryMatches) {
    posts.push({ title: stripHtml(match[1].replace(/\\'/g, "'")), pathname: match[2] });
  }
  return posts;
}

function extractRoutePosts() {
  const source = readFileSync(join('src', 'routes', 'AppRoutes.tsx'), 'utf8').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  return [...source.matchAll(/<Route\s+path="(\/blog\/[^":]+)"/g)].map((match) => ({
    pathname: match[1],
    title: titleFromPath(match[1]),
  }));
}

function extractMarkdownPosts() {
  const contentDir = join('src', 'content', 'aeo');
  if (!existsSync(contentDir)) return [];
  return readdirSync(contentDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const body = readFileSync(join(contentDir, file), 'utf8');
      const title = body.match(/^title:\s*"?([^"\n]+)"?/m)?.[1] || titleFromPath(file.replace(/\.md$/, ''));
      const slug = body.match(/^slug:\s*([^\n]+)/m)?.[1]?.trim() || file.replace(/\.md$/, '');
      return { pathname: `/blog/${slug}`, title };
    });
}

// Returns every known blog post deduped by canonical path (trailing slash
// stripped), as { pathname, title }.
export function listBlogPosts() {
  const postsByPath = new Map();
  for (const post of [...extractRoutePosts(), ...extractMarkdownPosts(), ...extractBlogCenterPosts()]) {
    postsByPath.set(post.pathname.replace(/\/$/, ''), post);
  }
  return [...postsByPath.values()];
}
