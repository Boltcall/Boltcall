// AI-generated-copy detector — pure statistics, no LLM.
//
// Port of AIOS `lib/ai-copy-detector.js` (2026-08-13). Kept in sync manually —
// small file, no shared package needed. Applied to inbound SMS / email /
// WhatsApp / lead-form messages: score above threshold => don't auto-draft,
// mark for human review.
//
// Doctrine from Allie K Miller video (2026-08-13 insights): 120 of 250 job
// applicants gave identical ChatGPT output — flag lazy AI copy, not AI use
// itself. Same signal applies to bot-generated inbound leads.

const TELL_PHRASES = [
  /\bwhen it comes to\b/i,
  /^honestly\??[,!.\s]/im,
  /\bin today['’]s\b/i,
  /\bi hope this (email |message |)finds you well\b/i,
  /\bfrom the bottom of my heart\b/i,
  /\bthank you so much for (your |the )/i,
  /\bit['’]s worth noting that\b/i,
  /\bi wanted to (reach out|touch base|follow up)\b/i,
  /\bat the end of the day\b/i,
  /\bmoving forward\b/i,
];

const CONTRAST_PATTERN = /\b(it['’]?s not (just )?|not only )[^,.]{2,40}[,;] (?:it['’]?s |but )/gi;
const RULE_OF_THREE = /,\s*[^,]{2,25},\s*[^,]{2,25},\s*and\s+[^,.!?]{2,30}/gi;

const WEIGHTS = {
  paragraphUniformity: 0.30,
  tellPhrases:         0.25,
  contrastPattern:     0.15,
  emDashDensity:       0.15,
  ruleOfThree:         0.15,
};

const MIN_LEN = 200;

export interface DetectorResult {
  aiScore: number;
  signals: Record<string, number>;
  length: number;
  reason?: 'too_short';
}

function splitParagraphs(text: string): string[] {
  return String(text || '')
    .split(/\n\s*\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

function coefficientOfVariation(nums: number[]): number | null {
  if (nums.length < 2) return null;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  if (mean === 0) return null;
  const variance = nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance) / mean;
}

function paragraphUniformityScore(text: string): number {
  const paras = splitParagraphs(text);
  if (paras.length < 3) return 0;
  const lengths = paras.map(p => p.length);
  const cv = coefficientOfVariation(lengths);
  if (cv === null) return 0;
  if (cv < 0.15) return 1;
  if (cv > 0.60) return 0;
  return 1 - (cv - 0.15) / 0.45;
}

function tellPhrasesScore(text: string): number {
  let hits = 0;
  for (const rx of TELL_PHRASES) if (rx.test(text)) hits++;
  if (hits === 0) return 0;
  if (hits === 1) return 0.4;
  if (hits === 2) return 0.7;
  return 1;
}

function per100Words(text: string): number {
  const words = String(text || '').split(/\s+/).filter(Boolean).length;
  return words > 0 ? 100 / words : 0;
}

function contrastPatternScore(text: string): number {
  const matches = text.match(CONTRAST_PATTERN) || [];
  return Math.min(1, (matches.length * per100Words(text)) / 2);
}

function emDashDensityScore(text: string): number {
  const emDashes = (text.match(/—|—/g) || []).length;
  return Math.min(1, emDashes * per100Words(text));
}

function ruleOfThreeScore(text: string): number {
  const matches = text.match(RULE_OF_THREE) || [];
  return Math.min(1, matches.length * per100Words(text));
}

export function scoreText(text: string | null | undefined): DetectorResult {
  const safe = String(text || '');
  if (safe.length < MIN_LEN) {
    return { aiScore: 0, signals: {}, length: safe.length, reason: 'too_short' };
  }
  const signals = {
    paragraphUniformity: paragraphUniformityScore(safe),
    tellPhrases:         tellPhrasesScore(safe),
    contrastPattern:     contrastPatternScore(safe),
    emDashDensity:       emDashDensityScore(safe),
    ruleOfThree:         ruleOfThreeScore(safe),
  };
  const aiScore = (Object.entries(WEIGHTS) as [keyof typeof WEIGHTS, number][])
    .reduce((sum, [k, w]) => sum + ((signals[k] || 0) * w), 0);
  return {
    aiScore: Number(aiScore.toFixed(3)),
    signals: Object.fromEntries(
      Object.entries(signals).map(([k, v]) => [k, Number(v.toFixed(3))])
    ),
    length: safe.length,
  };
}

// Threshold matches the AIOS cold-email triage wiring — 0.5 catches real
// templated cold-outbound replies. Bump to 0.6 if false-positives appear.
export const AI_TEMPLATED_THRESHOLD = 0.5;

export function isLikelyAiTemplated(text: string | null | undefined, threshold = AI_TEMPLATED_THRESHOLD): boolean {
  return scoreText(text).aiScore >= threshold;
}
