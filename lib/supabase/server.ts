import { createClient as createBrowserClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Mock client helper
const createMockClient = () => ({
  from: () => ({
    select: () => ({ data: [] as any[], error: null as any }),
    insert: () => ({ data: null as any, error: null as any }),
    update: () => ({ data: null as any, error: null as any }),
    delete: () => ({ data: null as any, error: null as any }),
  }),
  auth: {
    getUser: () => ({ data: { user: null as any }, error: null as any }),
    signOut: () => ({ error: null as any }),
  },
} as any);

// For static generation (no cookies)
export function createStaticClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not set. Using mock client for build.');
    return createMockClient();
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// For operations that require service role permissions (bypassing RLS)
export function createServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase service role environment variables not set. Using mock client for build.');
    return createMockClient();
  }
  return createBrowserClient(supabaseUrl, supabaseServiceKey);
}

// For server-side rendering and API routes (with cookies)
export async function createServerComponentClient() {
  if (typeof window !== 'undefined') {
    throw new Error("createServerComponentClient must be called in a server-side context");
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not set. Using mock client for build.');
    return createMockClient();
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // This can be ignored if you have middleware refreshing user sessions
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // This can be ignored if you have middleware refreshing user sessions
        }
      },
    },
  });
}
