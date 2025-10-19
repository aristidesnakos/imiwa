import { NextRequest, NextResponse } from 'next/server';

const rateLimit = (limit: number, windowMs: number) => {
  const requests = new Map<string, { count: number; timestamp: number }>();

  const check = async (req: NextRequest): Promise<NextResponse | null> => {
    const ip = req.headers.get('x-forwarded-for');
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
