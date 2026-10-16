/**
 * Validator for who may call each route handler under app/.
 *
 * Run: pnpm validate:routes
 *
 * ---------------------------------------------------------------------------
 * Why this exists
 * ---------------------------------------------------------------------------
 *
 * Every other validator checks data or pure logic; none checked who may call a
 * route. The 2026-10-16 audit found two public routes nobody had re-read in
 * nine to twelve months: a ShipFast webhook that sent attacker-written HTML
 * from ari@michikanji.com, and a DataFast proxy that lent the server key to
 * anyone (both closed in 30331ee). Both arrived looking finished. So access is
 * now a written decision:
 * every exported method of every app/**\/route.* file needs an entry in
 * scripts/route-access.json with an access class and a reason, and the class's
 * defence has to be visible in that handler (its own body, or a function in the
 * same file that it calls):
 *
 *   public-read        GET or HEAD only: static or idempotent. No marker.
 *   public-beacon      POST only: records a client analytics event anyone could
 *                      forge anyway. No marker, so the reason has to carry it.
 *   signed-webhook     calls a verify…( function and reads a Svix header (or
 *                      imports svix).
 *   sealed-token       calls a verify…Token( imported from @/lib/email/.
 *   local-only         opens with `const blocked = blockedResponse();` and
 *                      `if (blocked) return blocked;`, blockedResponse from
 *                      @/lib/sentences/local-only (CLAUDE.md's rule for admin).
 *   rate-limited-form  calls .check( on a limiter made by rateLimit(...) from
 *                      @/middlewares/rateLimiter.
 *
 * It fails on a method with no entry, an entry with no route, a class on a
 * method it does not allow, and a missing marker. A marker proves the defence
 * is called, not that it is right: the tokens are validate:subscribe's job.
 * A route found unsafe gets no entry: the missing entry keeps the check red
 * until the route is fixed.
 *
 * The first section replays the detector on fixtures, so a parser change that
 * stops seeing an export or a marker fails here rather than passing everything.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import ts from 'typescript';

const REPO = join(__dirname, '..');
const ALLOWLIST_PATH = join(__dirname, 'route-access.json');

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ROUTE_FILE = /^app\/(?:.+\/)?route\.(?:ts|tsx|js|jsx|mjs)$/;

type Access =
  | 'public-read'
  | 'public-beacon'
  | 'signed-webhook'
  | 'sealed-token'
  | 'local-only'
  | 'rate-limited-form';

interface Handler {
  method: string;
  /** The handler's code: a function, or an expression such as `wrap(fn)`. Null when re-exported from another module. */
  node: ts.Node | null;
  from?: string;
}

interface RouteModule {
  handlers: Handler[];
  /** Top-level functions and const initialisers by name, so a handler's helpers can be followed. */
  topLevel: Map<string, ts.Node>;
  /** Local import name -> module specifier. */
  imports: Map<string, string>;
  problems: string[];
}

let checks = 0;
let failures = 0;

function section(title: string) {
  console.log(`\n${title}`);
}

function check(name: string, problems: string[], description: string) {
  checks++;
  if (problems.length === 0) {
    console.log(`  ✓ ${name}: ${description}`);
    return;
  }
  failures++;
  console.log(`  ✗ ${name}: ${problems.length} problem(s)`);
  for (const problem of problems.slice(0, 12)) console.log(`      ${problem}`);
  if (problems.length > 12) console.log(`      … and ${problems.length - 12} more`);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseRoute(fileName: string, text: string): RouteModule {
  const kind = /\.[jt]sx$/.test(fileName) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
  const mod: RouteModule = { handlers: [], topLevel: new Map(), imports: new Map(), problems: [] };
  const exported = (node: ts.Node) =>
    ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some(m => m.kind === ts.SyntaxKind.ExportKeyword);

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const from = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (clause?.name) mod.imports.set(clause.name.text, from);
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) mod.imports.set(bindings.name.text, from);
      if (bindings && ts.isNamedImports(bindings)) for (const el of bindings.elements) mod.imports.set(el.name.text, from);
    } else if (ts.isFunctionDeclaration(statement) && statement.name) {
      const name = statement.name.text;
      mod.topLevel.set(name, statement);
      if (exported(statement) && METHODS.includes(name)) mod.handlers.push({ method: name, node: statement });
    } else if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
        mod.topLevel.set(decl.name.text, decl.initializer);
        if (exported(statement) && METHODS.includes(decl.name.text)) {
          mod.handlers.push({ method: decl.name.text, node: decl.initializer });
        }
      }
    }
  }

  // Export lists second: `export { handler as GET }` may come before `handler`.
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement)) continue;
    const from =
      statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : undefined;
    if (!statement.exportClause) {
      mod.problems.push(`export * from '${from}' hides which methods the route serves; export each one by name`);
      continue;
    }
    if (!ts.isNamedExports(statement.exportClause)) continue;
    for (const el of statement.exportClause.elements) {
      const method = el.name.text;
      if (!METHODS.includes(method)) continue;
      const local = (el.propertyName ?? el.name).text;
      const node = from ? null : mod.topLevel.get(local) ?? null;
      mod.handlers.push({ method, node, from: from ?? (node ? undefined : mod.imports.get(local)) });
    }
  }
  return mod;
}

