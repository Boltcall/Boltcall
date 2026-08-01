// Milestone events (P24 habit loop, P9 peaks). Pure — callers supply counts.
export type Milestone = {
  id: string;
  title: string;
  detail: string;
};

export function resolveMilestones(counts: { bookingCount: number; callCount: number }): Milestone[] {
  const events: Milestone[] = [];
  if (counts.bookingCount >= 1) {
    events.push({ id: 'first_booking', title: 'First booking!', detail: 'Your AI booked its first job. This is what it was built for.' });
  }
  if (counts.bookingCount >= 10) {
    events.push({ id: 'tenth_booking', title: '10 bookings', detail: '10 jobs booked without you lifting a finger.' });
  }
  if (counts.callCount >= 100) {
    events.push({ id: 'hundredth_call', title: '100 calls answered', detail: '100 conversations handled. No lead left waiting.' });
  }
  return events;
}

const SEEN_KEY = 'boltcall.milestones.seen';

export function unseenMilestones(all: Milestone[]): Milestone[] {
  try {
    const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'));
    return all.filter((m) => !seen.has(m.id));
  } catch {
    return all;
  }
}

export function markMilestoneSeen(id: string): void {
  try {
    const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'));
    seen.add(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch { /* best-effort */ }
}
