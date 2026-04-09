import { AuditConfig, AuditResult, AccessibilityIssue, PageData } from '../types/audit';
import { crawlWebsite, closeCrawler } from './crawler';
import { scanWithAxe } from './axe-scanner';
import { runCustomRules } from './custom-rules';
import { analyzePdf } from './pdf-analyzer';
import { analyzeWithAI } from './ai-analyzer';
import { calculateScore } from './scoring';
import { generateReport } from './report-generator';
import { v4 as uuidv4 } from 'uuid';

// In-memory audit store (would be database in production)
const auditStore = new Map<string, AuditResult>();

export function getAudit(id: string): AuditResult | undefined {
  return auditStore.get(id);
}

export function getAllAudits(): AuditResult[] {
  return Array.from(auditStore.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

export async function runWebsiteAudit(config: AuditConfig): Promise<string> {
  const id = uuidv4();
  const audit: AuditResult = {
    id, config,
    status: 'pending', progress: 0, progressMessage: 'Initializing...',
    pages: [], issues: [],
    score: { overall: 0, categoryScores: { perceivable: 0, operable: 0, understandable: 0, robust: 0, pdf: 0 }, complianceLevel: 'non-compliant', totalIssues: 0, issueBySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, issueByLevel: { A: 0, AA: 0, AAA: 0 } },
    startedAt: new Date().toISOString()
  };
  auditStore.set(id, audit);

  // Run audit in background
  runAuditPipeline(id, config).catch(err => {
    const a = auditStore.get(id);
    if (a) { a.status = 'error'; a.error = err.message; }
  });

  return id;
}

async function runAuditPipeline(id: string, config: AuditConfig) {
  const audit = auditStore.get(id)!;
  const updateProgress = (msg: string, pct: number) => {
    audit.progressMessage = msg;
    audit.progress = pct;
  };

  try {
    // Phase 1: Crawl
    audit.status = 'crawling';
    updateProgress('Starting website crawl...', 5);

    const crawlResult = await crawlWebsite({
      url: config.url!,
      maxPages: config.maxPages,
      crawlDepth: config.crawlDepth,
      loginConfig: config.loginConfig,
      onProgress: (msg, pct) => updateProgress(msg, pct)
    });

    audit.pages = crawlResult.pages;

    // Phase 2: Scan with axe-core
    audit.status = 'scanning';
    updateProgress('Running accessibility scans...', 50);
    const allIssues: AccessibilityIssue[] = [];

    for (let i = 0; i < crawlResult.pages.length; i++) {
      const page = crawlResult.pages[i];
      const pct = 50 + Math.round((i / crawlResult.pages.length) * 20);
      updateProgress(`Scanning page ${i + 1}/${crawlResult.pages.length}: ${page.title}`, pct);

      // axe-core scan
      const axeIssues = await scanWithAxe(crawlResult.context, page);
      allIssues.push(...axeIssues);

      // Custom rules scan
      const customIssues = await runCustomRules(page);
      allIssues.push(...customIssues);
    }

    // Phase 3: AI analysis
    audit.status = 'analyzing';
    updateProgress('Running AI analysis...', 75);

    if (config.includeAI) {
      for (const page of crawlResult.pages.slice(0, 3)) {
        const aiIssues = await analyzeWithAI({
          pageUrl: page.url,
          pageTitle: page.title,
          htmlSnippet: page.html,
          existingIssues: allIssues.filter(i => i.pageUrl === page.url)
        });
        allIssues.push(...aiIssues);
      }
    }

    // Close browser
    await closeCrawler(crawlResult.browser);

    // Phase 4: Scoring
    audit.status = 'scoring';
    updateProgress('Calculating scores...', 90);
    audit.issues = allIssues;
    audit.score = calculateScore(allIssues);

    // Phase 5: Report generation
    updateProgress('Generating report...', 95);
    audit.report = generateReport(id, allIssues, audit.score, audit.pages.map(p => ({ url: p.url, title: p.title })));

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

export async function runPdfAudit(fileBuffer: Buffer, fileName: string): Promise<string> {
  const id = uuidv4();
  const config: AuditConfig = { type: 'pdf', crawlDepth: 0, maxPages: 1, includeAI: false, wcagLevels: ['A', 'AA'] };
  const audit: AuditResult = {
    id, config,
    status: 'scanning', progress: 10, progressMessage: 'Analyzing PDF...',
    pages: [{ url: fileName, title: fileName, html: '', timestamp: new Date().toISOString() }],
    issues: [],
    score: { overall: 0, categoryScores: { perceivable: 0, operable: 0, understandable: 0, robust: 0, pdf: 0 }, complianceLevel: 'non-compliant', totalIssues: 0, issueBySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, issueByLevel: { A: 0, AA: 0, AAA: 0 } },
    startedAt: new Date().toISOString()
  };
  auditStore.set(id, audit);

  try {
    const result = await analyzePdf(fileBuffer, fileName, (msg) => { audit.progressMessage = msg; });
    audit.issues = result.issues;
    audit.score = calculateScore(result.issues);
    audit.report = generateReport(id, result.issues, audit.score, [{ url: fileName, title: result.metadata.title || fileName }]);
    audit.status = 'complete';
    audit.progress = 100;
    audit.completedAt = new Date().toISOString();
  } catch (error) {
    audit.status = 'error';
    audit.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return id;
}
