import { fileURLToPath } from 'node:url';

import Retell from 'retell-sdk';

export const DEFAULT_AGENT_ID = 'agent_35968112e79b86e897ef99bccc';
export const DEFAULT_EXPECTED_GREETING = 'Hi, thanks for calling Rapid Rooter QA';

export function normalizeForGreetingMatch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function flattenTranscriptObject(turns) {
  if (!Array.isArray(turns)) return '';
  return turns
    .map((turn) => {
      const role = turn?.role || 'unknown';
      const content =
        turn?.content ||
        (Array.isArray(turn?.words) ? turn.words.map((word) => word?.word || '').join(' ') : '');
      return `${role}: ${content}`.trim();
    })
    .filter(Boolean)
    .join('\n');
}

export function flattenTranscript(call) {
  const objectTranscript = flattenTranscriptObject(call?.transcript_object);
  if (objectTranscript) return objectTranscript;
  if (typeof call?.transcript === 'string') return call.transcript;
  if (typeof call?.call_analysis?.call_summary === 'string') return call.call_analysis.call_summary;
  return '';
}

export function extractFirstAgentUtterance(call) {
  if (Array.isArray(call?.transcript_object)) {
    const agentTurn = call.transcript_object.find((turn) =>
      ['agent', 'assistant', 'ai'].includes(String(turn?.role || '').toLowerCase()),
    );
    if (agentTurn) {
      return String(
        agentTurn.content ||
          (Array.isArray(agentTurn.words)
            ? agentTurn.words.map((word) => word?.word || '').join(' ')
            : ''),
      )
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  const transcript = flattenTranscript(call);
  for (const line of transcript.split(/\r?\n/)) {
    const match = line.match(/^\s*(agent|assistant|ai)\s*:\s*(.+)$/i);
    if (match?.[2]) return match[2].replace(/\s+/g, ' ').trim();
  }

  return '';
}

export function verifyGreeting(call, expectedGreeting = DEFAULT_EXPECTED_GREETING) {
  const firstAgentUtterance = extractFirstAgentUtterance(call);
  if (!firstAgentUtterance) {
    return {
      ok: false,
      reason: 'no_agent_utterance',
      firstAgentUtterance: '',
    };
  }

  const normalizedActual = normalizeForGreetingMatch(firstAgentUtterance);
  const normalizedExpected = normalizeForGreetingMatch(expectedGreeting);
  const ok = normalizedActual.startsWith(normalizedExpected);

  return {
    ok,
    reason: ok ? 'matched' : 'greeting_mismatch',
    firstAgentUtterance,
  };
}

export function verifyPhaseECallEvidence(
  call,
  expectedGreeting = DEFAULT_EXPECTED_GREETING,
  llmEvidence = {},
) {
  const greetingCheck = verifyGreeting(call, expectedGreeting);
  if (greetingCheck.ok) {
    return {
      ...greetingCheck,
      evidence: 'retell_transcript_agent_utterance',
    };
  }

  const transcript = flattenTranscript(call);
  const summary = String(call?.call_analysis?.call_summary || '');
  const callSuccessful = call?.call_analysis?.call_successful === true;
  const summaryShowsAgentResponded = /\bagent\b/i.test(summary) && /\b(confirm|confirmed|assist|assistance|help|helped)\b/i.test(summary);
  const substantiveUserTranscript = transcript.length >= 50;

  if (
    llmEvidence.llmGreetingVerified === true &&
    call?.call_status === 'ended' &&
    (call?.duration_ms || 0) >= 15000 &&
    callSuccessful &&
    substantiveUserTranscript &&
    summaryShowsAgentResponded
  ) {
    return {
      ok: true,
      reason: 'llm_greeting_and_successful_call_matched',
      firstAgentUtterance: String(llmEvidence.llmGreeting || ''),
      evidence: 'live_llm_greeting_plus_retell_call_analysis',
    };
  }

  return greetingCheck;
}

export function buildRetellCallListParams({ agentId, sinceMs, limit }) {
  return {
    filter_criteria: {
      agent: [{ agent_id: agentId }],
      start_timestamp: { op: 'ge', type: 'number', value: sinceMs },
    },
    sort_order: 'descending',
    limit,
  };
}

export function buildLlmWebsocketCallUrl(baseUrl, callId) {
  const url = new URL(baseUrl);
  const path = url.pathname.replace(/\/$/, '');
  url.pathname = path.endsWith('/llm-websocket')
    ? `${path}/${encodeURIComponent(callId)}`
    : path;
  return url.toString();
}

export function normalizeRetellCallListResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.calls)) return response.calls;
  if (Array.isArray(response?.items)) return response.items;
  return [];
}

