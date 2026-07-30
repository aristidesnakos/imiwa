/**
 * scripts/lib/google-service-account-auth.ts
 *
 * Zero-dependency Google service-account auth (node:crypto only — no
 * `googleapis`/`google-auth-library`). Exchanges a service-account JSON key
 * for a bearer token via the standard RS256 self-signed-JWT grant, so any
 * script can call any Google API the service account has been granted access
 * to (Search Console, and anything else added later) with the same two
 * functions.
 *
 * PORTABLE ACROSS PROJECTS: this file has no imports from the rest of this
 * repo. Copy it into another project's `scripts/lib/` as-is — nothing to
 * rename except perhaps the CREDENTIAL_ENV_VAR default if you want a
 * project-specific env var name.
 *
 * Usage:
 *   const key = parseServiceAccountKey(process.env.GSC_SERVICE_ACCOUNT_KEY!);
 *   const token = await getGoogleAccessToken(key, 'https://www.googleapis.com/auth/webmasters.readonly');
 */

import { createSign } from 'node:crypto';

export interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  private_key_id?: string;
  type?: string;
}

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Accepts either raw service-account JSON or that JSON base64-encoded. The
 * base64 form is worth supporting because a PEM private key contains
 * newlines, and newlines are the single most common way a pasted secret gets
 * mangled (GitHub Secrets, Vercel env vars, etc.) into an unhelpful
 * "error:0909006C" OpenSSL failure.
 */
export function parseServiceAccountKey(raw: string, envVarName = 'the credential env var'): ServiceAccountKey {
  const trimmed = raw.trim();
  let text = trimmed;
  if (!trimmed.startsWith('{')) {
    try {
      text = Buffer.from(trimmed, 'base64').toString('utf8');
    } catch {
      // fall through to the JSON.parse error below
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `${envVarName} is not valid JSON (nor base64-encoded JSON). Paste the ` +
        'entire downloaded service-account key file, including the outer braces.'
    );
  }

  const key = parsed as Partial<ServiceAccountKey>;
  if (!key.client_email || !key.private_key) {
    throw new Error(
      `${envVarName} is missing "client_email" and/or "private_key". That ` +
        'usually means an OAuth client secret was pasted instead of a ' +
        'service-account key. Re-download from IAM > Service Accounts > Keys.'
    );
  }
  // GitHub/Vercel secrets sometimes arrive with literal backslash-n instead of newlines.
  const private_key = key.private_key.includes('\\n')
    ? key.private_key.replace(/\\n/g, '\n')
    : key.private_key;

  return { ...key, private_key } as ServiceAccountKey;
}

/**
 * Exchange a self-signed RS256 JWT for an access token scoped to `scope`.
 * One token per scope; Google does not support requesting multiple
 * incompatible scopes in a single call for service accounts in a way that's
 * worth generalizing here — call this once per scope you need.
 */
export async function getGoogleAccessToken(key: ServiceAccountKey, scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT', kid: key.private_key_id };
  const claims = {
    iss: key.client_email,
    scope,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600, // Google rejects anything beyond 1 hour
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  let signature: string;
  try {
    signature = base64url(createSign('RSA-SHA256').update(signingInput).sign(key.private_key));
  } catch (err) {
    throw new Error(
      'Failed to sign the JWT with the service-account private key. The key is ' +
        'probably truncated or had its newlines mangled when it was stored as a ' +
        `secret. Original error: ${(err as Error).message}`
    );
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Token exchange failed (${res.status}). Google said: ${text}\n` +
        'Common causes: the relevant API is not enabled on the Google Cloud ' +
        'project, or the service-account key has been deleted/disabled.'
    );
  }
  const body = JSON.parse(text) as { access_token?: string };
  if (!body.access_token) {
    throw new Error(`Token endpoint returned no access_token: ${text}`);
  }
  return body.access_token;
}
