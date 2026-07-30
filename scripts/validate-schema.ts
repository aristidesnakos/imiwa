/**
 * scripts/validate-schema.ts
 *
 * Structured-data (JSON-LD) validator for the production build.
 * Run manually:  pnpm build && npx tsx --tsconfig tsconfig.json scripts/validate-schema.ts
 * Run in CI:     .github/workflows/schema-check.yml (every push / PR touching SEO surfaces)
 *
 * WHY THIS VALIDATES BUILD ARTEFACTS, NOT SOURCE
 * ----------------------------------------------
 * Two structured-data bugs shipped to production and stayed live for months:
 *
 *   1. Every one of the ~1,900 kanji pages claimed `author.name: "Imiwa"` — the
 *      git repo name, not the brand. Reading the source would not have flagged
 *      it; only comparing the rendered value against the single source of truth
 *      does.
 *   2. Every Organization/publisher logo pointed at `/logo.png`, which 404'd
 *      because no such file was ever committed. A logo URL that resolves to a
 *      404 is worse for rich-result eligibility than omitting the property, and
 *      no amount of JSON-schema-shaped validation catches it — you have to
 *      resolve the URL to a file on disk.
 *
 * A third failure mode is the apex/www split: JSON-LD asserting
 * `https://michikanji.com` while every canonical said `https://www.michikanji.com`
 * hands Google entity URLs that 301, splitting one brand across two hostnames.
 *
 * So this script reads what the build actually emitted:
 *   - `.next/server/app/**\/*.html`               — prerendered pages, e.g.
 *                                                   `.next/server/app/kanji/日.html`
 *   - `.next/server/app/sitemap.xml.body`         — static route handler output
 *   - `.next/server/app/robots.txt.body`          — ditto
 *
 * Expected values are IMPORTED from `lib/seo/site.ts`. They are deliberately not
 * duplicated here: a second hardcoded copy of the brand strings would just become
 * the next place the brand silently drifts.
 *
 * Fully offline and hermetic — no Google Rich Results Test, no network at all, so
 * CI cannot go flaky or get rate-limited. Run the hosted tool by hand when you
 * want Google's own opinion; this guards the regressions.
 *
 * Flags:
 *   --all           deep-validate every prerendered kanji page (default: sample)
 *   --sample=<n>    size of the kanji page sample (default 60)
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  SITE_URL,
  SITE_NAME,
  SITE_LOGO,
  SITE_OG_IMAGE,
  KANJI_CONTENT_PUBLISHED,
  KANJI_CONTENT_LAST_MODIFIED,
} from '../lib/seo/site';

// ─── Configuration ───────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..');
const BUILD_APP_DIR = path.join(REPO_ROOT, '.next', 'server', 'app');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
const APP_DIR = path.join(REPO_ROOT, 'app');

const SITE_HOST = new URL(SITE_URL).host; // www.michikanji.com
const APEX_HOST = SITE_HOST.replace(/^www\./, ''); // michikanji.com

/**
 * Brand names that must never appear as an `author` / `publisher` / entity name.
 * `Imiwa` is the git repo name; it leaked onto every kanji page for months.
 */
const FORBIDDEN_ENTITY_NAMES = ['Imiwa', 'imiwa'];

/** Pages that must carry the site-wide entity graph from `app/layout.tsx`. */
const PAGES_REQUIRING_SITE_GRAPH = ['index.html', 'kanji.html'];

/** Minimum number of prerendered kanji pages we expect the build to contain. */
const MIN_KANJI_PAGES = 1000;

/** Kanji pages always deep-validated, whatever the sample lands on. */
const SAMPLE_ANCHORS = ['日', '水', '語', '一', '花', '龍'];

/**
 * Files under `.next/server/app` skipped by the apex-host scan. Source maps
 * embed the original TS sources, so a comment mentioning the apex would fail the
 * scan without any apex URL ever reaching a crawler.
 */
const APEX_SCAN_SKIP = /\.(map|nft\.json)$/;

/** Extensions the apex scan reads as text. */
const APEX_SCAN_EXTS = new Set(['.html', '.body', '.rsc', '.js', '.json', '.txt', '.meta', '.css']);

// ─── Problem reporting ───────────────────────────────────────────────────────

interface Problem {
  /** Artefact the problem was found in, relative to the repo root. */
  file: string;
  /** schema.org type the problem sits on, e.g. `Article`. */
  schemaType: string;
  /** Dotted field path, e.g. `author.name`. */
  field: string;
  expected: string;
  actual: string;
  hint?: string;
}

const problems: Problem[] = [];

function fail(p: Problem): void {
  problems.push(p);
}

// ─── JSON-LD extraction ──────────────────────────────────────────────────────

const LD_JSON_RE =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;

type Node = Record<string, unknown>;

