import { describe, expect, it } from 'vitest';
import { buildFirmDraft, nextIntakeReply } from '../_shared/pi-intake';

describe('PI intake', () => {
  it('builds a source-backed draft without inventing missing firm information', () => {
    const draft = buildFirmDraft('https://example.com', {
      name: 'Example Law', practiceAreas: ['Car accidents'], locations: [], phone: '',
    });
    expect(draft).toMatchObject({ name: 'Example Law', website: 'https://example.com', locations: [], approved: false });
    expect(draft.questions.length).toBeGreaterThan(3);
    expect(nextIntakeReply(draft, [], 'Hello')).toMatchObject({ status: 'active', nextStep: 0 });
  });
  it('stops on opt-out and escalates legal questions instead of evaluating a case', () => {
    const firm = buildFirmDraft('https://example.com', { name: 'Example Law', practiceAreas: [], locations: [] });
    expect(nextIntakeReply(firm, [], 'STOP')).toMatchObject({ text: '', status: 'opted_out' });
    expect(nextIntakeReply(firm, [], 'What is my case worth?')).toMatchObject({ status: 'needs_attention' });
    expect(nextIntakeReply(firm, [], 'I cannot breathe')).toMatchObject({ status: 'needs_attention' });
    expect(nextIntakeReply(firm, [], 'Talk to a human')).toMatchObject({ status: 'needs_attention' });
  });
});
