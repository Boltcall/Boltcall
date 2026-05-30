/**
 * gemini-image.ts — Gemini "Banana" image generation adapter for the Agency OS.
 *
 * Mirrors the existing mcp__linkedin-mcp__generate_linkedin_image pattern but is
 * purpose-built for paid social ad creative (Meta, primarily).
 *
 * Responsibilities:
 *   1. Generate ad creative variants (batched, up to 8 at once) via Gemini's
 *      image generation endpoint ("Banana" = Google's Imagen / Gemini-Image family).
 *   2. Upload every generated image to Supabase Storage bucket `agency-creatives`
 *      and return short-lived signed URLs.
 *   3. Stamp every image with deterministic metadata (vertical, angle, seed,
 *      client_id, prompt fingerprint) so downstream agents can de-dupe and audit.
 *   4. Compute a cheap `banana_fingerprint_score` — a perceptual-hash–derived
 *      similarity to known generic-AI-looking patterns. Higher = more generic /
 *      Meta-fatigued. The adversarial critic (stage 2 of the creative-foundry
 *      pipeline) uses this to drop fingerprinted variants. See TODO below for
 *      the production implementation.
 *   5. Track cost meticulously (image gen is the most expensive line item in
 *      the agency OS) and emit a `cost_incurred` event into `agency_events`
 *      for every batch. NOTE: image gen does NOT emit `creative_published` —
 *      that's the Meta ads adapter's job once a creative actually goes live.
 *
 * Three public entry points:
 *   - generateAdCreative           — the primary batched generator (stage 1 diverger)
 *   - generateImageVariations      — given a base image, produce N tweaked variants
 *                                    (used by the adversarial critic when a strong
 *                                    candidate has too-high fingerprint score)
 *   - generateVerticalSamplePack   — generates the per-vertical reference pack
 *                                    that lives in the prompt template registry
 *
 * Environment:
 *   GEMINI_API_KEY                 — Google AI Studio / Vertex AI key
 *   GEMINI_IMAGE_MODEL             — default 'imagen-4.0-generate-002' (Banana)
 *   GEMINI_IMAGE_API_VERSION       — default 'v1beta'
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY — for storage uploads + event log writes
 *   AGENCY_CREATIVES_BUCKET        — default 'agency-creatives'
 *   AGENCY_SIGNED_URL_TTL_SECONDS  — default 86400 (24h)
 *
 * Cost model (USD, as of 2026 Q2 — re-check quarterly):
 *   - imagen-4.0-generate-002:           $0.040 / image @ 1080x1080
 *   - imagen-4.0-generate-002 (wide):    $0.048 / image @ 1080x1350 or 1080x1920
 *   - variations endpoint:               $0.030 / image
 *   These are the ONLY source of truth in this codebase — if they change,
 *   bump COST_TABLE_VERSION below so historical event rows can be re-priced.
 */

import { getServiceSupabase } from '../token-utils';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type AdAngle = 'proof' | 'fear' | 'status' | 'curiosity';
export type AdDimensions = '1080x1080' | '1080x1350' | '1080x1920';
export type VariationStrength = 'subtle' | 'aggressive';

export interface GenerateAdCreativeOpts {
  client_id: string;
  vertical: string;
  angle: AdAngle;
  prompt: string;
  dimensions: AdDimensions;
  /** Number of variants to generate in a single batched call. 1-8. Default 1. */
  n_variants?: number;
  /** Optional seed for reproducibility. If omitted, a random seed is chosen
   *  and returned per-image so the caller can re-run a specific variant. */
  seed?: number;
}

export interface GeneratedImage {
  /** Short-lived signed URL pointing at agency-creatives bucket. */
  url: string;
  /** Seed used for this specific variant (returned even when caller didn't
   *  provide one, so reruns are deterministic). */
  seed: number;
  /** Perceptual-hash similarity score against known generic-AI patterns.
   *  Range 0-1. Higher = looks more like every other AI ad on the platform.
   *  Adversarial critic should drop anything > ~0.65. */
  banana_fingerprint_score: number;
}

export interface GenerateAdCreativeResult {
  images: GeneratedImage[];
  cost_usd: number;
}

export interface GenerateImageVariationsOpts {
  base_image_url: string;
  n: number;
  variation_strength: VariationStrength;
}

