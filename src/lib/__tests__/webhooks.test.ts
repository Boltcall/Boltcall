import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authedFetch: vi.fn(),
}));

vi.mock('../authedFetch', () => ({
  authedFetch: mocks.authedFetch,
}));

vi.mock('../twilio', () => ({
  searchAvailableNumbers: vi.fn(),
  purchasePhoneNumber: vi.fn(),
}));

vi.mock('../api', () => ({
  FUNCTIONS_BASE: '/.netlify/functions',
}));

import { createAgentAndKnowledgeBase } from '../webhooks';

describe('createAgentAndKnowledgeBase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers backend details over the generic Retell wrapper on failure', async () => {
    mocks.authedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: 'Retell agent operation failed',
        details: 'Invalid voice_id: 11labs-Dorothy',
      }),
    });

    await expect(
      createAgentAndKnowledgeBase({
        businessName: 'Summit Solar',
        websiteUrl: 'https://summitsolar.example',
        mainCategory: 'solar',
        country: 'us',
        serviceAreas: [],
        openingHours: {},
        languages: ['en'],
      }),
    ).rejects.toThrow('Invalid voice_id: 11labs-Dorothy');
  });
});
