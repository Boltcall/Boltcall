// Runbook generator prompt — the "amnesia handbook" doctrine (Allie K Miller
// video 2026-08-13): the SOP file you'd hand to a new hire if you woke up
// with amnesia is the highest-leverage AI artifact. Iterate this prompt in
// this single file — text-only, no code changes required.

export interface RunbookInputs {
  businessName: string;
  industry: string | null;
  services: string[] | null;
  hours: string | null;
  serviceAreas: string[] | null;
  languages: string[] | null;
  retellSystemPrompt: string | null;   // canonical agent prompt if wired
  recentCallSummaries: string[];       // up to 20 abbreviated transcripts
  recentLeadSummaries: string[];       // up to 20 abbreviated lead intake logs
}

export function buildRunbookSystemPrompt(): string {
  return `You are producing a customer-facing operations runbook — the "amnesia handbook."
Read the business context, sample calls, and sample leads. Produce ONE Markdown document that
a brand-new virtual receptionist (or the founder's future self after a memory wipe) could pick up
and run the business with. NO fluff, NO marketing tone, NO invented facts. If a detail is not in
the provided context, write "not yet configured" — never guess.

Structure (H2 headers, in this exact order):

## Who we are
1-2 lines. Business name, industry, service areas, languages.

## Hours & availability
When we answer. When we don't. What happens after-hours.

## Services we offer
Bullet list. Include price/quote-only distinction if visible in the data.

## The 5 most common inbound situations
Pulled DIRECTLY from the sample calls + leads. For each: what they ask, exactly how to respond, when to escalate.

## Booking policy
How the receptionist should schedule appointments. What info to capture. What to skip.

## Escalation triggers
Situations that MUST go to a human immediately, not the AI.

## What we NEVER do
Boundaries. Things the AI receptionist should refuse, redirect, or flag.

## Open questions
List of gaps in the provided context — things the founder should fill in before this handbook goes live.

Rules:
- Plain Markdown, no HTML.
- No preamble ("Here is your runbook...") — start with # <Business Name> Runbook.
- Length: 400-1200 words. Longer = padding. Shorter = missing something.
- If provided context is thin (< 5 calls, < 5 leads), populate "Open questions" heavily rather than fabricate.`;
}

function fmtList(list: string[] | null): string {
  if (!list || list.length === 0) return '(not provided)';
  return list.join(', ');
}

export function buildRunbookUserPrompt(inputs: RunbookInputs): string {
  const parts: string[] = [];
  parts.push(`## Business context`);
  parts.push(`- Name: ${inputs.businessName}`);
  parts.push(`- Industry: ${inputs.industry || '(unknown)'}`);
  parts.push(`- Services: ${fmtList(inputs.services)}`);
  parts.push(`- Hours: ${inputs.hours || '(unknown)'}`);
  parts.push(`- Service areas: ${fmtList(inputs.serviceAreas)}`);
  parts.push(`- Languages: ${fmtList(inputs.languages)}`);

  if (inputs.retellSystemPrompt) {
    parts.push('');
    parts.push(`## Current Retell agent system prompt`);
    parts.push(inputs.retellSystemPrompt.slice(0, 3000));
  }

  parts.push('');
  parts.push(`## Sample calls (last ${inputs.recentCallSummaries.length})`);
  if (inputs.recentCallSummaries.length === 0) parts.push('(no calls yet)');
  else parts.push(inputs.recentCallSummaries.map((s, i) => `${i + 1}. ${s.slice(0, 500)}`).join('\n'));

  parts.push('');
  parts.push(`## Sample leads (last ${inputs.recentLeadSummaries.length})`);
  if (inputs.recentLeadSummaries.length === 0) parts.push('(no leads yet)');
  else parts.push(inputs.recentLeadSummaries.map((s, i) => `${i + 1}. ${s.slice(0, 300)}`).join('\n'));

  parts.push('');
  parts.push('Produce the runbook now, per the system prompt structure.');
  return parts.join('\n');
}
