import { AccessibilityIssue, AuditScore, AuditReport, WcagMappingEntry, RemediationStep, PageBreakdownEntry, GroupedIssue, CrawlCoverage, JourneyTestResult } from '../types/audit';
import { WCAG_CRITERIA } from '../wcag/criteria';
import { getComplianceLabel, groupIssues } from './scoring';

export function generateReport(
  auditId: string,
  issues: AccessibilityIssue[],
  score: AuditScore,
  pages: { url: string; title: string }[],
  crawlCoverage?: CrawlCoverage,
  journeyResults?: JourneyTestResult[]
): AuditReport {
  const pageCount = pages.length || 1;
  const grouped = groupIssues(issues, pageCount);
  const topCritical = getTopCritical(grouped);

  return {
    id: `report-${auditId}`,
    auditId,
    executiveSummary: generateExecutiveSummary(score, issues, grouped, crawlCoverage, journeyResults),
    score,
    issues,
    groupedIssues: grouped,
    topCritical,
    wcagMapping: generateWcagMapping(issues),
    remediationPlan: generateRemediationPlan(grouped, pageCount),
    pageBreakdown: generatePageBreakdown(issues, pages),
    crawlCoverage,
    journeyResults,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Get top critical issues to fix first — smart prioritization
 * Sorted by: severity > frequency > impact on user journeys
 */
function getTopCritical(grouped: GroupedIssue[]): GroupedIssue[] {
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

  return grouped
    .filter(g => g.severity === 'critical' || g.severity === 'high')
    .sort((a, b) => {
      // Primary: severity
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      // Secondary: frequency across pages
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      // Tertiary: occurrence count
      return b.occurrenceCount - a.occurrenceCount;
    })
    .slice(0, 10);
}

function generateExecutiveSummary(
  score: AuditScore,
  issues: AccessibilityIssue[],
  grouped: GroupedIssue[],
  crawlCoverage?: CrawlCoverage,
  journeyResults?: JourneyTestResult[]
): string {
  const compliance = getComplianceLabel(score.complianceLevel);
  const criticalCount = score.issueBySeverity.critical;
  const highCount = score.issueBySeverity.high;
  const pageCount = [...new Set(issues.map(i => i.pageUrl))].length || 1;

  let summary = `This accessibility audit evaluated the target against WCAG 2.2 guidelines. `;
  summary += `The overall accessibility score is ${score.overall}/100, classified as "${compliance}". `;
  summary += `A total of ${score.totalIssues} issues were identified (${score.uniqueIssues} unique issue types) across ${pageCount} page(s). `;

  // Coverage info
  if (crawlCoverage) {
    summary += `\n\n📊 CRAWL COVERAGE: ${crawlCoverage.pagesAudited} of ${crawlCoverage.totalPagesFound} discovered pages were audited (${crawlCoverage.coveragePercent}% coverage). `;
    if (crawlCoverage.pagesSkipped > 0) {
      summary += `${crawlCoverage.pagesSkipped} page(s) were skipped.`;
    }
  }

  if (criticalCount > 0) {
    summary += `\n\n⚠️ URGENT: ${criticalCount} critical issue(s) require immediate attention. These block access for users with disabilities. `;
  }
  if (highCount > 0) {
    summary += `${highCount} high-severity issue(s) significantly impact usability. `;
  }

  // Most widespread issues
  const widespread = grouped.filter(g => g.frequency > 50);
  if (widespread.length > 0) {
    summary += `\n\n🔥 WIDESPREAD: ${widespread.length} issue(s) appear on more than 50% of pages: `;
    summary += widespread.slice(0, 3).map(w => `"${w.title}" (${w.affectedPages.length} pages)`).join(', ') + '.';
  }

  // Journey test results
  if (journeyResults && journeyResults.length > 0) {
    const passed = journeyResults.filter(j => j.passed).length;
    const total = journeyResults.length;
    summary += `\n\n🚶 USER JOURNEY TESTS: ${passed}/${total} journeys passed. `;
    const failedJourneys = journeyResults.filter(j => !j.passed);
    if (failedJourneys.length > 0) {
      summary += `Failed: ${failedJourneys.map(j => j.journeyName).join(', ')}.`;
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

  // Confidence breakdown
  const highConf = issues.filter(i => i.confidence === 'high').length;
  const medConf = issues.filter(i => i.confidence === 'medium').length;
  const lowConf = issues.filter(i => i.confidence === 'low').length;
  summary += `\n\n🎯 CONFIDENCE: ${highConf} high, ${medConf} medium, ${lowConf} low confidence issues.`;

  return summary;
}

function generateWcagMapping(issues: AccessibilityIssue[]): WcagMappingEntry[] {
  const criteriaMap = new Map<string, number>();
  for (const issue of issues) {
    const count = criteriaMap.get(issue.wcagCriterion) || 0;
    criteriaMap.set(issue.wcagCriterion, count + 1);
  }

  const entries: WcagMappingEntry[] = [];
  for (const [id, criterion] of Object.entries(WCAG_CRITERIA)) {
    const count = criteriaMap.get(id) || 0;
    entries.push({
      criterion: id,
      name: criterion.name,
      level: criterion.level,
      issueCount: count,
      status: count > 0 ? 'fail' : 'pass'
    });
  }

  return entries.sort((a, b) => b.issueCount - a.issueCount);
}

/**
 * Smart remediation plan based on grouped issues
 */
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
    const highCount = pageIssues.filter(i => i.severity === 'high').length;
    const mediumCount = pageIssues.filter(i => i.severity === 'medium').length;
    const lowCount = pageIssues.filter(i => i.severity === 'low').length;

    let deduction = criticalCount * 15 + highCount * 7.5 + mediumCount * 3 + lowCount * 0.75;
    const score = Math.max(0, Math.round(100 - deduction));

    return {
      url: page.url,
      title: page.title,
      score,
      issueCount: pageIssues.length,
      criticalCount, highCount, mediumCount, lowCount
    };
  });
}

export function reportToJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}
