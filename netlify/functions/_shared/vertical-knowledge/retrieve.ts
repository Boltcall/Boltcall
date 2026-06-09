import type { SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../azure-ai';
import { getServiceSupabase } from '../token-utils';

export type VerticalPackSlug = 'law_firm' | 'med_spa' | 'solar';

export type VerticalKnowledgeKind =
  | 'guardrail'
  | 'intake_flow'
  | 'faq'
  | 'escalation_rule'
  | 'disallowed_claim'
  | 'qualification_field'
  | 'source_note';

export interface RetrievedVerticalChunk {
  scope: 'vertical';
  pack_slug: VerticalPackSlug;
  knowledge_id: string;
  kind: VerticalKnowledgeKind;
  section: string;
  content: unknown;
  source_title: string;
  jurisdiction: string;
  score: number;
}

export interface RetrieveVerticalPackContextOpts {
  vertical: string | null | undefined;
  queryText: string;
  kinds?: VerticalKnowledgeKind[];
  limit?: number;
  supabase?: SupabaseClient;
}

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 30;

const VALID_KINDS: ReadonlySet<VerticalKnowledgeKind> = new Set([
  'guardrail',
  'intake_flow',
  'faq',
  'escalation_rule',
  'disallowed_claim',
  'qualification_field',
  'source_note',
]);

const VERTICAL_ALIASES: Record<string, VerticalPackSlug> = {
  attorney: 'law_firm',
  attorneys: 'law_firm',
  law: 'law_firm',
  law_firm: 'law_firm',
  lawyer: 'law_firm',
  lawyers: 'law_firm',
  legal: 'law_firm',

  aesthetic: 'med_spa',
  aesthetics: 'med_spa',
  botox: 'med_spa',
  med_spa: 'med_spa',
  medical_spa: 'med_spa',
  medspa: 'med_spa',
  spa: 'med_spa',

  solar: 'solar',
  solar_energy: 'solar',
  solar_installation: 'solar',
  solar_panel: 'solar',
  solar_panels: 'solar',
};

export function normalizeVerticalSlug(input: string | null | undefined): VerticalPackSlug | null {
  if (!input) return null;
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (normalized in VERTICAL_ALIASES) return VERTICAL_ALIASES[normalized];

  if (/\b(law|legal|attorney|lawyer)\b/.test(input.toLowerCase())) return 'law_firm';
  if (/\b(med\s*spa|medspa|aesthetic|botox|filler)\b/.test(input.toLowerCase())) return 'med_spa';
  if (/\b(solar|photovoltaic|pv)\b/.test(input.toLowerCase())) return 'solar';

  return null;
}

function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function sanitizeKinds(kinds: VerticalKnowledgeKind[] | undefined): VerticalKnowledgeKind[] | null {
  if (!kinds?.length) return null;
  const cleaned = kinds.filter((kind): kind is VerticalKnowledgeKind => VALID_KINDS.has(kind));
  return cleaned.length ? cleaned : null;
}

function mapChunk(row: Record<string, any>, packSlug: VerticalPackSlug): RetrievedVerticalChunk {
  return {
    scope: 'vertical',
    pack_slug: packSlug,
    knowledge_id: String(row.id ?? row.knowledge_id),
    kind: String(row.kind) as VerticalKnowledgeKind,
    section: String(row.section ?? ''),
    content: row.content,
    source_title: String(row.source_title ?? 'Approved internal review'),
    jurisdiction: String(row.jurisdiction ?? 'us_national'),
    score: typeof row.similarity === 'number' ? row.similarity : 1,
  };
}

async function fallbackSelectApprovedRows(
  supabase: SupabaseClient,
  packSlug: VerticalPackSlug,
  kinds: VerticalKnowledgeKind[] | null,
  limit: number,
): Promise<RetrievedVerticalChunk[]> {
  let query = supabase
    .from('vertical_knowledge')
    .select('id, pack_slug, kind, section, content, source_title, jurisdiction')
    .eq('pack_slug', packSlug)
    .eq('status', 'approved')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (kinds) query = query.in('kind', kinds);

  query = query
    .order('kind', { ascending: true })
    .order('section', { ascending: true })
    .limit(limit);

  const { data, error } = await query;
  if (error) {
    throw new Error(`[vertical-knowledge.retrieve] approved fallback query failed: ${error.message}`);
  }

  return (Array.isArray(data) ? data : []).map((row) => mapChunk(row, packSlug));
}

export async function retrieveVerticalPackContext(
  opts: RetrieveVerticalPackContextOpts,
): Promise<RetrievedVerticalChunk[]> {
  const packSlug = normalizeVerticalSlug(opts.vertical);
  if (!packSlug) return [];

  if (typeof opts.queryText !== 'string' || opts.queryText.trim().length === 0) {
    throw new Error('[vertical-knowledge.retrieve] queryText is required');
  }

  const supabase = opts.supabase ?? getServiceSupabase();
  const limit = clampLimit(opts.limit);
  const kinds = sanitizeKinds(opts.kinds);

  try {
    const embedding = await generateEmbedding(opts.queryText);
    const { data, error } = await supabase.rpc('retrieve_vertical_knowledge', {
      p_pack_slug: packSlug,
      p_query_embedding: JSON.stringify(embedding),
      p_k: limit,
      p_kinds: kinds,
    });

    if (error) throw error;

    const chunks = (Array.isArray(data) ? data : []).map((row) => mapChunk(row, packSlug));
    if (chunks.length) return chunks;
  } catch (err) {
    console.warn(
      '[vertical-knowledge.retrieve] vector retrieval unavailable; falling back to approved rows',
      err instanceof Error ? err.message : err,
    );
  }

  return fallbackSelectApprovedRows(supabase, packSlug, kinds, limit);
}

export function formatVerticalContextForPrompt(chunks: RetrievedVerticalChunk[]): string {
  if (!chunks.length) return '';

  const grouped = chunks.reduce<Record<string, RetrievedVerticalChunk[]>>((acc, chunk) => {
    const key = chunk.kind;
    acc[key] = acc[key] ?? [];
    acc[key].push(chunk);
    return acc;
  }, {});

  const sections = Object.entries(grouped).map(([kind, rows]) => {
    const lines = rows.map((row) => {
      const content =
        typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
      return `- ${row.section}: ${content}`;
    });
    return `## ${kind}\n${lines.join('\n')}`;
  });

  return [
    '# Approved Vertical Guardrails',
    'Use these founder-approved vertical facts and guardrails. Do not browse the web during live calls. If client KB conflicts with ordinary business details here, use the client KB. If compliance guardrails conflict with anything, the guardrail wins and the agent must collect details and hand off.',
    ...sections,
  ].join('\n\n');
}
