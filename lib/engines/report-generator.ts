import { AccessibilityIssue, AuditScore, AuditReport, WcagMappingEntry, RemediationStep, PageBreakdownEntry, GroupedIssue, CrawlCoverage, JourneyTestResult } from '../types/audit';
import { WCAG_CRITERIA } from '../wcag/criteria';
import { getComplianceLabel, groupIssues } from './scoring';

export function generateReport(
  auditId: string,
  issues: AccessibilityIssue[],
  score: AuditScore,
  pages: { url: string; title: string }[],
  crawlCoverage?: CrawlCoverage,
  journeyResults?: JourneyTestResult[],
  inapplicableCriteria?: string[],    // ← N/A criteria from axe
  testedLevel?: string                 // ← e.g. 'AA'
): AuditReport {
  const pageCount = pages.length || 1;
  const grouped = groupIssues(issues, pageCount);
  const topCritical = getTopCritical(grouped);

  return {
    id: `report-${auditId}`,
    auditId,
    testedLevel: testedLevel || 'AA',
    executiveSummary: generateExecutiveSummary(score, issues, grouped, crawlCoverage, journeyResults, testedLevel),
    score,
    issues,
    groupedIssues: grouped,
    topCritical,
    wcagMapping: generateWcagMapping(issues, inapplicableCriteria || []),
    remediationPlan: generateRemediationPlan(grouped, pageCount),
    pageBreakdown: generatePageBreakdown(issues, pages),
    crawlCoverage,
    journeyResults,
    generatedAt: new Date().toISOString()
  };
}

function getTopCritical(grouped: GroupedIssue[]): GroupedIssue[] {
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return grouped
    .filter(g => g.severity === 'critical' || g.severity === 'high')
    .sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return b.occurrenceCount - a.occurrenceCount;
    })
    .slice(0, 10);
}

function generateExecutiveSummary(
  score: AuditScore,
  issues: AccessibilityIssue[],
  grouped: GroupedIssue[],
  crawlCoverage?: CrawlCoverage,
  journeyResults?: JourneyTestResult[],
  testedLevel?: string
): string {
  const compliance = getComplianceLabel(score.complianceLevel);
  const criticalCount = score.issueBySeverity.critical;
  const highCount = score.issueBySeverity.high;
  const pageCount = [...new Set(issues.map(i => i.pageUrl))].length || 1;
  const level = testedLevel || 'AA';

  let summary = `This KPMG AI-powered accessibility audit evaluated the target against WCAG 2.2 Level ${level} guidelines. `;
  summary += `The overall accessibility score is ${score.overall}/100, classified as "${compliance}". `;
  summary += `A total of ${score.totalIssues} issues were identified (${score.uniqueIssues} unique issue types) across ${pageCount} page(s). `;

  if (crawlCoverage) {
    const coveragePct = crawlCoverage.coveragePercent;
    summary += `\n\n📊 CRAWL COVERAGE: ${crawlCoverage.pagesAudited} of ${crawlCoverage.totalPagesFound} discovered pages were audited (${coveragePct}% coverage).`;
    if (coveragePct < 100 && crawlCoverage.pagesSkipped > 0) {
      summary += ` ${crawlCoverage.pagesSkipped} page(s) were not audited due to the configured page limit or skip rules.`;
    }
  }

  if (criticalCount > 0) {
    summary += `\n\n⚠️ URGENT: ${criticalCount} critical issue(s) require immediate attention. These directly block access for users with disabilities.`;
  }
  if (highCount > 0) {
    summary += ` ${highCount} high-severity issue(s) significantly impact usability.`;
  }

  const widespread = grouped.filter(g => g.frequency > 50);
  if (widespread.length > 0) {
    summary += `\n\n🔥 WIDESPREAD: ${widespread.length} issue(s) appear on more than 50% of pages: `;
    summary += widespread.slice(0, 3).map(w => `"${w.title}" (${w.affectedPages.length} pages)`).join(', ') + '.';
  }

  if (journeyResults && journeyResults.length > 0) {
    const passed = journeyResults.filter(j => j.passed).length;
    const total = journeyResults.length;
    summary += `\n\n🚶 USER JOURNEY TESTS: ${passed}/${total} journeys passed.`;
    const failedJourneys = journeyResults.filter(j => !j.passed);
    if (failedJourneys.length > 0) {
      summary += ` Failed: ${failedJourneys.map(j => j.journeyName).join(', ')}.`;
    }
  }

  summary += `\n\nCategory breakdown: `;
  summary += `Perceivable: ${score.categoryScores.perceivable}/100, `;
  summary += `Operable: ${score.categoryScores.operable}/100, `;
  summary += `Understandable: ${score.categoryScores.understandable}/100, `;
  summary += `Robust: ${score.categoryScores.robust}/100.`;

  if (score.categoryScores.pdf < 100) {
    summary += ` PDF: ${score.categoryScores.pdf}/100.`;
  }

  const highConf = issues.filter(i => i.confidence === 'high').length;
  const medConf  = issues.filter(i => i.confidence === 'medium').length;
  const lowConf  = issues.filter(i => i.confidence === 'low').length;
  summary += `\n\n🎯 CONFIDENCE: ${highConf} high, ${medConf} medium, ${lowConf} low confidence issues.`;

  return summary;
}

