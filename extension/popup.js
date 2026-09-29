'use strict';

const { STORAGE_KEYS } = Boltcall;

const els = {
  count: document.getElementById('stat-count'),
  avg: document.getElementById('stat-avg'),
  simulate: document.getElementById('simulate'),
  toggle: document.getElementById('auto-toggle'),
};

function isToday(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function render(leads, autoDemo) {
  const todays = leads.filter((l) => isToday(l.createdAt));
  els.count.textContent = String(todays.length);

  const handledToday = todays.filter((l) => l.status === 'handled');
  if (handledToday.length === 0) {
    els.avg.textContent = '–';
  } else {
    const avgMs = handledToday.reduce((sum, l) => sum + (new Date(l.handledAt) - new Date(l.createdAt)), 0) / handledToday.length;
    els.avg.textContent = Boltcall.formatDuration(avgMs);
  }

  els.toggle.checked = autoDemo;
}

function load() {
  chrome.storage.local.get([STORAGE_KEYS.leads, STORAGE_KEYS.autoDemo], (stored) => {
    render(stored[STORAGE_KEYS.leads] || [], stored[STORAGE_KEYS.autoDemo] !== false);
  });
}

load();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') load();
});

els.simulate.addEventListener('click', () => {
  els.simulate.disabled = true;
  chrome.runtime.sendMessage({ type: 'simulateLead' }, () => {
    els.simulate.disabled = false;
  });
});

els.toggle.addEventListener('change', () => {
  chrome.runtime.sendMessage({ type: 'setAutoDemo', value: els.toggle.checked });
});
