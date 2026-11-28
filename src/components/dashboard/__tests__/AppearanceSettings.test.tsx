import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardAppearanceProvider } from '../../../contexts/DashboardAppearanceContext';
import AppearanceSettings from '../AppearanceSettings';

const auth = vi.hoisted(() => ({
  getUser: vi.fn(), updateUser: vi.fn(),
  user: { id: 'client-one' },
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('../../../lib/supabase', () => ({ supabase: { auth, from: () => ({
  select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }),
}) } }));

describe('client dashboard appearance', () => {
  beforeEach(() => {
    auth.user = { id: 'client-one' };
    auth.getUser.mockResolvedValue({ data: { user: { id: 'client-one', user_metadata: {} } }, error: null });
    auth.updateUser.mockResolvedValue({ data: { user: { id: 'client-one' } }, error: null });
    vi.clearAllMocks();
  });

  it('saves the selected appearance to the signed-in account', async () => {
    render(<DashboardAppearanceProvider><AppearanceSettings /></DashboardAppearanceProvider>);
    const color = await screen.findByRole('radio', { name: 'Sky' });
    fireEvent.click(color);
    fireEvent.click(screen.getByRole('radio', { name: /roomy/i }));
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Corner radius' }), { key: 'End' });
    fireEvent.click(screen.getByRole('radio', { name: /dark/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save appearance' }));
    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ data: {
      boltcall_appearance: { accent: 'sky', density: 'roomy', radius: 28, previewMode: 'dark' },
    } }));
    expect(await screen.findByRole('status')).toHaveTextContent('Appearance saved');
  });

  it('keeps the draft after a failed save and lets the client retry', async () => {
    auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Offline') });
    render(<DashboardAppearanceProvider><AppearanceSettings /></DashboardAppearanceProvider>);
    fireEvent.click(await screen.findByRole('radio', { name: 'Iris' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save appearance' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save appearance');
    expect(screen.getByRole('radio', { name: 'Iris' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Save appearance' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Appearance saved');
    expect(auth.updateUser).toHaveBeenCalledTimes(2);
  });

  it('restores account settings and discards unsaved edits', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'client-one', user_metadata: {
      boltcall_appearance: { accent: 'iris', density: 'compact', radius: 8, previewMode: 'dark' },
    } } }, error: null });
    render(<DashboardAppearanceProvider><AppearanceSettings /></DashboardAppearanceProvider>);
    expect(await screen.findByRole('radio', { name: 'Iris' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Sky' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('radio', { name: 'Iris' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '8');
    expect(auth.updateUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(screen.getByRole('radio', { name: 'Boltcall blue' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(screen.getByRole('radio', { name: /dark/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('uses keyboard controls and keeps the radius within its bounds', async () => {
    render(<DashboardAppearanceProvider><AppearanceSettings /></DashboardAppearanceProvider>);
    const radio = await screen.findByRole('radio', { name: 'Boltcall blue' });
    radio.focus();
    fireEvent.keyDown(radio, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'Iris' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'Iris' })).toHaveAttribute('aria-checked', 'true');
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Home' });
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    fireEvent.keyDown(slider, { key: 'End' });
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(slider).toHaveAttribute('aria-valuenow', '28');
  });

  it('does not carry appearance between clients or accept a late previous-account load', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    auth.getUser.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }));
    const view = render(<DashboardAppearanceProvider><AppearanceSettings /></DashboardAppearanceProvider>);
    auth.user = { id: 'client-two' };
    auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'client-two', user_metadata: {
      boltcall_appearance: { accent: 'sky', density: 'cozy', radius: 10, previewMode: 'light' },
    } } }, error: null });
    view.rerender(<DashboardAppearanceProvider><AppearanceSettings /></DashboardAppearanceProvider>);
    expect(await screen.findByRole('radio', { name: 'Sky' })).toHaveAttribute('aria-checked', 'true');
    resolveFirst({ data: { user: { id: 'client-one', user_metadata: {
      boltcall_appearance: { accent: 'iris', density: 'roomy', radius: 24, previewMode: 'dark' },
    } } }, error: null });
    await waitFor(() => expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '10'));
    expect(screen.getByRole('radio', { name: 'Sky' })).toHaveAttribute('aria-checked', 'true');
  });

  it('refuses to save if the authenticated session changes to another client', async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'client-one', user_metadata: {} } }, error: null })
      .mockResolvedValueOnce({ data: { user: { id: 'client-two', user_metadata: {} } }, error: null });
    render(<DashboardAppearanceProvider><AppearanceSettings /></DashboardAppearanceProvider>);
    fireEvent.click(await screen.findByRole('radio', { name: 'Iris' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save appearance' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save appearance');
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});
