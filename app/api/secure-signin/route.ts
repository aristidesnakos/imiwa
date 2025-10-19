import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { performSecurityCheck, logSuspiciousActivity } from '@/lib/auth-security';
import rateLimit from '@/middlewares/rateLimiter';

// Create rate limiter: 5 attempts per 15 minutes
const limiter = rateLimit(5, 15 * 60 * 1000);

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await limiter.check(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Get request data
    const { email, captchaToken, provider } = await req.json();
    
    // Get IP address for security checks
    const ipAddress = 
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      null;
    
    // Validate captcha token
    if (!captchaToken && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'CAPTCHA verification required' },
        { status: 400 }
      );
    }
    
    // OAuth login (Google)
    if (provider === 'google') {
      // Still perform basic security check on OAuth
      const securityCheck = await performSecurityCheck(email || '', ipAddress);
      if (!securityCheck.isAllowed && securityCheck.shouldLog) {
        await logSuspiciousActivity(email || 'oauth_attempt', ipAddress, securityCheck.reason || 'OAuth suspicious');
      }
      
      // Let Supabase handle OAuth
      return NextResponse.json({ 
        message: 'Use Supabase client for OAuth',
        provider 
      });
    }
    
    // Magic link login
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Perform comprehensive security check
    const securityCheck = await performSecurityCheck(email, ipAddress);
    
    if (!securityCheck.isAllowed) {
      // Log suspicious activity
      if (securityCheck.shouldLog) {
        await logSuspiciousActivity(email, ipAddress, securityCheck.reason || 'Security check failed');
      }
      
      return NextResponse.json(
        { error: securityCheck.reason || 'Authentication not allowed' },
        { status: 403 }
      );
    }
    
    // Verify CAPTCHA with Cloudflare
    if (captchaToken && process.env.TURNSTILE_SECRET_KEY) {
      const captchaResponse = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: captchaToken,
            remoteip: ipAddress || '',
          }),
        }
      );
      
      const captchaResult = await captchaResponse.json();
      if (!captchaResult.success) {
        return NextResponse.json(
          { error: 'CAPTCHA verification failed' },
          { status: 400 }
        );
      }
    }
    
    // Proceed with Supabase magic link
    const supabase = await createServerComponentClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${req.nextUrl.origin}/api/auth/callback`,
      },
    });
    
    if (error) {
      // Log the error
      await logSuspiciousActivity(email, ipAddress, `Auth error: ${error.message}`);
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: 'Magic link sent successfully',
      email,
    });
    
  } catch (error) {
    console.error('Secure sign-in error:', error);
    return NextResponse.json(
      { error: 'An error occurred during authentication' },
      { status: 500 }
    );
  }
}