import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, element) => {
      return ({ children, ...props }: any) => React.createElement(element as string, props, children);
    },
  }),
}));

vi.mock('../../hooks/useDirection', () => ({
  useDirection: () => 'rtl',
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'footer.sections.features': 'תכונות',
      'footer.sections.freeTools': 'כלים חינמיים',
      'footer.sections.calculators': 'מחשבונים',
      'footer.sections.learn': 'למד',
      'footer.sections.industries': 'תעשיות והצעות',
      'footer.sections.comparisons': 'השוואות',
      'footer.sections.company': 'חברה',
      'footer.copyright': '© 2026 Boltcall. כל הזכויות שמורות.',
    }[key] ?? key),
    i18n: { language: 'he' },
  }),
}));

import Footer from '../Footer';

describe('Footer localization', () => {
  it('renders Hebrew labels and rtl direction for Hebrew visitors', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByRole('contentinfo')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('קבלת פנים AI')).toBeInTheDocument();
    expect(screen.getByText('מדריך מהירות ללידים')).toBeInTheDocument();
    expect(screen.getByText('אודות')).toBeInTheDocument();
  });
});