/**
 * Flatten a parsed ld+json payload into a list of entity objects.
 *
 * The three shapes this codebase actually emits all have to work:
 *   - a plain object              (`app/free-resources/page.tsx`)
 *   - a `@graph` wrapper          (`app/layout.tsx`)
 *   - a bare top-level array      (`app/kanji/[character]/page.tsx`)
 * An extractor that assumes "object" crashes on the kanji pages, which are
 * precisely the ~1,900 pages worth validating.
 */
function flattenEntities(payload: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(payload)) {
    for (const item of payload) flattenEntities(item, out);
    return out;
  }
  if (payload && typeof payload === 'object') {
    const node = payload as Node;
    if (Array.isArray(node['@graph'])) {
      for (const item of node['@graph']) flattenEntities(item, out);
      // A @graph wrapper may also carry its own properties beyond @context.
      const rest = Object.keys(node).filter((k) => k !== '@graph' && k !== '@context');
      if (rest.length > 0) out.push(node);
      return out;
    }
    out.push(node);
  }
  return out;
}

interface ExtractResult {
  entities: Node[];
  blockCount: number;
}

function extractJsonLd(file: string, html: string): ExtractResult {
  const entities: Node[] = [];
  let blockCount = 0;
  LD_JSON_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LD_JSON_RE.exec(html)) !== null) {
    blockCount += 1;
    const raw = match[1];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      fail({
        file,
        schemaType: '(unparseable block)',
        field: `ld+json block #${blockCount}`,
        expected: 'valid JSON',
        actual: `${(err as Error).message} — starts with: ${raw.slice(0, 120)}`,
        hint: 'A block that will not parse is invisible to Google. Check for unescaped characters in interpolated content.',
      });
      continue;
    }
    flattenEntities(parsed, entities);
  }
  return { entities, blockCount };
}

function typeOf(node: Node): string {
  const t = node['@type'];
  if (typeof t === 'string') return t;
  if (Array.isArray(t)) return t.filter((x) => typeof x === 'string').join('+') || '(untyped)';
  return '(untyped)';
}

function entitiesOfType(entities: Node[], type: string): Node[] {
  return entities.filter((e) => typeOf(e).split('+').includes(type));
}

function asObject(v: unknown): Node | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Node) : null;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

// ─── Asset resolution ────────────────────────────────────────────────────────

const assetCache = new Map<string, { ok: true; how: string } | { ok: false; how: string }>();

/**
 * Resolve a JSON-LD image/logo URL to something that actually exists.
 *
 * This is the check that catches P1-3. Asserting the string is non-empty, or
 * that it "looks like a URL", is exactly what let `/logo.png` 404 for months.
 */
function resolveAsset(url: string): { ok: boolean; how: string } {
  const cached = assetCache.get(url);
  if (cached) return cached;

  const result = ((): { ok: boolean; how: string } => {
    let pathname: string;
    if (url.startsWith('/')) {
      pathname = url;
    } else {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return { ok: false, how: 'not a parseable URL or root-relative path' };
      }
      if (parsed.host !== SITE_HOST) {
        return { ok: false, how: `off-site host "${parsed.host}" cannot be verified offline` };
      }
      pathname = parsed.pathname;
    }

    const rel = decodeURIComponent(pathname).replace(/^\/+/, '').split('?')[0];
    if (rel === '') return { ok: false, how: 'empty path' };

    // 1. A committed static file under public/.
    const publicPath = path.join(PUBLIC_DIR, rel);
    if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
      return { ok: true, how: `public/${rel}` };
    }

    // 2. A static route handler whose output the build already materialised.
    const bodyPath = path.join(BUILD_APP_DIR, `${rel}.body`);
    if (fs.existsSync(bodyPath)) return { ok: true, how: `.next/server/app/${rel}.body` };

    // 3. A dynamic route handler / Next metadata image route.
    const routePath = path.join(BUILD_APP_DIR, rel, 'route.js');
    if (fs.existsSync(routePath)) return { ok: true, how: `.next/server/app/${rel}/route.js` };

    // 4. A Next.js file convention in app/ (opengraph-image.tsx, icon.png, …).
    for (const ext of ['.tsx', '.ts', '.jsx', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp']) {
      const convPath = path.join(APP_DIR, `${rel}${ext}`);
      if (fs.existsSync(convPath)) return { ok: true, how: `app/${rel}${ext}` };
    }

    return {
      ok: false,
      how: 'no file under public/, no built route handler, no app/ file convention',
    };
  })();

  assetCache.set(url, result as { ok: true; how: string } | { ok: false; how: string });
  return result;
}

// ─── Shared assertions ───────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function requireField(file: string, schemaType: string, node: Node, field: string): unknown {
  const value = node[field];
  const missing =
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);
  if (missing) {
    fail({
      file,
      schemaType,
      field,
      expected: 'present and non-empty',
      actual: value === undefined ? 'missing' : JSON.stringify(value),
      hint: `Add \`${field}\` to the ${schemaType} JSON-LD.`,
    });
    return undefined;
  }
  return value;
}

