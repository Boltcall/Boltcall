import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/utils', () => ({
  updateMetaDescription: vi.fn(),
}));

vi.mock('../../hooks/useSchemaInjector', () => ({
  useSchemaInjector: vi.fn(),
}));

vi.mock('../../components/Header', () => ({ default: () => <div>Header</div> }));
vi.mock('../../components/Hero', () => ({ default: () => <div>Hero</div> }));
vi.mock('../../components/LazySection', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../components/ui/bento-card', () => ({ default: () => <div>BentoCard</div> }));
vi.mock('../../components/HowItWorks', () => ({ default: () => <div>HowItWorks</div> }));
vi.mock('../../components/FreeSetup', () => ({ default: () => <div>FreeSetup</div> }));
vi.mock('../../components/Pricing', () => ({ default: () => <div>Pricing</div> }));
vi.mock('../../components/ui/integration-hero', () => ({ default: () => <div>IntegrationHero</div> }));
vi.mock('../../components/FAQ', () => ({ default: () => <div>FAQ</div> }));
vi.mock('../../components/FinalCTA', () => ({ default: () => <div>FinalCTA</div> }));
vi.mock('../../components/Footer', () => ({ default: () => <div>Footer</div> }));
vi.mock('../../components/StickyScrollSection', () => ({
  StickyScrollSection: () => <div>StickyScrollSection</div>,
}));

import Home from '../Home';

describe('Home marketing page', () => {
  it('does not render the removed automation integrations promo strip', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Automation integrations')).not.toBeInTheDocument();
    expect(screen.queryByText('Send every new lead into Boltcall instantly.')).not.toBeInTheDocument();
    expect(
      screen.queryByText("Connect form fills, ad leads, CRM contacts, and spreadsheet rows to Boltcall's speed-to-lead workflow."),
    ).not.toBeInTheDocument();
  });
});
