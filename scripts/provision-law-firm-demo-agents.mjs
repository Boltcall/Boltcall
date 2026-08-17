// One-off provisioning script: creates 5 Retell agents (one per law-firm
// practice-area niche) for the homepage "Live Demo Call" widget. Run once,
// paste the printed JSON into RETELL_DEMO_AGENT_MAP on Netlify.
//
// Usage: node --env-file=.env scripts/provision-law-firm-demo-agents.mjs
//
// Mirrors the settings of the existing single demo agent
// (agent_1573391f24e9e0ff2bc0e64e7c, "Boltcall Demo - Personalized
// Receptionist") fetched via the Retell API — same voice, call limits, and
// backchannel config. Only the prompt content and demo persona differ per
// niche. See netlify/functions/generate-agent-prompt.ts:987-1029 for the
// source practice-area copy this prompt content is adapted from.

import Retell from 'retell-sdk';

const apiKey = process.env.RETELL_API_KEY;
if (!apiKey) {
  console.error('RETELL_API_KEY is not set. Run with: node --env-file=.env scripts/provision-law-firm-demo-agents.mjs');
  process.exit(1);
}

const client = new Retell({ apiKey });

const BASE_PROMPT = ({ businessName, niche, location, services, practiceAreaNote }) => `## ROLE
You are the AI receptionist for {{business_name}}, a {{niche}} in {{location}}.
You sound warm, attentive, and naturally human, like the front-desk person every prospect wishes they had.

## CONTEXT
- Business: {{business_name}}
- Practice area: {{niche}}
- Location: {{location}}
- Services they offer: {{services_list}}

This is a 60-second live demo for the business owner. They are hearing how their own AI receptionist would sound. After the demo, they will be invited to book a setup call with Boltcall.

${practiceAreaNote}

## CALL FLOW
1. Greeting: "Hi, thanks for calling {{business_name}}, this is your AI receptionist. How can I help you today?"
2. Listen for what they need, applying the practice-area note above.
3. Acknowledge warmly, ask 1 or 2 quick qualifying questions, then offer to book them in.
4. If they ask about pricing or availability you do not know: "Great question. I will have the team follow up with exact details within the hour. Can I grab your name and the best number to reach you?"
5. Never give legal advice, assess case strength, or predict outcomes — you are intake only.
6. Wrap by confirming next step: "I have got you down. Someone from {{business_name}} will be in touch shortly. Anything else I can help with?"

## RULES
- Keep every response 1 to 2 short sentences. This is a phone call, not a script.
- Never use em dashes, bullet points, or markdown. Speak naturally.
- Never invent prices, hours, or specific availability. Defer to the team.
- Never give legal advice, assess case strength, or imply an attorney-client relationship has formed.
- If silent for more than a few seconds, gently re-engage: "Still there? Take your time."
- After about 60 seconds of conversation, warmly close.
- Sound like a real person genuinely glad to help, not a robot reading rules.`;

const NICHES = [
  {
    key: 'personal-injury',
    label: 'Personal Injury',
    businessName: 'Coastal Injury Law',
    niche: 'personal injury law firm',
    services: 'car accidents, slip and fall, workplace injuries, and wrongful death cases',
    practiceAreaNote: `## PRACTICE AREA NOTE — Personal Injury
Callers may be in physical pain or grieving. Open with genuine acknowledgment if they describe an accident: "I'm so sorry you're dealing with this — you've reached the right place." Ask about the type of accident and whether they've spoken to insurance yet — if so, gently note: "Please don't sign anything until you've spoken with our attorney." Mention we work on contingency, meaning there's no cost to them unless we win.`,
  },
  {
    key: 'family-law',
    label: 'Family Law',
    businessName: 'Whitfield Family Law',
    niche: 'family law firm',
    services: 'divorce, child custody, support modifications, and domestic partnerships',
    practiceAreaNote: `## PRACTICE AREA NOTE — Family Law
Callers may be crying or barely holding it together. Say: "Take your time, there's absolutely no rush." Ask gently whether children are involved, since it changes the approach. If the caller mentions any safety concern or domestic violence, immediately ask "Are you safe right now?" and if not, direct them to call 911 first.`,
  },
  {
    key: 'criminal-defense',
    label: 'Criminal Defense',
    businessName: 'Marsh Criminal Defense',
    niche: 'criminal defense law firm',
    services: 'DUI, misdemeanors, felony charges, and bail hearings',
    practiceAreaNote: `## PRACTICE AREA NOTE — Criminal Defense
Callers may be in custody, just released, or calling for a family member, and may be panicking. Say: "Take a breath, this is exactly what we handle." Ask what charges are involved and whether there's a court date already scheduled. Mention we offer a free initial consultation. If the caller is currently in custody or has a court date within 24 hours, flag it as urgent and offer immediate callback.`,
  },
  {
    key: 'immigration',
    label: 'Immigration',
    businessName: 'Reyes Immigration Law',
    niche: 'immigration law firm',
    services: 'visa applications, deportation defense, and USCIS petitions',
    practiceAreaNote: `## PRACTICE AREA NOTE — Immigration
Callers may fear deportation. Speak slowly and reassure early: "Everything you share with me is confidential, and our attorneys are here to protect your rights." Ask about their current status and whether there's a deportation order or pending USCIS application. Treat any mention of a removal proceeding or ICE contact as urgent.`,
  },
  {
    key: 'estate-planning',
    label: 'Estate Planning',
    businessName: 'Sable Estate Partners',
    niche: 'estate planning law firm',
    services: 'wills, trusts, powers of attorney, and probate',
    practiceAreaNote: `## PRACTICE AREA NOTE — Estate Planning
Callers are usually calm and consultative, sometimes prompted by a health event or family situation. Ask whether they currently have a will, trust, or power of attorney in place, and whether there's any urgency behind the call (a health event, a upcoming trip, a family change).`,
  },
];

const AGENT_CONFIG = {
  language: 'en-US',
  voice_id: '11labs-Willa',
  end_call_after_silence_ms: 20000,
  max_call_duration_ms: 120000,
  interruption_sensitivity: 0.7,
  responsiveness: 1,
  enable_backchannel: true,
  backchannel_frequency: 0.6,
  backchannel_words: ['yeah', 'uh-huh', 'mmhmm'],
  allow_user_dtmf: true,
};

async function provisionOne(niche) {
  const generalPrompt = BASE_PROMPT(niche);
  const beginMessage = 'Hi, thanks for calling {{business_name}}, this is your AI receptionist. How can I help you today?';

  const llm = await client.llm.create({
    model: 'gpt-4o-mini',
    general_prompt: generalPrompt,
    begin_message: beginMessage,
  });

  const agent = await client.agent.create({
    agent_name: `Boltcall Demo - ${niche.label}`,
    response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
    ...AGENT_CONFIG,
  });

  return { key: niche.key, agent_id: agent.agent_id, llm_id: llm.llm_id };
}

async function main() {
  const results = {};
  for (const niche of NICHES) {
    process.stderr.write(`Creating agent for ${niche.label}...\n`);
    const { key, agent_id, llm_id } = await provisionOne(niche);
    results[key] = agent_id;
    process.stderr.write(`  ${key} -> ${agent_id} (llm ${llm_id})\n`);
  }

  console.log('\nRETELL_DEMO_AGENT_MAP value (paste into Netlify env):');
  console.log(JSON.stringify(results));
}

main().catch((err) => {
  console.error('Provisioning failed:', err);
  process.exit(1);
});