function requireEquals(
  file: string,
  schemaType: string,
  field: string,
  actual: unknown,
  expected: string,
  hint?: string
): void {
  if (actual !== expected) {
    fail({
      file,
      schemaType,
      field,
      expected: JSON.stringify(expected),
      actual: actual === undefined ? 'missing' : JSON.stringify(actual),
      hint,
    });
  }
}

function requireCanonicalHost(
  file: string,
  schemaType: string,
  field: string,
  value: unknown
): void {
  const str = asString(value);
  if (str === null) return; // presence is asserted separately
  if (!/^https?:\/\//.test(str)) return; // relative values are handled by asset resolution
  let host: string;
  try {
    host = new URL(str).host;
  } catch {
    fail({
      file,
      schemaType,
      field,
      expected: `an absolute URL on ${SITE_HOST}`,
      actual: JSON.stringify(str),
      hint: 'Entity URLs must parse; a malformed URL is dropped silently by consumers.',
    });
    return;
  }
  if (host === APEX_HOST) {
    fail({
      file,
      schemaType,
      field,
      expected: `host ${SITE_HOST} (canonical)`,
      actual: `host ${APEX_HOST} (apex — 301s to www)`,
      hint: `Build the URL from SITE_URL in lib/seo/site.ts. Asserting the apex splits the brand entity across a redirecting hostname.`,
    });
  }
}

/**
 * Assert an entity name is exactly the brand.
 *
 * Reports a forbidden name (the repo name that shipped on ~1,900 pages) with a
 * pointed message rather than a generic mismatch, and never reports twice for the
 * same value.
 */
function requireBrandName(file: string, schemaType: string, field: string, value: unknown): void {
  const str = asString(value);
  if (str !== null && FORBIDDEN_ENTITY_NAMES.some((bad) => str.trim() === bad)) {
    fail({
      file,
      schemaType,
      field,
      expected: `the brand name ${JSON.stringify(SITE_NAME)} (SITE_NAME in lib/seo/site.ts)`,
      actual: JSON.stringify(str),
      hint: 'This is the git repo name, not the brand — it shipped on ~1,900 pages once already. Import SITE_NAME instead of writing a literal.',
    });
    return;
  }
  requireEquals(
    file,
    schemaType,
    field,
    value,
    SITE_NAME,
    'Must match SITE_NAME in lib/seo/site.ts so the brand entity stays one entity.'
  );
}

/**
 * Same forbidden-name check for names that legitimately extend the brand, e.g.
 * the WebSite `name` ("MichiKanji - Japanese Kanji Stroke Order Dictionary").
 */
function requireNotForbiddenName(
  file: string,
  schemaType: string,
  field: string,
  value: unknown
): void {
  const str = asString(value);
  if (str === null) return;
  const trimmed = str.trim();
  const offender = FORBIDDEN_ENTITY_NAMES.find(
    (bad) => trimmed === bad || trimmed.startsWith(`${bad} `) || trimmed.startsWith(`${bad}-`)
  );
  if (offender) {
    fail({
      file,
      schemaType,
      field,
      expected: `a name derived from the brand ${JSON.stringify(SITE_NAME)} (SITE_NAME in lib/seo/site.ts)`,
      actual: JSON.stringify(str),
      hint: `"${offender}" is the git repo name, not the brand.`,
    });
  }
}

/** Recursively resolve every image/logo URL reachable from an entity. */
const IMAGE_FIELDS = new Set(['logo', 'image', 'thumbnailUrl', 'contentUrl', 'primaryImageOfPage']);

function checkAssetsDeep(file: string, schemaType: string, node: unknown, trail: string): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => checkAssetsDeep(file, schemaType, item, `${trail}[${i}]`));
    return;
  }
  const obj = asObject(node);
  if (!obj) return;
  for (const [key, value] of Object.entries(obj)) {
    const nextTrail = trail ? `${trail}.${key}` : key;
    if (IMAGE_FIELDS.has(key)) {
      const urls: string[] = [];
      if (typeof value === 'string') urls.push(value);
      const inner = asObject(value);
      if (inner && typeof inner.url === 'string') urls.push(inner.url);
      if (Array.isArray(value)) {
        for (const v of value) {
          if (typeof v === 'string') urls.push(v);
          const o = asObject(v);
          if (o && typeof o.url === 'string') urls.push(o.url);
        }
      }
      for (const url of urls) {
        requireCanonicalHost(file, schemaType, `${nextTrail} (url)`, url);
        const res = resolveAsset(url);
        if (!res.ok) {
          fail({
            file,
            schemaType,
            field: `${nextTrail} (url)`,
            expected: 'a URL that resolves to a real file (public/, a built route handler, or an app/ file convention)',
            actual: `${JSON.stringify(url)} — ${res.how}`,
            hint: 'A 404 logo/image is worse than an absent one: it makes the entity ineligible for rich results. Use SITE_LOGO / SITE_OG_IMAGE from lib/seo/site.ts.',
          });
        }
      }
    }
    if (value && typeof value === 'object') {
      checkAssetsDeep(file, schemaType, value, nextTrail);
    }
  }
}

