import { createClient } from '@supabase/supabase-js'

// Client navigateur (clé anon). La session est persistée pour garder l'utilisateur connecté.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
