import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import FeedbackPage, { getFeedbackSubmittedStorageKey } from '../FeedbackPage';

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

describe('FeedbackPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('marks feedback as submitted in localStorage when the form is sent', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <FeedbackPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /AI Receptionist/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));

    fireEvent.change(screen.getByLabelText(/Your feedback/i), {
      target: { value: 'This helped me get launched faster.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));

    fireEvent.click(screen.getByRole('button', { name: /Send Feedback/i }));

    expect(openSpy).toHaveBeenCalled();
    expect(setItemSpy).toHaveBeenCalledWith(
      getFeedbackSubmittedStorageKey('test-user'),
      'true',
    );
  });
});