/** Recursively flag any apex URL inside a parsed entity, whatever the field. */
function checkHostsDeep(file: string, schemaType: string, node: unknown, trail: string): void {
  if (typeof node === 'string') {
    if (new RegExp(`^https?://${APEX_HOST.replace('.', '\\.')}(?:[/?#]|$)`).test(node)) {
      fail({
        file,
        schemaType,
        field: trail || '(value)',
        expected: `host ${SITE_HOST}`,
        actual: `${JSON.stringify(node)} (apex — 301s to www)`,
        hint: 'Derive it from SITE_URL in lib/seo/site.ts.',
      });
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => checkHostsDeep(file, schemaType, item, `${trail}[${i}]`));
    return;
  }
  const obj = asObject(node);
  if (!obj) return;
  for (const [key, value] of Object.entries(obj)) {
    checkHostsDeep(file, schemaType, value, trail ? `${trail}.${key}` : key);
  }
}

// ─── Entity validators ───────────────────────────────────────────────────────

function validateOrganization(file: string, org: Node): void {
  const type = typeOf(org);
  requireField(file, type, org, 'name');
  requireBrandName(file, type, 'name', org.name);
  requireField(file, type, org, 'url');
  requireEquals(
    file,
    type,
    'url',
    org.url,
    SITE_URL,
    'Must match SITE_URL in lib/seo/site.ts (the canonical www host).'
  );

  const logo = asObject(org.logo);
  if (!org.logo) {
    fail({
      file,
      schemaType: type,
      field: 'logo',
      expected: `an ImageObject pointing at ${SITE_LOGO.url}`,
      actual: 'missing',
      hint: 'Organization.logo is required for publisher rich results. Use SITE_LOGO from lib/seo/site.ts.',
    });
  } else if (logo) {
    requireEquals(file, type, 'logo.url', logo.url, SITE_LOGO.url);
    requireField(file, type, logo, 'width');
    requireField(file, type, logo, 'height');
  }
}

function validateWebSite(file: string, site: Node): void {
  const type = typeOf(site);
  requireField(file, type, site, 'name');
  requireNotForbiddenName(file, type, 'name', site.name);
  requireEquals(file, type, 'url', site.url, SITE_URL);
  const publisher = asObject(site.publisher);
  if (!publisher) {
    fail({
      file,
      schemaType: type,
      field: 'publisher',
      expected: 'an Organization',
      actual: site.publisher === undefined ? 'missing' : JSON.stringify(site.publisher),
    });
  } else {
    requireBrandName(file, `${type}.publisher`, 'name', publisher.name);
    requireEquals(file, `${type}.publisher`, 'url', publisher.url, SITE_URL);
    const logo = asObject(publisher.logo);
    if (!logo) {
      fail({
        file,
        schemaType: `${type}.publisher`,
        field: 'logo',
        expected: `an ImageObject pointing at ${SITE_LOGO.url}`,
        actual: 'missing',
      });
    } else {
      requireEquals(file, `${type}.publisher`, 'logo.url', logo.url, SITE_LOGO.url);
    }
  }
}