/**
 * Generate WCAG mapping with true three-way status:
 *  'fail'       — at least one issue found
 *  'pass'       — explicitly tested and no violations
 *  'not-tested' — criterion did not apply to audited content (N/A)
 */
function generateWcagMapping(
  issues: AccessibilityIssue[],
  inapplicableCriteria: string[]
): WcagMappingEntry[] {
  // Count issues per criterion
  const criteriaMap = new Map<string, number>();
  for (const issue of issues) {
    criteriaMap.set(issue.wcagCriterion, (criteriaMap.get(issue.wcagCriterion) || 0) + 1);
  }

  // Criteria with confirmed violations
  const failedSet = new Set(criteriaMap.keys());
  // Criteria axe explicitly said are N/A
  const naSet = new Set(inapplicableCriteria);

  const entries: WcagMappingEntry[] = [];
  for (const [id, criterion] of Object.entries(WCAG_CRITERIA)) {
    const count = criteriaMap.get(id) || 0;
    let status: WcagMappingEntry['status'];

    if (failedSet.has(id)) {
      status = 'fail';
    } else if (naSet.has(id)) {
      status = 'not-tested';   // N/A — not applicable to this page's content
    } else {
      status = 'pass';
    }

    entries.push({
      criterion: id,
      name: criterion.name,
      level: criterion.level,
      issueCount: count,
      status
    });
  }

  return entries.sort((a, b) => b.issueCount - a.issueCount);
}

function generateRemediationPlan(grouped: GroupedIssue[], pageCount: number): RemediationStep[] {
  const steps: RemediationStep[] = [];
  let priority = 1;

  for (const group of grouped) {
    steps.push({
      priority: priority++,
      severity: group.severity,
      title: group.title,
      description: `${group.recommendation} (${group.occurrenceCount} instance${group.occurrenceCount > 1 ? 's' : ''} across ${group.affectedPages.length} page${group.affectedPages.length > 1 ? 's' : ''})`,
      affectedPages: group.affectedPages,
      estimatedEffort: group.occurrenceCount > 10 ? 'high' : group.occurrenceCount > 3 ? 'medium' : 'low',
      frequency: group.frequency,
    });
  }

  return steps;
}

function generatePageBreakdown(issues: AccessibilityIssue[], pages: { url: string; title: string }[]): PageBreakdownEntry[] {
  return pages.map(page => {
    const pageIssues = issues.filter(i => i.pageUrl === page.url);
    const criticalCount = pageIssues.filter(i => i.severity === 'critical').length;
    const highCount     = pageIssues.filter(i => i.severity === 'high').length;
    const mediumCount   = pageIssues.filter(i => i.severity === 'medium').length;
    const lowCount      = pageIssues.filter(i => i.severity === 'low').length;

    const deduction = criticalCount * 15 + highCount * 7.5 + mediumCount * 3 + lowCount * 0.75;
    const score = Math.max(0, Math.round(100 - deduction));

    return { url: page.url, title: page.title, score, issueCount: pageIssues.length, criticalCount, highCount, mediumCount, lowCount };
  });
}

export function reportToJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}
