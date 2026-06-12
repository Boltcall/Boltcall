import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AfterHoursLeadRescuePage from '../AfterHoursLeadRescuePage';
import AutomaticReviewsAgentPage from '../AutomaticReviewsAgentPage';
import RemindersAgentPage from '../RemindersAgentPage';

vi.mock('../../components/Header', () => ({ default: () => <header /> }));
vi.mock('../../components/Footer', () => ({ default: () => <footer /> }));
vi.mock('../../components/GiveawayBar', () => ({ default: () => null }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <AfterHoursLeadRescuePage />
    </MemoryRouter>,
  );

const renderSpecificPage = (Page: React.ComponentType) =>
  render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );

describe('done-for-you setup offer pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('validates required setup request fields before handoff', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /create my free setup/i }));

    await waitFor(() => {
      expect(screen.getByText(/business name is required/i)).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits a valid after-hours setup request to the Boltcall handoff endpoint', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, requestId: 'setup-1' }),
    } as Response);

    renderPage();

    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'Blue Star HVAC' } });
    fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: 'Jordan Lee' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'jordan@example.com' } });
    fireEvent.change(screen.getByLabelText(/your mobile phone/i), { target: { value: '+15551234567' } });
    fireEvent.change(screen.getByLabelText(/business phone/i), { target: { value: '+15557654321' } });
    fireEvent.click(screen.getByLabelText(/recipients can opt out with STOP/i));

    fireEvent.click(screen.getByRole('button', { name: /create my free setup/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/.netlify/functions/setup-request',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"offerSlug":"after-hours-lead-rescue"'),
        }),
      );
    });
    expect(
      await screen.findByText(/Setup created. Next: we'll run one test message before importing the first 100 contacts./i),
    ).toBeInTheDocument();
  });

  it.each([
    [AfterHoursLeadRescuePage, /Free 7-Day After-Hours Lead Rescue Setup/i],
    [AutomaticReviewsAgentPage, /Free 7-Day Automatic Reviews Agent Setup/i],
    [RemindersAgentPage, /Free 7-Day Reminders Agent Setup/i],
  ])('renders the public setup offer with only essential intake fields', (Page, heading) => {
    renderSpecificPage(Page);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your mobile phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business phone/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/current phone system/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/google review link/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/reminder type/i)).not.toBeInTheDocument();
    expect(screen.getByText(/recipients can opt out with STOP/i)).toBeInTheDocument();
  });

  it('shows the setup endpoint error when a request cannot be created', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Could not create setup request.' }),
    } as Response);

    renderPage();

    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'Blue Star HVAC' } });
    fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: 'Jordan Lee' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'jordan@example.com' } });
    fireEvent.change(screen.getByLabelText(/your mobile phone/i), { target: { value: '+15551234567' } });
    fireEvent.change(screen.getByLabelText(/business phone/i), { target: { value: '+15557654321' } });
    fireEvent.click(screen.getByLabelText(/recipients can opt out with STOP/i));
    fireEvent.click(screen.getByRole('button', { name: /create my free setup/i }));

    expect(await screen.findByText(/Could not create setup request/i)).toBeInTheDocument();
  });

  it('keeps the page direct above the fold and moves explanations into clean AEO sections', () => {
    renderPage();

    expect(screen.getByText(/What this setup does/i)).toBeInTheDocument();
    expect(screen.getByText(/How the 7-day setup works/i)).toBeInTheDocument();
    expect(screen.getByText(/Compliance and consent/i)).toBeInTheDocument();
    expect(screen.getByText(/Questions local businesses ask/i)).toBeInTheDocument();
    expect(screen.queryByText(/Ready to install the first test/i)).not.toBeInTheDocument();
  });
});
