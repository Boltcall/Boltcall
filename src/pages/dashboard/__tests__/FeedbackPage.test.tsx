import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import FeedbackPage, { getFeedbackSubmittedStorageKey } from '../FeedbackPage';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const fillAndReachStep3 = () => {
  fireEvent.click(screen.getByRole('button', { name: /AI Receptionist/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));

  fireEvent.change(screen.getByLabelText(/Your feedback/i), {
    target: { value: 'This helped me get launched faster.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
};

describe('FeedbackPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends feedback through send-email and only marks it submitted after a real 200', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>,
    );

    fillAndReachStep3();
    fireEvent.click(screen.getByRole('button', { name: /Send Feedback/i }));

    await waitFor(() => {
      expect(screen.getByText(/Thanks for your feedback!/i)).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/send-email'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      getFeedbackSubmittedStorageKey('test-user'),
      'true',
    );
  });

  it('shows an honest error and does not fake success when the send fails', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Brevo API key not configured' }), { status: 500 }),
    );
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>,
    );

    fillAndReachStep3();
    fireEvent.click(screen.getByRole('button', { name: /Send Feedback/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't send your feedback/i);
    });

    expect(screen.queryByText(/Thanks for your feedback!/i)).not.toBeInTheDocument();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
