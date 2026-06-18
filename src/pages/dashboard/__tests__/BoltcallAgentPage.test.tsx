import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const authedFetchMock = vi.hoisted(() => vi.fn());

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com', name: 'Test User' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../lib/authedFetch', () => ({
  authedFetch: authedFetchMock,
}));

vi.mock('../../../lib/readJsonResponse', () => ({
  readJsonResponse: async () => ({ reply: 'Done!' }),
}));

import BoltcallAgentPage from '../BoltcallAgentPage';

describe('BoltcallAgentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedFetchMock.mockResolvedValue({ ok: true });
  });

  it('includes attached text file context when sending a message', async () => {
    const user = userEvent.setup();

    render(<BoltcallAgentPage />);

    const fileInput = screen.getAllByLabelText(/attach file/i).find(
      (element) => element.tagName.toLowerCase() === 'input',
    ) as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText(/what's broken\?/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(fileInput).toBeTruthy();

    const file = new File(
      ['Caller said they need the callback window changed to afternoons only.'],
      'notes.txt',
      { type: 'text/plain' },
    );

    await user.upload(fileInput, file);
    await user.type(messageInput, 'Please review this note');
    await user.click(sendButton);

    await waitFor(() => {
      expect(authedFetchMock).toHaveBeenCalledTimes(1);
    });

    const request = authedFetchMock.mock.calls[0][1] as { body: string };
    const parsed = JSON.parse(request.body);

    expect(parsed.userId).toBe('test-user');
    expect(parsed.messages).toHaveLength(1);
    expect(parsed.messages[0].content).toContain('Please review this note');
    expect(parsed.messages[0].content).toContain('Attached file: notes.txt');
    expect(parsed.messages[0].content).toContain('Caller said they need the callback window changed to afternoons only.');
  });
});
