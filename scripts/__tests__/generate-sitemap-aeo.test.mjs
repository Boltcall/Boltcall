import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'vitest';

import { buildSitemapXml } from '../generate-sitemap.mjs';

describe('generate-sitemap AEO content', () => {
  it('includes published AEO pages and excludes drafts', () => {
    const contentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boltcall-aeo-sitemap-'));
    try {
      fs.writeFileSync(
        path.join(contentDir, 'published.md'),
        [
          '---',
          'title: "Test Published AEO Page"',
          'slug: test-published-aeo-page',
          'status: published',
          '---',
          '',
          '# Test Published AEO Page',
        ].join('\n'),
      );
      fs.writeFileSync(
        path.join(contentDir, 'draft.md'),
        [
          '---',
          'title: "Test Draft AEO Page"',
          'slug: test-draft-aeo-page',
          'status: draft',
          '---',
          '',
          '# Test Draft AEO Page',
        ].join('\n'),
      );

      const xml = buildSitemapXml({
        today: '2026-06-10',
        contentDir,
        // Real AppRoutes means ~110 git-log calls; this case is only about AEO drafts.
        appRoutesFile: path.join(contentDir, 'no-routes.tsx'),
      });

      assert.match(xml, /https:\/\/boltcall\.org\/blog\/test-published-aeo-page\//);
      assert.doesNotMatch(xml, /https:\/\/boltcall\.org\/blog\/test-draft-aeo-page\//);
    } finally {
      fs.rmSync(contentDir, { recursive: true, force: true });
    }
  });
});

describe('generate-sitemap lastmod + override posts', () => {
  function entry(xml, path) {
    const m = xml.match(new RegExp(`<url>\\s*<loc>https://boltcall\\.org${path}</loc>([\\s\\S]*?)</url>`));
    return m ? m[1] : null;
  }

  it('dates single-use pages, skips shared templates, lists live override posts, drops redirects', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boltcall-sitemap-'));
    try {
      fs.mkdirSync(path.join(root, 'pages'));
      fs.mkdirSync(path.join(root, 'routes'));
      fs.writeFileSync(path.join(root, 'pages', 'Solo.tsx'), 'export default () => null;');
      fs.writeFileSync(path.join(root, 'pages', 'Shared.tsx'), 'export default () => null;');
      const appRoutesFile = path.join(root, 'routes', 'AppRoutes.tsx');
      fs.writeFileSync(appRoutesFile, [
        "import Solo from '../pages/Solo';",
        "const Shared = React.lazy(() => import('../pages/Shared'));",
        '<Route path="/pricing" element={<Solo />} />',
        '<Route path="/about" element={<Shared />} />',
        '<Route path="/blog/new-post" element={<Shared />} />',
        '<Route path="/blog/retired" element={<Shared />} />',
      ].join('\n'));
      const overridesFile = path.join(root, 'overrides.json');
      fs.writeFileSync(overridesFile, JSON.stringify({
        '/blog/new-post': { updated_at: '2026-08-18T10:00:00Z' },
        '/blog/no-route': { updated_at: '2026-08-19' },
        '/blog/retired': { updated_at: '2026-08-20' },
      }));
      const redirectsFile = path.join(root, '_redirects');
      fs.writeFileSync(redirectsFile, '/blog/retired  /blog  301!\n/old/*  /new  301\n');

      const xml = buildSitemapXml({ contentDir: path.join(root, 'none'), appRoutesFile, overridesFile, redirectsFile });

      // Single-use page component: real file date (untracked here, so mtime).
      assert.match(entry(xml, '/pricing/'), /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
      // Shared template: an edit to it is not a content change, so no date.
      assert.doesNotMatch(entry(xml, '/about/'), /<lastmod>/);
      // Override post with a live route is listed with its own content date.
      assert.match(entry(xml, '/blog/new-post/'), /<lastmod>2026-08-18<\/lastmod>/);
      // No live route, or redirected away: never in the sitemap.
      assert.equal(entry(xml, '/blog/no-route/'), null);
      assert.equal(entry(xml, '/blog/retired/'), null);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
