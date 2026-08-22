// Generates 3 on-brand SVG break images per blog post, inserted inline in
// the article body (see getBlogBodyImage in src/lib/blogPreviewImages.ts).
// Same zero-dependency deterministic approach as generate-blog-preview-images
// — no photo library, no external image API, runs at build time for every
// known post (current + future, once daily-blog-publisher adds a route).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { keyFromPath, listBlogPosts } from './lib/blog-post-index.mjs';

const outputDir = join('public', 'images', 'blog', 'body');

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// One visual role per slot so the 3 images in an article don't repeat the
// same layout — each also gets a slug-hashed variant so different posts
// don't look identical to each other within the same slot either.
const ROLES = [
  { label: 'Key stat', icon: 'chart' },
  { label: 'How it works', icon: 'flow' },
  { label: 'Boltcall in action', icon: 'bolt' },
];

function iconFor(icon, tint) {
  switch (icon) {
    case 'chart':
      return `<rect x="60" y="150" width="46" height="90" rx="8" fill="${tint}"/><rect x="127" y="110" width="46" height="130" rx="8" fill="${tint}"/><rect x="194" y="70" width="46" height="170" rx="8" fill="#0B1220"/>`;
    case 'flow':
      return `<circle cx="70" cy="150" r="26" fill="${tint}"/><circle cx="150" cy="90" r="26" fill="${tint}"/><circle cx="230" cy="150" r="26" fill="#0B1220"/><path d="M94 138 130 104M170 104 206 138" stroke="#0B1220" stroke-width="6" stroke-linecap="round"/>`;
    default:
      return `<path d="M158 40 90 158h56l-20 102 96-140h-58l24-80Z" fill="${tint}" stroke="#0B1220" stroke-width="6" stroke-linejoin="round"/>`;
  }
}

function svgFor({ pathname, title }, role, seed) {
  const variant = seed % 3;
  const tint = variant === 0 ? '#2563EB' : variant === 1 ? '#0EA5E9' : '#2563EB';
  const bandFill = variant === 1 ? '#F0F9FF' : '#EFF6FF';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="500" viewBox="0 0 1200 500" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(role.label)} — ${escapeXml(title)}</title>
  <rect width="1200" height="500" fill="${bandFill}"/>
  <rect x="24" y="24" width="1152" height="452" rx="32" fill="white" stroke="#0B1220" stroke-width="5"/>
  <g transform="translate(70 130)">${iconFor(role.icon, tint)}</g>
  <rect x="420" y="150" width="180" height="40" rx="20" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="2"/>
  <text x="440" y="177" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800" fill="#2563EB">${escapeXml(role.label.toUpperCase())}</text>
  <text x="420" y="240" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" fill="#0B1220">Speed-to-lead, applied</text>
  <text x="420" y="280" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="500" fill="#334155">First business to respond wins the job.</text>
  <text x="420" y="308" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="800" letter-spacing="3" fill="#2563EB">BOLTCALL</text>
</svg>
`;
}

function main() {
  mkdirSync(outputDir, { recursive: true });
  const posts = listBlogPosts();

  for (const post of posts) {
    const key = keyFromPath(post.pathname);
    const hash = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    ROLES.forEach((role, i) => {
      const filename = `${key}-${i + 1}.svg`;
      writeFileSync(join(outputDir, filename), svgFor(post, role, hash + i), 'utf8');
    });
  }

  console.log(`Generated ${posts.length * ROLES.length} blog body images (${posts.length} posts x ${ROLES.length}) in ${outputDir}`);
}

main();
