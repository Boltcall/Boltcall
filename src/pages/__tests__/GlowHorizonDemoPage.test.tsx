import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import GlowHorizonDemoPage from '../GlowHorizonDemoPage';

describe('GlowHorizonDemoPage', () => {
  it('renders the glow horizon demo and variant controls', () => {
    render(<GlowHorizonDemoPage />);

    expect(screen.getByRole('heading', { name: /glow horizon/i })).toBeInTheDocument();
    expect(
      screen.getByText(/soft directional glow layer for hero sections/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /top/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /bottom/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /left/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /right/i })).toBeInTheDocument();
  });
}
