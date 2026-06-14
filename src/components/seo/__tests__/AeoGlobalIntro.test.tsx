import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import AeoGlobalIntro from '../AeoGlobalIntro';

describe('AeoGlobalIntro', () => {
  it('does not render visible article context on blog routes', () => {
    render(
      <MemoryRouter initialEntries={['/blog/ai-phone-answering-plumbers']}>
        <main>Article content</main>
        <footer>Features AI Receptionist. All rights reserved.</footer>
        <AeoGlobalIntro />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Page Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Sources & Citations')).not.toBeInTheDocument();
    expect(screen.queryByText('Page Context')).not.toBeInTheDocument();
  });

  it('renders comparison context before the site footer when mounted after route content', async () => {
    render(
      <MemoryRouter initialEntries={['/compare/boltcall-vs-gohighlevel']}>
        <main>Comparison content</main>
        <footer>Features AI Receptionist. All rights reserved.</footer>
        <AeoGlobalIntro />
      </MemoryRouter>,
    );

    const summary = await screen.findByText('Comparison Summary');
    const footer = screen.getByText(/All rights reserved/i);

    await waitFor(() => {
      expect(
        summary.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });
});
