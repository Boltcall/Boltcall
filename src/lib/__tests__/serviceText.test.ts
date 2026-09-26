import { describe, expect, it } from 'vitest';
import { serviceDetails } from '../serviceText';

describe('serviceDetails', () => {
  it('never prints null for unpriced services', () => {
    expect(serviceDetails({ duration: null, price: null })).toBe('');
    expect(serviceDetails({ duration: NaN, price: undefined })).toBe('');
    expect(serviceDetails({ duration: 30, price: null })).toBe('30 minutes');
    expect(serviceDetails({ duration: 45, price: 120 })).toBe('45 minutes, $120');
    expect(serviceDetails({ duration: 0, price: 0 })).toBe('0 minutes, $0');
  });
});
