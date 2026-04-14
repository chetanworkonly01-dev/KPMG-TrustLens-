import { AuditConfig, AuditResult, AccessibilityIssue, PageData, CrawlCoverage, TestLogEntry } from '../types/audit';
import { crawlWebsite, closeCrawler } from './crawler';
import { scanWithAxe, PageApplicabilityHints } from './axe-scanner';
import { runCustomRules } from './custom-rules';
import { analyzePdf } from './pdf-analyzer';
import { analyzeWithAI, assignConfidence } from './ai-analyzer';
import { calculateScore, normalizeSelector } from './scoring';
import { generateReport } from './report-generator';
import { runJourneyTests } from './journey-tester';
import { runTestSuite, TEST_CASES } from './test-runner';
import { v4 as uuidv4 } from 'uuid';

// In-memory audit store
const auditStore = new Map<string, AuditResult>();

export function getAudit(id: string): AuditResult | undefined {
  return auditStore.get(id);
}

export function getAllAudits(): AuditResult[] {
  return Array.from(auditStore.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

function createEmptyScore() {
  return {
    overall: 0,
    categoryScores: { perceivable: 0, operable: 0, understandable: 0, robust: 0, pdf: 0 },
    complianceLevel: 'non-compliant' as const,
    totalIssues: 0, uniqueIssues: 0,
    issueBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    issueByLevel: { A: 0, AA: 0, AAA: 0 },
    testsRun: 0, testsPassed: 0, testsFailed: 0
  };
}

export async function runWebsiteAudit(config: AuditConfig): Promise<string> {
  const id = uuidv4();
  const audit: AuditResult = {
    id, config,
    status: 'pending', progress: 0, progressMessage: 'Initializing...',
    pages: [], issues: [],
    score: createEmptyScore(),
    testResults: [], testLog: [],
    inapplicableCriteria: [],
    startedAt: new Date().toISOString()
  };
  auditStore.set(id, audit);

  runAuditPipeline(id, config).catch(err => {
    const a = auditStore.get(id);
    if (a) { a.status = 'error'; a.error = err.message; }
  });

  return id;
}

async function runAuditPipeline(id: string, config: AuditConfig) {
  const audit = auditStore.get(id)!;
  const wcagLevels = config.wcagLevels || ['A', 'AA'];
  const testedLevel = wcagLevels.includes('AAA') ? 'AAA' : wcagLevels.includes('AA') ? 'AA' : 'A';

  const updateProgress = (msg: string, pct: number) => {
    audit.progressMessage = msg;
    audit.progress = pct;
  };

  const addLog = (entry: TestLogEntry) => {
    audit.testLog.push(entry);
    if (entry.status === 'running') audit.progressMessage = entry.message;
  };

  // Aggregate N/A and pass data across all pages
  const allInapplicable = new Set<string>();
  const allPassed       = new Set<string>();
  let mergedApplicabilityHints: PageApplicabilityHints = {
    hasMedia: false, hasForms: false,
    hasTimedContent: false, hasAnimation: false, isSinglePage: false
  };

  try {
    // ─────────────────────────────────────────
    // PHASE 1: DEEP CRAWL
    // ─────────────────────────────────────────
    audit.status = 'crawling';
    updateProgress('Starting deep website crawl...', 5);

    const crawlResult = await crawlWebsite({
      url: config.url!,
      maxPages: config.maxPages,
      crawlDepth: config.crawlDepth,
      loginConfig: config.loginConfig,
      onProgress: (msg, pct) => updateProgress(msg, pct)
    });

    audit.pages = crawlResult.pages;
    mergedApplicabilityHints.isSinglePage = crawlResult.pages.length === 1;

    const crawlCoverage: CrawlCoverage = {
      totalPagesFound: crawlResult.totalFound,
      pagesAudited: crawlResult.pages.length,
      pagesSkipped: crawlResult.skippedPages.length,
      coveragePercent: crawlResult.totalFound > 0
        ? Math.round((crawlResult.pages.length / crawlResult.totalFound) * 100)
        : 100,
      skippedPages: crawlResult.skippedPages.slice(0, 50),
      discoveryMethods: crawlResult.discoveryMethods,
    };
    audit.crawlCoverage = crawlCoverage;

    updateProgress(`Crawl complete: ${crawlResult.pages.length} pages. Starting tests...`, 50);

    // ─────────────────────────────────────────
    // PHASE 2: TEST-DRIVEN EXECUTION
    // ─────────────────────────────────────────
    audit.status = 'scanning';
    const allIssues: AccessibilityIssue[] = [];

    for (let i = 0; i < crawlResult.pages.length; i++) {
      const pg = crawlResult.pages[i];
      const basePct = 50 + Math.round(((i) / crawlResult.pages.length) * 30);

      addLog({
        timestamp: new Date().toISOString(),
        testId: 'SUITE', testName: 'Test Suite',
        wcag: '', status: 'running',
        message: `━━━ Page ${i + 1}/${crawlResult.pages.length}: ${pg.title} ━━━`,
        pageUrl: pg.url
      });

      // Run structured test suite
      const pageResults = await runTestSuite(
        crawlResult.context, pg,
        (entry) => {
          addLog(entry);
          const testIdx = audit.testLog.filter(l => l.pageUrl === pg.url && l.status !== 'running').length;
          const pct = basePct + Math.round((testIdx / TEST_CASES.length) * (30 / crawlResult.pages.length));
          audit.progress = Math.min(pct, 82);
        }
      );

      audit.testResults.push(...pageResults);
      for (const tr of pageResults) allIssues.push(...tr.issues);

      // axe-core + custom rules — using new return type
      try {
        const axeResult = await scanWithAxe(crawlResult.context, pg);
        allIssues.push(...axeResult.issues);

        // Merge N/A and pass data
        axeResult.inapplicableCriteria.forEach(c => allInapplicable.add(c));
        axeResult.passedCriteria.forEach(c => allPassed.add(c));

        // Merge applicability hints (union — if ANY page has media/forms, it counts)
        if (axeResult.applicabilityHints.hasMedia)       mergedApplicabilityHints.hasMedia = true;
        if (axeResult.applicabilityHints.hasForms)       mergedApplicabilityHints.hasForms = true;
        if (axeResult.applicabilityHints.hasTimedContent) mergedApplicabilityHints.hasTimedContent = true;
        if (axeResult.applicabilityHints.hasAnimation)    mergedApplicabilityHints.hasAnimation = true;

        const customIssues = await runCustomRules(pg);
        allIssues.push(...customIssues);
      } catch (err) {
        console.error(`Scanner error for ${pg.url}:`, err);
      }
    }

    // ─────────────────────────────────────────
    // PHASE 3: USER JOURNEY TESTING
    // ─────────────────────────────────────────
    updateProgress('Running user journey tests...', 83);
    addLog({
      timestamp: new Date().toISOString(),
      testId: 'JOURNEY', testName: 'User Journey Suite',
      wcag: '', status: 'running',
      message: '━━━ Running User Journey Tests ━━━'
    });

    const journeyResult = await runJourneyTests(
      crawlResult.context,
      crawlResult.pages,
      (msg) => updateProgress(msg, audit.progress)
    );
    allIssues.push(...journeyResult.issues);

    addLog({
      timestamp: new Date().toISOString(),
      testId: 'JOURNEY', testName: 'User Journey Suite',
      wcag: '', status: journeyResult.journeyResults.every(j => j.passed) ? 'pass' : 'fail',
      message: `Journey tests: ${journeyResult.journeyResults.filter(j => j.passed).length}/${journeyResult.journeyResults.length} passed`
    });

    // ─────────────────────────────────────────
    // PHASE 4: AI ANALYSIS
    // ─────────────────────────────────────────
    if (config.includeAI) {
      audit.status = 'analyzing';
      updateProgress('Running AI-powered UX & cognitive analysis...', 86);

      const pagesToAnalyze = crawlResult.pages.slice(0, Math.min(5, crawlResult.pages.length));
      for (let i = 0; i < pagesToAnalyze.length; i++) {
        const page = pagesToAnalyze[i];
        const pct = 86 + Math.round(((i + 1) / pagesToAnalyze.length) * 6);
        updateProgress(`AI analyzing page ${i + 1}/${pagesToAnalyze.length}: ${page.title}`, pct);

        const aiIssues = await analyzeWithAI({
          pageUrl: page.url,
          pageTitle: page.title,
          htmlSnippet: page.html,
          existingIssues: allIssues.filter(issue => issue.pageUrl === page.url)
        });
        allIssues.push(...aiIssues);
      }
    }

    await closeCrawler(crawlResult.browser);

    // ─────────────────────────────────────────
    // PHASE 5: VALIDATION & DEDUPLICATION
    // ─────────────────────────────────────────
    updateProgress('Validating results and cross-checking...', 92);

    for (const issue of allIssues) {
      if (!issue.confidence) issue.confidence = assignConfidence(issue);
    }

    const deduped = deduplicateIssues(allIssues);

    // Store collected N/A criteria (exclude any that ended up having violations)
    const failedCriteria = new Set(deduped.map(i => i.wcagCriterion));
    const finalInapplicable = [...allInapplicable].filter(c => !failedCriteria.has(c));
    audit.inapplicableCriteria = finalInapplicable;

    // ─────────────────────────────────────────
    // PHASE 6: SCORING
    // ─────────────────────────────────────────
    audit.status = 'scoring';
    updateProgress('Calculating scores...', 94);
    audit.issues = deduped;
    audit.score = calculateScore(deduped, crawlResult.pages.length);

    const passed = audit.testResults.filter(r => r.status === 'pass').length;
    const failed = audit.testResults.filter(r => r.status === 'fail').length;
    audit.score.testsRun    = audit.testResults.length;
    audit.score.testsPassed = passed;
    audit.score.testsFailed = failed;

    // ─────────────────────────────────────────
    // PHASE 7: REPORT GENERATION
    // ─────────────────────────────────────────
    updateProgress('Generating report...', 96);
    audit.report = generateReport(
      id, deduped, audit.score,
      audit.pages.map(p => ({ url: p.url, title: p.title })),
      crawlCoverage,
      journeyResult.journeyResults,
      finalInapplicable,
      testedLevel
    );
    audit.report.testResults = audit.testResults;

    addLog({
      timestamp: new Date().toISOString(),
      testId: 'COMPLETE', testName: 'Audit Complete',
      wcag: '', status: 'pass',
      message: `✅ Audit complete — Score: ${audit.score.overall}/100 | Level: WCAG ${testedLevel} | ${deduped.length} issues | ${passed}/${passed + failed} tests passed`
    });

    audit.status = 'complete';
    audit.progress = 100;
    audit.progressMessage = 'Audit complete!';
    audit.completedAt = new Date().toISOString();

  } catch (error) {
    audit.status = 'error';
    audit.error = error instanceof Error ? error.message : 'Unknown error';
    audit.progressMessage = `Error: ${audit.error}`;
  }
}

/**
 * Deduplicate issues using normalised selector so CSS whitespace differences
 * don't create false duplicates.
 */
function deduplicateIssues(issues: AccessibilityIssue[]): AccessibilityIssue[] {
  const seen = new Set<string>();
  const deduped: AccessibilityIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.testId}::${issue.title}::${normalizeSelector(issue.element)}::${issue.pageUrl}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(issue);
    }
  }
  return deduped;
}

