import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// `supabase` is null when the env vars aren't configured (e.g. in CI, where
// gallery code is tested against a fake client and never touches this
// module's export). Gallery functions must fail loudly at call time rather
// than this module throwing at import time.
export const supabase = url && key ? createClient(url, key) : null
