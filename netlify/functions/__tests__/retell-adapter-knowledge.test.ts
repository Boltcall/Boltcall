import { beforeEach, describe, expect, it, vi } from 'vitest';

const llmCreateMock = vi.hoisted(() => vi.fn());
const llmUpdateMock = vi.hoisted(() => vi.fn());
const agentCreateMock = vi.hoisted(() => vi.fn());
const agentRetrieveMock = vi.hoisted(() => vi.fn());
const emitAgencyEventMock = vi.hoisted(() => vi.fn());
const getServiceSupabaseMock = vi.hoisted(() => vi.fn());
const syncRetellKnowledgeBasesMock = vi.hoisted(() => vi.fn());

vi.mock('retell-sdk', () => ({
  default: vi.fn(function RetellMock(this: any) {
    this.llm = {
      create: llmCreateMock,
      update: llmUpdateMock,
    };
    this.agent = {
      create: agentCreateMock,
      retrieve: agentRetrieveMock,
    };
    this.knowledgeBase = {
      create: vi.fn(),
    };
  }),
}));

vi.mock('../_shared/token-utils', () => ({
  getServiceSupabase: getServiceSupabaseMock,
}));

vi.mock('../_shared/emit-agency-event', () => ({
  emitAgencyEvent: emitAgencyEventMock,
}));

vi.mock('../_shared/retell-knowledge-sync', () => ({
  syncRetellKnowledgeBases: syncRetellKnowledgeBasesMock,
}));

describe('retell adapter knowledge binding', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.RETELL_API_KEY = 'test-retell-key';
    process.env.URL = 'https://boltcall.test';

    getServiceSupabaseMock.mockReturnValue({ from: vi.fn() });
    syncRetellKnowledgeBasesMock.mockResolvedValue([
      {
        scope: 'vertical',
        retell_knowledge_base_id: 'kb-vertical',
        content_hash: 'hash-vertical',
        source_count: 3,
        retell_status: 'complete',
      },
      {
        scope: 'client',
        retell_knowledge_base_id: 'kb-client',
        content_hash: 'hash-client',
        source_count: 2,
        retell_status: 'complete',
      },
    ]);
    llmCreateMock.mockResolvedValue({ llm_id: 'llm-1' });
    llmUpdateMock.mockResolvedValue({ llm_id: 'llm-1' });
    agentCreateMock.mockResolvedValue({ agent_id: 'agent-1' });
    agentRetrieveMock.mockResolvedValue({ response_engine: { llm_id: 'llm-1' } });
    emitAgencyEventMock.mockResolvedValue(undefined);
  });

  it('attaches approved Retell KB ids when creating a live agent', async () => {
    const { createAgentFromArtifact } = await import(
      '../_shared/agency-adapters/retell-adapter'
    );

    const result = await createAgentFromArtifact({
      client_id: 'client-1',
      artifact_id: 'artifact-1',
      agent_version: '1',
      vertical: 'law',
      prompt: 'Approved prompt',
      knowledge_base: { faq: 'Client-specific answer' },
      voice_id: 'voice-1',
      language: 'en-US',
    });

    expect(syncRetellKnowledgeBasesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase: expect.any(Object),
        retell: expect.any(Object),
        clientId: 'client-1',
        vertical: 'law',
        clientKnowledgeBase: { faq: 'Client-specific answer' },
      }),
    );
    expect(llmCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        general_prompt: 'Approved prompt',
        knowledge_base_ids: ['kb-vertical', 'kb-client'],
        kb_config: { top_k: 4, filter_score: 0.55 },
      }),
    );
    expect(result.knowledge_base_ids).toEqual(['kb-vertical', 'kb-client']);
  });

  it('reattaches approved Retell KB ids when updating an existing agent prompt', async () => {
    const { updateAgentPrompt } = await import('../_shared/agency-adapters/retell-adapter');

    const result = await updateAgentPrompt({
      agent_id: 'agent-1',
      prompt: 'Updated approved prompt',
      client_id: 'client-1',
      vertical: 'solar',
      knowledge_base: { services: 'Solar installs only in service area.' },
      artifact_id: 'artifact-2',
      reason: 'founder approved in queue',
      source: 'founder',
    });

    expect(llmUpdateMock).toHaveBeenCalledWith(
      'llm-1',
      expect.objectContaining({
        general_prompt: 'Updated approved prompt',
        knowledge_base_ids: ['kb-vertical', 'kb-client'],
        kb_config: { top_k: 4, filter_score: 0.55 },
      }),
    );
    expect(result.knowledge_base_ids).toEqual(['kb-vertical', 'kb-client']);
  });
});
