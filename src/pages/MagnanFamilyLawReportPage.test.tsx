import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';
import Header from '../components/Header';
import MagnanFamilyLawReportPage from './MagnanFamilyLawReportPage';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false }) }));

const originalObserver = window.IntersectionObserver;
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.IntersectionObserver = originalObserver; });

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

  it('uses the official firm logo without implying an endorsement', () => {
    render(<MemoryRouter><MagnanFamilyLawReportPage /></MemoryRouter>);
    expect(screen.getByRole('img', { name: 'Magnan Family Law official logo' })).toHaveAttribute('src', '/images/reports/magnan-family-law-logo.png');
    expect(screen.getByRole('link', { name: 'official logo' })).toHaveAttribute('href', 'https://magnanfamilylaw.com/wp-content/uploads/2025/05/Magnan-Family-Law-Logo.png');
    expect(screen.getByText(/not a partnership or endorsement/)).toBeVisible();
  });

  it('charts only the published hours with proportional bars and clear limitations', () => {
    const { container } = render(<MemoryRouter><MagnanFamilyLawReportPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Your published working week' })).toBeVisible();
    expect(screen.getByText('35')).toBeVisible();
    expect(screen.getByRole('list', { name: 'Published weekday office hours' })).toHaveTextContent('Friday9am–12pm3 hours');
    const bars = container.querySelectorAll<HTMLElement>('[data-office-hours]');
    expect(Array.from(bars, bar => Number(bar.dataset.officeHours))).toEqual([8, 8, 8, 8, 3]);
    expect(Array.from(bars, bar => bar.style.width)).toEqual(['100%', '100%', '100%', '100%', '37.5%']);
    expect(screen.getByText(/These bars do not measure enquiry coverage or response speed/)).toBeVisible();
  });

  it('uses a categorical comparison without inventing performance measurements', () => {
    render(<MemoryRouter><MagnanFamilyLawReportPage /></MemoryRouter>);
    expect(screen.getByRole('region', { name: 'Enquiry route comparison chart' })).toBeVisible();
    expect(screen.getAllByText('Not stated')).toHaveLength(3);
    expect(screen.getAllByText('Requested')).toHaveLength(2);
    expect(screen.getAllByText('To measure')).toHaveLength(4);
    expect(screen.getByText(/Actual reply times remain unknown/)).toBeVisible();
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

  it('uses the shared navbar without a promotion and opens its mobile menu', () => {
    render(<MemoryRouter><MagnanFamilyLawReportPage /></MemoryRouter>);
    screen.getAllByRole('link', { name: 'For Law Firms' }).forEach(link => expect(link).toHaveAttribute('href', '/industries/lawyer-answering-service'));
    screen.getAllByRole('link', { name: 'Pricing' }).forEach(link => expect(link).toHaveAttribute('href', '/pricing'));
    expect(document.querySelector('a[href="/giveaway"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const closeMenu = screen.getByRole('button', { name: 'Close menu' });
    expect(closeMenu.parentElement).toHaveClass('opacity-100');
    fireEvent.click(closeMenu);
    expect(closeMenu.parentElement).toHaveClass('opacity-0', 'pointer-events-none');
  });

  it('preserves the shared header promotion on other pages', () => {
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(document.querySelector('a[href="/giveaway"]')).not.toBeNull();
  });

  it('keeps the full report visible without IntersectionObserver', () => {
    window.IntersectionObserver = undefined as unknown as typeof IntersectionObserver;
    const { container } = render(<MemoryRouter><MagnanFamilyLawReportPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Sources and review scope/ })).toBeVisible();
    container.querySelectorAll<HTMLElement>('[data-report-reveal]').forEach(element => {
      expect(element).toBeVisible();
      expect(element.style.opacity).toBe('');
    });
  });

  it.each([false, true])('reveals content on entry and respects reduced motion (%s)', reducedMotion => {
    let onIntersect: IntersectionObserverCallback = () => {};
    const disconnect = vi.fn();
    window.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) { onIntersect = callback; }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = disconnect;
    } as unknown as typeof IntersectionObserver;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
      matches: reducedMotion, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    }));
    const { container, unmount } = render(<MemoryRouter><MagnanFamilyLawReportPage /></MemoryRouter>);
    const target = container.querySelector<HTMLElement>('[data-report-reveal]')!;
    const cancel = vi.fn();
    const animate = vi.fn().mockReturnValue({ cancel });
    Object.defineProperty(target, 'animate', { value: animate });
    expect(target).toBeVisible();
    expect(target.style.opacity).toBe('');
    onIntersect([{ target, isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(animate).toHaveBeenCalledTimes(reducedMotion ? 0 : 1);
    expect(screen.getByRole('complementary', { name: 'Proposed enquiry journey' })).toBeVisible();
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledTimes(reducedMotion ? 0 : 1);
  });
});
