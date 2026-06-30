import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
});
