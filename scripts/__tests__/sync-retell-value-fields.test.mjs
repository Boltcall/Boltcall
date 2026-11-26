import { describe, expect, it } from 'vitest';
import { mergeAnalysisFields } from '../sync-retell-value-fields.mjs';

describe('mergeAnalysisFields', () => {
  it('appends only the missing value fields and keeps existing ones untouched', () => {
    const existing = [
      { type: 'boolean', name: 'urgent', description: 'custom urgent rule' },
      { type: 'string', name: 'service_requested', description: 'owner-tuned wording' },
    ];
    const { merged, added } = mergeAnalysisFields(existing);
    expect(added).toEqual(['estimated_job_value', 'out_of_scope']);
    expect(merged.slice(0, 2)).toEqual(existing);
    expect(merged.map((f) => f.name)).toEqual(['urgent', 'service_requested', 'estimated_job_value', 'out_of_scope']);
  });

  it('adds all three to an agent with no analysis fields', () => {
    expect(mergeAnalysisFields(undefined).added).toEqual(['service_requested', 'estimated_job_value', 'out_of_scope']);
  });

  it('is a no-op once an agent has them', () => {
    const { merged } = mergeAnalysisFields(undefined);
    expect(mergeAnalysisFields(merged).added).toEqual([]);
  });
});
