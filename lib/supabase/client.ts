import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not set. Using mock client for build.');
    // Return a mock client for build time
    return {
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
    } as any;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
