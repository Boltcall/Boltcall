import { describe, it, expect } from 'vitest';
import { inferVertical } from '../_shared/vertical-utils';

describe('inferVertical', () => {
  it('does not score lawn mowing as legal', () => {
    expect(inferVertical('Green Acres Lawn Mowing and Landscaping')).toBe('general');
  });

  it('still matches an actual law firm', () => {
    expect(inferVertical('Smith & Associates Law Firm')).toBe('legal');
  });

  it('matches other legal keywords unaffected by the whole-word rule', () => {
    expect(inferVertical('Downtown Attorney Group')).toBe('legal');
  });
});
