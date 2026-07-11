import { describe, expect, it } from 'vitest';
import { deriveBusinessName, guessIndustry, normalizeWebsite } from '../useWebsiteIntel';

describe('deriveBusinessName', () => {
  it('picks the brand segment even when title starts with a hyphenated tagline', () => {
    // Bug: title split on plain "-" broke "Speed-to-lead" into "Speed".
    expect(
      deriveBusinessName('Speed-to-lead AI receptionist | Boltcall', 'boltcall.org'),
    ).toBe('Boltcall');
  });

  it('splits on pipes and en-dashes but leaves compound hyphens intact', () => {
    expect(deriveBusinessName('Boltcall | Speed to lead', 'boltcall.org')).toBe('Boltcall');
    expect(deriveBusinessName('Smith Dental – Family Dentistry', 'smithdental.com')).toBe(
      'Smith Dental',
    );
    // Hyphens flanked by spaces still count as separators.
    expect(deriveBusinessName('Boltcall - Home', 'boltcall.org')).toBe('Boltcall');
  });

  it('falls back to a title-cased domain root when the title is empty', () => {
    expect(deriveBusinessName('', 'smithdental.com')).toBe('Smithdental');
  });

  it('never returns a URL-looking string', () => {
    expect(deriveBusinessName('https://example.com', 'example.com')).toBe('Example');
  });
});

describe('normalizeWebsite', () => {
  it('adds https and strips trailing slash', () => {
    expect(normalizeWebsite('boltcall.org')).toEqual({
      url: 'https://boltcall.org',
      domain: 'boltcall.org',
    });
  });
  it('strips www', () => {
    expect(normalizeWebsite('https://www.boltcall.org/')?.domain).toBe('boltcall.org');
  });
  it('rejects garbage', () => {
    expect(normalizeWebsite('not a url')).toBeNull();
    expect(normalizeWebsite('')).toBeNull();
  });
});

describe('guessIndustry', () => {
  it('picks the industry with the strongest keyword hits', () => {
    expect(guessIndustry('We do drain cleaning and pipe repair')).toBe('plumbing');
    expect(guessIndustry('Family dentist, teeth cleaning, orthodontics')).toBe('dental');
    expect(guessIndustry('random unrelated content')).toBe('other');
  });
});