/** The handler and every top-level function or const it reaches by name, in the same file. */
function reachable(mod: RouteModule, root: ts.Node): ts.Node[] {
  const seen = new Set<ts.Node>([root]);
  const queue = [root];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      const target = mod.topLevel.get(node.text);
      if (target && !seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
    ts.forEachChild(node, visit);
  };
  while (queue.length > 0) visit(queue.pop()!);
  return [...seen];
}

interface Call {
  name: string;
  /** `limiter` in `limiter.check(req)`; absent for a bare call. */
  receiver?: string;
}

function callsIn(nodes: ts.Node[]): Call[] {
  const calls: Call[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee)) calls.push({ name: callee.text });
      else if (ts.isPropertyAccessExpression(callee)) calls.push({ name: callee.name.text, receiver: callee.expression.getText() });
    }
    ts.forEachChild(node, visit);
  };
  nodes.forEach(visit);
  return calls;
}

function stringsIn(nodes: ts.Node[]): string[] {
  const strings: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) strings.push(node.text);
    ts.forEachChild(node, visit);
  };
  nodes.forEach(visit);
  return strings;
}

// ---------------------------------------------------------------------------
// The classes
// ---------------------------------------------------------------------------

/** `const blocked = blockedResponse(); if (blocked) return blocked;` as the handler's first two statements. */
const localOnly = (mod: RouteModule, handler: ts.Node): string | null => {
  const want = 'must open with `const blocked = blockedResponse(); if (blocked) return blocked;`';
  const isFunction = ts.isFunctionDeclaration(handler) || ts.isFunctionExpression(handler) || ts.isArrowFunction(handler);
  const body = isFunction && handler.body && ts.isBlock(handler.body) ? handler.body.statements : null;
  if (!body || body.length < 2) return want;
  const [first, second] = body;
  const decl = ts.isVariableStatement(first) ? first.declarationList.declarations[0] : undefined;
  const init = decl?.initializer;
  if (!decl || !ts.isIdentifier(decl.name) || !init || !ts.isCallExpression(init)) return want;
  if (!ts.isIdentifier(init.expression) || init.expression.text !== 'blockedResponse') return want;
  if (mod.imports.get('blockedResponse') !== '@/lib/sentences/local-only') {
    return 'blockedResponse is not imported from @/lib/sentences/local-only';
  }
  const name = decl.name.text;
  const returnsIt = (s: ts.Statement): boolean =>
    (ts.isReturnStatement(s) && !!s.expression && ts.isIdentifier(s.expression) && s.expression.text === name) ||
    (ts.isBlock(s) && s.statements.length > 0 && returnsIt(s.statements[0]));
  const guarded =
    ts.isIfStatement(second) &&
    ts.isIdentifier(second.expression) &&
    second.expression.text === name &&
    returnsIt(second.thenStatement);
  return guarded ? null : want;
};

/** Given the route module and the handler's code, a problem or null. */
type Marker = typeof localOnly;

const CLASSES: Record<Access, { methods?: string[]; marker?: Marker; shown: string }> = {
  'public-read': { methods: ['GET', 'HEAD'], shown: 'GET or HEAD only' },
  'public-beacon': { methods: ['POST'], shown: 'POST only' },
  'signed-webhook': {
    shown: 'calls verify…( and reads a Svix header',
    marker: (mod, handler) => {
      const code = reachable(mod, handler);
      if (!callsIn(code).some(c => /^verify/i.test(c.name))) return 'no verify…( call';
      const svix = stringsIn(code).some(s => /svix/i.test(s)) || [...mod.imports.values()].includes('svix');
      return svix ? null : 'verifies something, but never reads a Svix header or imports svix';
    },
  },
  'sealed-token': {
    shown: 'calls a verify…Token( from @/lib/email/',
    marker: (mod, handler) => {
      const verified = callsIn(reachable(mod, handler)).some(
        c => !c.receiver && /^verify\w*Token$/.test(c.name) && (mod.imports.get(c.name) ?? '').startsWith('@/lib/email/'),
      );
      return verified ? null : 'no verify…Token( call imported from @/lib/email/';
    },
  },
  'local-only': { shown: 'opens with blockedResponse()', marker: localOnly },
  'rate-limited-form': {
    shown: 'calls .check( on a rateLimit(...) limiter',
    marker: (mod, handler) => {
      const limiters = [...mod.topLevel]
        .filter(([, init]) => ts.isCallExpression(init) && ts.isIdentifier(init.expression) &&
          mod.imports.get(init.expression.text) === '@/middlewares/rateLimiter')
        .map(([name]) => name);
      if (limiters.length === 0) return 'no limiter made by rateLimit(...) from @/middlewares/rateLimiter';
      const checked = callsIn(reachable(mod, handler)).some(c => c.name === 'check' && limiters.includes(c.receiver ?? ''));
      return checked ? null : `never calls ${limiters[0]}.check(`;
    },
  },
};

