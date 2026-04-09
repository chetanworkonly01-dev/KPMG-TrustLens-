import { AccessibilityIssue, AuditScore, AuditReport, WcagMappingEntry, RemediationStep, PageBreakdownEntry } from '../types/audit';
import { WCAG_CRITERIA } from '../wcag/criteria';
import { getComplianceLabel } from './scoring';

export function generateReport(
  auditId: string,
  issues: AccessibilityIssue[],
  score: AuditScore,
  pages: { url: string; title: string }[]
): AuditReport {
  return {
    id: `report-${auditId}`,
    auditId,
    executiveSummary: generateExecutiveSummary(score, issues),
    score,
    issues,
    wcagMapping: generateWcagMapping(issues),
    remediationPlan: generateRemediationPlan(issues),
    pageBreakdown: generatePageBreakdown(issues, pages),
    generatedAt: new Date().toISOString()
  };
}

function generateExecutiveSummary(score: AuditScore, issues: AccessibilityIssue[]): string {
  const compliance = getComplianceLabel(score.complianceLevel);
  const criticalCount = score.issueBySeverity.critical;
  const highCount = score.issueBySeverity.high;
  
  let summary = `This accessibility audit evaluated the target against WCAG 2.2 guidelines. `;
  summary += `The overall accessibility score is ${score.overall}/100, classified as "${compliance}". `;
  summary += `A total of ${score.totalIssues} issues were identified across ${issues.length > 0 ? [...new Set(issues.map(i => i.pageUrl))].length : 0} page(s). `;

  if (criticalCount > 0) {
    summary += `\n\n⚠️ URGENT: ${criticalCount} critical issue(s) require immediate attention. These block access for users with disabilities. `;
  }
  if (highCount > 0) {
    summary += `${highCount} high-severity issue(s) significantly impact usability. `;
  }

  summary += `\n\nCategory breakdown: `;
  summary += `Perceivable: ${score.categoryScores.perceivable}/100, `;
  summary += `Operable: ${score.categoryScores.operable}/100, `;
  summary += `Understandable: ${score.categoryScores.understandable}/100, `;
  summary += `Robust: ${score.categoryScores.robust}/100.`;

  if (score.categoryScores.pdf < 100) {
    summary += ` PDF: ${score.categoryScores.pdf}/100.`;
  }

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

function generateRemediationPlan(issues: AccessibilityIssue[]): RemediationStep[] {
  const grouped = new Map<string, AccessibilityIssue[]>();
  for (const issue of issues) {
    const key = `${issue.testId}-${issue.title}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(issue);
  }

  const steps: RemediationStep[] = [];
  let priority = 1;
  const severityOrder: ('critical' | 'high' | 'medium' | 'low')[] = ['critical', 'high', 'medium', 'low'];

  for (const severity of severityOrder) {
    for (const [, group] of grouped.entries()) {
      if (group[0].severity !== severity) continue;
      const pages = [...new Set(group.map(i => i.pageUrl))];
      steps.push({
        priority: priority++,
        severity,
        title: group[0].title,
        description: `${group[0].recommendation} (${group.length} instance${group.length > 1 ? 's' : ''})`,
        affectedPages: pages,
        estimatedEffort: group.length > 5 ? 'high' : group.length > 2 ? 'medium' : 'low'
      });
    }
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
