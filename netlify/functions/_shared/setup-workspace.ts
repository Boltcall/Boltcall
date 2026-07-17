import { getServiceSupabase } from './token-utils';

const DEFAULT_WORKSPACE_NAME = 'My Workspace';

type SupabaseLike = ReturnType<typeof getServiceSupabase>;

function errorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const maybeMessage = 'message' in error ? error.message : '';
  return typeof maybeMessage === 'string' ? maybeMessage : '';
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = 'code' in error ? error.code : undefined;
  return typeof code === 'string' ? code : undefined;
}

// asError: Supabase/PostgREST rejects with a plain error object, not an Error
// instance. Throwing it raw crashes the Lambda runtime's serializer (renders
// as an opaque "[object Object]" and surfaces to the client as a bare 502
// with no diagnosable message) — always wrap before throwing.
function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  const message = errorMessage(error) || 'Unknown workspace query error';
  const err = new Error(message);
  Object.assign(err, { cause: error });
  return err;
}

// 42703 = Postgres undefined_column — the version-independent signal.
// PostgREST's message wording for a bad filter column ("failed to parse
// filter", table-qualified names, etc.) doesn't reliably match a fixed
// string, so the code is checked first and the message patterns kept only
// as a fallback for older/differently-worded PostgREST responses.
function isMissingColumnError(error: unknown, column: string): boolean {
  if (errorCode(error) === '42703') return true;
  const message = errorMessage(error).toLowerCase();
  if (!message) return false;
  return (
    message.includes(`column "${column.toLowerCase()}" does not exist`) ||
    message.includes(`could not find the '${column.toLowerCase()}' column`) ||
    message.includes(`could not find the "${column.toLowerCase()}" column`)
  );
}

function isDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? error.code : undefined;
  if (code === '23505') return true;
  return errorMessage(error).toLowerCase().includes('duplicate key value');
}

async function selectWorkspaceByColumn<T>(
  supa: SupabaseLike,
  selectClause: string,
  column: 'user_id' | 'owner_id',
  userId: string,
): Promise<T | null> {
  const { data, error } = await supa
    .from('workspaces')
    .select(selectClause)
    .eq(column, userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error, column)) {
      return null;
    }
    throw asError(error);
  }

  return (data as T | null) ?? null;
}

async function findWorkspace<T>(supa: SupabaseLike, selectClause: string, userId: string): Promise<T | null> {
  const byUserId = await selectWorkspaceByColumn<T>(supa, selectClause, 'user_id', userId);
  if (byUserId) return byUserId;

  return await selectWorkspaceByColumn<T>(supa, selectClause, 'owner_id', userId);
}

export async function findWorkspaceForUser<T>(
  userId: string,
  selectClause: string,
): Promise<T | null> {
  return await findWorkspace<T>(getServiceSupabase(), selectClause, userId);
}

// workspaces.slug is NOT NULL with a UNIQUE constraint (workspaces_slug_key)
// but nothing in this table's tracked migrations adds it — schema drift.
// src/lib/database.ts's createWorkspace() (the client-side onboarding path)
// already generates one as `<slugified-name>-<timestamp36>-<random5>`; no
// business name is available here, so this mirrors that shape without one.
function generateWorkspaceSlug(userId: string): string {
  const timestamp = Date.now().toString(36);
  const randomString = Math.random().toString(36).slice(2, 7);
  return `workspace-${userId.replace(/-/g, '').slice(0, 8)}-${timestamp}-${randomString}`;
}

async function insertWorkspaceByColumn<T>(
  supa: SupabaseLike,
  selectClause: string,
  column: 'user_id' | 'owner_id',
  userId: string,
): Promise<T | null> {
  const payload = {
    [column]: userId,
    name: DEFAULT_WORKSPACE_NAME,
    slug: generateWorkspaceSlug(userId),
  };

  const { data, error } = await supa
    .from('workspaces')
    .insert(payload)
    .select(selectClause)
    .single();

  if (error) {
    if (isMissingColumnError(error, column) || isDuplicateError(error)) {
      return null;
    }
    throw asError(error);
  }

  return (data as T | null) ?? null;
}

export async function ensureWorkspaceForUser<T>(
  userId: string,
  selectClause: string,
): Promise<T | null> {
  const supa = getServiceSupabase();

  const existing = await findWorkspace<T>(supa, selectClause, userId);
  if (existing) return existing;

  const createdViaUserId = await insertWorkspaceByColumn<T>(supa, selectClause, 'user_id', userId);
  if (createdViaUserId) return createdViaUserId;

  const createdViaOwnerId = await insertWorkspaceByColumn<T>(supa, selectClause, 'owner_id', userId);
  if (createdViaOwnerId) return createdViaOwnerId;

  return await findWorkspace<T>(supa, selectClause, userId);
}
