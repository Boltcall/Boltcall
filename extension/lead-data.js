// Shared mock-data + formatting helpers. Loaded into both the content script
// and the background service worker (via importScripts) so lead generation
// logic lives in exactly one place. No network calls, no real data — v1 is
// demo-only per spec.
'use strict';

const BOLTCALL_STORAGE_KEYS = {
  leads: 'boltcallLeads',
  autoDemo: 'boltcallAutoDemo',
  position: 'boltcallOrbPosition',
};

const BOLTCALL_MAX_LEADS = 40; // ponytail: cap storage growth, add pagination if a firm ever needs history past this

const FIRST_NAMES = [
  'James', 'Maria', 'Robert', 'Linda', 'Michael', 'Patricia', 'David', 'Jennifer',
  'Carlos', 'Ashley', 'Kevin', 'Nicole', 'Brian', 'Stephanie', 'Marcus', 'Rachel',
  'Anthony', 'Danielle', 'Tyler', 'Samantha', 'Jose', 'Amanda', 'Derek', 'Christina',
];
const LAST_NAMES = [
  'Johnson', 'Garcia', 'Williams', 'Brown', 'Rodriguez', 'Martinez', 'Davis', 'Lopez',
  'Wilson', 'Anderson', 'Thomas', 'Moore', 'Jackson', 'White', 'Harris', 'Clark',
  'Lewis', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres',
];

const SOURCES = ['Web form', 'Missed call', 'SMS'];

// Each practice area: label, a pool of case summaries (already written in the
// "AI-style" one-line intake summary voice the spec asks for), and an
// urgency weight list (more 'urgent' entries = more likely to roll urgent).
const PRACTICE_AREAS = [
  {
    label: 'Personal Injury',
    summaries: [
      'Rear-ended on I-95 yesterday, neck pain, other driver insured, wants consult this week.',
      'T-boned at an intersection this morning, airbags deployed, ambulance called, has the police report number.',
      'Hit by a delivery van in a parking lot, shoulder injury, witness on scene, wants to know next steps.',
      'Passenger in a highway pileup, whiplash symptoms starting, other driver cited at fault.',
    ],
    urgencyWeights: ['urgent', 'urgent', 'standard'],
  },
  {
    label: 'Slip and Fall',
    summaries: [
      'Slipped on a wet floor at a grocery store Tuesday, twisted ankle, has photos, hasn’t seen a doctor yet.',
      'Fell on an icy sidewalk outside an apartment building, hip pain, no warning sign was posted.',
      'Tripped on a broken stair at a rental unit last week, sprained wrist, landlord knew about the hazard.',
    ],
    urgencyWeights: ['standard', 'standard', 'urgent'],
  },
  {
    label: 'Criminal / DUI',
    summaries: [
      'Pulled over Friday night, first-time DUI charge, arraignment Monday, needs representation fast.',
      'Arrested after a bar fight over the weekend, released on bail, court date in 10 days.',
      'Facing a possession charge from a traffic stop, first offense, wants to understand the options.',
    ],
    urgencyWeights: ['urgent', 'urgent', 'urgent'],
  },
  {
    label: 'Family / Divorce',
    summaries: [
      'Filing for divorce, two kids involved, spouse already has a lawyer, wants custody guidance.',
      'Needs an emergency custody modification, co-parent missed three scheduled visits this month.',
      'Married eight years, no kids, mostly amicable, wants a fast uncontested filing.',
    ],
    urgencyWeights: ['standard', 'urgent', 'standard'],
  },
  {
    label: 'Estate Planning',
    summaries: [
      'Just had a baby, no will yet, wants a trust set up before year end.',
      'Recently widowed, needs to update a will and figure out probate on a small estate.',
      'Wants power of attorney documents in place before an upcoming surgery.',
    ],
    urgencyWeights: ['standard', 'standard', 'urgent'],
  },
  {
    label: 'Immigration',
    summaries: [
      'Green card renewal, been in process 8 months, employer visa about to expire, needs urgent help.',
      'Asylum interview scheduled in three weeks, wants representation before then.',
      'Filing a family-based petition for a spouse, first time going through the process.',
    ],
    urgencyWeights: ['urgent', 'standard', 'standard'],
  },
];

function boltcallRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function boltcallPick(arr) {
  return arr[boltcallRandomInt(0, arr.length - 1)];
}

function boltcallGeneratePhone() {
  const exchange = boltcallRandomInt(200, 899);
  const line = boltcallRandomInt(1000, 9999);
  return `(555) ${exchange}-${line}`;
}

function boltcallGenerateLead() {
  const area = boltcallPick(PRACTICE_AREAS);
  const now = new Date().toISOString();
  return {
    id: `lead-${Date.now()}-${boltcallRandomInt(1000, 9999)}`,
    name: `${boltcallPick(FIRST_NAMES)} ${boltcallPick(LAST_NAMES)}`,
    phone: boltcallGeneratePhone(),
    practiceArea: area.label,
    source: boltcallPick(SOURCES),
    summary: boltcallPick(area.summaries),
    urgency: boltcallPick(area.urgencyWeights),
    createdAt: now,
    status: 'waiting',
    handledAt: null,
  };
}

/** mm:ss under an hour, h:mm:ss past it — intake waits are rarely past an hour but don't wrap badly if one is. */
function boltcallFormatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

if (typeof self !== 'undefined') {
  self.Boltcall = {
    STORAGE_KEYS: BOLTCALL_STORAGE_KEYS,
    MAX_LEADS: BOLTCALL_MAX_LEADS,
    generateLead: boltcallGenerateLead,
    formatDuration: boltcallFormatDuration,
  };
}
