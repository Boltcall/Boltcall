// Boltcall Lead Orb — content script. Injects a draggable orb (Shadow DOM,
// isolated from host-page CSS) into every page. Pulses + shows a bubble on a
// new mock lead, opens a compact lead list on click. All data is mock —
// generated and stored by background.js in chrome.storage.local; this file
// only renders it and asks the background to mutate it (markHandled, etc).
'use strict';

if (!document.getElementById('boltcall-lead-orb-host')) {
  const { STORAGE_KEYS } = Boltcall;

  const COLLAPSED = 60; // orb diameter, px — matches the AIOS desktop orb
  const MAX_VISIBLE_BUBBLES = 3;
  const BUBBLE_LIFETIME_MS = 8000;
  const DRAG_THRESHOLD_PX = 4;
  const EDGE_MARGIN = 16;
  const BLUE = '#2563EB';
  const BLUE_DARK = '#1E40AF';
  const EYE = '#FAFAFA';

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .root {
      position: fixed;
      z-index: 2147483647;
      right: var(--orb-right, 24px);
      bottom: var(--orb-bottom, 24px);
      pointer-events: none;
    }
    .trigger {
      pointer-events: auto;
      position: relative;
      width: ${COLLAPSED}px;
      height: ${COLLAPSED}px;
      border-radius: 999px;
      border: none;
      padding: 0;
      cursor: grab;
      background: radial-gradient(circle at 32% 28%, #3B82F6 0%, ${BLUE} 55%, ${BLUE_DARK} 100%);
      box-shadow: 0 8px 24px rgb(0 0 0 / .3);
      transition: transform 150ms cubic-bezier(.16,1,.3,1), box-shadow 150ms cubic-bezier(.16,1,.3,1);
    }
    .trigger:hover { transform: scale(1.04); }
    .trigger:active { cursor: grabbing; }
    .trigger:focus-visible { outline: 2px solid #93C5FD; outline-offset: 3px; }
    .trigger, .bubble-main, .bubble-close, .panel-close, .lead-btn { touch-action: manipulation; }
    .trigger.dragging { transition: none; }
    .trigger.pulsing { animation: boltcall-pulse 1.1s cubic-bezier(.16,1,.3,1) 2; }
    @keyframes boltcall-pulse {
      0%, 100% { box-shadow: 0 8px 24px rgb(0 0 0 / .3), 0 0 0 0 rgb(37 99 235 / .55); }
      50% { box-shadow: 0 8px 24px rgb(0 0 0 / .3), 0 0 0 14px rgb(37 99 235 / 0); }
    }
    .eyes {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      pointer-events: none;
    }
    .eye {
      width: 8px;
      height: 16px;
      border-radius: 999px;
      background: ${EYE};
      transition: height 90ms ease;
    }
    .eyes.blink .eye { height: 2px; }
    .badge {
      pointer-events: none;
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: #DC2626;
      color: #fff;
      font: 700 10px/1 -apple-system, sans-serif;
      box-shadow: 0 0 0 2px rgb(0 0 0 / .25);
    }
    .badge[hidden] { display: none; }
    .bubbles {
      pointer-events: none;
      position: absolute;
      right: 0;
      bottom: ${COLLAPSED + 12}px;
      width: 280px;
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
    }
    .bubble {
      pointer-events: auto;
      display: flex;
      align-items: stretch;
      gap: 2px;
      border-radius: 12px;
      background: #fff;
      border: 1px solid #E5E7EB;
      box-shadow: 0 10px 28px rgb(0 0 0 / .22);
      animation: boltcall-bubble-in 220ms cubic-bezier(.16,1,.3,1);
    }
    @keyframes boltcall-bubble-in {
      from { opacity: 0; transform: translateY(8px) scale(.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .bubble-main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
      text-align: left;
      background: none;
      border: none;
      padding: 10px 6px 10px 12px;
      cursor: pointer;
    }
    .bubble-name { font: 600 13px/1.2 inherit; color: #0B1220; }
    .bubble-meta { font: 500 11px/1.3 inherit; color: #475569; }
    .bubble-timer { font: 600 11px/1.3 inherit; color: ${BLUE}; }
    .bubble-close {
      flex: none;
      width: 24px;
      height: 24px;
      margin: 6px 6px 0 0;
      border: none;
      background: none;
      border-radius: 999px;
      font-size: 15px;
      line-height: 1;
      color: #9CA3AF;
      cursor: pointer;
    }
    .bubble-close:hover { background: #F3F4F6; }
    .bubble-close:focus-visible { outline: 2px solid ${BLUE}; outline-offset: 1px; }

    .panel {
      pointer-events: auto;
      position: absolute;
      right: 0;
      bottom: ${COLLAPSED + 12}px;
      width: 340px;
      max-height: 480px;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      background: #fff;
      border: 1px solid #E5E7EB;
      box-shadow: 0 16px 40px rgb(0 0 0 / .3);
      overflow: hidden;
      opacity: 0;
      transform: translateY(10px) scale(.98);
      transition: opacity 180ms cubic-bezier(.16,1,.3,1), transform 180ms cubic-bezier(.16,1,.3,1);
    }
    .panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .panel:not(.open) { pointer-events: none; }
    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 8px 12px 16px;
      border-bottom: 1px solid #E5E7EB;
      flex: none;
    }
    .panel-title { flex: 1; font: 600 14px/1.2 inherit; color: #0B1220; }
    .panel-sub { font: 500 11px/1.2 inherit; color: #475569; }
    .panel-close {
      width: 28px; height: 28px; border-radius: 999px; border: none; background: none;
      font-size: 18px; line-height: 1; color: #475569; cursor: pointer; flex: none;
    }
    .panel-close:hover { background: #F3F4F6; }
    .panel-close:focus-visible { outline: 2px solid ${BLUE}; outline-offset: 1px; }
    .panel-body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
    .panel-empty { padding: 32px 16px; text-align: center; font: 500 12px/1.5 inherit; color: #475569; }

    .lead-card { border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .lead-card.handled { background: #F9FAFB; }
    .lead-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .lead-name { font: 600 13px/1.3 inherit; color: #0B1220; }
    .lead-area { font: 500 11px/1.3 inherit; color: #475569; }
    .lead-tag {
      flex: none;
      font: 700 10px/1 inherit;
      text-transform: uppercase;
      letter-spacing: .04em;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid transparent;
    }
    .lead-tag.urgent { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
    .lead-tag.standard { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
    .lead-summary { font: 400 12px/1.5 inherit; color: #1F2937; }
    .lead-meta-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .lead-source { font: 500 11px/1.3 inherit; color: #9CA3AF; }
    .lead-timer { font: 600 11px/1.3 inherit; color: ${BLUE}; }
    .lead-timer.done { color: #16A34A; }
    .lead-actions { display: flex; gap: 6px; margin-top: 2px; }
    .lead-btn {
      flex: 1;
      text-align: center;
      text-decoration: none;
      border: 1px solid #E5E7EB;
      border-radius: 999px;
      padding: 6px 10px;
      font: 600 11px/1.3 inherit;
      color: #0B1220;
      background: #fff;
      cursor: pointer;
    }
    .lead-btn:hover { background: #F3F4F6; }
    .lead-btn:focus-visible { outline: 2px solid ${BLUE}; outline-offset: 1px; }
    .lead-btn.primary { background: ${BLUE}; border-color: ${BLUE}; color: #fff; }
    .lead-btn.primary:hover { background: ${BLUE_DARK}; }

    @media (prefers-reduced-motion: reduce) {
      .trigger, .bubble, .panel, .eye { animation: none !important; transition: none !important; }
    }
  `;

  // ---- Host + Shadow DOM ------------------------------------------------
  const host = document.createElement('div');
  host.id = 'boltcall-lead-orb-host';
  const shadow = host.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  shadow.appendChild(styleEl);

  const root = document.createElement('div');
  root.className = 'root';
  root.innerHTML = `
    <div class="panel" id="panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">Boltcall Leads</div>
          <div class="panel-sub" id="panel-sub"></div>
        </div>
        <button type="button" class="panel-close" id="panel-close" aria-label="Close leads">&times;</button>
      </div>
      <div class="panel-body" id="panel-body"></div>
    </div>
    <div class="bubbles" id="bubbles" role="status" aria-live="polite"></div>
    <button type="button" class="trigger" id="trigger" aria-haspopup="true" aria-expanded="false" aria-label="Open Boltcall leads">
      <span class="eyes" id="eyes" aria-hidden="true"><span class="eye"></span><span class="eye"></span></span>
      <span class="badge" id="badge" hidden></span>
    </button>
  `;
  shadow.appendChild(root);

  // run_at: document_idle (manifest.json) guarantees document.body exists.
  document.body.appendChild(host);

  const el = {
    trigger: shadow.getElementById('trigger'),
    eyes: shadow.getElementById('eyes'),
    badge: shadow.getElementById('badge'),
    bubbles: shadow.getElementById('bubbles'),
    panel: shadow.getElementById('panel'),
    panelSub: shadow.getElementById('panel-sub'),
    panelBody: shadow.getElementById('panel-body'),
    panelClose: shadow.getElementById('panel-close'),
  };

  // ---- Position + drag ---------------------------------------------------
  function clamp(right, bottom) {
    const maxRight = Math.max(EDGE_MARGIN, window.innerWidth - COLLAPSED - EDGE_MARGIN);
    const maxBottom = Math.max(EDGE_MARGIN, window.innerHeight - COLLAPSED - EDGE_MARGIN);
    return {
      right: Math.min(Math.max(right, EDGE_MARGIN), maxRight),
      bottom: Math.min(Math.max(bottom, EDGE_MARGIN), maxBottom),
    };
  }

  function applyPosition(pos) {
    root.style.setProperty('--orb-right', `${pos.right}px`);
    root.style.setProperty('--orb-bottom', `${pos.bottom}px`);
  }

  let position = { right: 24, bottom: 24 };
  chrome.storage.local.get([STORAGE_KEYS.position], (stored) => {
    if (stored[STORAGE_KEYS.position]) {
      position = clamp(stored[STORAGE_KEYS.position].right, stored[STORAGE_KEYS.position].bottom);
      applyPosition(position);
    }
  });

  let dragStart = null;
  let dragged = false;

  el.trigger.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragStart = { x: e.clientX, y: e.clientY, right: position.right, bottom: position.bottom };
    dragged = false;
    el.trigger.setPointerCapture(e.pointerId);
  });

  el.trigger.addEventListener('pointermove', (e) => {
    if (!dragStart || !el.trigger.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (!dragged && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    dragged = true;
    el.trigger.classList.add('dragging');
    position = clamp(dragStart.right - dx, dragStart.bottom - dy);
    applyPosition(position);
  });

  el.trigger.addEventListener('pointerup', (e) => {
    el.trigger.releasePointerCapture(e.pointerId);
    el.trigger.classList.remove('dragging');
    if (dragged) {
      chrome.storage.local.set({ [STORAGE_KEYS.position]: position });
    } else {
      togglePanel();
    }
    dragStart = null;
    dragged = false;
  });

  window.addEventListener('resize', () => {
    position = clamp(position.right, position.bottom);
    applyPosition(position);
  });

  // ---- Eye tracking + blink ----------------------------------------------
  // Mousemove fires far more often than the display refreshes (sometimes
  // 1000Hz), so it only records the raw cursor position here — no layout
  // read on every event. getBoundingClientRect() runs at most once per
  // animation frame, inside the already rAF-gated tick loop below.
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  document.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tickEyes() {
    const r = el.trigger.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    targetX = Math.min(1, Math.max(-1, (mouseX - cx) / 120));
    targetY = Math.min(1, Math.max(-1, (mouseY - cy) / 120));
    curX += (targetX - curX) * 0.16;
    curY += (targetY - curY) * 0.16;
    el.eyes.style.transform = `translate(${curX * 4}px, ${curY * 4}px)`;
    requestAnimationFrame(tickEyes);
  }
  if (!reduceMotion) requestAnimationFrame(tickEyes);

  if (!reduceMotion) {
    (function scheduleBlink() {
      setTimeout(() => {
        el.eyes.classList.add('blink');
        setTimeout(() => el.eyes.classList.remove('blink'), 120);
        scheduleBlink();
      }, 2200 + Math.random() * 3600);
    })();
  }

  // ---- Panel toggle --------------------------------------------------------
  let panelOpen = false;
  function setPanelOpen(open) {
    panelOpen = open;
    el.panel.classList.toggle('open', panelOpen);
    el.trigger.setAttribute('aria-expanded', String(panelOpen));
    el.trigger.setAttribute('aria-label', panelOpen ? 'Close Boltcall leads' : 'Open Boltcall leads');
  }
  function togglePanel() {
    setPanelOpen(!panelOpen);
    if (panelOpen) { clearBubbles(); renderPanel(currentLeads); }
  }
  el.panelClose.addEventListener('click', () => setPanelOpen(false));
  document.addEventListener('click', (e) => {
    if (!panelOpen) return;
    if (!host.contains(e.target) && e.composedPath?.().indexOf(host) === -1) setPanelOpen(false);
  });

  // ---- Bubbles --------------------------------------------------------------
  let visibleBubbles = []; // [{lead, timeoutId}]

  function clearBubbles() {
    visibleBubbles.forEach((b) => clearTimeout(b.timeoutId));
    visibleBubbles = [];
    el.bubbles.innerHTML = '';
  }

  function dismissBubble(id) {
    const idx = visibleBubbles.findIndex((b) => b.lead.id === id);
    if (idx === -1) return;
    clearTimeout(visibleBubbles[idx].timeoutId);
    visibleBubbles.splice(idx, 1);
    const node = el.bubbles.querySelector(`[data-bubble-id="${id}"]`);
    node?.remove();
  }

  function pushBubble(lead) {
    if (visibleBubbles.length >= MAX_VISIBLE_BUBBLES) {
      dismissBubble(visibleBubbles[0].lead.id);
    }
    const node = document.createElement('div');
    node.className = 'bubble';
    node.dataset.bubbleId = lead.id;
    node.innerHTML = `
      <button type="button" class="bubble-main">
        <span class="bubble-name">${escapeHtml(lead.name)}</span>
        <span class="bubble-meta">${escapeHtml(lead.practiceArea)} &middot; ${escapeHtml(lead.source)}</span>
        <span class="bubble-timer" data-timer="${lead.id}">waiting 0:00</span>
      </button>
      <button type="button" class="bubble-close" aria-label="Dismiss">&times;</button>
    `;
    node.querySelector('.bubble-main').addEventListener('click', () => {
      dismissBubble(lead.id);
      setPanelOpen(true);
      renderPanel(currentLeads);
    });
    node.querySelector('.bubble-close').addEventListener('click', () => dismissBubble(lead.id));
    el.bubbles.appendChild(node);
    const timeoutId = setTimeout(() => dismissBubble(lead.id), BUBBLE_LIFETIME_MS);
    visibleBubbles.push({ lead, timeoutId });
  }

  function pulseOrb() {
    el.trigger.classList.remove('pulsing');
    // restart the animation
    void el.trigger.offsetWidth;
    el.trigger.classList.add('pulsing');
  }

  // ---- Panel render -----------------------------------------------------
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function telHref(phone) { return `tel:${phone.replace(/[^\d+]/g, '')}`; }
  function smsHref(phone) { return `sms:${phone.replace(/[^\d+]/g, '')}`; }

  function renderPanel(leads) {
    const waiting = leads.filter((l) => l.status === 'waiting').length;
    el.panelSub.textContent = leads.length === 0 ? 'No leads yet' : `${waiting} waiting · ${leads.length} total`;
    if (leads.length === 0) {
      el.panelBody.innerHTML = `<div class="panel-empty">No leads yet. Use “Simulate Lead” in the extension popup to see how it works.</div>`;
      return;
    }
    el.panelBody.innerHTML = leads.map((lead) => {
      const handled = lead.status === 'handled';
      const timerLabel = handled
        ? `Answered in ${Boltcall.formatDuration(new Date(lead.handledAt) - new Date(lead.createdAt))}`
        : `Waiting ${Boltcall.formatDuration(Date.now() - new Date(lead.createdAt))}`;
      return `
        <div class="lead-card ${handled ? 'handled' : ''}" data-lead-id="${lead.id}">
          <div class="lead-top">
            <div>
              <div class="lead-name">${escapeHtml(lead.name)}</div>
              <div class="lead-area">${escapeHtml(lead.practiceArea)}</div>
            </div>
            <span class="lead-tag ${lead.urgency}">${lead.urgency === 'urgent' ? 'Urgent' : 'Standard'}</span>
          </div>
          <div class="lead-summary">${escapeHtml(lead.summary)}</div>
          <div class="lead-meta-row">
            <span class="lead-source">${escapeHtml(lead.source)} &middot; ${escapeHtml(lead.phone)}</span>
            <span class="lead-timer ${handled ? 'done' : ''}" ${handled ? '' : `data-timer="${lead.id}" data-created="${lead.createdAt}"`}>${timerLabel}</span>
          </div>
          <div class="lead-actions">
            <a class="lead-btn" href="${telHref(lead.phone)}">Call</a>
            <a class="lead-btn" href="${smsHref(lead.phone)}">Text</a>
            ${handled ? '' : `<button type="button" class="lead-btn primary" data-handle="${lead.id}">Mark Handled</button>`}
          </div>
        </div>
      `;
    }).join('');

    el.panelBody.querySelectorAll('[data-handle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'markHandled', id: btn.dataset.handle });
      });
    });
  }

  // ---- Live timers (bubbles + open panel), ticked once per second --------
  setInterval(() => {
    shadow.querySelectorAll('[data-timer]').forEach((elm) => {
      const id = elm.dataset.timer;
      const lead = currentLeads.find((l) => l.id === id);
      if (!lead || lead.status !== 'waiting') return;
      const label = `${elm.classList.contains('bubble-timer') ? 'waiting ' : 'Waiting '}${Boltcall.formatDuration(Date.now() - new Date(lead.createdAt))}`;
      elm.textContent = label;
    });
  }, 1000);

  // ---- State sync via chrome.storage.onChanged ----------------------------
  let currentLeads = [];
  let knownIds = new Set();

  chrome.storage.local.get([STORAGE_KEYS.leads], (stored) => {
    currentLeads = stored[STORAGE_KEYS.leads] || [];
    knownIds = new Set(currentLeads.map((l) => l.id));
    updateBadge();
    if (panelOpen) renderPanel(currentLeads);
  });

  function updateBadge() {
    const waiting = currentLeads.filter((l) => l.status === 'waiting').length;
    el.badge.hidden = waiting === 0;
    el.badge.textContent = waiting > 9 ? '9+' : String(waiting);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEYS.leads]) return;
    const nextLeads = changes[STORAGE_KEYS.leads].newValue || [];
    const nextIds = new Set(nextLeads.map((l) => l.id));
    const freshLeads = nextLeads.filter((l) => !knownIds.has(l.id));

    currentLeads = nextLeads;
    knownIds = nextIds;
    updateBadge();
    if (panelOpen) renderPanel(currentLeads);

    freshLeads.forEach((lead) => {
      pulseOrb();
      pushBubble(lead);
    });
  });
}
