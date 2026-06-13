import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import AeoGlobalIntro from '../AeoGlobalIntro';

describe('AeoGlobalIntro', () => {
  it('renders article context before the site footer when mounted after route content', async () => {
    render(
      <MemoryRouter initialEntries={['/blog/ai-phone-answering-plumbers']}>
        <main>Article content</main>
        <footer>Features AI Receptionist. All rights reserved.</footer>
        <AeoGlobalIntro />
      </MemoryRouter>,
    );

    const summary = await screen.findByText('Page Summary');
    const footer = screen.getByText(/All rights reserved/i);

    await waitFor(() => {
      expect(
        summary.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });
});