export async function runPdfAudit(fileBuffer: Buffer, fileName: string): Promise<string> {
  const id = uuidv4();
  const config: AuditConfig = {
    type: 'pdf', crawlDepth: 0, maxPages: 1,
    includeAI: false, wcagLevels: ['A', 'AA'],
    standard: 'WCAG 2.2'
  };
  const audit: AuditResult = {
    id, config,
    status: 'scanning', progress: 10, progressMessage: 'Analyzing PDF...',
    pages: [{ url: fileName, title: fileName, html: '', timestamp: new Date().toISOString() }],
    issues: [],
    score: createEmptyScore(),
    testResults: [], testLog: [],
    inapplicableCriteria: [],
    startedAt: new Date().toISOString()
  };
  auditStore.set(id, audit);

  try {
    const result = await analyzePdf(fileBuffer, fileName, (msg) => { audit.progressMessage = msg; });
    for (const issue of result.issues) {
      if (!issue.confidence) issue.confidence = assignConfidence(issue);
    }
    audit.issues = result.issues;
    audit.score = calculateScore(result.issues, 1);
    audit.score.testsRun = 0; audit.score.testsPassed = 0; audit.score.testsFailed = 0;
    audit.report = generateReport(
      id, result.issues, audit.score,
      [{ url: fileName, title: result.metadata.title || fileName }],
      undefined, undefined, [], 'AA'
    );
    audit.status = 'complete';
    audit.progress = 100;
    audit.completedAt = new Date().toISOString();
  } catch (error) {
    audit.status = 'error';
    audit.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return id;
}
