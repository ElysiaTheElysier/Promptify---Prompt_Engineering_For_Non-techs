import { createClient } from '@supabase/supabase-js';

// Safe environment variable access for both Vite browser runtime and Node test runner
const nodeEnv = typeof globalThis !== 'undefined' && (globalThis as any).process?.env;
const env: Record<string, string | undefined> = 
  (typeof import.meta !== 'undefined' && import.meta && (import.meta as any).env) 
    ? (import.meta as any).env 
    : (nodeEnv || {});

function sanitizeSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/rest\/v1\/?$/, '');
  url = url.replace(/\/+$/, '');
  return url;
}

const rawSupabaseUrl = env.VITE_SUPABASE_URL || '';
const rawSupabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

export const supabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);
export const supabaseAnonKey = rawSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey.length >= 10 &&
  !supabaseAnonKey.includes('placeholder') &&
  !supabaseAnonKey.includes('your-anon-key')
);

// Khởi tạo Supabase client nếu có biến môi trường hợp lệ, ngược lại dùng dummy client an toàn
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
  : createClient(
      'https://dummy-placeholder-promptify.supabase.co',
      'dummy-anon-key-placeholder',
      { auth: { persistSession: false } }
    );
