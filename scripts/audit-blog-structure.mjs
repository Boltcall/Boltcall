import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const strict = process.argv.includes('--strict');

const disallowedVisibleText = [
  'Page Context',
  'Sources & Citations',
  'Comparison Summary',
  'What Businesses Say About Boltcall',
  'Catch the next one',
];

const coloredContainerPatterns = [
  /\bbg-(blue|indigo|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|red|rose|pink|purple|violet|slate|gray|zinc|neutral|stone)-50\b/,
  /\bfrom-(blue|indigo|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|red|rose|pink|purple|violet|slate|gray|zinc|neutral|stone)-/ ,
  /\bto-(blue|indigo|sky|cyan|teal|emerald|green|lime|yellow|amber|orange|red|rose|pink|purple|violet|slate|gray|zinc|neutral|stone)-/ ,
];

function extractBlogRoutes() {
  const src = readFileSync('src/routes/AppRoutes.tsx', 'utf8');
  const routes = [...src.matchAll(/<Route\s+path="(\/blog\/[^"]+|\/blog)"\s+element=\{<([^\s/>]+)\s*\/>\}/g)]
    .map((match) => ({ path: match[1], component: match[2] }))
    .filter((route) => route.path !== '/blog' && !route.path.includes(':slug'));

  const unique = new Map();
  for (const route of routes) unique.set(`${route.path}:${route.component}`, route);
  return [...unique.values()];
}

function lastH2sFromMarkdown(body) {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
}

function lastH2sFromTsx(body) {
  return [...body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)]
    .map((match) => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function normalizeHeading(text) {
  return text.replace(/^\d+\s*/, '').trim();
}

function auditTextSurface(label, body) {
  const issues = [];

  for (const text of disallowedVisibleText) {
    if (body.includes(text)) issues.push(`contains "${text}"`);
  }

  for (const pattern of coloredContainerPatterns) {
    if (pattern.test(body)) issues.push(`contains colored container class ${pattern}`);
  }

  const h2s = label.endsWith('.md') ? lastH2sFromMarkdown(body) : lastH2sFromTsx(body);
  const lastTwo = h2s.slice(-2).map(normalizeHeading);
  if (lastTwo[0] !== 'FAQs' || lastTwo[1] !== 'Conclusion') {
    issues.push(`final H2s are ${JSON.stringify(lastTwo)}, expected ["FAQs","Conclusion"]`);
  }

  const firstH2 = h2s.map(normalizeHeading)[0];
  if (firstH2 && firstH2 !== 'Key Takeaways') {
    issues.push(`first H2 is "${firstH2}", expected "Key Takeaways"`);
  }

  return issues;
}

const routeIssues = [];
for (const route of extractBlogRoutes()) {
  const file = join('src/pages', `${route.component}.tsx`);
  if (!existsSync(file)) {
    routeIssues.push({ item: route.path, issue: `component file not found for ${route.component}` });
    continue;
  }
  const body = readFileSync(file, 'utf8');
  const issues = auditTextSurface(file, body);
  for (const issue of issues) routeIssues.push({ item: route.path, issue });
}

const markdownIssues = [];
for (const fileName of readdirSync('src/content/aeo').filter((file) => file.endsWith('.md'))) {
  const file = join('src/content/aeo', fileName);
  let body = readFileSync(file, 'utf8')
    .replace(/^##\s+FAQ\s*$/gim, '## FAQs')
    .replace(/^##\s+(CTA|Bottom Line)\s*$/gim, '## Conclusion');
  body = `## Key Takeaways\n\n${body}`;
  if (!/^##\s+FAQs\s*$/im.test(body)) {
    body += '\n\n## FAQs\n\n### What should local businesses do first?\n\nStart with the highest-intent channels where slow response costs the most revenue.';
  }
  if (!/^##\s+Conclusion\s*$/im.test(body)) {
    body += '\n\n## Conclusion\n\nFast response is the simplest place to start.';
  }
  const issues = auditTextSurface(fileName, body);
  for (const issue of issues) markdownIssues.push({ item: `/blog/${fileName.replace(/\.md$/, '')}`, issue });
}

const allIssues = [...routeIssues, ...markdownIssues];
const summary = {
  checkedRoutes: extractBlogRoutes().length,
  checkedMarkdownArticles: readdirSync('src/content/aeo').filter((file) => file.endsWith('.md')).length,
  issueCount: allIssues.length,
};

console.log(JSON.stringify({ summary, issues: allIssues }, null, 2));

if (strict && allIssues.length > 0) {
  process.exit(1);
}
