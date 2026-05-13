import type { AuditPillar, TrustScore, PillarResults, PillarConfig } from './trustscore';

export type AuditType   = 'website' | 'portal' | 'pdf';
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
  successIndicator?: string;
}

export interface AuditConfig {
  url?: string;
  type: AuditType;
  loginConfig?: LoginConfig;
  crawlDepth: number;
  maxPages: number;
  includeAI: boolean;
  /** WCAG conformance levels to test against — drives axe tag selection and reporting */
  wcagLevels: ('A' | 'AA' | 'AAA')[];
  /** Optional: which standard to reference (e.g. 'WCAG 2.2', 'EN 301 549', 'Section 508') */
  standard?: string;
  // ── TrustLens Pillar Configuration ──
  /** Which audit pillars to run (default: all enabled) */
  enabledPillars?: AuditPillar[];
  /** Custom pillar weight overrides */
  pillarConfig?: Partial<PillarConfig>;
}

export interface PageData {
  url: string;
  title: string;
  html: string;
  screenshot?: string;
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
  /** Criteria that were N/A for the audited content */
  inapplicableCriteria: string[];
  startedAt: string;
  completedAt?: string;
  error?: string;
  // ── TrustLens Multi-Pillar Results ──
  /** Unified trust score across all enabled pillars */
  trustScore?: TrustScore;
  /** Per-pillar detailed results */
  pillarResults?: PillarResults;
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
  browserInteraction: boolean;
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
  executionTime: number;
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
  /** Which audit pillar this log entry belongs to */
  pillar?: 'accessibility' | 'darkpatterns' | 'performance' | 'privacy';
  /** The principle, standard or framework being applied (e.g. "Brignull Taxonomy", "GDPR Art. 7", "RAIL Model") */
  methodology?: string;
  /** The named phase within the engine (e.g. "Phase 1: DOM Scan", "Layer C: Consent Infrastructure") */
  phase?: string;
}

export interface AccessibilityIssue {
  id: string;
  testId: string;
  title: string;
  description: string;
  element: string;
  elementHtml?: string;
  /** Base64-encoded PNG screenshot of the violating element */
  elementScreenshot?: string;
  pageUrl: string;
  wcagCriterion: string;
  wcagName: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  recommendation: string;
  codeFix?: string;
  category: 'perceivable' | 'operable' | 'understandable' | 'robust' | 'pdf';
  source: 'axe-core' | 'custom-rule' | 'pdf-analyzer' | 'ai-analysis' | 'journey-test' | 'test-runner';
  confidence: ConfidenceLevel;
  occurrenceCount?: number;
  affectedPages?: string[];
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
  issueBySeverity: { critical: number; high: number; medium: number; low: number; };
  issueByLevel: { A: number; AA: number; AAA: number; };
  journeyScore?: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
}

// ===== CRAWL COVERAGE =====

export interface CrawlCoverage {
  totalPagesFound: number;    // all unique URLs discovered (before any cap/skip)
  pagesAudited: number;
  pagesSkipped: number;
  coveragePercent: number;
  skippedPages: SkippedPage[];
  discoveryMethods: Record<string, number>;
}

export interface SkippedPage { url: string; reason: string; }

// ===== GROUPED ISSUES =====

export interface GroupedIssue {
  issueKey: string;
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
  frequency: number;
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
  /** WCAG level(s) that were in scope for this audit */
  testedLevel: string;
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
  // ── TrustLens Multi-Pillar ──
  trustScore?: TrustScore;
  pillarResults?: PillarResults;
}

export interface WcagMappingEntry {
  criterion: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  issueCount: number;
  /** 'not-tested' = criterion was N/A for this content (e.g. no video → captions N/A) */
  status: 'pass' | 'fail' | 'not-tested';
}

export interface RemediationStep {
  priority: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedPages: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  frequency: number;
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
