# Production 404 Errors: Static Generation vs Dynamic Rendering

## Problem Summary

**Issue**: Production deployment returning 404 errors for dynamic routes that work perfectly in development.

**Root Cause**: Failed static site generation (SSG) during build process prevented route creation, while development server uses dynamic rendering by default.

## Technical Details

### The Symptoms
- ✅ Development: `GET /kanji/十 200` (works locally)
- ❌ Production: `GET /kanji/%E5%8D%81 404` (fails on Vercel)
- ✅ API routes: `/api/kanji-svg/05341` work in both environments

### The Investigation Path
1. **Build Process Analysis**: Local builds succeeded, but production builds were failing silently
2. **Dependency Issues**: Missing environment variables caused build-time failures
3. **Static Generation Complexity**: `generateStaticParams()` worked locally but failed in production

### The Root Cause
Next.js App Router attempts static generation by default. When `generateStaticParams()` fails during build:
- Development falls back to dynamic rendering
- Production deployment **omits the routes entirely** → 404 errors

## Solutions Applied

### 1. Remove Build Dependencies
```bash
# Removed unused dependencies causing build failures
pnpm remove @supabase/ssr @supabase/supabase-js
rm -rf lib/supabase hooks/useCheckout.ts lib/auth-security.ts
```

### 2. Force Dynamic Rendering
```typescript
// app/[dynamic-route]/page.tsx
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  // Return empty array to force all pages dynamic
  return [];
}

export const dynamicParams = true;
```

## Key Learnings for Full Stack Developers

### 1. **Development ≠ Production Behavior**
- Development server is more forgiving with dynamic rendering
- Production builds are stricter about static generation
- Always test production builds locally: `npm run build`

### 2. **Static vs Dynamic Trade-offs**
| Approach | Performance | Reliability | Build Complexity |
|----------|-------------|-------------|------------------|
| Static (SSG) | ⚡ Fastest | ⚠️ Build-dependent | 🔴 High |
| Dynamic (SSR) | 🐌 Slower | ✅ Reliable | 🟢 Low |

### 3. **When to Choose Dynamic Rendering**
- Complex data dependencies at build time
- External API dependencies (CDNs, databases)
- Large numbers of dynamic routes (>1000 pages)
- Frequent content changes requiring real-time data

### 4. **Debugging Production Route Issues**
```bash
# Test production build locally
npm run build && npm run start

# Check route generation in build output
# Look for: ● (SSG) vs ƒ (Dynamic) indicators

# Verify API routes work independently
curl https://yourapp.com/api/endpoint
```

## Prevention Strategies

### 1. **Minimize Build Dependencies**
- Keep `generateStaticParams()` simple
- Avoid external API calls during build
- Use environment variables defensively

### 2. **Graceful Degradation**
```typescript
export async function generateStaticParams() {
  try {
    // Attempt static generation
    return await generatePaths();
  } catch (error) {
    console.warn('Static generation failed, falling back to dynamic');
    return []; // Force dynamic rendering
  }
}
```

### 3. **Build Validation**
```json
{
  "scripts": {
    "build": "next build",
    "build:test": "next build && next start",
    "validate:routes": "curl -f http://localhost:3000/your-dynamic-route"
  }
}
```

## Applicable Patterns

This solution pattern applies to:
- **E-commerce**: Product pages with large catalogs
- **CMS Systems**: Dynamic content with complex dependencies  
- **Documentation Sites**: Auto-generated pages from external sources
- **User-Generated Content**: Profiles, posts, dynamic listings

## Key Takeaway

**When in doubt, go dynamic.** Static generation is an optimization, not a requirement. A working dynamic site is better than a broken static one.