function validateArticle(file: string, article: Node, expectedPageUrl: string | null): void {
  const type = typeOf(article);

  for (const field of [
    'headline',
    'description',
    'datePublished',
    'dateModified',
    'image',
    'author',
    'publisher',
    'mainEntityOfPage',
  ]) {
    requireField(file, type, article, field);
  }

  // ─ author: the P1-1 regression ─
  const author = asObject(article.author);
  if (author) {
    requireBrandName(file, `${type}.author`, 'name', author.name);
    requireCanonicalHost(file, `${type}.author`, 'url', author.url);
    requireEquals(file, `${type}.author`, 'url', author.url, SITE_URL);
  } else if (article.author !== undefined) {
    fail({
      file,
      schemaType: type,
      field: 'author',
      expected: 'an Organization or Person object',
      actual: JSON.stringify(article.author),
    });
  }

  // ─ publisher + logo: the P1-3 regression ─
  const publisher = asObject(article.publisher);
  if (publisher) {
    requireBrandName(file, `${type}.publisher`, 'name', publisher.name);
    requireEquals(file, `${type}.publisher`, 'url', publisher.url, SITE_URL);
    const logo = asObject(publisher.logo);
    if (!logo) {
      fail({
        file,
        schemaType: `${type}.publisher`,
        field: 'logo',
        expected: `an ImageObject pointing at ${SITE_LOGO.url}`,
        actual: publisher.logo === undefined ? 'missing' : JSON.stringify(publisher.logo),
        hint: 'Use SITE_LOGO from lib/seo/site.ts.',
      });
    } else {
      requireEquals(file, `${type}.publisher`, 'logo.url', logo.url, SITE_LOGO.url);
    }
  }

  // ─ dates ─
  for (const field of ['datePublished', 'dateModified'] as const) {
    const value = asString(article[field]);
    if (value !== null && !ISO_DATE_RE.test(value) && Number.isNaN(Date.parse(value))) {
      fail({
        file,
        schemaType: type,
        field,
        expected: 'an ISO 8601 date (YYYY-MM-DD)',
        actual: JSON.stringify(value),
      });
    }
  }
  requireEquals(
    file,
    type,
    'datePublished',
    article.datePublished,
    KANJI_CONTENT_PUBLISHED,
    'Must match KANJI_CONTENT_PUBLISHED in lib/seo/site.ts.'
  );
  requireEquals(
    file,
    type,
    'dateModified',
    article.dateModified,
    KANJI_CONTENT_LAST_MODIFIED,
    'Must match KANJI_CONTENT_LAST_MODIFIED in lib/seo/site.ts. Never `new Date()` — a lastmod that moves every deploy is a lastmod Google stops trusting.'
  );
  const pub = asString(article.datePublished);
  const mod = asString(article.dateModified);
  if (pub && mod && Date.parse(mod) < Date.parse(pub)) {
    fail({
      file,
      schemaType: type,
      field: 'dateModified',
      expected: `>= datePublished (${pub})`,
      actual: mod,
    });
  }

  // ─ image ─
  const image = asObject(article.image);
  if (image) {
    requireEquals(file, type, 'image.url', image.url, SITE_OG_IMAGE.url);
    requireField(file, type, image, 'width');
    requireField(file, type, image, 'height');
  }

  // ─ mainEntityOfPage points at this exact page ─
  const meop = asObject(article.mainEntityOfPage);
  if (meop) {
    requireCanonicalHost(file, `${type}.mainEntityOfPage`, '@id', meop['@id']);
    if (expectedPageUrl !== null) {
      const actual = asString(meop['@id']);
      const normalise = (u: string): string => {
        try {
          const parsed = new URL(u);
          return `${parsed.origin}${decodeURIComponent(parsed.pathname).normalize('NFC')}`;
        } catch {
          return u;
        }
      };
      if (actual === null || normalise(actual) !== normalise(expectedPageUrl)) {
        fail({
          file,
          schemaType: `${type}.mainEntityOfPage`,
          field: '@id',
          expected: expectedPageUrl,
          actual: actual === null ? 'missing' : actual,
          hint: 'mainEntityOfPage must self-reference the page it is on, or Google cannot tie the Article to the URL.',
        });
      }
    }
  }
}

function validateFaqPage(file: string, faq: Node): void {
  const type = typeOf(faq);
  const mainEntity = faq.mainEntity;
  if (!Array.isArray(mainEntity) || mainEntity.length === 0) {
    fail({
      file,
      schemaType: type,
      field: 'mainEntity',
      expected: 'a non-empty array of Question objects',
      actual: mainEntity === undefined ? 'missing' : JSON.stringify(mainEntity).slice(0, 120),
    });
    return;
  }
  mainEntity.forEach((q, i) => {
    const question = asObject(q);
    if (!question) {
      fail({
        file,
        schemaType: type,
        field: `mainEntity[${i}]`,
        expected: 'a Question object',
        actual: JSON.stringify(q).slice(0, 120),
      });
      return;
    }
    requireEquals(file, `${type}.mainEntity[${i}]`, '@type', question['@type'], 'Question');
    requireField(file, `${type}.mainEntity[${i}]`, question, 'name');
    const answer = asObject(question.acceptedAnswer);
    if (!answer) {
      fail({
        file,
        schemaType: `${type}.mainEntity[${i}]`,
        field: 'acceptedAnswer',
        expected: 'an Answer object',
        actual: question.acceptedAnswer === undefined ? 'missing' : JSON.stringify(question.acceptedAnswer).slice(0, 120),
      });
      return;
    }
    requireEquals(file, `${type}.mainEntity[${i}].acceptedAnswer`, '@type', answer['@type'], 'Answer');
    requireField(file, `${type}.mainEntity[${i}].acceptedAnswer`, answer, 'text');
  });
}

