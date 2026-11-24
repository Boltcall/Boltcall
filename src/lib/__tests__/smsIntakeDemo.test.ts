import { describe, expect, it } from 'vitest';
import { buildSmsIntakeConfig, createSmsIntakeAgent, sampleSmsSettings } from '../smsIntakeDemo';

describe('SMS intake demo', () => {
  it('qualifies a text conversation and hands it to the selected team once', () => {
    const agent = createSmsIntakeAgent({ ...sampleSmsSettings, team: 'new inquiries desk' });
    expect(agent.receive(1, 'Hi')).toContain('Alder Intake Law');
    expect(agent.receive(2, 'Sam')).toContain('employment and small-business matters');
    expect(agent.receive(3, 'Help reviewing an agreement')).toContain('callback');
    expect(agent.receive(4, 'Tuesday after 2')).toContain('new inquiries desk');
    expect(agent.receive(4, 'Tuesday after 2')).toBeNull();
    expect(agent.receive(5, 'Thanks')).toBeNull();
    expect(agent.handoff()).toEqual({
      recipient: 'new inquiries desk',
      reason: 'New inquiry',
      firstName: 'Sam',
      topic: 'Help reviewing an agreement',
      callbackWindow: 'Tuesday after 2',
      optedOut: false,
    });
  });

  it('handles callback-only intake and leaves unspecified details empty', () => {
    const agent = createSmsIntakeAgent({ ...sampleSmsSettings, goal: 'callback' });
    agent.receive(1, 'Hi');
    expect(agent.receive(2, '555-0100')).toContain('first name');
    expect(agent.receive(3, 'Riley')).toContain('callback');
    agent.receive(4, 'skip');
    expect(agent.handoff()).toMatchObject({ reason: 'Callback request', topic: null, callbackWindow: null });
  });

  it('preserves the current step while opted out until explicit START', () => {
    const agent = createSmsIntakeAgent(sampleSmsSettings);
    agent.receive(1, 'Hi');
    expect(agent.receive(2, ' stop! ')).toContain('Opted out');
    expect(agent.receive(3, 'HELP')).toBeNull();
    expect(agent.receive(4, 'Are you there?')).toBeNull();
    expect(agent.receive(5, 'START')).toContain('first name');
    expect(agent.receive(6, 'Sam')).toContain('What do you need help with?');
  });

  it('hands human and urgent requests to staff and exports the selected configuration', () => {
    const urgent = createSmsIntakeAgent(sampleSmsSettings);
    expect(urgent.receive(1, 'This is an emergency')).toContain('local emergency services');
    expect(urgent.handoff()?.reason).toBe('Urgent inquiry');
    const human = createSmsIntakeAgent(sampleSmsSettings);
    human.receive(1, 'Can I speak to a person?');
    expect(human.handoff()?.reason).toBe('Requested a person');
    human.receive(2, 'STOP');
    expect(human.handoff()?.optedOut).toBe(true);
    const exported = buildSmsIntakeConfig(sampleSmsSettings);
    expect(exported.settings).toEqual(sampleSmsSettings);
    expect(exported.systemPrompt).toContain('Alder Intake Law');
  });
});