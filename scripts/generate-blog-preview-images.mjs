import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outputDir = join('public', 'images', 'blog', 'previews');

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripHtml(value) {
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

function keyFromPath(pathname) {
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

function wrapText(text, maxChars, maxLines) {
  const words = stripHtml(text).split(/\s+/);
  const lines = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = next;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function categoryFor(pathname, title) {
  const text = `${pathname} ${title}`.toLowerCase();
  if (text.includes(' vs ') || text.includes('-vs-') || text.includes('comparison') || text.includes('/compare/')) return 'Comparison';
  if (text.includes('how-to') || text.includes('how ') || text.includes('setup') || text.includes('set-up')) return 'How-to';
  if (text.includes('best') || text.includes('top')) return 'Buyer guide';
  if (text.includes('cost') || text.includes('pricing') || text.includes('roi') || text.includes('worth')) return 'ROI';
  if (text.includes('statistics') || text.includes('stats')) return 'Data';
  if (text.includes('hvac') || text.includes('plumber') || text.includes('dental') || text.includes('law') || text.includes('roofing') || text.includes('med spa') || text.includes('solar') || text.includes('vet')) return 'Industry guide';
  return 'Speed to lead';
}

function iconSet(variant) {
  const icons = [
    `<path d="M0 32c0-13 10-24 24-24h52c13 0 24 11 24 24v34c0 13-11 24-24 24H24C10 90 0 79 0 66V32Z" fill="white" stroke="#0B1220" stroke-width="5"/><path d="M23 33h54M23 52h34M23 70h22" stroke="#2563EB" stroke-width="7" stroke-linecap="round"/>`,
    `<rect x="0" y="7" width="86" height="86" rx="22" fill="white" stroke="#0B1220" stroke-width="5"/><path d="M25 37c8-16 28-16 36 0M25 63c8 16 28 16 36 0" stroke="#2563EB" stroke-width="7" stroke-linecap="round"/><path d="M13 50h60" stroke="#0B1220" stroke-width="5" stroke-linecap="round"/>`,
    `<rect x="4" y="12" width="94" height="78" rx="20" fill="white" stroke="#0B1220" stroke-width="5"/><path d="M25 8v18M77 8v18M23 45h56M23 65h34" stroke="#2563EB" stroke-width="7" stroke-linecap="round"/>`,
    `<circle cx="50" cy="50" r="42" fill="white" stroke="#0B1220" stroke-width="5"/><path d="M50 24v26l18 13" stroke="#2563EB" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
  ];
  return icons[variant % icons.length];
}

function svgFor({ pathname, title }) {
  const key = keyFromPath(pathname);
  const hash = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const variant = hash % 6;
  const category = categoryFor(pathname, title);
  const titleLines = wrapText(title, 27, 3);
  const subtitle = category === 'Comparison' ? 'clear choice guide' : category === 'How-to' ? 'step-by-step playbook' : 'local business growth guide';

  const lineY = [236, 305, 374];
  const titleText = titleLines
    .map((line, index) => `<text x="86" y="${lineY[index]}" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="800" fill="#0B1220">${escapeXml(line)}</text>`)
    .join('\n');

  const pattern =
    variant % 2 === 0
      ? `<path d="M820 112h250M820 156h180M820 200h290" stroke="#DBEAFE" stroke-width="14" stroke-linecap="round"/>`
      : `<path d="M840 120c80 34 160 34 240 0M840 180c80 34 160 34 240 0M840 240c80 34 160 34 240 0" stroke="#DBEAFE" stroke-width="12" stroke-linecap="round"/>`;

  const accent =
    variant % 3 === 0
      ? `<rect x="820" y="368" width="260" height="122" rx="30" fill="#2563EB"/><path d="M870 432h160M870 464h92" stroke="white" stroke-width="12" stroke-linecap="round"/>`
      : variant % 3 === 1
        ? `<circle cx="948" cy="430" r="86" fill="#2563EB"/><path d="M906 430h84l-24-24M990 430l-24 24" stroke="white" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<rect x="826" y="356" width="248" height="148" rx="36" fill="white" stroke="#2563EB" stroke-width="10"/><path d="M880 424h136M880 462h80" stroke="#0B1220" stroke-width="12" stroke-linecap="round"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">Boltcall blog preview image for ${escapeXml(title)}.</desc>
  <rect width="1200" height="675" fill="white"/>
  <rect x="36" y="36" width="1128" height="603" rx="44" fill="white" stroke="#0B1220" stroke-width="6"/>
  <path d="M72 557h1056" stroke="#DBEAFE" stroke-width="4"/>
  <rect x="86" y="84" width="188" height="46" rx="23" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="2"/>
  <text x="112" y="115" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="#2563EB">${escapeXml(category)}</text>
  <text x="86" y="177" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="800" letter-spacing="4" fill="#2563EB">BOLTCALL</text>
  ${titleText}
  <text x="86" y="475" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600" fill="#334155">${escapeXml(subtitle)}</text>
  <g transform="translate(882 80)">
    ${pattern}
  </g>
  <g transform="translate(870 250) scale(1.15)">
    ${iconSet(variant)}
  </g>
  ${accent}
  <path d="M88 587h150" stroke="#2563EB" stroke-width="12" stroke-linecap="round"/>
  <path d="M1010 586h66M1098 586h28" stroke="#0B1220" stroke-width="10" stroke-linecap="round"/>
</svg>
`;
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

function main() {
  mkdirSync(outputDir, { recursive: true });

  const postsByPath = new Map();
  for (const post of [...extractRoutePosts(), ...extractMarkdownPosts(), ...extractBlogCenterPosts()]) {
    postsByPath.set(post.pathname.replace(/\/$/, ''), post);
  }

  for (const post of postsByPath.values()) {
    const filename = `${keyFromPath(post.pathname)}.svg`;
    writeFileSync(join(outputDir, filename), svgFor(post), 'utf8');
  }

  console.log(`Generated ${postsByPath.size} blog preview images in ${outputDir}`);
}

main();
