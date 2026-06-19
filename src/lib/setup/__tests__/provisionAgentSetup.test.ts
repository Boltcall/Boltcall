import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createUserWorkspaceAndProfile: vi.fn(),
  createAgentAndKnowledgeBase: vi.fn(),
  createLocation: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('../../database', () => ({
  createUserWorkspaceAndProfile: mocks.createUserWorkspaceAndProfile,
}));

vi.mock('../../webhooks', () => ({
  createAgentAndKnowledgeBase: mocks.createAgentAndKnowledgeBase,
}));

vi.mock('../../locations', () => ({
  LocationService: {
    create: mocks.createLocation,
  },
}));

vi.mock('../../api', () => ({
  FUNCTIONS_BASE: '/.netlify/functions',
}));

vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
  },
}));

import { provisionAgentSetup } from '../provisionAgentSetup';

describe('provisionAgentSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    mocks.createUserWorkspaceAndProfile.mockResolvedValue({
      workspace: { id: 'ws-1' },
      businessProfile: { id: 'bp-1' },
    });
    mocks.createLocation.mockResolvedValue({ id: 'loc-1' });
    mocks.createAgentAndKnowledgeBase
      .mockResolvedValueOnce({ kb_folder_id: 'kb-1', agent_id: 'agent-inbound' })
      .mockResolvedValueOnce({ kb_folder_id: 'kb-1', agent_id: 'agent-outbound' });
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as never;
  });

  it('creates workspace profile and provisions inbound plus speed-to-lead agents with the business website', async () => {
    await provisionAgentSetup('user-1', {
      businessName: 'Summit Solar',
      websiteUrl: 'https://summitsolar.example',
      industry: 'solar',
      voiceId: '11labs-Dorothy',
      goal: 'book-appointments',
      tone: 'friendly_concise',
      transferNumber: '+15551234567',
      createdAt: '2026-06-19T10:00:00.000Z',
    });

    expect(mocks.createUserWorkspaceAndProfile).toHaveBeenCalledWith('user-1', {
      business_name: 'Summit Solar',
      website_url: 'https://summitsolar.example',
      main_category: 'solar',
      country: 'us',
      service_areas: [],
      opening_hours: {},
      languages: ['en'],
    });

    expect(mocks.createAgentAndKnowledgeBase).toHaveBeenCalledTimes(2);
    expect(mocks.createAgentAndKnowledgeBase).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        businessName: 'Summit Solar',
        websiteUrl: 'https://summitsolar.example',
        businessProfileId: 'bp-1',
        locationId: 'loc-1',
        agentType: 'inbound',
        agentName: 'Summit Solar AI Receptionist',
        voiceId: '11labs-Dorothy',
        transferNumber: '+15551234567',
      }),
    );
    expect(mocks.createAgentAndKnowledgeBase).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        businessName: 'Summit Solar',
        websiteUrl: 'https://summitsolar.example',
        businessProfileId: 'bp-1',
        locationId: 'loc-1',
        agentType: 'speed_to_lead',
        agentName: 'Summit Solar Follow-Up Agent',
        kbFolderId: 'kb-1',
      }),
    );
  });
});
