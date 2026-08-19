import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fenmghxzmawubuxavrol.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zoaKmW0DIRPgwKPhHUBEZQ_ZJt4q4mN";

// Publishable (anon) key — safe for the browser. Session persistence is off so
// this client is also safe to evaluate during SSR.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: undefined,
    persistSession: false,
    autoRefreshToken: false,
  },
});