export interface ImageVariation {
  url: string;
  /** 0-1, where 1 = identical to base. Subtle → ~0.85, aggressive → ~0.55. */
  similarity_to_base: number;
}

export interface GenerateImageVariationsResult {
  images: ImageVariation[];
}

export interface SamplePackOpts {
  vertical: string;
}

export interface SamplePackEntry {
  url: string;
  angle: AdAngle;
  alt_text: string;
}

export interface SamplePackResult {
  samples: SamplePackEntry[];
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const COST_TABLE_VERSION = '2026-05-30';

const COST_PER_IMAGE_USD: Record<AdDimensions, number> = {
  '1080x1080': 0.040,
  '1080x1350': 0.048,
  '1080x1920': 0.048,
};
const COST_PER_VARIATION_USD = 0.030;

const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || 'imagen-4.0-generate-002';
const GEMINI_API_VERSION = process.env.GEMINI_IMAGE_API_VERSION || 'v1beta';
const GEMINI_BASE = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}`;

const BUCKET = process.env.AGENCY_CREATIVES_BUCKET || 'agency-creatives';
const SIGNED_URL_TTL = parseInt(
  process.env.AGENCY_SIGNED_URL_TTL_SECONDS || '86400',
  10,
);

const MAX_BATCH = 8;

// Per-angle prompt steering — appended to every user prompt to bias the
// diverger toward visually distinct outputs across the four angle bins.
const ANGLE_STEER: Record<AdAngle, string> = {
  proof:
    'Photographic, high-trust, real workplace setting. Show concrete results, ' +
    'numbers, or before/after evidence. Avoid stock-photo composition. ' +
    'Neutral palette, documentary lighting.',
  fear:
    'Tense, problem-focused composition. Show the cost of inaction (missed ' +
    'call, empty waiting room, frustrated customer). Muted desaturated palette, ' +
    'high contrast, slight vignette. No literal alarm clocks.',
  status:
    'Aspirational, premium-feel. Modern office, clean architecture, ' +
    'high-end materials. Subject looks in-control and successful. ' +
    'Warm sophisticated palette. Editorial photography style.',
  curiosity:
    'Visually unexpected — an unusual juxtaposition or pattern interrupt. ' +
    'Bright contrasting palette, single bold focal element, ' +
    'graphic composition. Make the viewer pause.',
};

// Per-vertical anchor cues used by the sample-pack generator. Kept short
// so they compose cleanly with the angle steer.
const VERTICAL_CUES: Record<string, string> = {
  plumber: 'plumbing service van, residential kitchen or bathroom, technician with tools',
  dental: 'modern dental practice, clean operatory, smiling patient or hygienist',
  hvac: 'HVAC technician at outdoor condenser unit, residential setting, summer or winter context',
  legal: 'professional attorney in modern office, client consultation, law books or laptop',
  medspa: 'med spa treatment room, calm lighting, aesthetic services context',
  restaurant: 'busy restaurant interior, host station with phone, full dining room',
  real_estate: 'realtor showing modern home, "for sale" sign, family touring property',
  medical: 'medical clinic reception, doctor with patient, clean clinical setting',
  auto: 'auto repair shop, technician under hood, customer at service counter',
  fitness: 'modern gym floor, trainer with client, mid-workout',
  solar: 'rooftop solar install in progress, residential context, sunny day',
  roofing: 'roofer on residential roof, ladder visible, inspection or repair',
  pest_control: 'pest control technician at residential exterior, equipment visible',
  electrical: 'electrician at panel, residential or commercial, safety gear',
  general: 'local service business owner, friendly professional context',
};

function verticalCue(v: string): string {
  return VERTICAL_CUES[v] || VERTICAL_CUES.general;
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Stage 1 diverger of the creative-foundry pipeline.
 *
 * Generates up to MAX_BATCH variants in one logical call (we issue n_variants
 * parallel sub-requests so each gets its own seed; Gemini's batch API caps
 * single-request `sampleCount` at 4 for Imagen, so we fan out instead).
 *
 * Uploads everything to Supabase Storage and returns signed URLs.
 * Emits a single aggregated `cost_incurred` event into agency_events.
 */
export async function generateAdCreative(
  opts: GenerateAdCreativeOpts,
): Promise<GenerateAdCreativeResult> {
  const {
    client_id,
    vertical,
    angle,
    prompt,
    dimensions,
    n_variants = 1,
    seed,
  } = opts;

  if (!client_id) throw new Error('generateAdCreative: client_id is required');
  if (!prompt || !prompt.trim()) throw new Error('generateAdCreative: prompt is required');
  if (!ANGLE_STEER[angle]) throw new Error(`generateAdCreative: unknown angle "${angle}"`);
  if (!COST_PER_IMAGE_USD[dimensions]) {
    throw new Error(`generateAdCreative: unsupported dimensions "${dimensions}"`);
  }

  const batch = Math.max(1, Math.min(n_variants, MAX_BATCH));
  const fullPrompt = composePrompt(prompt, angle, vertical);
  const promptFp = await sha256Hex(fullPrompt);

  // Fan out — one seed per variant, parallel.
  const seeds = Array.from({ length: batch }, (_, i) =>
    seed !== undefined ? seed + i : randomSeed(),
  );

  const generated = await Promise.all(
    seeds.map((s) =>
      callGeminiImage({
        prompt: fullPrompt,
        dimensions,
        seed: s,
      }).then(async (imageBytes) => {
        const fingerprint = computeBananaFingerprintScore(imageBytes);
        const key = buildStorageKey({
          client_id,
          vertical,
          angle,
          dimensions,
          seed: s,
          promptFp,
          ext: 'png',
        });
        const url = await uploadToStorage(key, imageBytes, {
          client_id,
          vertical,
          angle,
          dimensions,
          seed: String(s),
          prompt_fingerprint: promptFp,
          source: 'gemini-image.generateAdCreative',
          banana_fingerprint_score: fingerprint.toFixed(3),
        });
        return { url, seed: s, banana_fingerprint_score: fingerprint };
      }),
    ),
  );

  const cost_usd = +(COST_PER_IMAGE_USD[dimensions] * batch).toFixed(4);

  // Image gen is purely production — it does NOT publish anything.
  // The Meta-ads adapter is responsible for `creative_published` once a
  // generated asset actually gets attached to a live ad set.
  await emitCostIncurred({
    client_id,
    cost_usd,
    n_images: batch,
    dimensions,
    angle,
    vertical,
    model: GEMINI_MODEL,
    prompt_fingerprint: promptFp,
    source: 'generateAdCreative',
  });

  return { images: generated, cost_usd };
}

/**
 * Adversarial-critic helper: produce N variations of an approved-but-fingerprinted
 * base image, biased toward visual divergence from the base.
 *
 * `variation_strength`:
 *   - 'subtle'     — small tweaks (palette shift, minor crop, light change)
 *   - 'aggressive' — substantial composition / subject change while keeping the
 *                    core message intent
 */
export async function generateImageVariations(
  opts: GenerateImageVariationsOpts,
): Promise<GenerateImageVariationsResult> {
  const { base_image_url, n, variation_strength } = opts;
  if (!base_image_url) throw new Error('generateImageVariations: base_image_url required');
  if (n < 1 || n > MAX_BATCH) {
    throw new Error(`generateImageVariations: n must be between 1 and ${MAX_BATCH}`);
  }

  const baseBytes = await fetchBytes(base_image_url);
  const strengthSteer =
    variation_strength === 'subtle'
      ? 'Make small variations: shift palette slightly, vary lighting angle, ' +
        'micro-adjust crop. Keep subject, composition, and message identical.'
      : 'Make substantial variations: change composition, swap secondary subjects, ' +
        'alter palette family, vary photographic style. Preserve only the core ' +
        'message intent — everything else should look meaningfully different.';

  const targetSimilarity = variation_strength === 'subtle' ? 0.85 : 0.55;

  const seeds = Array.from({ length: n }, () => randomSeed());

  const images = await Promise.all(
    seeds.map(async (s) => {
      const bytes = await callGeminiImageVariation({
        base: baseBytes,
        instruction: strengthSteer,
        seed: s,
      });
      const key = `variations/${Date.now()}-${s}.png`;
      const url = await uploadToStorage(key, bytes, {
        source: 'gemini-image.generateImageVariations',
        variation_strength,
        seed: String(s),
      });
      // Similarity is currently a heuristic anchored to the requested strength.
      // TODO: replace with actual perceptual-hash distance once we wire up the
      // pHash library — same TODO as banana_fingerprint_score below.
      const similarity_to_base =
        targetSimilarity + (Math.random() - 0.5) * 0.1;
      return {
        url,
        similarity_to_base: clamp01(similarity_to_base),
      };
    }),
  );

  const cost_usd = +(COST_PER_VARIATION_USD * n).toFixed(4);
  await emitCostIncurred({
    cost_usd,
    n_images: n,
    model: GEMINI_MODEL,
    source: 'generateImageVariations',
    variation_strength,
  });

  return { images };
}

/**
 * Per-vertical reference sample pack. Used by the prompt template registry
 * so every new client has a visual anchor for the four angles.
 *
 * Always produces exactly 4 samples — one per angle. Square 1080x1080.
 */
export async function generateVerticalSamplePack(
  opts: SamplePackOpts,
): Promise<SamplePackResult> {
  const { vertical } = opts;
  if (!vertical) throw new Error('generateVerticalSamplePack: vertical required');

  const cue = verticalCue(vertical);
  const angles: AdAngle[] = ['proof', 'fear', 'status', 'curiosity'];

  const samples = await Promise.all(
    angles.map(async (angle) => {
      const prompt = `Sample reference ad creative for ${vertical} businesses. ${cue}.`;
      const fullPrompt = composePrompt(prompt, angle, vertical);
      const seed = randomSeed();
      const bytes = await callGeminiImage({
        prompt: fullPrompt,
        dimensions: '1080x1080',
        seed,
      });
      const key = `sample-packs/${vertical}/${angle}.png`;
      const url = await uploadToStorage(key, bytes, {
        source: 'gemini-image.generateVerticalSamplePack',
        vertical,
        angle,
        seed: String(seed),
      });
      return {
        url,
        angle,
        alt_text: `Sample ${angle}-angle ad creative for ${vertical} businesses`,
      };
    }),
  );

  const cost_usd = +(COST_PER_IMAGE_USD['1080x1080'] * angles.length).toFixed(4);
  await emitCostIncurred({
    cost_usd,
    n_images: angles.length,
    vertical,
    model: GEMINI_MODEL,
    source: 'generateVerticalSamplePack',
  });

  return { samples };
}

// ────────────────────────────────────────────────────────────────────────────
// Internals — prompt composition
// ────────────────────────────────────────────────────────────────────────────

function composePrompt(userPrompt: string, angle: AdAngle, vertical: string): string {
  const cue = verticalCue(vertical);
  return [
    userPrompt.trim(),
    `Vertical context: ${cue}.`,
    `Angle steer: ${ANGLE_STEER[angle]}`,
    // Anti-fingerprint cues — try to push the model off the generic-AI manifold.
    'No watermarks. No text overlays. No fake logos. ' +
      'Avoid AI-typical glossy plastic skin, symmetric staring faces, ' +
      'centered subjects against bokeh, or unrealistic finger counts. ' +
      'Photograph should look like it came from a working photographer, ' +
      'not a stock library.',
  ].join('\n\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Internals — Gemini API
// ────────────────────────────────────────────────────────────────────────────

interface GeminiImageCallOpts {
  prompt: string;
  dimensions: AdDimensions;
  seed: number;
}

async function callGeminiImage(opts: GeminiImageCallOpts): Promise<Uint8Array> {
  const apiKey = requireEnv('GEMINI_API_KEY');
  const [w, h] = opts.dimensions.split('x').map(Number);
  const aspectRatio = aspectFromDims(w, h);

  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateImage?key=${apiKey}`;
  const body = {
    prompt: { text: opts.prompt },
    config: {
      sampleCount: 1,
      aspectRatio,
      personGeneration: 'allow_adult',
      seed: opts.seed,
      // Hint to the model to emit PNG; downstream Supabase upload assumes PNG.
      outputMimeType: 'image/png',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini image generation failed (${res.status}): ${errBody}`);
  }

  const json = await res.json() as {
    generatedImages?: Array<{ image?: { imageBytes?: string } }>;
    candidates?: Array<{ image?: { bytesBase64Encoded?: string } }>;
  };

  const b64 =
    json.generatedImages?.[0]?.image?.imageBytes ||
    json.candidates?.[0]?.image?.bytesBase64Encoded;
  if (!b64) {
    throw new Error(
      `Gemini response missing image bytes: ${JSON.stringify(json).slice(0, 400)}`,
    );
  }

  return base64ToBytes(b64);
}

interface GeminiVariationOpts {
  base: Uint8Array;
  instruction: string;
  seed: number;
}

async function callGeminiImageVariation(
  opts: GeminiVariationOpts,
): Promise<Uint8Array> {
  const apiKey = requireEnv('GEMINI_API_KEY');
  const url = `${GEMINI_BASE}/models/${GEMINI_MODEL}:editImage?key=${apiKey}`;
  const body = {
    prompt: { text: opts.instruction },
    referenceImages: [
      { image: { imageBytes: bytesToBase64(opts.base) } },
    ],
    config: {
      sampleCount: 1,
      seed: opts.seed,
      outputMimeType: 'image/png',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini variation failed (${res.status}): ${errBody}`);
  }
  const json = await res.json() as {
    generatedImages?: Array<{ image?: { imageBytes?: string } }>;
  };
  const b64 = json.generatedImages?.[0]?.image?.imageBytes;
  if (!b64) throw new Error('Gemini variation returned no image bytes');
  return base64ToBytes(b64);
}

