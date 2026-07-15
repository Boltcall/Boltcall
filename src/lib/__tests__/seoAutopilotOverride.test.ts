import { describe, expect, it } from 'vitest';

import { applySeoAutopilotOverride } from '../seoAutopilotOverride';

describe('SEO autopilot page overrides', () => {
  it('improves an existing article without changing its canonical path', () => {
    const article = applySeoAutopilotOverride({ path: '/blog/example', intro: 'Old', sections: [] }, {
      intro: 'Direct buyer answer',
      answer_title: 'What buyers need to know',
      answer_paragraphs: ['Answer first.'],
      links: [{ label: 'Book an audit', href: '/book-a-call/' }],
      updated_at: '2026-07-15',
    });
    expect(article.path).toBe('/blog/example');
    expect(article.intro).toBe('Direct buyer answer');
    expect(article.sections[0]).toEqual({
      title: 'What buyers need to know',
      paragraphs: ['Answer first.'],
      links: [{ label: 'Book an audit', href: '/book-a-call/' }],
    });
  });
});
