import { AccessibilityIssue, AuditScore, GroupedIssue } from '../types/audit';
import { SEVERITY_WEIGHTS, LEVEL_MULTIPLIERS } from '../wcag/severity';

export function calculateScore(issues: AccessibilityIssue[], pageCount?: number): AuditScore {
  const issueBySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  const issueByLevel = { A: 0, AA: 0, AAA: 0 };
  const categoryIssues: Record<string, AccessibilityIssue[]> = {
    perceivable: [], operable: [], understandable: [], robust: [], pdf: []
  };

  for (const issue of issues) {
    issueBySeverity[issue.severity]++;
    issueByLevel[issue.wcagLevel]++;
    categoryIssues[issue.category]?.push(issue);
  }

  // Group issues to count unique problems
  const grouped = groupIssues(issues, pageCount || 1);

  // === ADVANCED SCORING ===

  let totalDeduction = 0;

  // 1. Base deduction per issue
  for (const issue of issues) {
    const sevWeight = SEVERITY_WEIGHTS[issue.severity];
    const levelMult = LEVEL_MULTIPLIERS[issue.wcagLevel] || 1;
    // Reduce weight for low-confidence issues
    const confMult = issue.confidence === 'high' ? 1.0 : issue.confidence === 'medium' ? 0.7 : 0.4;
    totalDeduction += sevWeight * levelMult * confMult;
  }

  // 2. Frequency penalty: issues appearing across many pages are penalized more
  if (pageCount && pageCount > 1) {
    for (const group of grouped) {
      if (group.frequency > 50) {
        // Issue appears on >50% of pages — add extra penalty
        const extraPenalty = SEVERITY_WEIGHTS[group.severity] * (group.frequency / 100) * 2;
        totalDeduction += extraPenalty;
      }
    }
  }

  // 3. Critical issue heavy penalty: each critical issue beyond 3 has accelerating impact
  if (issueBySeverity.critical > 3) {
    totalDeduction += (issueBySeverity.critical - 3) * 5;
  }

  // 4. Journey test bonus: if journey tests passed, reduce deduction
  const journeyIssues = issues.filter(i => i.source === 'journey-test');
  const journeyTestCount = new Set(journeyIssues.map(i => i.testId)).size;
  const journeyScore = journeyTestCount > 0 ? Math.max(0, 100 - journeyTestCount * 15) : undefined;

  // Cap deduction with diminishing returns
  const cappedDeduction = totalDeduction > 50
    ? 50 + (totalDeduction - 50) * 0.3
    : totalDeduction;

  const overall = Math.max(0, Math.round(100 - cappedDeduction));

  // Category scores
  const categoryScores = {
    perceivable: calcCategoryScore(categoryIssues.perceivable),
    operable: calcCategoryScore(categoryIssues.operable),
    understandable: calcCategoryScore(categoryIssues.understandable),
    robust: calcCategoryScore(categoryIssues.robust),
    pdf: categoryIssues.pdf.length > 0 ? calcCategoryScore(categoryIssues.pdf) : 100
  };

  // Compliance level
  let complianceLevel: AuditScore['complianceLevel'];
  if (overall >= 90 && issueBySeverity.critical === 0) {
    complianceLevel = 'aaa-compliant';
  } else if (overall >= 75 && issueBySeverity.critical === 0) {
    complianceLevel = 'aa-compliant';
  } else if (overall >= 50) {
    complianceLevel = 'partially-compliant';
  } else {
    complianceLevel = 'non-compliant';
  }

  return {
    overall,
    categoryScores,
    complianceLevel,
    totalIssues: issues.length,
    uniqueIssues: grouped.length,
    issueBySeverity,
    issueByLevel,
    journeyScore,
    testsRun: 0,
    testsPassed: 0,
    testsFailed: 0
  };
}

function calcCategoryScore(issues: AccessibilityIssue[]): number {
  if (issues.length === 0) return 100;
  let deduction = 0;
  for (const issue of issues) {
    const confMult = issue.confidence === 'high' ? 1.0 : issue.confidence === 'medium' ? 0.7 : 0.4;
    deduction += SEVERITY_WEIGHTS[issue.severity] * (LEVEL_MULTIPLIERS[issue.wcagLevel] || 1) * confMult;
  }
  const capped = deduction > 40 ? 40 + (deduction - 40) * 0.2 : deduction;
  return Math.max(0, Math.round(100 - capped));
}

/**
 * Group identical issues across pages for cleaner reporting
 */
export function groupIssues(issues: AccessibilityIssue[], pageCount: number): GroupedIssue[] {
  const groups = new Map<string, GroupedIssue>();

  for (const issue of issues) {
    // Group by testId + title (same type of issue)
    const key = `${issue.testId}::${issue.title}`;

    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.occurrenceCount++;
      if (!group.affectedPages.includes(issue.pageUrl)) {
        group.affectedPages.push(issue.pageUrl);
      }
      group.instances.push(issue);
      group.frequency = Math.round((group.affectedPages.length / pageCount) * 100);
    } else {
      groups.set(key, {
        issueKey: key,
        title: issue.title,
        testId: issue.testId,
        wcagCriterion: issue.wcagCriterion,
        wcagName: issue.wcagName,
        wcagLevel: issue.wcagLevel,
        severity: issue.severity,
        category: issue.category,
        description: issue.description,
        recommendation: issue.recommendation,
        codeFix: issue.codeFix,
        confidence: issue.confidence || 'medium',
        occurrenceCount: 1,
        affectedPages: [issue.pageUrl],
        frequency: Math.round((1 / pageCount) * 100),
        instances: [issue],
      });
    }
  }

  // Sort by severity then frequency
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return Array.from(groups.values()).sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.frequency - a.frequency;
  });
}

export function getComplianceLabel(level: AuditScore['complianceLevel']): string {
  const labels: Record<string, string> = {
    'non-compliant': 'Non-Compliant',
    'partially-compliant': 'Partially Compliant',
    'aa-compliant': 'WCAG AA Compliant',
    'aaa-compliant': 'WCAG AAA Compliant'
  };
  return labels[level] || level;
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#3B82F6';
  if (score >= 50) return '#EAB308';
  return '#EF4444';
}
