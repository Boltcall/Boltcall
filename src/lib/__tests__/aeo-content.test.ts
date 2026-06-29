import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getAeoArticleBySlug } from '../aeoContent';

const llmsTxt = readFileSync(resolve(process.cwd(), 'public/llms.txt'), 'utf8');

describe('AEO public content', () => {
  it('keeps llms.txt focused on one canonical Boltcall profile', () => {
    expect(llmsTxt.match(/^# Boltcall$/gm) ?? []).toHaveLength(1);
    expect(llmsTxt).not.toMatch(/\$99\/month|\$179\/month|\$249\/month|\$997\/month/);
  });

  it('keeps llms.txt aligned with public pricing', () => {
    expect(llmsTxt).toContain('$549/month');
    expect(llmsTxt).toContain('$897/month');
    expect(llmsTxt).toContain('$4,997/month');
  });

  it('publishes missed-call text-back software as a loadable AEO article', () => {
    const article = getAeoArticleBySlug('missed-call-text-back-software');

    expect(article).not.toBeNull();
    expect(article?.status).toBe('published');
    expect(article?.route).toBe('/blog/missed-call-text-back-software/');
    expect(article?.targetQuery).toBe('missed call text back software');
  });

  it('keeps missed-call text-back software FAQs before conclusion', () => {
    const article = getAeoArticleBySlug('missed-call-text-back-software');
    expect(article).not.toBeNull();

    const faqIndex = article!.body.search(/^## FAQs$/m);
    const conclusionIndex = article!.body.search(/^## Conclusion$/m);

    expect(faqIndex).toBeGreaterThan(0);
    expect(conclusionIndex).toBeGreaterThan(faqIndex);
  });
});
