import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import SetupEntry from '../SetupEntry';

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

const LocationEcho: React.FC = () => {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.search}
    </div>
  );
};

function renderSetupEntry() {
  return render(
    <MemoryRouter initialEntries={['/setup']}>
      <Routes>
        <Route path="/setup" element={<SetupEntry />} />
        <Route path="/setup/classic" element={<div>Classic setup</div>} />
        <Route path="/signup" element={<LocationEcho />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SetupEntry', () => {
  it('sends signed-out visitors to signup with the setup entry redirect', () => {
    authState.isAuthenticated = false;
    authState.isLoading = false;

    renderSetupEntry();

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/signup?redirect=%2Fsetup',
    );
  });

  it('sends authenticated visitors straight to the classic setup flow', () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;

    renderSetupEntry();

    expect(screen.getByText('Classic setup')).toBeInTheDocument();
  });

  it('shows a loading state while auth is resolving', () => {
    authState.isAuthenticated = false;
    authState.isLoading = true;

    renderSetupEntry();

    expect(screen.getByText('Loading setup...')).toBeInTheDocument();
  });
});
