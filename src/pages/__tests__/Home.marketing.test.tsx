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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string | string[]> = {
        'hero.neverMiss': 'NEVER MISS',
        'hero.a': 'A ',
        'hero.rotatingWords': ['CALL', 'LEAD', 'TEXT', 'REVIEW', 'REPLY'],
        'hero.subtitle': 'The Speed To Lead System for local businesses',
        'hero.startFree': 'Start Free',
        'hero.seeHowItWorks': 'See How It Works',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('framer-motion', async () => {
  const ReactModule = await import('react');
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        ({ children, initial: _initial, animate: _animate, transition: _transition, whileInView: _whileInView, viewport: _viewport, layout: _layout, ...props }: any) =>
          ReactModule.createElement(tag, props, children),
    },
  );

  return {
    motion,
    LayoutGroup: ({ children }: { children: React.ReactNode }) => ReactModule.createElement(ReactModule.Fragment, null, children),
  };
});

vi.mock('../../hooks/useDirection', () => ({
  useDirection: () => 'ltr',
}));

vi.mock('../../components/Header', () => ({ default: () => <div>Header</div> }));
vi.mock('../../components/LazySection', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../../components/ui/text-rotate', () => ({
  TextRotate: ({ texts }: { texts: string[] }) => <span>{texts.join(' ')}</span>,
}));
vi.mock('../../components/ui/parallax-floating', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FloatingElement: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  it('renders exactly one crawlable speed-to-lead H1 and internal SEO links', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Speed-to-Lead Software for Local Service Businesses');

    expect(screen.getByRole('link', { name: /speed-to-lead guide/i })).toHaveAttribute('href', '/speed-to-lead');
    expect(screen.getByRole('link', { name: /top ai receptionist agencies/i })).toHaveAttribute('href', '/blog/top-10-ai-receptionist-agencies');
    expect(screen.getByRole('link', { name: /hvac ai lead response/i })).toHaveAttribute('href', '/blog/hvac-ai-lead-response');
    expect(screen.getByRole('link', { name: /lead response scorecard/i })).toHaveAttribute('href', '/lead-response-scorecard');
    expect(screen.getByRole('link', { name: /comparisons/i })).toHaveAttribute('href', '/comparisons');
  });

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
