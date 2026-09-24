/**
 * Single source of truth for Retell agent + LLM tuning.
 *
 * Tuned for speed-to-lead: the caller should hear a greeting almost
 * immediately, get fast turn-taking, and never get cut off while reading out
 * a phone number or address. Every field here is a documented
 * AgentCreateParams / LlmCreateParams field in retell-sdk — Retell silently
 * ignores unknown keys, so a typo here costs quality without an error.
 */

// Fast, strong at tool calling (booking/transfer), no reasoning latency.
// Override per environment without a deploy of code: RETELL_LLM_MODEL.
export const RETELL_LLM_MODEL = process.env.RETELL_LLM_MODEL || 'gpt-4.1-mini';

// Post-call analysis runs after hangup, so it never affects caller latency —
// a mini model keeps per-call cost down (Retell's default is full gpt-4.1).
export const RETELL_POST_CALL_ANALYSIS_MODEL = 'gpt-4.1-mini';

/** Retell LLM settings shared by every llm.create / create-retell-llm call. */
export function getDefaultLlmConfig(opts: { beginMessage?: string | null } = {}) {
  return {
    model: RETELL_LLM_MODEL,
    // Low temperature keeps tool calls (book/transfer/end) reliable while
    // leaving a little variation so replies don't sound canned.
    model_temperature: 0.2,
    tool_call_strict_mode: true,
    // Dedicated pool = lower, more consistent latency, at a higher per-minute
    // price. Opt in with RETELL_MODEL_HIGH_PRIORITY=true.
    model_high_priority: process.env.RETELL_MODEL_HIGH_PRIORITY === 'true',
    // Inbound speed-to-lead: the agent greets first. Only when there is a
    // begin_message; otherwise the LLM generates the opener itself.
    ...(opts.beginMessage ? { start_speaker: 'agent' as const, begin_message: opts.beginMessage } : {}),
  };
}

function isElevenLabsVoice(voiceId?: string | null): boolean {
  return typeof voiceId === 'string' && voiceId.startsWith('11labs-');
}

/** Agent-level voice/turn-taking settings applied to every new agent. */
export function getDefaultAgentConfig(
  opts: { language?: string; voiceId?: string | null; businessName?: string | null } = {},
) {
  const isHebrew = opts.language?.startsWith('he');
  const fallbackVoiceIds = (process.env.RETELL_FALLBACK_VOICE_IDS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  return {
    // ── Speed ──────────────────────────────────────────────────────────
    responsiveness: 1,
    // Waits a beat longer for slow talkers / people reading digits, so
    // max responsiveness never turns into cutting the caller off.
    enable_dynamic_responsiveness: true,
    stt_mode: 'fast' as const,
    begin_message_delay_ms: 400,
    // Flash v2.5 is ElevenLabs' lowest-latency model. Hebrew stays on the
    // provider default, where pronunciation is more reliable.
    ...(isElevenLabsVoice(opts.voiceId) && !isHebrew ? { voice_model: 'eleven_flash_v2_5' as const } : {}),

    // ── Quality ────────────────────────────────────────────────────────
    // Callers are often in trucks, on job sites, or with kids in the
    // background — strip background voices so they don't trigger barge-in.
    denoising_mode: 'noise-and-background-speech-cancellation' as const,
    interruption_sensitivity: 0.8,
    enable_backchannel: true,
    backchannel_words: isHebrew ? ['אהה', 'אה-אה'] : ['yeah', 'uh-huh', 'got it'],
    backchannel_frequency: 0.6,
    // A receptionist line should sound clean, not like a café.
    ambient_sound: null,
    // Helps STT catch the business name when callers say it.
    ...(opts.businessName ? { boosted_keywords: [opts.businessName] } : {}),
    handbook_config: {
      ai_disclosure: true,
      echo_verification: true, // read back phone numbers, names, times
      smart_matching: true,
      speech_normalization: true,
      scope_boundaries: true,
      high_empathy: true,
    },
    ...(fallbackVoiceIds.length ? { fallback_voice_ids: fallbackVoiceIds } : {}),

    // ── Efficiency ─────────────────────────────────────────────────────
    reminder_trigger_ms: 8000,
    reminder_max_count: 1,
    end_call_after_silence_ms: 20000,
    max_call_duration_ms: 480000,
    allow_user_dtmf: true,
    post_call_analysis_model: RETELL_POST_CALL_ANALYSIS_MODEL,
  };
}
