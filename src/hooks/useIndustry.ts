import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { wordingFor, isLawFirm } from '../lib/industryWording';

// business_profiles.main_category per user, fetched once per session.
const cache = new Map<string, Promise<string | null>>();

function loadIndustry(userId: string): Promise<string | null> {
  let p = cache.get(userId);
  if (!p) {
    p = (async () => {
      try {
        const { data } = await supabase.from('business_profiles').select('main_category').eq('user_id', userId).limit(1).maybeSingle();
        return (data?.main_category as string | null) ?? null;
      } catch {
        cache.delete(userId); // retry next mount instead of caching a failure
        return null;
      }
    })();
    cache.set(userId, p);
  }
  return p;
}

/** Industry slug of the signed-in workspace plus ready-to-use wording. */
export function useIndustry() {
  const { user } = useAuth();
  const [industry, setIndustry] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    loadIndustry(user.id).then((i) => {
      if (!cancelled) setIndustry(i);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { industry, lawFirm: isLawFirm(industry), words: wordingFor(industry) };
}
