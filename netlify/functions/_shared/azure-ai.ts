/**
 * Azure OpenAI helper — supports Foundry (Responses API) + legacy resource (chat/completions).
 *
 * Resource priority (highest first):
 *   1. Foundry resource    AZURE_OPENAI_FOUNDRY_ENDPOINT + AZURE_OPENAI_FOUNDRY_KEY
 *      → uses Responses API at /openai/responses?api-version=2025-04-01-preview
 *      → model selected via "model" field in body (gpt-5.5, gpt-5.4-mini, etc.)
 *   2. Legacy resource     AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY
 *      → uses chat/completions at /openai/deployments/<name>/chat/completions
 *      → model selected via deployment-name in URL (gpt-4o, gpt-4o-mini)
 *   3. Anthropic fallback  ANTHROPIC_API_KEY (disaster recovery only)
 *
 * Env vars:
 *   AZURE_OPENAI_FOUNDRY_ENDPOINT       https://<resource>.cognitiveservices.azure.com  [Foundry]
 *   AZURE_OPENAI_FOUNDRY_KEY            Foundry API key
 *   AZURE_OPENAI_FOUNDRY_API_VERSION    optional, defaults to 2025-04-01-preview
 *   AZURE_OPENAI_FOUNDRY_DEPLOYMENT         light tier   [default: gpt-5.4-mini]
 *   AZURE_OPENAI_FOUNDRY_DEPLOYMENT_HEAVY   heavy tier   [default: gpt-5.5]
 *   AZURE_OPENAI_FOUNDRY_DEPLOYMENT_NANO    routing/triage [default: gpt-5.4-nano]
 *   AZURE_OPENAI_FOUNDRY_DEPLOYMENT_CODEX   code reasoning [default: gpt-5.3-codex]
 *   AZURE_OPENAI_EMBEDDING_DEPLOYMENT       [default: text-embedding-3-large]
 *   AZURE_OPENAI_AUDIO_DEPLOYMENT           [default: gpt-audio-1.5]
 *
 *   AZURE_OPENAI_DEPLOYMENT         legacy light deployment   [default: gpt-4o-mini]
 *   AZURE_OPENAI_DEPLOYMENT_HEAVY   legacy heavy deployment   [default: gpt-4o]
 *
 *   AZURE_OPENAI_ENDPOINT           https://<resource>.openai.azure.com   [legacy fallback]
 *   AZURE_OPENAI_API_KEY            legacy API key
 *   AZURE_OPENAI_API_VERSION        legacy api-version, defaults to 2024-02-01
 *   AZURE_OPENAI_IMAGE_DEPLOYMENT   image deployment  [default: gpt-image-2]
 */

const FOUNDRY_API_VERSION =
  process.env.AZURE_OPENAI_FOUNDRY_API_VERSION || '2025-04-01-preview';
const LEGACY_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';
const EMBEDDING_API_VERSION = '2023-05-15';

export type Tier = 'light' | 'heavy' | 'nano' | 'codex';

function isFoundryConfigured(): boolean {
  return !!(
    process.env.AZURE_OPENAI_FOUNDRY_ENDPOINT &&
    process.env.AZURE_OPENAI_FOUNDRY_KEY
  );
}

function isLegacyAzureConfigured(): boolean {
  return !!(
    process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY
  );
}

export function isAzureConfigured(): boolean {
  return isFoundryConfigured() || isLegacyAzureConfigured();
}

export function getAzureDeployment(tier: Tier | boolean = 'light'): string {
  // Backward compat: accept boolean (true = heavy, false = light)
  const t: Tier = typeof tier === 'boolean' ? (tier ? 'heavy' : 'light') : tier;

  // When Foundry is configured, prefer FOUNDRY_DEPLOYMENT_* env vars for resolution.
  // Falls back to non-prefixed envs only if those aren't set, then to GPT-5 defaults.
  if (isFoundryConfigured()) {
    switch (t) {
      case 'heavy':
        return (
          process.env.AZURE_OPENAI_FOUNDRY_DEPLOYMENT_HEAVY ||
          process.env.AZURE_OPENAI_FOUNDRY_DEPLOYMENT ||
          'gpt-5.5'
        );
      case 'nano':
        return (
          process.env.AZURE_OPENAI_FOUNDRY_DEPLOYMENT_NANO ||
          process.env.AZURE_OPENAI_FOUNDRY_DEPLOYMENT ||
          'gpt-5.4-nano'
        );
      case 'codex':
        return (
          process.env.AZURE_OPENAI_FOUNDRY_DEPLOYMENT_CODEX ||
          process.env.AZURE_OPENAI_FOUNDRY_DEPLOYMENT_HEAVY ||
          'gpt-5.3-codex'
        );
      case 'light':
      default:
        return process.env.AZURE_OPENAI_FOUNDRY_DEPLOYMENT || 'gpt-5.4-mini';
    }
  }

  // Legacy resource path — uses old env var names + gpt-4o family defaults.
  switch (t) {
    case 'heavy':
      return (
        process.env.AZURE_OPENAI_DEPLOYMENT_HEAVY ||
        process.env.AZURE_OPENAI_DEPLOYMENT ||
        'gpt-4o'
      );
    case 'nano':
    case 'codex':
    case 'light':
    default:
      return process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
  }
}

/**
 * Simple chat completion — returns raw text.
 * Routes through Foundry Responses API when configured, else legacy chat/completions, else Anthropic.
 */
