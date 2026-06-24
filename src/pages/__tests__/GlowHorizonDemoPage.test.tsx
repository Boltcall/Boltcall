import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import GlowHorizonDemoPage from '../GlowHorizonDemoPage';

describe('GlowHorizonDemoPage', () => {
  it('renders the boltcall welcome hero', () => {
    render(<GlowHorizonDemoPage />);

    expect(screen.getByRole('main')).toHaveClass('min-h-screen', 'overflow-hidden');
    expect(screen.getByRole('heading', { name: /welcome to boltcall/i })).toBeInTheDocument();
    expect(document.title).toBe('Glow Horizon Demo - Boltcall');
  });
});
