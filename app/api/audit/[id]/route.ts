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
    config: audit.config,
    status: audit.status,
    progress: audit.progress,
    progressMessage: audit.progressMessage,
    pages: audit.pages.map(p => ({ url: p.url, title: p.title, timestamp: p.timestamp })),
    issues: audit.issues,
    score: audit.score,
    report: audit.report,
    crawlCoverage: audit.crawlCoverage,
    testResults: audit.testResults || [],
    testLog: audit.testLog || [],
    inapplicableCriteria: audit.inapplicableCriteria || [],
    startedAt: audit.startedAt,
    completedAt: audit.completedAt,
    error: audit.error
  });
}
