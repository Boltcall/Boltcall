import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://puszjwovldwgitfpsnfm.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1c3pqd292bGR3Z2l0ZnBzbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MzI3NzUsImV4cCI6MjEwMDIwODc3NX0.S5bHgXWWdcnB_S9_mUFF2HPbl84dPks9_LBvWAFIQeQ'

const hasSupabaseConfig = Boolean(
  (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL) &&
    (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY)
)

if (!hasSupabaseConfig && import.meta.env.DEV) {
  console.warn('Supabase env vars are missing; using the default Boltcall project config in this local session.')
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

// Create the Supabase client with fallback credentials
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export default supabase;