function validateBreadcrumbList(file: string, crumbs: Node): void {
  const type = typeOf(crumbs);
  const items = crumbs.itemListElement;
  if (!Array.isArray(items) || items.length === 0) {
    fail({
      file,
      schemaType: type,
      field: 'itemListElement',
      expected: 'a non-empty array of ListItem objects',
      actual: items === undefined ? 'missing' : JSON.stringify(items).slice(0, 120),
    });
    return;
  }
  items.forEach((raw, i) => {
    const item = asObject(raw);
    if (!item) {
      fail({
        file,
        schemaType: type,
        field: `itemListElement[${i}]`,
        expected: 'a ListItem object',
        actual: JSON.stringify(raw).slice(0, 120),
      });
      return;
    }
    const label = `${type}.itemListElement[${i}]`;
    requireEquals(file, label, '@type', item['@type'], 'ListItem');
    if (item.position !== i + 1) {
      fail({
        file,
        schemaType: label,
        field: 'position',
        expected: String(i + 1),
        actual: item.position === undefined ? 'missing' : JSON.stringify(item.position),
        hint: 'BreadcrumbList positions must be contiguous and 1-based.',
      });
    }
    requireField(file, label, item, 'name');
    requireField(file, label, item, 'item');
    requireCanonicalHost(file, label, 'item', item.item);
  });
}

// ─── Page-level validation ───────────────────────────────────────────────────

function relative(p: string): string {
  return path.relative(REPO_ROOT, p);
}

function validatePage(absPath: string, opts: { kanjiChar: string | null; requireSiteGraph: boolean }): void {
  const file = relative(absPath);
  const html = fs.readFileSync(absPath, 'utf8');
  const { entities, blockCount } = extractJsonLd(file, html);

  if (blockCount === 0) {
    if (opts.requireSiteGraph || opts.kanjiChar !== null) {
      fail({
        file,
        schemaType: '(page)',
        field: '<script type="application/ld+json">',
        expected: 'at least one JSON-LD block in the rendered HTML',
        actual: 'none found',
        hint: 'Metadata that does not reach the HTML does not exist. Check the component actually renders on the server.',
      });
    }
    return;
  }

  // Host + asset checks apply to everything we parse, regardless of type.
  for (const entity of entities) {
    const type = typeOf(entity);
    checkHostsDeep(file, type, entity, '');
    checkAssetsDeep(file, type, entity, '');
  }

  const orgs = entitiesOfType(entities, 'Organization');
  const sites = entitiesOfType(entities, 'WebSite');

  if (opts.requireSiteGraph || opts.kanjiChar !== null) {
    if (orgs.length === 0) {
      fail({
        file,
        schemaType: 'Organization',
        field: '(block)',
        expected: 'an Organization entity from the site-wide graph in app/layout.tsx',
        actual: `absent — page has ${entities.map(typeOf).join(', ')}`,
      });
    }
    if (sites.length === 0) {
      fail({
        file,
        schemaType: 'WebSite',
        field: '(block)',
        expected: 'a WebSite entity from the site-wide graph in app/layout.tsx',
        actual: `absent — page has ${entities.map(typeOf).join(', ')}`,
      });
    }
  }
  for (const org of orgs) validateOrganization(file, org);
  for (const site of sites) validateWebSite(file, site);

  if (opts.kanjiChar === null) return;

  const expectedPageUrl = `${SITE_URL}/kanji/${encodeURIComponent(opts.kanjiChar)}`;

  const articles = entitiesOfType(entities, 'Article');
  if (articles.length === 0) {
    fail({
      file,
      schemaType: 'Article',
      field: '(block)',
      expected: 'exactly one Article entity',
      actual: `absent — page has ${entities.map(typeOf).join(', ')}`,
    });
  }
  for (const article of articles) validateArticle(file, article, expectedPageUrl);

  const faqs = entitiesOfType(entities, 'FAQPage');
  if (faqs.length === 0) {
    fail({
      file,
      schemaType: 'FAQPage',
      field: '(block)',
      expected: 'one FAQPage entity',
      actual: `absent — page has ${entities.map(typeOf).join(', ')}`,
      hint: 'FAQPage drives the expandable rich result on kanji pages.',
    });
  }
  for (const faq of faqs) validateFaqPage(file, faq);

  const crumbLists = entitiesOfType(entities, 'BreadcrumbList');
  if (crumbLists.length === 0) {
    fail({
      file,
      schemaType: 'BreadcrumbList',
      field: '(block)',
      expected: 'one BreadcrumbList entity',
      actual: `absent — page has ${entities.map(typeOf).join(', ')}`,
    });
  }
  for (const crumbs of crumbLists) validateBreadcrumbList(file, crumbs);
}

// ─── Sitemap / robots ────────────────────────────────────────────────────────