function compactCallEvidence(call, greetingCheck) {
  return {
    call_id: call?.call_id,
    agent_id: call?.agent_id,
    direction: call?.direction,
    call_status: call?.call_status,
    start_timestamp: call?.start_timestamp
      ? new Date(call.start_timestamp).toISOString()
      : undefined,
    duration_sec: Math.round((call?.duration_ms || 0) / 1000),
    transcript_length: flattenTranscript(call).length,
    greeting: greetingCheck.firstAgentUtterance.slice(0, 220),
    evidence: greetingCheck.evidence,
    reason: greetingCheck.reason,
  };
}

async function verifyLiveLlmGreeting({ client, agentId, expectedGreeting }) {
  if (typeof WebSocket !== 'function') {
    return { ok: false, reason: 'websocket_unavailable' };
  }

  const retellAgent = await client.agent.retrieve(agentId);
  const baseUrl = retellAgent?.response_engine?.llm_websocket_url;
  if (!baseUrl) return { ok: false, reason: 'llm_websocket_url_missing' };

  const callId = `phase-e-smoke-${Date.now()}`;
  const wsUrl = buildLlmWebsocketCallUrl(baseUrl, callId);

  return new Promise((resolve) => {
    let settled = false;
    let ws;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        ws?.close();
      } catch {
        // Ignore close errors in a one-shot smoke.
      }
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({ ok: false, reason: 'llm_greeting_timeout', wsUrl });
    }, 10000);

    try {
      ws = new WebSocket(wsUrl);
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({
          interaction_type: 'call_details',
          call: { call_id: callId, agent_id: agentId },
        }));
      });
      ws.addEventListener('message', (event) => {
        const raw = typeof event.data === 'string'
          ? event.data
          : Buffer.from(event.data).toString('utf8');
        const payload = JSON.parse(raw);
        const greeting = String(payload?.content || '').trim();
        const ok = normalizeForGreetingMatch(greeting).startsWith(
          normalizeForGreetingMatch(expectedGreeting),
        );
        finish({
          ok,
          reason: ok ? 'matched' : 'llm_greeting_mismatch',
          greeting,
          wsUrl,
        });
      });
      ws.addEventListener('error', () => {
        finish({ ok: false, reason: 'llm_websocket_error', wsUrl });
      });
    } catch (error) {
      finish({
        ok: false,
        reason: 'llm_websocket_exception',
        error: error instanceof Error ? error.message : String(error),
        wsUrl,
      });
    }
  });
}

async function main() {
  const apiKey = process.env.RETELL_API_KEY || '';
  if (!apiKey || apiKey.includes('*')) {
    throw new Error(
      'RETELL_API_KEY is required and must be the real Retell secret, not a masked Netlify CLI value.',
    );
  }

  const agentId = process.env.RETELL_PHASE_E_AGENT_ID || DEFAULT_AGENT_ID;
  const expectedGreeting = process.env.RETELL_PHASE_E_EXPECTED_GREETING || DEFAULT_EXPECTED_GREETING;
  const sinceIso =
    process.env.RETELL_PHASE_E_SINCE_ISO ||
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sinceMs = Date.parse(sinceIso);
  if (!Number.isFinite(sinceMs)) {
    throw new Error(`RETELL_PHASE_E_SINCE_ISO is invalid: ${sinceIso}`);
  }

  const limit = Math.min(Math.max(Number(process.env.RETELL_PHASE_E_LIMIT || 20), 1), 100);
  const client = new Retell({ apiKey });
  const llmGreetingEvidence = await verifyLiveLlmGreeting({ client, agentId, expectedGreeting });
  const listResponse = await client.call.list(buildRetellCallListParams({ agentId, sinceMs, limit }));
  const calls = normalizeRetellCallListResponse(listResponse);

  const candidates = [];
  for (const summary of calls || []) {
    const call = summary?.transcript || summary?.transcript_object
      ? summary
      : await client.call.retrieve(summary.call_id);
    const greetingCheck = verifyPhaseECallEvidence(call, expectedGreeting, {
      llmGreetingVerified: llmGreetingEvidence.ok,
      llmGreeting: llmGreetingEvidence.greeting,
    });
    candidates.push({ call, greetingCheck });
    if (greetingCheck.ok) {
      return {
        status: 'passed',
        expectedGreeting,
        sinceIso,
        llmGreetingEvidence,
        checkedCalls: candidates.length,
        matchedCall: compactCallEvidence(call, greetingCheck),
      };
    }
  }

  if (candidates.length === 0) {
    return {
      status: 'failed',
      reason: 'no_recent_calls',
      expectedGreeting,
      agentId,
      sinceIso,
      llmGreetingEvidence,
    };
  }

  return {
    status: 'failed',
    reason: 'greeting_not_found',
    expectedGreeting,
    agentId,
    sinceIso,
    llmGreetingEvidence,
    checkedCalls: candidates.length,
    latestCall: compactCallEvidence(candidates[0].call, candidates[0].greetingCheck),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== 'passed') process.exitCode = 1;
    })
    .catch((err) => {
      console.error(JSON.stringify({ status: 'failed', error: err.message }, null, 2));
      process.exitCode = 1;
    });
}
