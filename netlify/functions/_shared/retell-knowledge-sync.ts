import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeVerticalSlug } from './vertical-knowledge/retrieve';

type RetellKnowledgeBaseStatus =
  | 'in_progress'
  | 'complete'
  | 'error'
  | 'refreshing_in_progress';

export interface RetellKnowledgeText {
  title: string;
  text: string;
}

export interface RetellKnowledgeBinding {
  scope: 'vertical' | 'client';
  retell_knowledge_base_id: string;
  content_hash: string;
  source_count: number;
  retell_status: RetellKnowledgeBaseStatus;
}

interface RetellKnowledgeBaseResponse {
  knowledge_base_id: string;
  status?: RetellKnowledgeBaseStatus;
}

interface RetellKnowledgeBaseClient {
  create(params: {
    knowledge_base_name: string;
    knowledge_base_texts?: RetellKnowledgeText[];
    enable_auto_refresh?: boolean;
    max_chunk_size?: number;
    min_chunk_size?: number;
  }): Promise<RetellKnowledgeBaseResponse>;
}

interface RetellClientWithKnowledgeBase {
  knowledgeBase: RetellKnowledgeBaseClient;
}

export interface SyncRetellKnowledgeBasesArgs {
  supabase: SupabaseClient;
  retell: RetellClientWithKnowledgeBase;
  clientId: string;
  vertical?: string | null;
  clientKnowledgeBase?: unknown;
}

interface KnowledgeBundle {
  scope: 'vertical' | 'client';
  name: string;
  texts: RetellKnowledgeText[];
  content_hash: string;
  pack_slug?: string;
  pack_version?: number;
  client_id?: string;
  metadata: Record<string, unknown>;
}

interface BindingRow {
  id: string;
  retell_knowledge_base_id: string;
  retell_status: RetellKnowledgeBaseStatus;
  content_hash: string;
  source_count: number;
}

const MAX_RETELL_TEXTS_PER_KB = 80;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(obj[key])}`)
    .join(',')}}`;
}

export function hashKnowledgeTexts(scope: string, texts: RetellKnowledgeText[]): string {
  const normalized = texts.map((item) => ({
    title: item.title.trim(),
    text: item.text.trim(),
  }));
  return createHash('sha256')
    .update(scope)
    .update('\n')
    .update(stableJson(normalized))
    .digest('hex');
}

