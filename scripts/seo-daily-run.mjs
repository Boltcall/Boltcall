#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function loadLocalEnv() {
  for (const path of [resolve('.env.local'), resolve('..', '.env.local')]) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index <= 0) continue;
      const key = trimmed.slice(0, index);
      const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

loadLocalEnv();

const baseUrl = process.env.URL || process.env.SITE_URL || 'https://boltcall.org';
const response = await fetch(`${baseUrl}/.netlify/functions/daily-seo-aeo-runner`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(process.env.CRON_SECRET ? { 'x-cron-secret': process.env.CRON_SECRET } : {}),
  },
  body: JSON.stringify({ date: process.env.DAILY_SEO_DATE || undefined }),
});

const text = await response.text();
console.log(text);
if (!response.ok) process.exit(1);
