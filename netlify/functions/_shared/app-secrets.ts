import { getServiceSupabase } from './token-utils';

const cache = new Map<string, string | null>();

export async function getAppSecret(key: string): Promise<string | null> {
  if (cache.has(key)) return cache.get(key) ?? null;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('app_secrets')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`[app-secrets] Failed to read ${key}:`, error.message || error);
    cache.set(key, null);
    return null;
  }

  const value = typeof data?.value === 'string' && data.value.length > 0 ? data.value : null;
  cache.set(key, value);
  return value;
}

