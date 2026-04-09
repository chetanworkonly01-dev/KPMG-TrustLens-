import { NextRequest, NextResponse } from 'next/server';
import { getAudit } from '@/lib/engines/audit-orchestrator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = getAudit(id);

  if (!audit) {
    return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: audit.id,
    status: audit.status,
    progress: audit.progress,
    progressMessage: audit.progressMessage,
    ...(audit.status === 'complete' ? {
      score: audit.score,
      issueCount: audit.issues.length,
      completedAt: audit.completedAt
    } : {}),
    ...(audit.status === 'error' ? { error: audit.error } : {})
  });
}
