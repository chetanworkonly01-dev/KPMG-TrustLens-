import { NextResponse } from 'next/server';
import { getAudit, getAllAudits } from '@/lib/engines/audit-orchestrator';

export const dynamic = 'force-dynamic';

export async function GET() {
  const audits = getAllAudits();
  const summary = audits.map(a => ({
    id: a.id,
    status: a.status,
    config: {
      url: a.config.url,
      type: a.config.type,
      wcagLevels: a.config.wcagLevels,
      standard: a.config.standard,
    },
    score: {
      overall: a.score.overall,
      complianceLevel: a.score.complianceLevel,
      totalIssues: a.score.totalIssues,
      testsRun: a.score.testsRun,
    },
    progress: a.progress,
    startedAt: a.startedAt,
    completedAt: a.completedAt,
    crawlCoverage: a.crawlCoverage ? {
      totalPagesFound: a.crawlCoverage.totalPagesFound,
      pagesAudited: a.crawlCoverage.pagesAudited,
      coveragePercent: a.crawlCoverage.coveragePercent,
    } : undefined,
  }));
  return NextResponse.json(summary);
}
