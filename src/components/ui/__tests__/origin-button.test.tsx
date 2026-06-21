import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OriginButton } from '../origin-button';

describe('OriginButton', () => {
  it('inherits the shared demo button shell by default', () => {
    render(<OriginButton>Origin Button</OriginButton>);

    const button = screen.getByRole('button', { name: /origin button/i });
    expect(button).toHaveClass('border-2');
    expect(button).toHaveClass('shadow-shadow');
    expect(button).toHaveClass('rounded-base');
    expect(button).not.toHaveClass('rounded-xl');
  });

  it('anchors the fill overlay to the pointer origin', () => {
    render(<OriginButton>Origin Button</OriginButton>);

    const button = screen.getByRole('button', { name: /origin button/i });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 60,
      top: 20,
      right: 210,
      bottom: 80,
      left: 10,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.pointerEnter(button, { clientX: 70, clientY: 50, pointerId: 1 });

    const fill = button.querySelector('span[aria-hidden="true"]');
    expect(fill).not.toBeNull();
    expect(fill).toHaveClass('rounded-full');
    expect(fill).toHaveStyle({
      left: '60px',
      top: '30px',
      width: '287px',
      height: '287px',
    });
  });
});
