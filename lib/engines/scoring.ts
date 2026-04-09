import { AccessibilityIssue, AuditScore } from '../types/audit';
import { SEVERITY_WEIGHTS, LEVEL_MULTIPLIERS } from '../wcag/severity';

export function calculateScore(issues: AccessibilityIssue[]): AuditScore {
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

  // Calculate overall score
  let totalDeduction = 0;
  for (const issue of issues) {
    const sevWeight = SEVERITY_WEIGHTS[issue.severity];
    const levelMult = LEVEL_MULTIPLIERS[issue.wcagLevel] || 1;
    totalDeduction += sevWeight * levelMult;
  }

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
    issueBySeverity,
    issueByLevel
  };
}

function calcCategoryScore(issues: AccessibilityIssue[]): number {
  if (issues.length === 0) return 100;
  let deduction = 0;
  for (const issue of issues) {
    deduction += SEVERITY_WEIGHTS[issue.severity] * (LEVEL_MULTIPLIERS[issue.wcagLevel] || 1);
  }
  const capped = deduction > 40 ? 40 + (deduction - 40) * 0.2 : deduction;
  return Math.max(0, Math.round(100 - capped));
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
