import { describe, expect, it } from 'vitest';

import { answerBoxFromOverride, applySeoAutopilotOverride } from '../seoAutopilotOverride';

describe('SEO autopilot page overrides', () => {
  it('overrides the intro without changing the canonical path', () => {
    const article = applySeoAutopilotOverride({ path: '/blog/example', intro: 'Old', sections: [] }, {
      intro: 'Direct buyer answer',
      updated_at: '2026-07-15',
    });
    expect(article.path).toBe('/blog/example');
    expect(article.intro).toBe('Direct buyer answer');
    expect(article.sections).toEqual([]);
  });

  it('splices body_sections right after sections[0] (Key Takeaways)', () => {
    const article = applySeoAutopilotOverride(
      {
        path: '/blog/example',
        intro: 'Old',
        sections: [{ title: 'Key Takeaways' }, { title: 'What Matters Most' }],
      },
      {
        body_sections: [{ title: 'Custom Section', paragraphs: ['Written for this post.'] }],
      },
    );
    expect(article.sections.map((s) => s.title)).toEqual(['Key Takeaways', 'Custom Section', 'What Matters Most']);
  });

  it('leaves sections untouched when no body_sections are given', () => {
    const sections = [{ title: 'Key Takeaways' }, { title: 'What Matters Most' }];
    const article = applySeoAutopilotOverride({ path: '/blog/example', intro: 'Old', sections }, { intro: 'x' });
    expect(article.sections).toBe(sections);
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
