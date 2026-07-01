import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SetupGradientBackground } from '../SetupGradientBackground';

describe('SetupGradientBackground', () => {
  it('renders the Boltcall logo at the top of the setup background', () => {
    const { container } = render(<SetupGradientBackground />);

    expect(screen.getByAltText('Boltcall')).toHaveAttribute(
      'src',
      '/boltcall_full_logo.png',
    );
    expect(container.querySelector('.setup-gradient-field')?.getAttribute('style')).toContain(
      'boltcallSetupBackgroundIn',
    );
    expect(container.querySelector('.setup-gradient-glow')?.getAttribute('style')).toContain(
      'boltcallSetupGlowIn',
    );
  });
});