function validateSitemap(): void {
  const abs = path.join(BUILD_APP_DIR, 'sitemap.xml.body');
  const file = relative(abs);
  if (!fs.existsSync(abs)) {
    fail({
      file,
      schemaType: '(sitemap)',
      field: 'artefact',
      expected: 'the static route handler output for app/sitemap.xml',
      actual: 'missing',
      hint: 'If sitemap.xml became dynamic, this check needs updating — but a dynamic sitemap also loses its CDN cache.',
    });
    return;
  }
  const xml = fs.readFileSync(abs, 'utf8');
  if (!xml.trimStart().startsWith('<?xml')) {
    fail({
      file,
      schemaType: '(sitemap)',
      field: 'xml declaration',
      expected: 'a document starting with <?xml',
      actual: JSON.stringify(xml.slice(0, 60)),
    });
  }
  const locs = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((m) => m[1].trim());
  if (locs.length === 0) {
    fail({
      file,
      schemaType: '(sitemap)',
      field: '<loc>',
      expected: 'at least one URL',
      actual: '0 entries',
    });
  }
  for (const loc of locs) {
    if (!loc.startsWith(`${SITE_URL}`)) {
      fail({
        file,
        schemaType: '(sitemap)',
        field: '<loc>',
        expected: `a URL starting with ${SITE_URL}`,
        actual: loc,
        hint: 'Sitemap URLs must be canonical; a sitemap of redirects wastes crawl budget.',
      });
    }
  }
  const kanjiLocs = locs.filter((l) => l.startsWith(`${SITE_URL}/kanji/`));
  if (kanjiLocs.length < MIN_KANJI_PAGES) {
    fail({
      file,
      schemaType: '(sitemap)',
      field: '<loc> (kanji detail pages)',
      expected: `at least ${MIN_KANJI_PAGES} /kanji/<char> URLs`,
      actual: `${kanjiLocs.length}`,
      hint: 'The dictionary is the whole crawlable surface; a truncated sitemap silently de-indexes it.',
    });
  }
  for (const mod of [...xml.matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/g)].map((m) => m[1].trim())) {
    if (!ISO_DATE_RE.test(mod) && Number.isNaN(Date.parse(mod))) {
      fail({
        file,
        schemaType: '(sitemap)',
        field: '<lastmod>',
        expected: 'an ISO 8601 date',
        actual: mod,
      });
    }
  }
}

function validateRobots(): void {
  const abs = path.join(BUILD_APP_DIR, 'robots.txt.body');
  const file = relative(abs);
  if (!fs.existsSync(abs)) {
    fail({
      file,
      schemaType: '(robots)',
      field: 'artefact',
      expected: 'the static route handler output for app/robots.txt',
      actual: 'missing',
    });
    return;
  }
  const txt = fs.readFileSync(abs, 'utf8');
  const sitemapLines = txt
    .split('\n')
    .filter((l) => l.trim().toLowerCase().startsWith('sitemap:'))
    .map((l) => l.split(':').slice(1).join(':').trim());
  if (sitemapLines.length === 0) {
    fail({
      file,
      schemaType: '(robots)',
      field: 'Sitemap:',
      expected: `Sitemap: ${SITE_URL}/sitemap.xml`,
      actual: 'no Sitemap directive',
    });
  }
  for (const line of sitemapLines) {
    if (line !== `${SITE_URL}/sitemap.xml`) {
      fail({
        file,
        schemaType: '(robots)',
        field: 'Sitemap:',
        expected: `${SITE_URL}/sitemap.xml`,
        actual: line,
      });
    }
  }
}

// ─── Whole-build apex scan ───────────────────────────────────────────────────

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(p, acc);
    else if (entry.isFile()) acc.push(p);
  }
  return acc;
}

function scanForApexHost(allFiles: string[]): number {
  const apexRe = new RegExp(`https?://${APEX_HOST.replace(/\./g, '\\.')}`, 'g');
  let scanned = 0;
  for (const abs of allFiles) {
    if (APEX_SCAN_SKIP.test(abs)) continue;
    if (!APEX_SCAN_EXTS.has(path.extname(abs))) continue;
    scanned += 1;
    const text = fs.readFileSync(abs, 'utf8');
    apexRe.lastIndex = 0;
    const hit = apexRe.exec(text);
    if (hit) {
      const start = Math.max(0, hit.index - 60);
      fail({
        file: relative(abs),
        schemaType: '(build artefact)',
        field: `apex host ${APEX_HOST}`,
        expected: `every absolute URL on ${SITE_HOST}`,
        actual: `…${text.slice(start, hit.index + 80).replace(/\s+/g, ' ')}…`,
        hint: `The apex 301s to www. Import SITE_URL from lib/seo/site.ts instead of hardcoding a host.`,
      });
    }
  }
  return scanned;
}

// ─── Sampling ────────────────────────────────────────────────────────────────

function isSingleCharacter(name: string): boolean {
  return [...name].length === 1;
}

function pickSample<T>(items: T[], size: number): T[] {
  if (items.length <= size) return [...items];
  const step = items.length / size;
  const out: T[] = [];
  for (let i = 0; i < size; i += 1) out.push(items[Math.floor(i * step)]);
  return out;
}

// ─── Output ──────────────────────────────────────────────────────────────────

/**
 * Group identical problems so one systemic bug reports once with examples
 * instead of 1,895 near-identical paragraphs nobody reads.
 */
