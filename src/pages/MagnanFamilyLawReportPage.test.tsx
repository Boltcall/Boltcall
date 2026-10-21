import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MagnanFamilyLawReportPage from './MagnanFamilyLawReportPage';

afterEach(cleanup);

describe('Magnan personalised web report', () => {
  it('shows the full report directly without a form or PDF download', () => {
    const { container } = render(<MemoryRouter><MagnanFamilyLawReportPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Magnan Family Law' })).toBeVisible();
    expect(screen.getByText('Prepared for Jordan Magnan')).toBeVisible();
    expect(screen.getByRole('heading', { name: /Three points worth checking/ })).toBeVisible();
    expect(screen.getByRole('heading', { name: /Sources and review scope/ })).toBeVisible();
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('a[href$=".pdf"]')).toBeNull();
    expect(screen.getAllByRole('table')).toHaveLength(2);
    expect(screen.getByRole('img', { name: /contact page showing Friday/ })).toHaveAttribute('src', '/images/reports/magnan-contact-evidence.png');
  });

  it('keeps unmeasured results explicit and includes real sources', () => {
    render(<MemoryRouter><MagnanFamilyLawReportPage /></MemoryRouter>);
    expect(screen.getByText('Actual response speed: unmeasured')).toBeVisible();
    expect(screen.getByText(/No lost-client estimate or speed grade is assigned/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Magnan Family Law.*Contact Us/ })).toHaveAttribute('href', 'https://magnanfamilylaw.com/contact-us/');
  });

  it('sets report metadata and restores robots on navigation away', () => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'index, follow';
    document.head.appendChild(robots);
    const { unmount } = render(<MemoryRouter><MagnanFamilyLawReportPage /></MemoryRouter>);
    expect(document.title).toBe('Magnan Family Law Enquiry Response Report | Boltcall');
    expect(robots.content).toBe('noindex, nofollow');
    unmount();
    expect(robots.content).toBe('index, follow');
    robots.remove();
  });
});
