import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import OriginButtonDemoPage from '../OriginButtonDemoPage';

describe('OriginButtonDemoPage', () => {
  it('renders the origin button demo states', () => {
    render(<OriginButtonDemoPage />);

    expect(screen.getByRole('heading', { name: /origin button demo/i })).toBeInTheDocument();
    expect(screen.getByText(/hover each button/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /finish/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /disabled/i })).toBeDisabled();
  });
});
