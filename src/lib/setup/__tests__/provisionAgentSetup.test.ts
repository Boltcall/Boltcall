import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createUserWorkspaceAndProfile: vi.fn(),
  createBusinessProfile: vi.fn(),
  getUserWorkspaces: vi.fn(),
  getUserBusinessProfiles: vi.fn(),
  createAgentAndKnowledgeBase: vi.fn(),
  createLocation: vi.fn(),
  getSession: vi.fn(),
  supabaseFromChain: vi.fn(),
  featuresUpsert: vi.fn(),
  profileUpdate: vi.fn(),
  profileSelect: vi.fn(),
}));

vi.mock('../../database', () => ({
  createUserWorkspaceAndProfile: mocks.createUserWorkspaceAndProfile,
  createBusinessProfile: mocks.createBusinessProfile,
  getUserWorkspaces: mocks.getUserWorkspaces,
  getUserBusinessProfiles: mocks.getUserBusinessProfiles,
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

// Table-aware mock so applyPainDefaults (business_features upsert +
// business_profiles select/update) doesn't blow up on missing methods.
// Legacy `.from(any).select().eq().then` chain preserved for the agents
// lookup that predates this test.
vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
    from: (table: string) => {
      if (table === 'business_features') {
        return { upsert: mocks.featuresUpsert };
      }
      if (table === 'business_profiles') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mocks.profileSelect }),
          }),
          update: (patch: unknown) => ({
            eq: (col: string, val: string) => mocks.profileUpdate({ patch, col, val }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            then: (cb: (r: { data: unknown[]; error: null }) => unknown) =>
              Promise.resolve(cb({ data: [], error: null })),
          }),
        }),
      };
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
    // Default: no pre-existing workspace/profile → mint fresh via
    // createUserWorkspaceAndProfile (preserves the original assertion below).
    mocks.getUserWorkspaces.mockResolvedValue([]);
    mocks.getUserBusinessProfiles.mockResolvedValue([]);
    mocks.createBusinessProfile.mockResolvedValue({ id: 'bp-1' });
    mocks.createLocation.mockResolvedValue({ id: 'loc-1' });
    mocks.createAgentAndKnowledgeBase
      .mockResolvedValueOnce({ kb_folder_id: 'kb-1', agent_id: 'agent-inbound' })
      .mockResolvedValueOnce({ kb_folder_id: 'kb-1', agent_id: 'agent-outbound' });
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.featuresUpsert.mockResolvedValue({ error: null });
    mocks.profileSelect.mockResolvedValue({ data: { opening_hours: {} }, error: null });
    mocks.profileUpdate.mockResolvedValue({ error: null });
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
      voiceId: '11labs-Grace',
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
        voiceId: '11labs-Grace',
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

  it('flips missed_call_textback_enabled and threads painPoint into both agents when pain=missed_calls', async () => {
    await provisionAgentSetup('user-1', {
      businessName: 'Summit Solar',
      websiteUrl: 'https://summitsolar.example',
      industry: 'solar',
      voiceId: '11labs-Grace',
      goal: 'book-appointments',
      tone: 'friendly_concise',
      transferNumber: '',
      painPoint: 'missed_calls',
      createdAt: '2026-06-19T10:00:00.000Z',
    });

    // Missed-call text-back gets flipped ON with a default template — this is
    // the whole point of the pain-point customization for this branch.
    expect(mocks.featuresUpsert).toHaveBeenCalledTimes(1);
    expect(mocks.featuresUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        workspace_id: 'ws-1',
        missed_call_textback_enabled: true,
        missed_call_config: expect.objectContaining({ template: expect.any(String) }),
      }),
      expect.objectContaining({ onConflict: 'user_id' }),
    );
    // opening_hours is not the missed_calls concern — must not touch it.
    expect(mocks.profileUpdate).not.toHaveBeenCalled();

    // callFlow.painPoint reaches BOTH agents so both prompts get the
    // per-pain "primary focus" line.
    expect(mocks.createAgentAndKnowledgeBase).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        agentType: 'inbound',
        callFlow: { painPoint: 'missed_calls' },
      }),
    );
    expect(mocks.createAgentAndKnowledgeBase).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        agentType: 'speed_to_lead',
        callFlow: { painPoint: 'missed_calls' },
      }),
    );
  });

  it('writes default M-F 9-5 opening_hours when pain=after_hours and profile has empty hours', async () => {
    await provisionAgentSetup('user-1', {
      businessName: 'Summit Solar',
      websiteUrl: 'https://summitsolar.example',
      industry: 'solar',
      voiceId: '11labs-Grace',
      goal: 'book-appointments',
      tone: 'friendly_concise',
      transferNumber: '',
      painPoint: 'after_hours',
      createdAt: '2026-06-19T10:00:00.000Z',
    });

    expect(mocks.profileUpdate).toHaveBeenCalledTimes(1);
    const call = mocks.profileUpdate.mock.calls[0][0];
    expect(call).toMatchObject({
      patch: {
        opening_hours: expect.objectContaining({
          monday: { open: '09:00', close: '17:00', closed: false },
          saturday: expect.objectContaining({ closed: true }),
        }),
      },
      col: 'id',
      val: 'bp-1',
    });
    // Never touches business_features on this branch.
    expect(mocks.featuresUpsert).not.toHaveBeenCalled();
  });

  it('does not clobber intel-populated opening_hours', async () => {
    mocks.profileSelect.mockResolvedValueOnce({
      data: { opening_hours: { monday: { open: '10:00', close: '18:00', closed: false } } },
      error: null,
    });

    await provisionAgentSetup('user-1', {
      businessName: 'Summit Solar',
      websiteUrl: 'https://summitsolar.example',
      industry: 'solar',
      voiceId: '11labs-Grace',
      goal: 'book-appointments',
      tone: 'friendly_concise',
      transferNumber: '',
      painPoint: 'after_hours',
      createdAt: '2026-06-19T10:00:00.000Z',
    });

    expect(mocks.profileUpdate).not.toHaveBeenCalled();
  });

  it('writes no per-pain feature flags for slow_followup or front_desk (covered elsewhere)', async () => {
    for (const painPoint of ['slow_followup', 'front_desk'] as const) {
      mocks.featuresUpsert.mockClear();
      mocks.profileUpdate.mockClear();
      // reset the two-agent expectation setup so each iteration gets fresh
      // resolved values (mockResolvedValueOnce is consumed by each call).
      mocks.createAgentAndKnowledgeBase.mockReset();
      mocks.createAgentAndKnowledgeBase
        .mockResolvedValueOnce({ kb_folder_id: 'kb-1', agent_id: 'agent-inbound' })
        .mockResolvedValueOnce({ kb_folder_id: 'kb-1', agent_id: 'agent-outbound' });

      await provisionAgentSetup('user-1', {
        businessName: 'Summit Solar',
        websiteUrl: 'https://summitsolar.example',
        industry: 'solar',
        voiceId: '11labs-Grace',
        goal: 'book-appointments',
        tone: 'friendly_concise',
        transferNumber: '+15551234567',
        painPoint,
        createdAt: '2026-06-19T10:00:00.000Z',
      });

      expect(mocks.featuresUpsert).not.toHaveBeenCalled();
      expect(mocks.profileUpdate).not.toHaveBeenCalled();
      // callFlow still threaded — the prompt line is the visible customization.
      expect(mocks.createAgentAndKnowledgeBase).toHaveBeenCalledWith(
        expect.objectContaining({ callFlow: { painPoint } }),
      );
    }
  });
});
