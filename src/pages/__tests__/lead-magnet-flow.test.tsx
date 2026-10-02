import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import LeadMagnetPage from '../LeadMagnetPage';

vi.mock('@/components/ui/halide-landing', () => ({ HalideLanding: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function setup() {
  render(<MemoryRouter><Routes>
    <Route path="/" element={<LeadMagnetPage source="intake-agent-playbook" />} />
    <Route path="/lead-magnet/thank-you" element={<p>Resource ready</p>} />
  </Routes></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'reader@example.com' } });
}
it('keeps the form available and reports rejected delivery instead of confirming success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
  setup();
  fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form')!);
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(screen.queryByText('Resource ready')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
});
it('rejects empty email before making a delivery request', () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  setup();
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: '' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form')!);
  expect(fetch).not.toHaveBeenCalled();
});
it('confirms an accepted request', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  setup();
  fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form')!);
  await screen.findByText('Resource ready');
});
it('allows retry after a network failure', async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true });
  vi.stubGlobal('fetch', fetch); setup();
  fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form')!);
  await screen.findByRole('alert');
  fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form')!);
  await screen.findByText('Resource ready');
});
