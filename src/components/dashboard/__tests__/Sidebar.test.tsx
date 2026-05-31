import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import Sidebar from '../Sidebar';

const renderSidebar = (props: { isOpen: boolean; onClose?: () => void }) => {
  return render(
    <BrowserRouter>
      <Sidebar isOpen={props.isOpen} onClose={props.onClose || vi.fn()} />
    </BrowserRouter>
  );
};

describe('Sidebar', () => {
  it('should render without crashing', () => {
    renderSidebar({ isOpen: true });
    expect(screen.getByText('Boltcall')).toBeInTheDocument();
  });

  it('should display the logo/brand name', () => {
    renderSidebar({ isOpen: true });
    expect(screen.getByText('Boltcall')).toBeInTheDocument();
  });

  it('should render all navigation items', () => {
    renderSidebar({ isOpen: true });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Voice Library')).toBeInTheDocument();
    expect(screen.getByText('Business Details')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should have nav items as links', () => {
    renderSidebar({ isOpen: true });
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('should have "Main navigation" aria-label on nav', () => {
    renderSidebar({ isOpen: true });
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('should show the section heading "Main"', () => {
    renderSidebar({ isOpen: true });
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('should render mobile overlay when open', () => {
    const { container } = renderSidebar({ isOpen: true });
    const overlay = container.querySelector('div[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
  });

  it('should not render mobile overlay when closed', () => {
    const { container } = renderSidebar({ isOpen: false });
    // The overlay is a div with aria-hidden, not an SVG
    const overlay = container.querySelector('div[aria-hidden="true"]');
    expect(overlay).not.toBeInTheDocument();
  });

  it('should call onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = renderSidebar({ isOpen: true, onClose });
    const overlay = container.querySelector('div[aria-hidden="true"]');
    if (overlay) fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('should apply translate-x-0 when open', () => {
    const { container } = renderSidebar({ isOpen: true });
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('translate-x-0');
  });

  it('should apply -translate-x-full when closed', () => {
    const { container } = renderSidebar({ isOpen: false });
    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('-translate-x-full');
  });
});
