import { describe, expect, it } from 'vitest';

import { answerBoxFromOverride, applySeoAutopilotOverride } from '../seoAutopilotOverride';

describe('SEO autopilot page overrides', () => {
  it('overrides the intro without changing the canonical path', () => {
    const article = applySeoAutopilotOverride({ path: '/blog/example', intro: 'Old' }, {
      intro: 'Direct buyer answer',
      updated_at: '2026-07-15',
    });
    expect(article.path).toBe('/blog/example');
    expect(article.intro).toBe('Direct buyer answer');
  });

  it('builds the top-of-page answer box from the override', () => {
    expect(answerBoxFromOverride(undefined)).toBeNull();
    expect(answerBoxFromOverride({ answer_title: 'Q only' })).toBeNull();
    expect(answerBoxFromOverride({
      answer_title: 'What buyers need to know',
      answer_paragraphs: ['Answer first.'],
      links: [{ label: 'Book an audit', href: '/book-a-call/' }],
    })).toEqual({
      title: 'What buyers need to know',
      paragraphs: ['Answer first.'],
      links: [{ label: 'Book an audit', href: '/book-a-call/' }],
    });
  });
});