function markerProblem(access: Access, mod: RouteModule, handler: Handler): string | null {
  const marker = CLASSES[access].marker;
  if (!marker) return null;
  if (!handler.node) return `re-exported from ${handler.from ?? 'another module'}, so its ${access} marker cannot be checked`;
  return marker(mod, handler.node);
}

// ---------------------------------------------------------------------------
// 1. The detector, on fixtures
// ---------------------------------------------------------------------------

section('1. The detector, on fixtures');
{
  const problems: string[] = [];
  const seen = parseRoute('fixture.ts', `
    export function GET() { return new Response('a'); }
    export async function POST() { return new Response('b'); }
    export const PUT = async () => new Response('c');
    export { remove as DELETE };
    const remove = () => new Response('d');
    export const dynamic = 'force-dynamic';
    function helper() {}
  `).handlers.map(h => h.method).sort().join(' ');
  if (seen !== 'DELETE GET POST PUT') problems.push(`saw "${seen}", expected "DELETE GET POST PUT"`);
  check('exports', problems, 'function, async function, const and export-list handlers are all found');
}
{
  const LOCAL = `import { blockedResponse } from '@/lib/sentences/local-only';`;
  const TOKEN = `import { verifyConfirmToken } from '@/lib/email/subscribe-token';`;
  const LIMIT = `import rateLimit from '@/middlewares/rateLimiter';\nconst limiter = rateLimit(2, 600000);`;
  const fixtures: [string, Access, string, string, boolean][] = [
    ['local-only, guarded first', 'local-only', 'POST', `${LOCAL}
      export async function POST(request) { const blocked = blockedResponse(); if (blocked) return blocked; return new Response('ok'); }`, true],
    ['local-only, work before the guard', 'local-only', 'POST', `${LOCAL}
      export async function POST(request) { const body = await request.json(); const blocked = blockedResponse(); if (blocked) return blocked; return new Response(body); }`, false],
    ['local-only, guard result ignored', 'local-only', 'POST', `${LOCAL}
      export async function POST() { const blocked = blockedResponse(); return new Response('ok'); }`, false],
    ['local-only, guard from elsewhere', 'local-only', 'POST', `import { blockedResponse } from '@/lib/other';
      export async function POST() { const blocked = blockedResponse(); if (blocked) return blocked; return new Response('ok'); }`, false],
    ['sealed-token, verified in a helper', 'sealed-token', 'POST', `${TOKEN}
      function confirm(token) { return verifyConfirmToken(token, 's'); }
      export async function POST(request) { return Response.json(confirm(await request.text())); }`, true],
    ['sealed-token, verifier from elsewhere', 'sealed-token', 'POST', `import { verifyConfirmToken } from '@/lib/jwt';
      export async function POST(request) { return Response.json(verifyConfirmToken(await request.text(), 's')); }`, false],
    ['sealed-token, only the other method verifies', 'sealed-token', 'GET', `${TOKEN}
      export async function POST(request) { verifyConfirmToken(await request.text(), 's'); return new Response(null); }
      export async function GET() { return new Response('form'); }`, false],
    ['rate-limited-form, checked', 'rate-limited-form', 'POST', `${LIMIT}
      export async function POST(request) { const limited = await limiter.check(request); if (limited) return limited; return new Response('ok'); }`, true],
    ['rate-limited-form, limiter never checked', 'rate-limited-form', 'POST', `${LIMIT}
      export async function POST() { return new Response('ok'); }`, false],
    ['signed-webhook, Svix signature verified', 'signed-webhook', 'POST', `import { verifyWebhookSignature } from '@/lib/email/inbound-forward';
      export async function POST(request) {
        if (!verifyWebhookSignature({ id: request.headers.get('svix-id'), body: await request.text() })) return new Response(null, { status: 400 });
        return new Response(null);
      }`, true],
    ['signed-webhook, the ShipFast relay', 'signed-webhook', 'POST', `import { sendEmail } from '@/lib/resend';
      export async function POST(req) { const data = await req.formData(); await sendEmail({ html: data.get('body-html') }); return new Response(null); }`, false],
  ];
  const problems: string[] = [];
  for (const [name, access, method, text, shouldPass] of fixtures) {
    const mod = parseRoute('fixture.ts', text);
    const handler = mod.handlers.find(h => h.method === method);
    const problem = handler ? markerProblem(access, mod, handler) : `no ${method} handler found`;
    if (shouldPass && problem) problems.push(`${name}: wrongly failed (${problem})`);
    if (!shouldPass && !problem) problems.push(`${name}: wrongly passed`);
  }
  check('markers', problems, `${fixtures.length} fixtures: each defence is found where it is and missed where it is not`);
}

