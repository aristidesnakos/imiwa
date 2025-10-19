import { NextResponse, NextRequest } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import config from "@/config";
import { Profile } from "@/types/profiles";

export const dynamic = "force-dynamic";

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createServerComponentClient();
    await supabase.auth.exchangeCodeForSession(code);
    
    // Check if user has completed onboarding
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', user.id)
        .single() as { data: Pick<Profile, 'onboarding_complete'> | null };
      
      // Redirect to onboarding if not completed
      if (!profile?.onboarding_complete) {
        return NextResponse.redirect(requestUrl.origin + '/onboarding');
      }
    }
  }

  // URL to redirect to after sign in process completes (for users who completed onboarding)
  return NextResponse.redirect(requestUrl.origin + config.auth.callbackUrl);
}
