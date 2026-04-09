import { NextResponse } from 'next/server';
import { getAudit, getAllAudits } from '@/lib/engines/audit-orchestrator';

export const dynamic = 'force-dynamic';

export async function GET() {
  const audits = getAllAudits();
  const summary = audits.map(a => ({
    id: a.id,
    type: a.config.type,
    url: a.config.url || 'PDF Upload',
    status: a.status,
    score: a.score.overall,
    complianceLevel: a.score.complianceLevel,
    totalIssues: a.score.totalIssues,
    startedAt: a.startedAt,
    completedAt: a.completedAt
  }));
  return NextResponse.json(summary);
}
