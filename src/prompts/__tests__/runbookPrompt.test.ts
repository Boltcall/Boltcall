import { describe, test, expect } from 'vitest';
import { buildRunbookSystemPrompt, buildRunbookUserPrompt } from '../runbookPrompt';

const RICH: any = {
  businessName: 'Alpine Roofing',
  industry: 'roofing',
  services: ['inspection', 'repair', 'full replacement'],
  hours: 'Mon-Fri 8am-6pm',
  serviceAreas: ['Denver', 'Boulder'],
  languages: ['English', 'Spanish'],
  retellSystemPrompt: 'You are the receptionist for Alpine Roofing.',
  recentCallSummaries: [
    'Caller asked about leak repair, wanted quote today.',
    'Caller booked inspection for next Tuesday.',
    'Caller asked if we service Boulder — confirmed yes.',
  ],
  recentLeadSummaries: [
    'John Smith via website form - status new',
    'Jane Doe via referral - status contacted',
  ],
};

const THIN: any = {
  businessName: 'New Shop',
  industry: null,
  services: null,
  hours: null,
  serviceAreas: null,
  languages: null,
  retellSystemPrompt: null,
  recentCallSummaries: [],
  recentLeadSummaries: [],
};

describe('runbookPrompt', () => {
  test('system prompt names the required sections in order', () => {
    const s = buildRunbookSystemPrompt();
    const sections = [
      'Who we are',
      'Hours & availability',
      'Services we offer',
      'The 5 most common inbound situations',
      'Booking policy',
      'Escalation triggers',
      'What we NEVER do',
      'Open questions',
    ];
    let lastIndex = -1;
    for (const s2 of sections) {
      const idx = s.indexOf(s2);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  test('system prompt bans fabrication + preamble', () => {
    const s = buildRunbookSystemPrompt();
    expect(s).toMatch(/never guess|no invented facts|never fabricate/i);
    expect(s).toMatch(/no preamble/i);
  });

  test('user prompt with rich inputs includes services + calls + leads', () => {
    const u = buildRunbookUserPrompt(RICH);
    expect(u).toContain('Alpine Roofing');
    expect(u).toContain('roofing');
    expect(u).toContain('inspection, repair, full replacement');
    expect(u).toContain('Denver, Boulder');
    expect(u).toContain('Sample calls (last 3)');
    expect(u).toContain('leak repair');
    expect(u).toContain('Sample leads (last 2)');
  });

  test('user prompt with thin inputs shows (no calls yet) / (no leads yet)', () => {
    const u = buildRunbookUserPrompt(THIN);
    expect(u).toContain('(no calls yet)');
    expect(u).toContain('(no leads yet)');
    expect(u).toContain('(unknown)');
    expect(u).toContain('(not provided)');
  });

  test('user prompt does not include retell prompt section when absent', () => {
    const u = buildRunbookUserPrompt(THIN);
    expect(u).not.toContain('Current Retell agent system prompt');
  });

  test('user prompt truncates long retell prompt at 3000 chars', () => {
    // Use Ψ (rare unicode char) so we count only the injected block, not
    // any real letters that appear in the surrounding fixture text.
    const long = 'Ψ'.repeat(5000);
    const u = buildRunbookUserPrompt({ ...RICH, retellSystemPrompt: long });
    expect(u).toContain('Ψ');
    const injected = (u.match(/Ψ/g) || []).length;
    expect(injected).toBeLessThanOrEqual(3000);
    expect(injected).toBeGreaterThan(1000); // truncation happened but plenty landed
  });
});