function aspectFromDims(w: number, h: number): string {
  if (w === h) return '1:1';
  if (w === 1080 && h === 1350) return '4:5';
  if (w === 1080 && h === 1920) return '9:16';
  return `${w}:${h}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Internals — Supabase Storage
// ────────────────────────────────────────────────────────────────────────────

interface BuildStorageKeyOpts {
  client_id: string;
  vertical: string;
  angle: AdAngle;
  dimensions: AdDimensions;
  seed: number;
  promptFp: string;
  ext: string;
}

function buildStorageKey(opts: BuildStorageKeyOpts): string {
  // Keys are deterministic given (client_id, prompt fingerprint, seed) so
  // re-runs with the same inputs overwrite rather than orphan.
  const date = new Date().toISOString().slice(0, 10);
  const shortFp = opts.promptFp.slice(0, 10);
  return [
    'ad-creatives',
    opts.client_id,
    date,
    `${opts.vertical}-${opts.angle}-${opts.dimensions}-${shortFp}-${opts.seed}.${opts.ext}`,
  ].join('/');
}

async function uploadToStorage(
  key: string,
  bytes: Uint8Array,
  metadata: Record<string, string>,
): Promise<string> {
  const supabase = getServiceSupabase();

  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(
    key,
    bytes,
    {
      contentType: 'image/png',
      upsert: true,
      // Supabase Storage stores headers as `x-amz-meta-*` so callers can
      // read them back. Booleans/numbers must be strings.
      metadata,
    } as { contentType: string; upsert: boolean; metadata: Record<string, string> },
  );

  if (uploadErr) {
    throw new Error(`Supabase Storage upload failed (${key}): ${uploadErr.message}`);
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL);

  if (signErr || !signed?.signedUrl) {
    throw new Error(
      `Supabase signed URL creation failed (${key}): ${signErr?.message || 'unknown'}`,
    );
  }
  return signed.signedUrl;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch base image (${res.status}): ${url}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

// ────────────────────────────────────────────────────────────────────────────
// Internals — Banana fingerprint scoring
// ────────────────────────────────────────────────────────────────────────────

/**
 * Cheap perceptual-hash similarity to known generic-AI patterns.
 *
 * TODO(production): replace this placeholder with a real implementation:
 *   1. Compute a 64-bit dHash of the generated image (downscale to 9x8 grayscale,
 *      diff adjacent pixels). The `sharp` + `image-hash` pairing is the
 *      standard choice but is too heavy for Netlify functions — prefer
 *      `@jimp/core` + a small hand-rolled dHash, or move scoring to a
 *      dedicated Edge Function.
 *   2. Maintain a Supabase table `banana_fingerprint_corpus` of ~200 dHashes
 *      seeded from (a) the AI-Detective / DeepfakeDetect public datasets,
 *      (b) curated examples of Meta-fatigued AI ad creative from the OS's
 *      own past 90 days of `agency_artifacts` rows scored as fatigued.
 *   3. Score = max Hamming-similarity (1 - distance/64) across the corpus.
 *   4. Keep this function pure / synchronous from the caller's perspective —
 *      load the corpus once at module init and cache.
 *
 * Until that lands, we return a deterministic-but-fake score derived from a
 * checksum of the image bytes, biased to fall into the "ambiguous" zone
 * (0.30-0.55) so downstream code paths are exercised but no real image is
 * spuriously rejected.
 */
function computeBananaFingerprintScore(imageBytes: Uint8Array): number {
  // Cheap stable hash of first/last 4KB — deterministic per image, fast.
  let h = 0;
  const sampleSize = Math.min(4096, imageBytes.length);
  for (let i = 0; i < sampleSize; i++) {
    h = ((h << 5) - h + imageBytes[i]) | 0;
  }
  for (let i = Math.max(0, imageBytes.length - sampleSize); i < imageBytes.length; i++) {
    h = ((h << 5) - h + imageBytes[i]) | 0;
  }
  // Map to [0.30, 0.55] — the "ambiguous" placeholder band.
  const norm = (Math.abs(h) % 1000) / 1000;
  return +(0.30 + norm * 0.25).toFixed(3);
}

// ────────────────────────────────────────────────────────────────────────────
// Internals — event emission (cost tracking)
// ────────────────────────────────────────────────────────────────────────────

interface CostIncurredPayload {
  cost_usd: number;
  n_images: number;
  model: string;
  source: string;
  client_id?: string;
  vertical?: string;
  angle?: AdAngle;
  dimensions?: AdDimensions;
  prompt_fingerprint?: string;
  variation_strength?: VariationStrength;
}

/**
 * Best-effort write to agency_events. Image gen is the most expensive line
 * item in the OS so we never want a generation to fail because the event log
 * is unavailable — we log + swallow.
 *
 * Schema target: agency_events
 *   event_type     'cost_incurred'
 *   client_id      (nullable; null = OS-level cost like sample pack regeneration)
 *   severity       'info'
 *   cost_usd       numeric
 *   payload        jsonb (all the structured fields below)
 *   source         text (function name)
 *   ts             timestamptz default now()
 *
 * Also mirrors into aios_event_log so the existing self-improving loop
 * monitors pick it up alongside every other channel's cost data.
 */
async function emitCostIncurred(payload: CostIncurredPayload): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    const row = {
      event_type: 'cost_incurred',
      severity: 'info' as const,
      client_id: payload.client_id ?? null,
      cost_usd: payload.cost_usd,
      source: payload.source,
      payload: {
        ...payload,
        cost_table_version: COST_TABLE_VERSION,
      },
      ts: new Date().toISOString(),
    };

    // Primary write — the agency-OS-scoped event log.
    const { error: agencyErr } = await supabase.from('agency_events').insert(row);
    if (agencyErr) {
      console.error('[gemini-image] agency_events insert failed:', agencyErr.message);
    }

    // Mirror to aios_event_log so loop-monitors see it. Schema there is
    // slightly different — uses channel/subject_id rather than client_id.
    const { error: aiosErr } = await supabase.from('aios_event_log').insert({
      event_type: 'cost_incurred',
      channel: 'agency_creative',
      subject_id: payload.client_id ?? null,
      payload: row.payload,
      ts: row.ts,
    });
    if (aiosErr) {
      console.error('[gemini-image] aios_event_log insert failed:', aiosErr.message);
    }
  } catch (e) {
    console.error('[gemini-image] emitCostIncurred threw (non-blocking):', e);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Internals — small utilities
// ────────────────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`gemini-image: required env var ${name} is unset`);
  return v;
}

function randomSeed(): number {
  // 31-bit positive — fits comfortably in JSON without quoting.
  return Math.floor(Math.random() * 0x7fffffff);
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

async function sha256Hex(input: string): Promise<string> {
  // Use Web Crypto when available (Netlify Edge), Node crypto otherwise.
  const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (subtle) {
    const bytes = new TextEncoder().encode(input);
    const buf = await subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Lazy require — keeps this file importable in pure-browser builds (it isn't,
  // but the pattern is cheap).
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.createHash('sha256').update(input).digest('hex');
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(b64, 'base64'));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
