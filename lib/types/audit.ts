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
  crawlCoverage?: CrawlCoverage;
  testResults: TestResult[];
  testLog: TestLogEntry[];
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// ===== TEST-DRIVEN EXECUTION MODEL =====

export type TestStatus = 'pending' | 'running' | 'pass' | 'fail' | 'error' | 'needs-review';

export interface TestCase {
  testId: string;
  testName: string;
  wcagCriterion: string;
  wcagName: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  category: 'perceivable' | 'operable' | 'understandable' | 'robust';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  browserInteraction: boolean; // requires real browser actions
}

export interface TestResult {
  testId: string;
  testName: string;
  pageUrl: string;
  status: TestStatus;
  wcagCriterion: string;
  wcagName: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: ConfidenceLevel;
  evidence: TestEvidence;
  issues: AccessibilityIssue[];
  executionTime: number; // ms
  error?: string;
}

export interface TestEvidence {
  summary: string;
  elementsChecked: number;
  elementsFailed: number;
  details: string[];
  domSnapshots?: string[];
}

export interface TestLogEntry {
  timestamp: string;
  testId: string;
  testName: string;
  wcag: string;
  status: TestStatus;
  message: string;
  pageUrl?: string;
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
  source: 'axe-core' | 'custom-rule' | 'pdf-analyzer' | 'ai-analysis' | 'journey-test' | 'test-runner';
  confidence: ConfidenceLevel;
  occurrenceCount?: number; // how many pages this issue appears on
  affectedPages?: string[]; // pages where this issue occurs
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
  uniqueIssues: number;
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
  journeyScore?: number; // score for user journey accessibility
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
}

// ===== CRAWL COVERAGE =====

export interface CrawlCoverage {
  totalPagesFound: number;
  pagesAudited: number;
  pagesSkipped: number;
  coveragePercent: number;
  skippedPages: SkippedPage[];
  discoveryMethods: Record<string, number>; // how links were discovered
}

export interface SkippedPage {
  url: string;
  reason: string;
}

// ===== GROUPED ISSUES =====

export interface GroupedIssue {
  issueKey: string; // unique key for this group
  title: string;
  testId: string;
  wcagCriterion: string;
  wcagName: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: AccessibilityIssue['category'];
  description: string;
  recommendation: string;
  codeFix?: string;
  confidence: ConfidenceLevel;
  occurrenceCount: number;
  affectedPages: string[];
  frequency: number; // percentage of pages affected
  instances: AccessibilityIssue[];
}

// ===== USER JOURNEY =====

export interface JourneyTestResult {
  journeyName: string;
  description: string;
  steps: JourneyStep[];
  passed: boolean;
  issues: AccessibilityIssue[];
}

export interface JourneyStep {
  name: string;
  action: string;
  passed: boolean;
  issue?: string;
}

// ===== REPORT =====

export interface AuditReport {
  id: string;
  auditId: string;
  executiveSummary: string;
  score: AuditScore;
  issues: AccessibilityIssue[];
  groupedIssues: GroupedIssue[];
  topCritical: GroupedIssue[];
  wcagMapping: WcagMappingEntry[];
  remediationPlan: RemediationStep[];
  pageBreakdown: PageBreakdownEntry[];
  crawlCoverage?: CrawlCoverage;
  journeyResults?: JourneyTestResult[];
  testResults?: TestResult[];
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
  frequency: number; // percentage of pages
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

