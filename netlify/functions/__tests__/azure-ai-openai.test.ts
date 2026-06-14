import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = [
  'AZURE_OPENAI_FOUNDRY_ENDPOINT',
  'AZURE_OPENAI_FOUNDRY_KEY',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'OPENAI_MODEL_HEAVY',
  'OPENAI_EMBEDDING_MODEL',
];

const originalEnv = { ...process.env };

function resetProviderEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe('azure-ai OpenAI fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    resetProviderEnv();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it('uses OpenAI Responses when only OPENAI_API_KEY is configured', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-openai';
    process.env.OPENAI_MODEL_HEAVY = 'gpt-test-heavy';
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: 'real answer' }],
          },
        ],
      }),
    } as Response);

    const { chatCompletion } = await import('../_shared/azure-ai');
    const answer = await chatCompletion('system prompt', 'user prompt', {
      tier: 'heavy',
      maxTokens: 321,
    });

    expect(answer).toBe('real answer');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-openai',
        }),
      }),
    );
    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string);
    expect(body).toEqual(expect.objectContaining({
      model: 'gpt-test-heavy',
      instructions: 'system prompt',
      input: 'user prompt',
      max_output_tokens: 321,
    }));
  });

  it('uses OpenAI embeddings when only OPENAI_API_KEY is configured', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-openai';
    process.env.OPENAI_EMBEDDING_MODEL = 'text-test-embedding';
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      }),
    } as Response);

    const { generateEmbedding } = await import('../_shared/azure-ai');
    const embedding = await generateEmbedding('support question');

    expect(embedding).toEqual([0.1, 0.2, 0.3]);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-openai',
        }),
      }),
    );
    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string);
    expect(body).toEqual({
      model: 'text-test-embedding',
      input: 'support question',
    });
  });
});
