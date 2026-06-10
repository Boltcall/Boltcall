import { describe, expect, it } from 'vitest';

import { listPublishedAeoArticles, loadAeoArticlesFromModules } from '../aeoContent';

const published = [
  '---',
  'title: "Test Published AEO Page"',
  'slug: test-published-aeo-page',
  'target_query: test published aeo page',
  'status: published',
  'created: 2026-06-10',
  'schema_type: FAQPage',
  '---',
  '',
  '# Test Published AEO Page',
  '',
  '**Short answer:** This page is public.',
  '',
  '## FAQ',
  '',
  '### What is this test page?',
  '',
  'It is a published test article.',
  '',
  '### Should this page be public?',
  '',
  'Yes. The frontmatter says published.',
].join('\n');

const draft = [
  '---',
  'title: "Test Draft AEO Page"',
  'slug: test-draft-aeo-page',
  'target_query: test draft aeo page',
  'status: draft',
  'created: 2026-06-10',
  'schema_type: FAQPage',
  '---',
  '',
  '# Test Draft AEO Page',
].join('\n');

describe('AEO markdown content loader', () => {
  it('lists published AEO markdown and hides drafts', () => {
    const articles = loadAeoArticlesFromModules({
      '../content/aeo/test-published-aeo-page.md': published,
      '../content/aeo/test-draft-aeo-page.md': draft,
    });

    expect(articles).toHaveLength(1);
    expect(articles.every((article) => article.status === 'published')).toBe(true);
    expect(articles.some((article) => article.slug === 'test-published-aeo-page')).toBe(true);
    expect(articles.some((article) => article.slug === 'test-draft-aeo-page')).toBe(false);
  });

  it('resolves a published article by slug with FAQ questions', () => {
    const article = loadAeoArticlesFromModules({
      '../content/aeo/test-published-aeo-page.md': published,
      '../content/aeo/test-draft-aeo-page.md': draft,
    }).find((item) => item.slug === 'test-published-aeo-page');

    expect(article?.title).toBe('Test Published AEO Page');
    expect(article?.route).toBe('/blog/test-published-aeo-page/');
    expect(article?.faqs.length).toBeGreaterThanOrEqual(2);
  });

  it('loads the repository content folder without exposing drafts', () => {
    expect(listPublishedAeoArticles().every((article) => article.status === 'published')).toBe(true);
  });
});
