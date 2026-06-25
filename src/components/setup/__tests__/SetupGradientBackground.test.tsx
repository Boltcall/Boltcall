import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SetupGradientBackground } from '../SetupGradientBackground';

describe('SetupGradientBackground', () => {
  it('renders the Boltcall logo at the top of the setup background', () => {
    render(<SetupGradientBackground />);

    expect(screen.getByAltText('Boltcall')).toHaveAttribute(
      'src',
      '/boltcall_full_logo.png',
    );
  });
});
