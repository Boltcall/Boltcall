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

export function normalizeRetellCallListResponse(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.calls)) return response.calls;
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
  };
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
  const listResponse = await client.call.list(buildRetellCallListParams({ agentId, sinceMs, limit }));
  const calls = normalizeRetellCallListResponse(listResponse);

  const candidates = [];
  for (const summary of calls || []) {
    const call = summary?.transcript || summary?.transcript_object
      ? summary
      : await client.call.retrieve(summary.call_id);
    const greetingCheck = verifyGreeting(call, expectedGreeting);
    candidates.push({ call, greetingCheck });
    if (greetingCheck.ok) {
      return {
        status: 'passed',
        expectedGreeting,
        sinceIso,
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
    };
  }

  return {
    status: 'failed',
    reason: 'greeting_not_found',
    expectedGreeting,
    agentId,
    sinceIso,
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
