import { describe, expect, it } from 'vitest';

import { getDefaultVoiceForCountry } from '../retell-agents';

describe('getDefaultVoiceForCountry', () => {
  it('uses known-good setup fallback voices', () => {
    expect(getDefaultVoiceForCountry('us', 'female')).toBe('11labs-Grace');
    expect(getDefaultVoiceForCountry('gb', 'male')).toBe('11labs-Nico');
  });
});
