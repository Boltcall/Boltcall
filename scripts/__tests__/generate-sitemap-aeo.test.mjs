import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildSitemapXml } from '../generate-sitemap.mjs';

const contentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boltcall-aeo-sitemap-'));
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
});

assert.match(xml, /https:\/\/boltcall\.org\/blog\/test-published-aeo-page\//);
assert.doesNotMatch(xml, /https:\/\/boltcall\.org\/blog\/test-draft-aeo-page\//);

fs.rmSync(contentDir, { recursive: true, force: true });

console.log('generate sitemap AEO tests passed');