export async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; heavy?: boolean; tier?: Tier } = {},
): Promise<string> {
  const { maxTokens = 512, heavy = false, tier } = options;
  const resolvedTier: Tier = tier ?? (heavy ? 'heavy' : 'light');

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const errors: string[] = [];

  if (isFoundryConfigured()) {
    try {
      return await foundryResponsesCompletion(systemPrompt, userPrompt, maxTokens, resolvedTier);
    } catch (err: any) {
      errors.push(`Foundry: ${err?.message || err}`);
      console.warn('[chatCompletion] Foundry failed, trying next provider:', err?.message || err);
    }
  }

  if (isLegacyAzureConfigured()) {
    try {
      return await legacyAzureChatCompletion(systemPrompt, userPrompt, maxTokens, resolvedTier);
    } catch (err: any) {
      errors.push(`Legacy Azure: ${err?.message || err}`);
      console.warn('[chatCompletion] Legacy Azure failed, trying next provider:', err?.message || err);
    }
  }

  if (anthropicKey) {
    try {
      return await anthropicChatCompletion(anthropicKey, systemPrompt, userPrompt, maxTokens, resolvedTier);
    } catch (err: any) {
      errors.push(`Anthropic: ${err?.message || err}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`All AI providers failed. ${errors.join(' | ')}`);
  }
  throw new Error(
    'No AI provider configured. Set AZURE_OPENAI_FOUNDRY_ENDPOINT + AZURE_OPENAI_FOUNDRY_KEY, or AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY, or ANTHROPIC_API_KEY.',
  );
}

async function foundryResponsesCompletion(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  tier: Tier,
): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_FOUNDRY_ENDPOINT!.replace(/\/$/, '');
  const apiKey = process.env.AZURE_OPENAI_FOUNDRY_KEY!;
  const model = getAzureDeployment(tier);
  const url = `${endpoint}/openai/responses?api-version=${FOUNDRY_API_VERSION}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      instructions: systemPrompt,
      input: userPrompt,
      max_output_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Azure Foundry Responses error ${res.status}: ${err}`);
  }

  const data = await res.json();
  // Responses API returns { output: [{ type: 'message', content: [{ type: 'output_text', text: '...' }] }] }
  const output = data.output;
  if (!Array.isArray(output)) return '';
  for (const item of output) {
    if (item?.type === 'message' && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c?.type === 'output_text' && typeof c.text === 'string') return c.text;
      }
    }
  }
  return '';
}

async function legacyAzureChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  tier: Tier,
): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, '');
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const deployment = getAzureDeployment(tier);
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${LEGACY_API_VERSION}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Azure OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate an embedding vector for a single string.
 * Uses Foundry resource if configured (text-embedding-3-large = 3072-dim).
 * Embeddings haven't moved to the Responses API — still uses /openai/deployments/<name>/embeddings.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const endpoint = (
    process.env.AZURE_OPENAI_FOUNDRY_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT
  )?.replace(/\/$/, '');
  const apiKey =
    process.env.AZURE_OPENAI_FOUNDRY_KEY || process.env.AZURE_OPENAI_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error(
      'Azure not configured for embeddings. Set AZURE_OPENAI_FOUNDRY_ENDPOINT + AZURE_OPENAI_FOUNDRY_KEY (preferred) or AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY.',
    );
  }

  const deployment =
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large';
  const url = `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=${EMBEDDING_API_VERSION}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ input: text }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Azure embedding error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const emb = data.data?.[0]?.embedding;
  if (!Array.isArray(emb)) {
    throw new Error('Azure embedding response missing data[0].embedding');
  }
  return emb;
}

/**
 * Transcribe audio to text using gpt-audio-1.5 (replaces Whisper).
 * Audio is sent as base64 inside the chat/completions input array; output is plain text.
 */
export async function transcribeAudio(
  audioBase64: string,
  format: 'wav' | 'mp3' | 'ogg' | 'webm' | 'm4a' = 'ogg',
): Promise<string> {
  if (!isFoundryConfigured()) {
    throw new Error(
      'Audio transcription requires Foundry resource. Set AZURE_OPENAI_FOUNDRY_ENDPOINT + AZURE_OPENAI_FOUNDRY_KEY.',
    );
  }

  const endpoint = process.env.AZURE_OPENAI_FOUNDRY_ENDPOINT!.replace(/\/$/, '');
  const apiKey = process.env.AZURE_OPENAI_FOUNDRY_KEY!;
  const deployment = process.env.AZURE_OPENAI_AUDIO_DEPLOYMENT || 'gpt-audio-1.5';
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2025-01-01-preview`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      modalities: ['text'],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe this audio verbatim. Output only the transcript, no commentary.' },
            { type: 'input_audio', input_audio: { data: audioBase64, format } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Azure audio transcription error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Image generation — returns base64-encoded PNG string.
 * Uses the legacy westus3 resource that hosts gpt-image-2 (separate from Foundry chat resource).
 */
export async function generateImage(
  prompt: string,
  options: {
    size?: '1024x1024' | '1536x1024' | '1024x1536';
    quality?: 'low' | 'medium' | 'high';
  } = {},
): Promise<string> {
  if (!isLegacyAzureConfigured()) {
    throw new Error(
      'Image gen requires legacy resource. Set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY (gpt-image-2 hosted on westus3).',
    );
  }
  const { size = '1024x1024', quality = 'high' } = options;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, '');
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const deployment = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || 'gpt-image-2';
  const url = `${endpoint}/openai/deployments/${deployment}/images/generations?api-version=2024-05-01-preview`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ prompt, size, quality, n: 1, output_format: 'png' }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Azure OpenAI image error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.data?.[0]?.b64_json || '';
}

async function anthropicChatCompletion(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  tier: Tier,
): Promise<string> {
  const model =
    tier === 'heavy' || tier === 'codex'
      ? 'claude-sonnet-4-20250514'
      : 'claude-haiku-4-5-20251001';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}
