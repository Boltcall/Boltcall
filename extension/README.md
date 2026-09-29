# Boltcall Lead Orb (Chrome extension, v1)

A speed-to-lead alert widget for law firm intake staff. Installs a small draggable
Boltcall-blue orb in the corner of every page; it pulses and shows a bubble when a
new lead comes in, with a live "waiting" timer. Click it to open the lead list,
call or text a lead, and mark it handled.

## This is a demo, not a live product

**Everything is mock data.** There is no Supabase, no backend, no auth, and no
network calls anywhere in this extension. Leads are fake law-firm intake
scenarios (PI, criminal/DUI, family/divorce, estate planning, immigration)
generated locally in `lead-data.js`, with fake `(555)` phone numbers. Nothing
is sent anywhere, ever. Storage is `chrome.storage.local` only.

## Load it unpacked

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. The orb appears bottom-right on every open tab. Click the toolbar icon for
   the popup (Simulate lead, auto-demo toggle, today's stats).

## What's real vs mock

| Piece | Real | Mock |
|---|---|---|
| Orb UI, drag, position memory | Real | – |
| Lead list, urgency tags, Call/Text links | Real UI | Fake phone numbers |
| "Waiting" / "answered in" timers | Real elapsed-time math | Off fake `createdAt` |
| New-lead alerts (pulse, bubble, desktop notification) | Real | Fired by a mock generator, not a real inbox |
| Cross-tab sync | Real (`chrome.storage.onChanged`) | – |
| Auto-demo cadence | Real `chrome.alarms`, ~every 3 min | Lead content itself is fake |

## Files

- `manifest.json` — MV3 manifest. Permissions: `storage`, `alarms`,
  `notifications`, plus a content script on `<all_urls>`. No `host_permissions`
  beyond that, no external URLs.
- `lead-data.js` — shared mock lead generator + duration formatter, loaded into
  both the content script and the background worker.
- `background.js` — service worker. Owns all writes to `chrome.storage.local`,
  the `chrome.alarms` auto-demo timer, and `chrome.notifications`.
- `content.js` — injects the orb into a Shadow DOM root on every page (so host
  page CSS can never leak in or clash), renders bubbles + the lead panel, and
  handles drag/position.
- `popup.html/.css/.js` — toolbar popup: Simulate lead, auto-demo toggle,
  today's lead count + average response time.
- `icons/` — 16/48/128 px orb icons (generated as flat PNGs, Boltcall blue
  `#2563EB` body, off-white eyes).

## Known v1 limits

- Single-origin: leads live in the browser profile's local storage, not per
  site — every tab across every site shows the same lead list. That's correct
  for "one intake inbox", not per-site.
- No options page. Auto-demo cadence (~3 min) is fixed in `background.js`.
