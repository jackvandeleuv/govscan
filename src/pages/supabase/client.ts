import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let accessToken: string | null = null;

const customFetch = async (url: string, options: RequestInit) => {
  if (accessToken) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    };
  }
  return fetch(url, options);
};


const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
(supabase as any).fetch = customFetch; 

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export default supabase;
