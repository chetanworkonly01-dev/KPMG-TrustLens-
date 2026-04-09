export type AuditType = 'website' | 'portal' | 'pdf';
export type AuditStatus = 'pending' | 'crawling' | 'scanning' | 'analyzing' | 'scoring' | 'complete' | 'error';

export interface LoginConfig {
  loginUrl: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  username: string;
  password: string;
  otpSelector?: string;
  otpValue?: string;
  successIndicator?: string; // selector that appears after successful login
}

export interface AuditConfig {
  url?: string;
  type: AuditType;
  loginConfig?: LoginConfig;
  crawlDepth: number;
  maxPages: number;
  includeAI: boolean;
  wcagLevels: ('A' | 'AA' | 'AAA')[];
}

export interface PageData {
  url: string;
  title: string;
  html: string;
  screenshot?: string; // base64
  timestamp: string;
}

export interface AuditResult {
  id: string;
  config: AuditConfig;
  status: AuditStatus;
  progress: number;
  progressMessage: string;
  pages: PageData[];
  issues: AccessibilityIssue[];
  score: AuditScore;
  report?: AuditReport;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface AccessibilityIssue {
  id: string;
  testId: string;
  title: string;
  description: string;
  element: string; // CSS selector or XPath or PDF section
  elementHtml?: string; // the actual HTML snippet
  pageUrl: string;
  wcagCriterion: string; // e.g., "1.1.1"
  wcagName: string; // e.g., "Non-text Content"
  wcagLevel: 'A' | 'AA' | 'AAA';
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string; // who is affected
  recommendation: string;
  codeFix?: string;
  category: 'perceivable' | 'operable' | 'understandable' | 'robust' | 'pdf';
  source: 'axe-core' | 'custom-rule' | 'pdf-analyzer' | 'ai-analysis';
}

export interface AuditScore {
  overall: number;
  categoryScores: {
    perceivable: number;
    operable: number;
    understandable: number;
    robust: number;
    pdf: number;
  };
  complianceLevel: 'non-compliant' | 'partially-compliant' | 'aa-compliant' | 'aaa-compliant';
  totalIssues: number;
  issueBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  issueByLevel: {
    A: number;
    AA: number;
    AAA: number;
  };
}

export interface AuditReport {
  id: string;
  auditId: string;
  executiveSummary: string;
  score: AuditScore;
  issues: AccessibilityIssue[];
  wcagMapping: WcagMappingEntry[];
  remediationPlan: RemediationStep[];
  pageBreakdown: PageBreakdownEntry[];
  generatedAt: string;
}

export interface WcagMappingEntry {
  criterion: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  issueCount: number;
  status: 'pass' | 'fail' | 'not-tested';
}

export interface RemediationStep {
  priority: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedPages: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface PageBreakdownEntry {
  url: string;
  title: string;
  score: number;
  issueCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}
