import { getServiceSupabase } from './token-utils';

const DEFAULT_WORKSPACE_NAME = 'My Workspace';

type SupabaseLike = ReturnType<typeof getServiceSupabase>;

function errorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const maybeMessage = 'message' in error ? error.message : '';
  return typeof maybeMessage === 'string' ? maybeMessage : '';
}

function isMissingColumnError(error: unknown, column: string): boolean {
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
    throw error;
  }

  return (data as T | null) ?? null;
}

async function findWorkspace<T>(supa: SupabaseLike, selectClause: string, userId: string): Promise<T | null> {
  const byUserId = await selectWorkspaceByColumn<T>(supa, selectClause, 'user_id', userId);
  if (byUserId) return byUserId;

  return await selectWorkspaceByColumn<T>(supa, selectClause, 'owner_id', userId);
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
    throw error;
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
