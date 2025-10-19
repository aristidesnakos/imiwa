"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Provider } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import config from "@/config";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaptchaVerification } from "@/components/CaptchaVerification";
import { useCaptcha } from "@/components/LayoutClient";

export default function Login() {
  const supabase = createClient();
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [isReviewerSignup, setIsReviewerSignup] = useState<boolean>(false);
  const [captchaVerified, setCaptchaVerified] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>("");
  const { captchaToken } = useCaptcha();

  // Check for reviewer signup parameter on client-side only
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('redirectTo') === '/reviewer-signup' || 
        searchParams.get('redirect') === '/reviewer-signup') {
      setIsReviewerSignup(true);
    }
  }, []); 

  // Reset error when captcha token changes
  useEffect(() => {
    if (captchaToken) {
      // Clear any previous errors when token is refreshed
      console.log('Captcha token refreshed');
    }
  }, [captchaToken]);

  const handleSignup = async (
    e: any,
    options: {
      type: string;
      provider?: Provider;
    }
  ) => {
    e?.preventDefault();

    setIsLoading(true);

    try {
      const { type, provider } = options;
      
      const callbackURL = `${window.location.origin}/api/auth/callback`;

      if (type === "oauth") {
        await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: callbackURL
          },
        });
      } else if (type === "magic_link") {
        try {
          // Validate email before proceeding
          const emailValidation = validateEmail(email);
          if (!emailValidation.isValid) {
            toast.error(emailValidation.error);
            setEmailError(emailValidation.error);
            return;
          }

          // Validate captcha verification
          if (!validateCaptcha()) {
            return;
          }

          // Use the secure sign-in API route
          const response = await fetch('/api/auth/secure-signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              captchaToken: captchaToken || undefined
            })
          });

          const result = await response.json();
          const error = !response.ok ? { message: result.error } : null;
          
          if (error) {
            console.error('Magic link error:', error);
            
            // Handle specific error cases
            if (error.message.includes('captcha')) {
              toast.error("CAPTCHA verification failed. Please try again.");
              setCaptchaVerified(false);
            } else {
              toast.error(`Authentication error: ${error.message}`);
            }
            return;
          }
          
          toast.success("Check your emails!");
          setIsDisabled(true);
        } catch (err: any) {
          console.error('Magic link exception:', err);
          toast.error(`Failed to send magic link: ${err?.message || 'Unknown error'}`);
          setCaptchaVerified(false);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Email validation function
  const validateEmail = (email: string): { isValid: boolean; error: string } => {
    const trimmedEmail = email.trim().toLowerCase();
    
    // Check if email is empty
    if (!trimmedEmail) {
      return { isValid: false, error: "Email is required" };
    }
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: "Please enter a valid email address" };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /^[a-z]@[a-z]+\.(com|net|org)$/i, // Single letter emails like a@gmail.com
      /^[a-z]{1,2}@/i, // Single or double letter emails
      /^(test|example|fake|dummy|spam|abc|xyz|asdf|qwerty)@/i, // Common test email patterns
      /^[a-z]{1,3}@[a-z]{3,6}\.(com|net|org)$/i, // Very short emails
      /@(example|test|fake|dummy|spam)\./i, // Suspicious domains
      /^[a-z]+@[a-z]+\.[a-z]{2}$/i, // Domain with only 2 letter TLD and short local part
      /xxx|[0-9]{10,}|3\.?1415|2\.?7182/i, // xxx, long numbers, pi, e
      /(brainless|stupid|hack|pwn|admin|root|exploit)/i, // Offensive/malicious
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(trimmedEmail)) {
        return { isValid: false, error: "Please enter a valid business or personal email address" };
      }
    }
    
    // Block common disposable/temporary email domains
    const disposableDomains = [
      'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
      'temp-mail.org', 'throwaway.email', 'getnada.com', 'sharklasers.com',
      'evimzo.com', 'zssasa.com', 'yourmyth.ai', 'mail.com', 'xyz.com',
      'yopmail.com', 'trashmail.com', 'mailnesia.com', 'dropmail.me'
    ];
    
    const domain = trimmedEmail.split('@')[1];
    if (disposableDomains.includes(domain)) {
      return { isValid: false, error: "Temporary email addresses are not allowed. Please use a permanent email." };
    }
    
    return { isValid: true, error: "" };
  };

  // Validate captcha verification
  const validateCaptcha = (): boolean => {
    if (!captchaVerified) {
      toast.error('Please complete the captcha verification first');
      return false;
    }

    if (!captchaToken) {
      toast.error('Captcha token is missing. Please refresh and try again.');
      return false;
    }
    
    return true;
  };

  // Handle email input change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (newEmail) {
      const validation = validateEmail(newEmail);
      setEmailError(validation.error);
    } else {
      setEmailError("");
    }
  };

  // Handle captcha verification
  const handleCaptchaVerify = () => {
    setCaptchaVerified(true);
  };

  return (
    <main className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="inline-flex items-center text-primary hover:font-bold transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-6 h-6 mr-2"
            >
              <path
                fillRule="evenodd"
                d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
                clipRule="evenodd"
              />
            </svg>
            <span>Back to home</span>
          </Link>
        </div>

        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Sign in to {config.appName}
            </CardTitle>
            {isReviewerSignup && (
              <CardDescription className="text-center mt-4">
                Join Llanai to improve your grammar
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="default"
              className="w-full hover:bg-secondary hover:text-background"
              onClick={(e) => handleSignup(e, { type: "oauth", provider: "google" })}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 48 48"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                  />
                  <path
                    fill="#FF3D00"
                    d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                  />
                </svg>
              )}
              <span>Sign in with Google</span>
            </Button>

            <div className="relative flex items-center justify-center gap-2 my-4">
              <div className="flex-grow border-t"></div>
            <span className="px-2 text-xs uppercase text-primary">
                Or continue with email
              </span>
              <div className="flex-grow border-t"></div>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => handleSignup(e, { type: "magic_link" })}
            >
              <div className="space-y-2">
                <input
                  required
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="ari@llanai.com"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    emailError 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-gray-300 focus:ring-primary/50'
                  }`}
                  onChange={handleEmailChange}
                />
                {emailError && (
                  <p className="text-sm text-red-600 mt-1">{emailError}</p>
                )}
              </div>

              <Button
                className="w-full hover:bg-secondary hover:text-background"
                disabled={isLoading || isDisabled || !!emailError}
                type="submit"
              >
                {isLoading && (
                  <span className="loading loading-spinner loading-xs mr-2"></span>
                )}
                Send Magic Link
              </Button>
            </form>
          </CardContent>
        </Card>
        {/* CAPTCHA verification */}
        <div className="items-center mx-auto">
          <CaptchaVerification
            onVerified={handleCaptchaVerify}
          />
        </div>
      </div>
    </main>
  );
}
