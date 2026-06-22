import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

const mockUseAuth = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../components/ui/auth-switch', () => ({
  default: () => <div>signup form</div>,
}));

vi.mock('../../lib/utils', () => ({
  updateMetaDescription: vi.fn(),
}));

import Signup from '../Signup';

describe('Signup page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the signup form while unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/setup" element={<div>setup page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('signup form')).toBeInTheDocument();
  });

  it('redirects authenticated users straight to setup', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/setup" element={<div>setup page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('setup page')).toBeInTheDocument();
  });
});
