import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://hbwogktdajorojljkjwg.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhid29na3RkYWpvcm9qbGprandnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5Nzk3OTAsImV4cCI6MjA3NDU1NTc5MH0.5OGNa0_WfxPMFqxj9sY4Tq6WZtOaxjejS7Z4HNzbe7w'

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