function truncate(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 3)}...` : trimmed;
}

function retellKbName(value: string): string {
  return truncate(value.replace(/[^a-zA-Z0-9 _-]/g, ' ').replace(/\s+/g, ' '), 39);
}

function titleFromParts(...parts: Array<string | number | null | undefined>): string {
  return truncate(parts.filter((part) => part !== null && part !== undefined && String(part).trim()).join(' - '), 120);
}

function contentToText(value: unknown): string {
  if (typeof value === 'string') return value;
  return stableJson(value);
}

function flattenClientKnowledgeBase(value: unknown, path = 'Client KB'): RetellKnowledgeText[] {
  if (!value) return [];
  if (typeof value === 'string') {
    return value.trim() ? [{ title: path, text: value.trim() }] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenClientKnowledgeBase(item, `${path} ${index + 1}`));
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const maybeTitle = typeof record.title === 'string'
      ? record.title
      : typeof record.name === 'string'
      ? record.name
      : path;
    const maybeText =
      typeof record.text === 'string'
        ? record.text
        : typeof record.content === 'string'
        ? record.content
        : typeof record.answer === 'string'
        ? record.answer
        : null;

    if (maybeText) {
      return [{ title: titleFromParts(path, maybeTitle), text: maybeText }];
    }

    return Object.entries(record).flatMap(([key, child]) =>
      flattenClientKnowledgeBase(child, titleFromParts(path, key)),
    );
  }
  return [{ title: path, text: String(value) }];
}

function sourceMetadataIsUsable(row: {
  source_type: string | null;
  source_title: string | null;
  source_url: string | null;
}): boolean {
  if (row.source_type === 'internal_review') return Boolean(row.source_title);
  return Boolean(row.source_type && row.source_title && row.source_url);
}

async function buildVerticalBundle(
  supabase: SupabaseClient,
  vertical: string | null | undefined,
): Promise<KnowledgeBundle | null> {
  const packSlug = normalizeVerticalSlug(vertical ?? '');
  if (!packSlug) return null;

  const { data: pack } = await supabase
    .from('vertical_packs')
    .select('slug, version')
    .eq('slug', packSlug)
    .eq('status', 'approved')
    .maybeSingle();

  const packRow = pack as { slug?: string; version?: number } | null;
  if (!packRow?.slug || typeof packRow.version !== 'number') return null;

  const { data } = await supabase
    .from('vertical_knowledge')
    .select('id, kind, section, content, source_url, source_title, source_type, jurisdiction, confidence, expires_at')
    .eq('pack_slug', packRow.slug)
    .eq('pack_version', packRow.version)
    .eq('status', 'approved')
    .order('kind', { ascending: true });

  const now = Date.now();
  const rows = Array.isArray(data) ? data : [];
  const texts = rows
    .filter((row) => {
      const r = row as { expires_at?: string | null; source_type?: string | null; source_title?: string | null; source_url?: string | null };
      if (r.expires_at && Date.parse(r.expires_at) <= now) return false;
      return sourceMetadataIsUsable({
        source_type: r.source_type ?? null,
        source_title: r.source_title ?? null,
        source_url: r.source_url ?? null,
      });
    })
    .map((row, index) => {
      const r = row as Record<string, unknown>;
      return {
        title: titleFromParts('Vertical', packRow.slug, r.kind as string, r.section as string, index + 1),
        text: [
          `Pack: ${packRow.slug} v${packRow.version}`,
          `Kind: ${String(r.kind ?? 'unknown')}`,
          `Section: ${String(r.section ?? 'general')}`,
          `Jurisdiction: ${String(r.jurisdiction ?? 'us_national')}`,
          `Confidence: ${String(r.confidence ?? 'unknown')}`,
          `Source: ${String(r.source_title ?? 'internal review')}`,
          `Approved content: ${contentToText(r.content)}`,
        ].join('\n'),
      };
    })
    .slice(0, MAX_RETELL_TEXTS_PER_KB);

  if (texts.length === 0) return null;

  return {
    scope: 'vertical',
    name: retellKbName(`BC vertical ${packRow.slug} v${packRow.version}`),
    texts,
    content_hash: hashKnowledgeTexts(`vertical:${packRow.slug}:${packRow.version}`, texts),
    pack_slug: packRow.slug,
    pack_version: packRow.version,
    metadata: { pack_slug: packRow.slug, pack_version: packRow.version },
  };
}

async function buildClientBundle(
  supabase: SupabaseClient,
  clientId: string,
  clientKnowledgeBase: unknown,
): Promise<KnowledgeBundle | null> {
  const artifactTexts = flattenClientKnowledgeBase(clientKnowledgeBase);

  const { data } = await supabase
    .from('agency_knowledge')
    .select('id, kind, content, version')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(80);

  const agencyTexts = (Array.isArray(data) ? data : []).map((row, index) => {
    const r = row as Record<string, unknown>;
    return {
      title: titleFromParts('Client', r.kind as string, r.version as number, index + 1),
      text: contentToText(r.content),
    };
  });

  const texts = [...artifactTexts, ...agencyTexts]
    .filter((item) => item.text.trim())
    .slice(0, MAX_RETELL_TEXTS_PER_KB);

  if (texts.length === 0) return null;

  return {
    scope: 'client',
    name: retellKbName(`BC client ${clientId.slice(0, 8)} KB`),
    texts,
    content_hash: hashKnowledgeTexts(`client:${clientId}`, texts),
    client_id: clientId,
    metadata: { client_id: clientId },
  };
}

async function findExistingBinding(
  supabase: SupabaseClient,
  bundle: KnowledgeBundle,
): Promise<BindingRow | null> {
  let query = supabase
    .from('retell_knowledge_bindings')
    .select('id, retell_knowledge_base_id, retell_status, content_hash, source_count')
    .eq('scope', bundle.scope)
    .eq('content_hash', bundle.content_hash);

  if (bundle.scope === 'vertical') {
    query = query
      .eq('pack_slug', bundle.pack_slug)
      .eq('pack_version', bundle.pack_version);
  } else {
    query = query.eq('client_id', bundle.client_id);
  }

  const { data } = await query.maybeSingle();
  return data as BindingRow | null;
}

async function insertBinding(
  supabase: SupabaseClient,
  bundle: KnowledgeBundle,
  retellKb: RetellKnowledgeBaseResponse,
): Promise<RetellKnowledgeBinding> {
  const row = {
    scope: bundle.scope,
    pack_slug: bundle.pack_slug ?? null,
    pack_version: bundle.pack_version ?? null,
    client_id: bundle.client_id ?? null,
    content_hash: bundle.content_hash,
    retell_knowledge_base_id: retellKb.knowledge_base_id,
    retell_status: retellKb.status ?? 'in_progress',
    source_count: bundle.texts.length,
    metadata: bundle.metadata,
    last_synced_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('retell_knowledge_bindings')
    .insert(row)
    .select('retell_knowledge_base_id, retell_status, content_hash, source_count')
    .single();

  if (error) {
    const existing = await findExistingBinding(supabase, bundle);
    if (existing) {
      return {
        scope: bundle.scope,
        retell_knowledge_base_id: existing.retell_knowledge_base_id,
        content_hash: existing.content_hash,
        source_count: existing.source_count,
        retell_status: existing.retell_status,
      };
    }
    throw error;
  }

  const inserted = data as {
    retell_knowledge_base_id: string;
    retell_status: RetellKnowledgeBaseStatus;
    content_hash: string;
    source_count: number;
  };

  return {
    scope: bundle.scope,
    retell_knowledge_base_id: inserted.retell_knowledge_base_id,
    content_hash: inserted.content_hash,
    source_count: inserted.source_count,
    retell_status: inserted.retell_status,
  };
}

async function syncBundle(
  supabase: SupabaseClient,
  retell: RetellClientWithKnowledgeBase,
  bundle: KnowledgeBundle,
): Promise<RetellKnowledgeBinding> {
  const existing = await findExistingBinding(supabase, bundle);
  if (existing && existing.retell_status !== 'error') {
    return {
      scope: bundle.scope,
      retell_knowledge_base_id: existing.retell_knowledge_base_id,
      content_hash: existing.content_hash,
      source_count: existing.source_count,
      retell_status: existing.retell_status,
    };
  }

  const retellKb = await retell.knowledgeBase.create({
    knowledge_base_name: bundle.name,
    knowledge_base_texts: bundle.texts,
    enable_auto_refresh: false,
    max_chunk_size: 1400,
    min_chunk_size: 250,
  });

  if (!retellKb.knowledge_base_id) {
    throw new Error(`Retell did not return a knowledge_base_id for ${bundle.scope} KB`);
  }

  return insertBinding(supabase, bundle, retellKb);
}

export async function syncRetellKnowledgeBases(
  args: SyncRetellKnowledgeBasesArgs,
): Promise<RetellKnowledgeBinding[]> {
  const bundles = await Promise.all([
    buildVerticalBundle(args.supabase, args.vertical),
    buildClientBundle(args.supabase, args.clientId, args.clientKnowledgeBase),
  ]);

  const activeBundles = bundles.filter((bundle): bundle is KnowledgeBundle => Boolean(bundle));
  const synced: RetellKnowledgeBinding[] = [];
  for (const bundle of activeBundles) {
    synced.push(await syncBundle(args.supabase, args.retell, bundle));
  }
  return synced;
}
