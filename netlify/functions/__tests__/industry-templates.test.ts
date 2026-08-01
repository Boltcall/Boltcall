import { describe, it, expect } from 'vitest';
import {
  INDUSTRY_TEMPLATES,
  INDUSTRY_TEMPLATES_ES,
  findIndustryTemplate,
} from '../generate-agent-prompt';
import { INDUSTRY_OPTIONS } from '../../../src/lib/setup/onboarding';

/**
 * Regression guard for the industry prompt library (batch-2 task 4).
 * Catches the three silent-failure modes that shipped before:
 *   1. A picker option with no template (landscaping fell back to generic).
 *   2. EN/ES array drift (ES resolved by index — parity is load-bearing).
 *   3. A template fully shadowed by an earlier one (never matchable).
 */

// Picker value → substring expected in the matched EN agentRole. Guards both
// resolution AND that the RIGHT template wins (no earlier-template shadowing).
const EXPECTED_ROLE: Record<string, string> = {
  plumbing: 'plumbing',
  hvac: 'HVAC',
  roofing: 'roofing',
  dental: 'dental',
  med_spa: 'med spa',
  law_firm: 'law firm',
  solar: 'solar',
  vet: 'medical office', // veterinary routes to the medical template
  real_estate: 'real estate',
  auto_repair: 'auto shop',
  cleaning: 'cleaning',
  landscaping: 'landscaping',
  electrical: 'electrical',
  pest_control: 'pest control',
  moving: 'moving company',
  restaurant: 'restaurant',
  fitness: 'fitness',
  accounting: 'accounting',
  towing: 'towing',
  locksmith: 'locksmith',
  garage_door: 'garage door',
  pool_service: 'pool service',
  painting: 'painting',
  chiropractor: 'chiropractic',
};

describe('EN/ES template parity', () => {
  it('arrays have equal length (ES resolves by index)', () => {
    expect(INDUSTRY_TEMPLATES_ES.length).toBe(INDUSTRY_TEMPLATES.length);
  });

  it('every template in both languages is substantive', () => {
    for (const templates of [INDUSTRY_TEMPLATES, INDUSTRY_TEMPLATES_ES]) {
      for (const t of templates) {
        expect(t.matchCategories.length).toBeGreaterThan(0);
        expect(t.agentRole.trim().length).toBeGreaterThan(0);
        expect(t.specialInstructions.trim().length).toBeGreaterThan(100);
        expect(t.commonQuestions.length).toBeGreaterThanOrEqual(5);
        expect(t.bookingContext.trim().length).toBeGreaterThan(0);
        expect(t.transferContext.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('picker → template resolution', () => {
  const values = INDUSTRY_OPTIONS.map((o) => o.value).filter((v) => v !== 'other');

  it('covers every picker option in EXPECTED_ROLE', () => {
    expect(Object.keys(EXPECTED_ROLE).sort()).toEqual([...values].sort());
  });

  for (const value of Object.keys(EXPECTED_ROLE)) {
    it(`'${value}' resolves to the ${EXPECTED_ROLE[value]} template (EN + ES)`, () => {
      const en = findIndustryTemplate(value, 'en');
      expect(en, `EN template missing for picker value '${value}'`).not.toBeNull();
      expect(en!.agentRole.toLowerCase()).toContain(EXPECTED_ROLE[value].toLowerCase());

      // ES must resolve too (directly or via the EN index-mapped fallback)
      const es = findIndustryTemplate(value, 'es');
      expect(es, `ES template missing for picker value '${value}'`).not.toBeNull();
    });
  }
});

describe('no fully-shadowed templates', () => {
  // First-match-wins: every template must own at least one category that
  // actually resolves to it, otherwise it can never be reached.
  for (let i = 0; i < INDUSTRY_TEMPLATES.length; i++) {
    const t = INDUSTRY_TEMPLATES[i];
    it(`EN[${i}] (${t.agentRole}) is reachable by at least one of its own categories`, () => {
      const reachable = t.matchCategories.some((m) => findIndustryTemplate(m, 'en') === t);
      expect(reachable).toBe(true);
    });
  }
});
