import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract the real client IP from the request.
 * `x-forwarded-for` can be a comma-separated list (client, proxy1, proxy2 …);
 * we always want the first entry (the original caller).
 * Fall back to `x-real-ip` which Vercel also populates.
 */
function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip');
}

const rateLimit = (limit: number, windowMs: number) => {
  const requests = new Map<string, { count: number; timestamp: number }>();

  const check = async (req: NextRequest): Promise<NextResponse | null> => {
    const ip = getClientIp(req);
    const now = Date.now();

    if (!ip) {
      return NextResponse.json({ error: "Unable to determine IP address" }, { status: 500 });
    }

    const requestLog = requests.get(ip) || { count: 0, timestamp: now };

    if (now - requestLog.timestamp > windowMs) {
      requestLog.count = 1;
      requestLog.timestamp = now;
    } else {
      requestLog.count += 1;
    }

    requests.set(ip, requestLog);

    if (requestLog.count > limit) {
      return NextResponse.json({ error: "Too many requests, please try again later." }, { status: 429 });
    }

    return null;
  };

  return { check };
};

export default rateLimit;
