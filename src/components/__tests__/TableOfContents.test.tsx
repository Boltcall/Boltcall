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
          title: 'Recover missed jobs',
          body: 'See how much revenue slow response is costing.',
          href: '/ai-revenue-audit',
          label: 'Get the audit',
        }}
      />,
    );

    expect(screen.getByText('Recover missed jobs')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get the audit' })).toHaveAttribute('href', '/ai-revenue-audit');
  });
});
