/* eslint-disable @typescript-eslint/no-explicit-any -- supabase chain mock */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const updates: Array<{ table: string; payload: Record<string, unknown> }> = [];
let profileRow: Record<string, unknown>;
let latestPrefs: Record<string, unknown>;
const toast = vi.fn();

vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('../../../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: toast }) }));
vi.mock('../../../../components/ui/pop-button', () => ({
  PopButton: ({ children, ...p }: any) => <button {...p}>{children}</button>,
}));

vi.mock('../../../../lib/supabase', () => {
  const chain = (table: string, result: () => unknown): any => {
    const c: any = {
      select: () => c, eq: () => c, order: () => c, limit: () => c,
      maybeSingle: () => Promise.resolve({ data: result(), error: null }),
      single: () => Promise.resolve({ data: result(), error: null }),
      then: (cb: any) => Promise.resolve({ data: result(), error: null }).then(cb),
      update: (payload: Record<string, unknown>) => {
        updates.push({ table, payload });
        return { eq: () => Promise.resolve({ error: null }) };
      },
    };
    return c;
  };
  return {
    supabase: {
      from: (table: string) =>
        // the save re-read ("latest") is distinguished by the page calling .single()
        chain(table, () => (table === 'services' ? [] : { ...profileRow, user_preferences: latestPrefs })),
    },
  };
});

import ServicesPage from '../ServicesPage';

beforeEach(() => {
  updates.length = 0;
  toast.mockClear();
  profileRow = { id: 'p1', workspace_id: 'w1', avg_deal_value_cents: 0, main_category: 'roofing' };
  latestPrefs = { theme: 'dark', dashboard_appearance: { density: 'compact' } };
});

const open = async () => {
  render(<ServicesPage />);
  return (await screen.findByLabelText(/alert me for jobs worth/i)) as HTMLInputElement;
};

describe('Big job alert setting', () => {
  it('shows the industry default as placeholder when unset', async () => {
    const input = await open();
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('8000');
    expect(screen.getByText(/default for your industry: \$8,000/)).toBeInTheDocument();
  });

  it('saves dollars as cents and keeps other user_preferences keys', async () => {
    const input = await open();
    fireEvent.change(input, { target: { value: '12000' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(updates.some((u) => 'user_preferences' in u.payload)).toBe(true));
    const prefs = updates.find((u) => 'user_preferences' in u.payload)!.payload.user_preferences;
    expect(prefs).toEqual({
      theme: 'dark',
      dashboard_appearance: { density: 'compact' },
      lead_value: { high_value_threshold_cents: 1200000 },
    });
  });

  it('rejects non-whole or non-positive amounts and writes nothing', async () => {
    const input = await open();
    fireEvent.change(input, { target: { value: '12.5' } });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(updates).toHaveLength(0);
  });

  it('does not touch user_preferences when the amount is unchanged', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(updates.some((u) => 'user_preferences' in u.payload)).toBe(false);
  });
});
