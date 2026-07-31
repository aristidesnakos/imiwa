/**
 * app/api/admin/sentences/decisions/[level]/route.ts
 *
 * The write surface for the local-only sentence review dashboard.
 *
 *   GET    /api/admin/sentences/decisions/N5   → DecisionLog for the level
 *   POST   /api/admin/sentences/decisions/N5   → record one decision
 *   DELETE /api/admin/sentences/decisions/N5?candidateId=…  → back to undecided
 *
 * Every handler opens with the production kill-switch. This endpoint writes to
 * the repo working tree with `fs` and has no authentication of any kind; the
 * only thing that makes that acceptable is that it cannot exist in production.
 *
 * All the actual rules live in `lib/sentences/record-decision.ts` so a CLI can
 * take the identical code path. This file only translates results into status
 * codes.
 */

import { NextRequest, NextResponse } from 'next/server';

import { blockedResponse } from '@/lib/sentences/local-only';
import { isLevel, readDecisionLog } from '@/lib/sentences/store';
import { clearDecision, recordDecision } from '@/lib/sentences/record-decision';
import type { DecisionInput } from '@/lib/sentences/record-decision';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ level: string }> };

const badLevel = (level: string) =>
  NextResponse.json({ error: `unknown level "${level}"` }, { status: 400 });

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const blocked = blockedResponse();
  if (blocked) return blocked;

  const { level } = await params;
  if (!isLevel(level)) return badLevel(level);

  return NextResponse.json(readDecisionLog(level));
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const blocked = blockedResponse();
  if (blocked) return blocked;

  const { level } = await params;
  if (!isLevel(level)) return badLevel(level);

  let body: DecisionInput;
  try {
    body = (await request.json()) as DecisionInput;
  } catch {
    return NextResponse.json({ error: 'body must be JSON' }, { status: 400 });
  }

  const result = recordDecision(level, body);

  // 409 on a candidate that already has a decision — the caller must opt in to
  // replacing someone else's (or their own stale tab's) judgement.
  if (result.code === 'conflict') {
    return NextResponse.json(
      { error: result.message, code: 'conflict', existing: result.existing },
      { status: 409 }
    );
  }
  if (result.code === 'invalid') {
    return NextResponse.json({ error: result.message, code: 'invalid' }, { status: 400 });
  }

  return NextResponse.json({
    decision: result.decision,
    replaced: result.replaced,
  });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const blocked = blockedResponse();
  if (blocked) return blocked;

  const { level } = await params;
  if (!isLevel(level)) return badLevel(level);

  const candidateId = request.nextUrl.searchParams.get('candidateId');
  if (!candidateId) {
    return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
  }

  const result = clearDecision(level, candidateId);
  return NextResponse.json({ removed: result.removed });
}
