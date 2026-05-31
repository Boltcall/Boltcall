import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

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
});
