import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, prop) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        React.forwardRef(({ children, ...p }: any, ref: any) =>
          React.createElement(prop as string, { ...p, ref }, children),
        ),
    },
  ),
}));

import { Input } from './input';

const ControlledInput = () => {
  const [value, setValue] = useState('');

  return (
    <Input
      label="Email Address"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
};

describe('animated Input', () => {
  it('renders an accessible textbox and updates through the controlled value', async () => {
    const user = userEvent.setup();
    render(<ControlledInput />);

    const textbox = screen.getByRole('textbox', { name: /email address/i });

    await user.type(textbox, 'owner@boltcall.org');
    expect(textbox).toHaveValue('owner@boltcall.org');
  });
});
