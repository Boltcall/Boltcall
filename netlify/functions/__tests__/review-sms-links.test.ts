import { describe, it, expect } from 'vitest';
import { buildReviewSms } from '../appointment-handler';

const vars = { client_name: 'Dana', business_name: 'Cohen Law', review_url: 'https://g.page/r/abc' };
const tpl = 'Hi {{client_name}}, thanks for visiting {{business_name}}! {{review_url}}';

describe('buildReviewSms', () => {
  it('keeps the Google-only message when no extra sites are set', () => {
    expect(buildReviewSms(tpl, vars, undefined)).toBe('Hi Dana, thanks for visiting Cohen Law! https://g.page/r/abc');
  });

  it('appends extra review sites on new lines, max 3, https only', () => {
    const out = buildReviewSms(tpl, vars, [
      { label: 'Avvo', url: 'https://avvo.com/x' },
      { label: 'Yelp', url: 'http://yelp.com/insecure' },
      { label: 'Facebook', url: ' https://facebook.com/x ' },
      { url: 'https://trustpilot.com/x' },
      { label: 'Extra', url: 'https://bbb.org/x' },
    ]);
    expect(out).toBe('Hi Dana, thanks for visiting Cohen Law! https://g.page/r/abc\nAvvo: https://avvo.com/x\nFacebook: https://facebook.com/x\nReview: https://trustpilot.com/x');
  });

  it('puts the links where {{review_links}} sits instead of appending', () => {
    const out = buildReviewSms('Review us: {{review_url}}\n{{review_links}}\nThanks!', vars, [{ label: 'Avvo', url: 'https://avvo.com/x' }]);
    expect(out).toBe('Review us: https://g.page/r/abc\nAvvo: https://avvo.com/x\nThanks!');
  });
});
