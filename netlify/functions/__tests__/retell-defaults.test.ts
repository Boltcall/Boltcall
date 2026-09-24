import { describe, expect, it } from 'vitest';

import { getDefaultAgentConfig, getDefaultLlmConfig } from '../_shared/retell-defaults';

describe('getDefaultAgentConfig', () => {
  it('tunes for fast turn-taking without cutting callers off', () => {
    const cfg = getDefaultAgentConfig({ voiceId: '11labs-Grace', businessName: 'Acme Plumbing' });
    expect(cfg.responsiveness).toBe(1);
    expect(cfg.enable_dynamic_responsiveness).toBe(true);
    expect(cfg.voice_model).toBe('eleven_flash_v2_5');
    expect(cfg.boosted_keywords).toEqual(['Acme Plumbing']);
    expect(cfg).not.toHaveProperty('response_eagerness');
  });

  it('only forces the ElevenLabs flash model on ElevenLabs voices outside Hebrew', () => {
    expect(getDefaultAgentConfig({ voiceId: 'cartesia-Hailey' })).not.toHaveProperty('voice_model');
    expect(getDefaultAgentConfig({ voiceId: '11labs-Grace', language: 'he-IL' })).not.toHaveProperty('voice_model');
  });
});

describe('getDefaultLlmConfig', () => {
  it('makes the agent speak first only when a greeting exists', () => {
    expect(getDefaultLlmConfig({ beginMessage: 'Hi!' })).toMatchObject({ start_speaker: 'agent', begin_message: 'Hi!' });
    expect(getDefaultLlmConfig()).not.toHaveProperty('start_speaker');
  });
});