// ---------------------------------------------------------------------------
// 2. Every route against the allowlist
// ---------------------------------------------------------------------------

interface Entry {
  access: string;
  reason?: string;
}

const allowlist = (JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')) as { routes: Record<string, Record<string, Entry>> }).routes;

// Tracked and untracked-but-not-ignored, so a new route is caught before its first commit.
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'app'], {
  cwd: REPO,
  encoding: 'utf8',
})
  .split('\n')
  .filter(file => ROUTE_FILE.test(file) && existsSync(join(REPO, file)))
  .sort();

/** app/api/kanji-svg/[hex]/route.ts -> /api/kanji-svg/[hex]. Route groups and parallel-route slots are not in the URL. */
function urlPath(file: string): string {
  const segments = posix.dirname(file).split('/').slice(1).filter(s => !/^\(.+\)$/.test(s) && !s.startsWith('@'));
  return `/${segments.join('/')}`;
}

const routes = files.map(file => ({ file, path: urlPath(file), mod: parseRoute(file, readFileSync(join(REPO, file), 'utf8')) }));

section(`2. Routes (${routes.length} route files under app/)`);
for (const { path, mod } of routes) {
  const methods = mod.handlers.map(h => `${h.method} ${allowlist[path]?.[h.method]?.access ?? '(no entry)'}`);
  console.log(`  ${path.padEnd(42)} ${methods.join(', ') || '(no handlers)'}`);
}
{
  const exportProblems = routes.flatMap(({ file, mod }) => mod.problems.map(p => `${file}: ${p}`));
  check('exports', exportProblems, 'every route names the methods it exports');

  const missing: string[] = [];
  for (const { file, path, mod } of routes) {
    for (const { method } of mod.handlers) {
      if (!allowlist[path]?.[method]) missing.push(`${path} ${method} (${file}): add it to scripts/route-access.json with an access class and a reason`);
    }
  }
  check('every method has an entry', missing, `${routes.reduce((n, r) => n + r.mod.handlers.length, 0)} exported methods, each with an access class`);

  const stale: string[] = [];
  for (const [path, methods] of Object.entries(allowlist)) {
    const route = routes.find(r => r.path === path);
    for (const method of Object.keys(methods)) {
      if (!route) stale.push(`${path} ${method}: no route file serves this path; remove the entry`);
      else if (!route.mod.handlers.some(h => h.method === method)) stale.push(`${path} ${method}: ${route.file} does not export ${method}; remove the entry`);
    }
  }
  check('every entry has a route', stale, 'no allowlist entry outlives its route');

  const malformed: string[] = [];
  for (const [path, methods] of Object.entries(allowlist)) {
    for (const [method, entry] of Object.entries(methods)) {
      const where = `${path} ${method}`;
      if (!METHODS.includes(method)) malformed.push(`${where}: not an HTTP method a route handler can export`);
      if (!(entry.access in CLASSES)) {
        malformed.push(`${where}: unknown access class "${entry.access}" (one of ${Object.keys(CLASSES).join(', ')})`);
        continue;
      }
      const allowed = CLASSES[entry.access as Access].methods;
      if (allowed && !allowed.includes(method)) malformed.push(`${where}: ${entry.access} is for ${allowed.join(' or ')} only`);
      if (!entry.reason?.trim()) malformed.push(`${where}: no reason`);
    }
  }
  check('entries are well formed', malformed, 'a known class on a method it allows, and a reason');
}

// ---------------------------------------------------------------------------
// 3. Each class's defence is in the handler
// ---------------------------------------------------------------------------

section('3. Access markers');
for (const access of Object.keys(CLASSES) as Access[]) {
  if (!CLASSES[access].marker) continue;
  const problems: string[] = [];
  let count = 0;
  for (const { file, path, mod } of routes) {
    for (const handler of mod.handlers) {
      if (allowlist[path]?.[handler.method]?.access !== access) continue;
      count++;
      const problem = markerProblem(access, mod, handler);
      if (problem) problems.push(`${path} ${handler.method} (${file}): ${problem}`);
    }
  }
  if (count > 0) check(access, problems, `${count} handler(s); each ${CLASSES[access].shown}`);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
