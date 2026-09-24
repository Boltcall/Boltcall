import type { Utterance } from './types.js';

const FOUNDRY_API_VERSION =
  process.env.AZURE_OPENAI_FOUNDRY_API_VERSION || '2025-04-01-preview';

function getConfig() {
  const endpoint = process.env.AZURE_OPENAI_FOUNDRY_ENDPOINT?.replace(/\/$/, '');
  const apiKey = process.env.AZURE_OPENAI_FOUNDRY_KEY;
  const deployment = process.env.AZURE_OPENAI_FOUNDRY_DEPLOYMENT || 'gpt-5.4-mini';
  if (!endpoint || !apiKey) {
    throw new Error(
      'Missing AZURE_OPENAI_FOUNDRY_ENDPOINT or AZURE_OPENAI_FOUNDRY_KEY env vars',
    );
  }
  return { endpoint, apiKey, deployment };
}

/**
 * Streams chat completion from Azure OpenAI Foundry (gpt-5.4-mini by default).
 * Uses the standard chat/completions endpoint with SSE streaming — compatible with
 * the OpenAI chat completions wire format that Retell custom LLM expects.
 */
export async function* streamChatCompletion(
  systemPrompt: string,
  transcript: Utterance[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const { endpoint, apiKey, deployment } = getConfig();
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${FOUNDRY_API_VERSION}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...transcript.map((u) => ({
      role: u.role === 'agent' ? 'assistant' : 'user',
      content: u.content,
    })),
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages,
      stream: true,
      max_tokens: 150,
      temperature: 0.4,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => '');
    throw new Error(`Azure OpenAI error ${res.status}: ${err}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (typeof content === 'string' && content) yield content;
      } catch {
        // skip malformed SSE chunk
      }
    }
  }
}
