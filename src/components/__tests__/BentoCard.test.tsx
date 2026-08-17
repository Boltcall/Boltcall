import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/input', () => ({
  Input: ({ label, value, onChange, type = 'text', required = false }: any) => (
    <input
      aria-label={label}
      value={value}
      onChange={onChange}
      type={type}
      required={required}
    />
  ),
}));

vi.mock('@/components/ui/siri-orb', () => ({
  default: () => <div data-testid="siri-orb" />,
}));

import BentoCard from '../ui/bento-card';

describe('BentoCard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders one clean live-call form without the old preview chrome', () => {
    render(<BentoCard />);

    expect(
      screen.getAllByRole('heading', {
        name: /Receive a live call from our agent and hear how Boltcall handles real customer conversations\./i,
      }),
    ).toHaveLength(1);
    expect(screen.queryByText(/Dashboard Preview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/interactive V1-inspired screens/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Consult intake and fast callback\./i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/One number\. Multiple demo agents\. We route the call by industry\./i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Get a call/i })).toBeInTheDocument();
  });

  it('renders all 5 practice-area options and sends the selected one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ phone: '+15551234567' }),
    }));

    render(<BentoCard />);

    const labels = ['Personal Injury', 'Family Law', 'Criminal Defense', 'Immigration', 'Estate Planning'];
    for (const label of labels) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    fireEvent.click(screen.getByRole('button', { name: 'Family Law' }));
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Noam Yakoby' } });
    fireEvent.change(screen.getByLabelText('+15551234567'), { target: { value: '+15551234567' } });
    fireEvent.submit(screen.getByRole('button', { name: /Get a call/i }).closest('form')!);

    await screen.findByText(/Family Law demo selected\./i);

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body).industry).toBe('family-law');
  });

  it('shows a polished fallback instead of a backend configuration error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'RETELL_DEMO_FROM_NUMBER is not configured' }),
    }));

    render(<BentoCard />);

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Noam Yakoby' } });
    fireEvent.change(screen.getByLabelText('+15551234567'), { target: { value: '+15551234567' } });
    fireEvent.submit(screen.getByRole('button', { name: /Get a call/i }).closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We're unable to place your call right now. Please try again in a few minutes.",
    );
    expect(screen.queryByText('RETELL_DEMO_FROM_NUMBER is not configured')).not.toBeInTheDocument();
  });
});