function reportProblems(): void {
  const groups = new Map<string, { p: Problem; files: string[] }>();
  for (const p of problems) {
    const key = [p.schemaType, p.field, p.expected, p.actual].join('\u0000');
    const existing = groups.get(key);
    if (existing) existing.files.push(p.file);
    else groups.set(key, { p, files: [p.file] });
  }

  console.error(`\n✗ Structured data validation FAILED — ${problems.length} problem(s), ${groups.size} distinct:\n`);
  let n = 0;
  for (const { p, files } of groups.values()) {
    n += 1;
    console.error(`${n}. [${p.schemaType}] ${p.field}`);
    console.error(`   expected: ${p.expected}`);
    console.error(`   actual:   ${p.actual}`);
    if (p.hint) console.error(`   why:      ${p.hint}`);
    const shown = files.slice(0, 3);
    const suffix = files.length > shown.length ? ` (+${files.length - shown.length} more)` : '';
    console.error(`   in:       ${shown.join(', ')}${suffix}`);
    console.error('');
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const validateAll = args.includes('--all');
  const sampleArg = args.find((a) => a.startsWith('--sample='));
  const sampleSize = sampleArg ? Number(sampleArg.split('=')[1]) : 60;

  console.log('\n═══ MichiKanji Structured Data Check ═══');
  console.log(`Build dir:   ${relative(BUILD_APP_DIR)}`);
  console.log(`Expected brand: ${SITE_NAME}`);
  console.log(`Expected host:  ${SITE_HOST} (apex ${APEX_HOST} must never appear)`);
  console.log(`Expected logo:  ${SITE_LOGO.url}`);

  if (!fs.existsSync(BUILD_APP_DIR)) {
    console.error(
      `\n✗ ${relative(BUILD_APP_DIR)} not found.\n` +
        '  This validator checks the build output, not the source, because that is the\n' +
        '  only way to catch metadata that never reaches the HTML.\n' +
        '  Run `pnpm build` first.\n'
    );
    process.exit(1);
  }

  const allFiles = walkFiles(BUILD_APP_DIR);
  const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));

  const kanjiDir = path.join(BUILD_APP_DIR, 'kanji');
  const kanjiPages = htmlFiles
    .filter((f) => path.dirname(f) === kanjiDir)
    .filter((f) => isSingleCharacter(path.basename(f, '.html')))
    .sort();

  const kanjiPageSet = new Set(kanjiPages);
  const otherPages = htmlFiles.filter((f) => !kanjiPageSet.has(f)).sort();

  console.log(`Prerendered: ${htmlFiles.length} HTML pages (${kanjiPages.length} kanji detail pages)`);

  if (kanjiPages.length < MIN_KANJI_PAGES) {
    fail({
      file: relative(kanjiDir),
      schemaType: '(build artefact)',
      field: 'prerendered kanji pages',
      expected: `at least ${MIN_KANJI_PAGES} .next/server/app/kanji/<char>.html files`,
      actual: `${kanjiPages.length}`,
      hint: 'If the kanji pages stopped prerendering, none of the per-page structured data is in the HTML crawlers see.',
    });
  }

  // ─ kanji page sample ─
  const anchors = kanjiPages.filter((f) => SAMPLE_ANCHORS.includes(path.basename(f, '.html')));
  const sample = validateAll
    ? kanjiPages
    : [...new Set([...anchors, ...pickSample(kanjiPages, sampleSize)])];
  console.log(
    `Deep check:  ${sample.length} kanji page(s)${validateAll ? ' (--all)' : ` sampled of ${kanjiPages.length}`} + ${otherPages.length} other page(s)`
  );

  for (const abs of sample) {
    validatePage(abs, { kanjiChar: path.basename(abs, '.html').normalize('NFC'), requireSiteGraph: true });
  }

  // ─ every non-kanji prerendered page ─
  for (const abs of otherPages) {
    validatePage(abs, {
      kanjiChar: null,
      requireSiteGraph: PAGES_REQUIRING_SITE_GRAPH.includes(path.relative(BUILD_APP_DIR, abs)),
    });
  }

  validateSitemap();
  validateRobots();

  const scanned = scanForApexHost(allFiles);
  console.log(`Apex scan:   ${scanned} text artefact(s) under ${relative(BUILD_APP_DIR)}`);
  console.log('═══════════════════════════════════════');

  if (problems.length > 0) {
    reportProblems();
    console.error('Fix the values in lib/seo/site.ts (or the page that ignores it), rebuild, and re-run.\n');
    process.exit(1);
  }

  console.log('\n✓ Structured data valid.');
  console.log('  - Article author/publisher match the brand; no repo-name leakage');
  console.log('  - All required Article fields present (dates, image, publisher, mainEntityOfPage)');
  console.log('  - Every logo/image URL in JSON-LD resolves to a real file');
  console.log(`  - Every entity URL is on ${SITE_HOST}; apex ${APEX_HOST} absent from the build`);
  console.log('  - FAQPage and BreadcrumbList well-formed; sitemap + robots canonical\n');
}

main();
