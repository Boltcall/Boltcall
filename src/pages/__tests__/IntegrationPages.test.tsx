import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type React from 'react';
import {
  GoHighLevelIntegrationPage,
  HubSpotIntegrationPage,
  IntegrationsHubPage,
  MakeIntegrationPage,
  ZapierIntegrationPage,
} from '../IntegrationPages';

function renderPage(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('public integration AEO pages', () => {
  it('renders the integrations hub without auth', () => {
    renderPage(<IntegrationsHubPage />);

    expect(screen.getByRole('heading', { name: /connect boltcall/i })).toBeInTheDocument();
    expect(screen.getAllByText('Zapier').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Make').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HubSpot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GoHighLevel').length).toBeGreaterThan(0);
  });

  it('renders platform-specific answer and schema blocks', () => {
    renderPage(<ZapierIntegrationPage />);

    expect(screen.getByRole('heading', { name: /boltcall zapier integration/i })).toBeInTheDocument();
    expect(screen.getByText(/direct answer/i)).toBeInTheDocument();
    expect(document.querySelectorAll('script[type="application/ld+json"]').length).toBeGreaterThanOrEqual(3);
  });

  it('renders all four detail pages', () => {
    const pages = [
      <ZapierIntegrationPage key="zapier" />,
      <MakeIntegrationPage key="make" />,
      <HubSpotIntegrationPage key="hubspot" />,
      <GoHighLevelIntegrationPage key="gohighlevel" />,
    ];

    for (const page of pages) {
      const { unmount } = renderPage(page);
      expect(screen.getByText(/acceptance/i)).toBeInTheDocument();
      unmount();
    }
  });
});
