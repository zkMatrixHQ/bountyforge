import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Get Supabase client (lazy initialization)
 * Returns null if env vars are missing (for Day 2 testing without Supabase)
 */
function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Supabase client initialized');
  }
  
  return supabaseClient;
}

/**
 * Supabase client with service role key
 * Used for server-side operations and auth validation
 * Returns null if env vars are missing
 */
export const supabase = getSupabase();

