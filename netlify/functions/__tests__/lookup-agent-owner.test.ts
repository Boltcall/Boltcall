import { describe, expect, it } from 'vitest';
import {
  buildAgentOwnerOrFilter,
  sanitizeRetellAgentId,
} from '../_shared/lookup-agent-owner';

describe('sanitizeRetellAgentId', () => {
  it('accepts real Retell agent ids', () => {
    expect(sanitizeRetellAgentId('agent_35968112e79b86e897ef99bccc')).toBe(
      'agent_35968112e79b86e897ef99bccc',
    );
    expect(sanitizeRetellAgentId('agent-abc-123')).toBe('agent-abc-123');
  });

  it('rejects PostgREST or-filter escape attempts', () => {
    // A crafted id containing `,` or `)` in the raw PostgREST or() call
    // would let a caller break out of the current expression and match
    // arbitrary rows in the agents table.
    expect(sanitizeRetellAgentId("agent_x'),retell_agent_id.eq.other")).toBeNull();
    expect(sanitizeRetellAgentId('agent_x,agent_y')).toBeNull();
    expect(sanitizeRetellAgentId('agent x')).toBeNull();
    expect(sanitizeRetellAgentId('')).toBeNull();
    expect(sanitizeRetellAgentId(null)).toBeNull();
    expect(sanitizeRetellAgentId(undefined)).toBeNull();
    expect(sanitizeRetellAgentId(123 as unknown as string)).toBeNull();
  });
});

describe('buildAgentOwnerOrFilter', () => {
  it('emits the two-branch filter Retell webhooks depend on', () => {
    expect(buildAgentOwnerOrFilter('agent_abc123')).toBe(
      'retell_agent_id.eq.agent_abc123,api_keys->>retell_agent_id.eq.agent_abc123',
    );
  });

  it('throws on rejected input rather than emitting a malformed filter', () => {
    expect(() => buildAgentOwnerOrFilter('agent,x')).toThrow(/Invalid/);
  });
});
