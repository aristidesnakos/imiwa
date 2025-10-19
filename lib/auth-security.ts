import { createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

interface SecurityCheckResult {
  isAllowed: boolean;
  reason?: string;
  shouldLog?: boolean;
}

// Enhanced suspicious email patterns
const SUSPICIOUS_PATTERNS = [
  // Single letter or very short emails
  /^[a-z]{1,2}@/i,
  // Test/fake patterns
  /^(test|example|fake|dummy|spam|abc|xyz|asdf|qwerty)/i,
  // Offensive/inappropriate usernames
  /(brainless|stupid|idiot|hack|pwn|admin|root|exploit)/i,
  // Random character sequences
  /[0-9]{10,}|xxx|[a-z]{15,}/i,
  // Common bot patterns
  /^(user|client|customer)[0-9]+@/i,
  // Suspicious number patterns (like pi, e, etc.)
  /3\.?1415|2\.?7182/i,
];

// Expanded list of disposable email domains
const DISPOSABLE_DOMAINS = [
  // Common disposable email services
  'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
  'temp-mail.org', 'throwaway.email', 'getnada.com', 'sharklasers.com',
  'evimzo.com', 'zssasa.com', 'yourmyth.ai', 'trashmail.com', 'yopmail.com',
  'mailnesia.com', 'dropmail.me', 'mintemail.com', 'mailcatch.com',
  // Suspicious generic domains
  'mail.com', 'email.com', 'xyz.com', 
];

// IP-based rate limiting with exponential backoff
const authAttempts = new Map<string, {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
}>();

const MAX_ATTEMPTS_PER_HOUR = 5;
const MAX_ATTEMPTS_PER_DAY = 20;
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function performSecurityCheck(
  email: string,
  ipAddress?: string | null
): Promise<SecurityCheckResult> {
  const normalizedEmail = email.trim().toLowerCase();
  
  // Check IP-based rate limiting
  if (ipAddress) {
    const ipCheck = checkIpRateLimit(ipAddress);
    if (!ipCheck.isAllowed) {
      return ipCheck;
    }
  }
  
  // Check email format
  if (!isValidEmailFormat(normalizedEmail)) {
    return {
      isAllowed: false,
      reason: "Invalid email format",
    };
  }
  
  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(normalizedEmail)) {
      return {
        isAllowed: false,
        reason: "Email contains suspicious patterns",
        shouldLog: true,
      };
    }
  }
  
  // Check disposable domains
  const domain = normalizedEmail.split('@')[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return {
      isAllowed: false,
      reason: "Disposable email addresses are not allowed",
      shouldLog: true,
    };
  }
  
  // Check domain reputation (basic check)
  if (!isReputableDomain(domain)) {
    return {
      isAllowed: false,
      reason: "Please use a reputable email provider",
      shouldLog: true,
    };
  }
  
  return { isAllowed: true };
}

function checkIpRateLimit(ipAddress: string): SecurityCheckResult {
  const now = Date.now();
  const attempt = authAttempts.get(ipAddress);
  
  if (!attempt) {
    authAttempts.set(ipAddress, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      blocked: false,
    });
    return { isAllowed: true };
  }
  
  // Check if IP is blocked
  if (attempt.blocked) {
    if (now - attempt.lastAttempt < BLOCK_DURATION_MS) {
      return {
        isAllowed: false,
        reason: "Too many authentication attempts. Please try again later.",
        shouldLog: true,
      };
    }
    // Unblock after duration
    attempt.blocked = false;
    attempt.count = 1;
    attempt.firstAttempt = now;
    attempt.lastAttempt = now;
  }
  
  // Check hourly limit
  const hourAgo = now - 60 * 60 * 1000;
  if (attempt.lastAttempt > hourAgo) {
    if (attempt.count >= MAX_ATTEMPTS_PER_HOUR) {
      attempt.blocked = true;
      return {
        isAllowed: false,
        reason: "Rate limit exceeded. Please try again in an hour.",
        shouldLog: true,
      };
    }
  } else {
    // Reset hourly counter
    attempt.count = 1;
    attempt.firstAttempt = now;
  }
  
  // Check daily limit
  const dayAgo = now - 24 * 60 * 60 * 1000;
  if (attempt.firstAttempt > dayAgo && attempt.count >= MAX_ATTEMPTS_PER_DAY) {
    attempt.blocked = true;
    return {
      isAllowed: false,
      reason: "Daily limit exceeded. Please try again tomorrow.",
      shouldLog: true,
    };
  }
  
  // Increment counter
  attempt.count++;
  attempt.lastAttempt = now;
  
  return { isAllowed: true };
}

function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email);
}

function isReputableDomain(domain: string): boolean {
  // Allow common reputable domains
  const reputableDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
    'protonmail.com', 'fastmail.com', 'zoho.com', 'aol.com', 'yandex.com',
    'mail.ru', 'qq.com', '163.com', '126.com', 'sina.com', 'naver.com',
  ];
  
  if (reputableDomains.includes(domain)) {
    return true;
  }
  
  // Allow corporate/educational domains
  if (domain.endsWith('.edu') || domain.endsWith('.gov') || domain.endsWith('.org')) {
    return true;
  }
  
  // Allow domains with at least a subdomain (e.g., company.com)
  const parts = domain.split('.');
  if (parts.length >= 2 && parts[0].length >= 3 && parts[1].length >= 2) {
    return true;
  }
  
  return false;
}

// Log suspicious activity to Supabase
export async function logSuspiciousActivity(
  email: string,
  ipAddress: string | null,
  reason: string
) {
  try {
    const supabase = createServiceClient();
    await supabase.from('security_logs').insert({
      email,
      ip_address: ipAddress,
      reason,
      timestamp: new Date().toISOString(),
      action: 'auth_attempt_blocked',
    });
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
  }
}

// Clean up old entries periodically
export function cleanupOldAttempts() {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  
  for (const [ip, attempt] of authAttempts.entries()) {
    if (attempt.lastAttempt < dayAgo) {
      authAttempts.delete(ip);
    }
  }
}

// Run cleanup every hour
if (typeof window === 'undefined') {
  setInterval(cleanupOldAttempts, 60 * 60 * 1000);
}