import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const DOCS_BASE = 'https://boltcall.mintlify.app';

export const DEFAULT_SUPPORT_TOPICS = [
  { id: 'phone_routing', cues: ['phone', 'number', 'call routing', 'forwarding'] },
  { id: 'agent_setup', cues: ['agent', 'voice', 'speech'] },
  { id: 'call_troubleshooting', cues: ['call failing', 'failed call', 'troubleshoot'] },
  { id: 'billing_paypal', cues: ['billing', 'paypal', 'payment', 'subscription'] },
  { id: 'data_export', cues: ['export', 'csv', 'download'] },
  { id: 'team_roles', cues: ['invite', 'team', 'role'] },
  { id: 'integrations_overview', cues: ['integration', 'zapier'] },
  { id: 'crm_integrations', cues: ['crm', 'hubspot', 'salesforce', 'pipedrive'] },
  { id: 'lead_webhooks', cues: ['webhook', 'google lead', 'facebook lead', 'meta lead'] },
  { id: 'knowledge_base', cues: ['knowledge', 'kb', 'faq'] },
  { id: 'calendar_booking', cues: ['booking', 'calendar', 'appointment'] },
  { id: 'sms_whatsapp', cues: ['sms', 'whatsapp', 'follow up'] },
  { id: 'onboarding_launch', cues: ['setup', 'onboarding', 'go live', 'launch'] },
  { id: 'speed_to_lead', cues: ['instant reply', 'speed to lead', 'lead response'] },
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractDocsIndexBlock(source) {
  const start = source.indexOf('const DOCS_INDEX');
  if (start === -1) return '';
  const assignment = source.indexOf('=', start);
  if (assignment === -1) return '';
  const arrayStart = source.indexOf('[', assignment);
  if (arrayStart === -1) return '';

  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = arrayStart; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      inString = true;
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(arrayStart, i + 1);
    }
  }

  return '';
}

export function extractDocsIndexEvidence(source) {
  const block = extractDocsIndexBlock(String(source || ''));
  const cues = [];
  const urls = [];

  for (const match of block.matchAll(/cues:\s*\[([\s\S]*?)\]/g)) {
    for (const cueMatch of match[1].matchAll(/['"]([^'"]+)['"]/g)) {
      cues.push(cueMatch[1].toLowerCase());
    }
  }

  for (const match of block.matchAll(/url:\s*`?\$\{DOCS_BASE\}([^`,\s]+)`?/g)) {
    urls.push(`${DOCS_BASE}${match[1]}`);
  }
  for (const match of block.matchAll(/url:\s*['"]((?:https?:)?\/\/[^'"]+)['"]/g)) {
    urls.push(match[1].startsWith('//') ? `https:${match[1]}` : match[1]);
  }

  return {
    cues: unique(cues),
    urls: unique(urls),
  };
}

async function resolveSupportSources(urls, fetchImpl) {
  const results = [];
  const brokenSources = [];

  for (const url of urls) {
    try {
      const response = await fetchImpl(url, { redirect: 'follow' });
      const status = Number(response.status);
      const result = { url, status };
      results.push(result);
      if (status < 200 || status >= 400) brokenSources.push(result);
    } catch (error) {
      const result = {
        url,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
      };
      results.push(result);
      brokenSources.push(result);
    }
  }

  return { sourceResults: results, brokenSources };
}

export async function auditSupportKbCoverage(evidence, opts = {}) {
  const requiredTopics = opts.requiredTopics || DEFAULT_SUPPORT_TOPICS;
  const fetchImpl = opts.fetchImpl || fetch;
  const cues = new Set((evidence.cues || []).map((cue) => String(cue).toLowerCase()));
  const urls = evidence.urls || [];
  const coveredTopics = [];
  const missingTopics = [];

  for (const topic of requiredTopics) {
    const covered = topic.cues.some((cue) => cues.has(String(cue).toLowerCase()));
    if (covered) coveredTopics.push(topic.id);
    else missingTopics.push(topic.id);
  }

  const { sourceResults, brokenSources } = await resolveSupportSources(urls, fetchImpl);

  return {
    status: missingTopics.length === 0 && brokenSources.length === 0 ? 'passed' : 'failed',
    check: 'support_kb_coverage',
    docsIndexed: urls.length,
    cuesIndexed: cues.size,
    coveredTopics,
    missingTopics,
    sourceResults,
    brokenSources,
  };
}

async function main() {
  const sourcePath = new URL('../netlify/functions/saas-v2-help-ask.ts', import.meta.url);
  const source = await fs.readFile(sourcePath, 'utf8');
  const evidence = extractDocsIndexEvidence(source);
  return auditSupportKbCoverage(evidence);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (result.status !== 'passed') process.exitCode = 1;
    })
    .catch((error) => {
      console.error(JSON.stringify({
        status: 'failed',
        check: 'support_kb_coverage',
        error: error instanceof Error ? error.message : String(error),
      }, null, 2));
      process.exitCode = 1;
    });
}
