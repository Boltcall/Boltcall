import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TableOfContents from '../TableOfContents';

describe('TableOfContents', () => {
  const headings = [
    { id: 'key-takeaways', text: 'Key Takeaways', level: 2 },
    { id: 'setup', text: 'Setup', level: 2 },
  ];

  it('renders optional social links in the On this page header', () => {
    render(
      <TableOfContents
        headings={headings}
        socialLinks={[
          { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61582307818752' },
          { label: 'X', href: 'https://x.com/boltcallteam' },
          { label: 'LinkedIn', href: 'https://www.linkedin.com/company/boltcall' },
        ]}
      />,
    );

    expect(screen.getByLabelText('Boltcall on Facebook')).toBeInTheDocument();
    expect(screen.getByLabelText('Boltcall on X')).toBeInTheDocument();
    expect(screen.getByLabelText('Boltcall on LinkedIn')).toBeInTheDocument();
  });

  it('renders an optional compact CTA below the navigation', () => {
    render(
      <TableOfContents
        headings={headings}
        cta={{
          title: 'Missed jobs?',
          body: 'Catch the next one.',
          href: '/signup',
          label: 'Start for free',
        }}
      />,
    );

    expect(screen.getByText('Missed jobs?')).toBeInTheDocument();
    expect(screen.getByText('Catch the next one.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start for free' })).toHaveAttribute('href', '/signup');
    expect(screen.getByLabelText('Missed jobs?')).toBeInTheDocument();
  });
});
