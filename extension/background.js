// Service worker: owns every write to chrome.storage.local (single source of
// truth for lead data) plus the alarms + desktop notifications. Content
// scripts and the popup only send messages here for actions, and read state
// via chrome.storage.local / chrome.storage.onChanged — see content.js.
'use strict';

importScripts('lead-data.js');

const ALARM_NAME = 'boltcall-auto-lead';
const ALARM_PERIOD_MINUTES = 3; // "roughly every few minutes" per spec

async function getState() {
  const stored = await chrome.storage.local.get([
    Boltcall.STORAGE_KEYS.leads,
    Boltcall.STORAGE_KEYS.autoDemo,
  ]);
  return {
    leads: stored[Boltcall.STORAGE_KEYS.leads] || [],
    autoDemo: stored[Boltcall.STORAGE_KEYS.autoDemo] !== false, // default on
  };
}

async function addLead() {
  const { leads } = await getState();
  const lead = Boltcall.generateLead();
  const next = [lead, ...leads].slice(0, Boltcall.MAX_LEADS);
  await chrome.storage.local.set({ [Boltcall.STORAGE_KEYS.leads]: next });

  chrome.notifications.create(lead.id, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `New lead: ${lead.name}`,
    message: `${lead.practiceArea} · ${lead.source}\n${lead.summary}`,
    priority: 2,
  });

  return lead;
}

async function markHandled(id) {
  const { leads } = await getState();
  const next = leads.map((lead) =>
    lead.id === id && lead.status === 'waiting'
      ? { ...lead, status: 'handled', handledAt: new Date().toISOString() }
      : lead
  );
  await chrome.storage.local.set({ [Boltcall.STORAGE_KEYS.leads]: next });
}

async function setAutoDemo(enabled) {
  await chrome.storage.local.set({ [Boltcall.STORAGE_KEYS.autoDemo]: enabled });
  if (enabled) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
  } else {
    chrome.alarms.clear(ALARM_NAME);
  }
}

async function initAlarm() {
  const { autoDemo } = await getState();
  if (autoDemo) chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([Boltcall.STORAGE_KEYS.leads], (stored) => {
    if (!stored[Boltcall.STORAGE_KEYS.leads]) {
      chrome.storage.local.set({ [Boltcall.STORAGE_KEYS.leads]: [] });
    }
  });
  initAlarm();
});

chrome.runtime.onStartup.addListener(initAlarm);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) addLead();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'simulateLead') {
    addLead().then(() => sendResponse({ ok: true }));
    return true; // keep the message channel open for the async response
  }
  if (message?.type === 'markHandled') {
    markHandled(message.id).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === 'setAutoDemo') {
    setAutoDemo(!!message.value).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});
