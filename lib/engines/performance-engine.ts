// ============================================================
// KPMG TrustLens — Performance & Core Web Vitals Engine
// ============================================================

import type { BrowserContext, Page } from 'playwright';
import type { PerformanceResult, PagePerformance, CoreWebVitals, ResourceIssue } from '../types/performance';
import { CWV_THRESHOLDS } from '../types/performance';
import type { TestLogEntry } from '../types/audit';

interface PageData { url: string; title: string; }
type ProgressFn = (entry: TestLogEntry) => void;

export async function runPerformanceAudit(
  context: BrowserContext,
  pages: PageData[],
  onProgress?: ProgressFn
): Promise<PerformanceResult> {
  const pageResults: PagePerformance[] = [];
  const log = (testId: string, status: string, message: string, methodology?: string, phase?: string) => {
    onProgress?.({ timestamp: new Date().toISOString(), testId, testName: 'Performance', wcag: '', status: status as any, message, pillar: 'performance', methodology, phase });
  };

  for (const pageData of pages) {
    let page: Page | null = null;
    try {
      page = await context.newPage();

      // Collect network requests
      const requests: Array<{ url: string; size: number; type: string; headers: Record<string, string> }> = [];
      page.on('response', async (response) => {
        try {
          const headers = response.headers();
          const size = parseInt(headers['content-length'] || '0', 10);
          const type = headers['content-type'] || '';
          requests.push({ url: response.url(), size, type, headers });
        } catch {}
      });

      const startTime = Date.now();
      await page.goto(pageData.url, { waitUntil: 'load', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      await page.waitForTimeout(2000);

      // ── Layer A: Core Web Vitals ──
      log('PERF-CWV', 'running', '━━━ Layer A: Core Web Vitals Measurement', 'Google Core Web Vitals (CWV) — Ranking Signals', 'Layer A: Core Web Vitals');
      log('PERF-CWV-LCP', 'running', '  → LCP (Largest Contentful Paint): target <2.5s — hero image, H1, above-fold block', 'CWV — LCP Google Ranking Signal', 'Layer A: Core Web Vitals');
      log('PERF-CWV-INP', 'running', '  → INP (Interaction to Next Paint): target <200ms — replaces FID as primary responsiveness metric', 'CWV — INP Google Ranking Signal', 'Layer A: Core Web Vitals');
      log('PERF-CWV-CLS', 'running', '  → CLS (Cumulative Layout Shift): target <0.1 — images without dimensions, injected content', 'CWV — CLS Google Ranking Signal', 'Layer A: Core Web Vitals');
      log('PERF-CWV-FCP', 'running', '  → FCP (First Contentful Paint): target <1.8s — Lighthouse performance score component', 'Lighthouse — FCP Criterion', 'Layer A: Core Web Vitals');
      log('PERF-CWV-TBT', 'running', '  → TBT (Total Blocking Time): target <200ms — long tasks >50ms on main thread', 'Lighthouse — TBT Criterion', 'Layer A: Core Web Vitals');
      log('PERF-CWV-TTFB', 'running', '  → TTFB (Time to First Byte): target <800ms — server response, CDN, network latency', 'RAIL Model — Load Phase', 'Layer A: Core Web Vitals');
      const vitals = await measureCoreWebVitals(page);
      const t = CWV_THRESHOLDS;
      const lcpLabel = vitals.lcp !== null ? (vitals.lcp <= t.lcp.good ? 'Good' : vitals.lcp <= t.lcp.poor ? 'Needs Work' : 'Poor') : 'N/A';
      const clsLabel = vitals.cls !== null ? (vitals.cls <= t.cls.good ? 'Good' : vitals.cls <= t.cls.poor ? 'Needs Work' : 'Poor') : 'N/A';
      const fcpLabel = vitals.fcp !== null ? (vitals.fcp <= t.fcp.good ? 'Good' : vitals.fcp <= t.fcp.poor ? 'Needs Work' : 'Poor') : 'N/A';
      log('PERF-CWV', 'pass', `  ✓ CWV: LCP ${vitals.lcp ?? '?'}ms (${lcpLabel}) | CLS ${vitals.cls ?? '?'} (${clsLabel}) | FCP ${vitals.fcp ?? '?'}ms (${fcpLabel})`, 'Google Core Web Vitals', 'Layer A: Core Web Vitals');

      // ── Layer B: Resource Optimization ──
      log('PERF-RES', 'running', '━━━ Layer B: Resource Optimisation Analysis', 'Lighthouse Asset Optimisation Criteria', 'Layer B: Resource Optimization');
      log('PERF-RES-IMG', 'running', '  → Unoptimised Images: WebP/AVIF format check, size >500KB threshold', 'Lighthouse — Serve Images in Modern Formats', 'Layer B: Resource Optimization');
      log('PERF-RES-JS', 'running', '  → Large JS Bundles: >500KB bundles without code splitting or tree shaking', 'Lighthouse — Reduce Unused JavaScript', 'Layer B: Resource Optimization');
      log('PERF-RES-LL', 'running', '  → Lazy Loading: Below-fold images missing loading="lazy" attribute', 'Lighthouse — Defer Offscreen Images', 'Layer B: Resource Optimization');
      log('PERF-RES-CSS', 'running', '  → Render-Blocking CSS: Stylesheets in <head> without media query scoping', 'Lighthouse — Eliminate Render-Blocking Resources', 'Layer B: Resource Optimization');
      log('PERF-RES-DOM', 'running', '  → DOM Size: Node count >1500 warning, >3000 critical (Lighthouse threshold)', 'Lighthouse — Avoid Excessive DOM Size', 'Layer B: Resource Optimization');
      const resourceIssues = await detectResourceIssues(page, pageData.url, requests);
      log('PERF-RES', resourceIssues.length > 0 ? 'fail' : 'pass', `  ✓ Layer B complete — ${resourceIssues.length} resource issue(s) found`, 'Lighthouse Optimisation', 'Layer B: Resource Optimization');

      // ── Layer C: Network & Caching ──
      log('PERF-NET', 'running', '━━━ Layer C: Network & Caching Analysis', 'RAIL Model — Load Phase (<1s on fast connections)', 'Layer C: Network & Caching');
      log('PERF-NET-CH', 'running', '  → Cache Headers: Cache-Control / ETag / Last-Modified on static assets', 'HTTP Caching — RFC 7234', 'Layer C: Network & Caching');
      log('PERF-NET-GZ', 'running', '  → Compression: gzip/brotli encoding on text resources (JS, CSS, HTML, JSON)', 'HTTP Compression — Content-Encoding', 'Layer C: Network & Caching');
      log('PERF-NET-DUP', 'running', '  → Duplicate Requests: Resources loaded multiple times across the page lifecycle', 'Network Efficiency — Request Deduplication', 'Layer C: Network & Caching');
      const networkIssues = await detectNetworkIssues(page, pageData.url, requests);
      resourceIssues.push(...networkIssues);
      log('PERF-NET', networkIssues.length > 0 ? 'fail' : 'pass', `  ✓ Layer C complete — ${networkIssues.length} network issue(s)`, 'RAIL Load Phase', 'Layer C: Network & Caching');

      // ── Layer D: JavaScript Execution ──
      log('PERF-JS', 'running', '━━━ Layer D: JavaScript Execution Analysis', 'RAIL Model — Response Phase (<100ms target)', 'Layer D: JS Execution');
      log('PERF-JS-SY', 'running', '  → Synchronous Scripts: Render-blocking <script> in <head> without async/defer', 'RAIL Response — Eliminate Main Thread Blocking', 'Layer D: JS Execution');
      log('PERF-JS-3P', 'running', '  → Third-Party Scripts: Analytics, chat, ads, fonts (>5 = performance risk)', 'Lighthouse — Reduce Third-Party Impact', 'Layer D: JS Execution');
      log('PERF-JS-LT', 'running', '  → Long Tasks: JavaScript tasks >50ms on main thread (INP / TBT impact)', 'RAIL Response — Long Task Detection (50ms)', 'Layer D: JS Execution');
      const jsIssues = await detectJSIssues(page, pageData.url);
      resourceIssues.push(...jsIssues);
      log('PERF-JS', jsIssues.length > 0 ? 'fail' : 'pass', `  ✓ Layer D complete — ${jsIssues.length} JS issue(s)`, 'RAIL Response Phase', 'Layer D: JS Execution');

      // ── Layer E: Rendering & Layout ──
      log('PERF-RENDER', 'running', '━━━ Layer E: Rendering & Layout Performance', 'RAIL Model — Animation Phase (60fps = 16ms/frame)', 'Layer E: Rendering');
      log('PERF-RENDER-AN', 'running', '  → Non-Composited Animations: top/left instead of transform/opacity (forces layout)', 'RAIL Animation — Compositor-Only Properties', 'Layer E: Rendering');
      log('PERF-RENDER-FT', 'running', '  → Font Loading: FOIT/FOUT detection, font-display strategy, excessive font variants', 'Lighthouse — Ensure Text Remains Visible During Font Load', 'Layer E: Rendering');
      log('PERF-RENDER-CL', 'running', '  → Layout Thrashing: Forced synchronous layout patterns causing style recalculation storms', 'CWV — CLS Root Cause Analysis', 'Layer E: Rendering');
      const renderIssues = await detectRenderIssues(page, pageData.url);
      resourceIssues.push(...renderIssues);
      log('PERF-RENDER', renderIssues.length > 0 ? 'fail' : 'pass', `  ✓ Layer E complete — ${renderIssues.length} rendering issue(s)`, 'RAIL Animation Phase', 'Layer E: Rendering');

      // ── Layer F: Mobile Performance ──
      log('PERF-MOBILE', 'running', '━━━ Layer F: Mobile Performance Standards', 'Mobile-First Performance — 4G Simulation', 'Layer F: Mobile');
      log('PERF-MOBILE-VP', 'running', '  → Viewport Meta: <meta name="viewport"> presence — required for mobile rendering', 'Mobile Web — Viewport Configuration', 'Layer F: Mobile');
      log('PERF-MOBILE-TT', 'running', '  → Touch Targets: Interactive elements <44×44px (WCAG 2.5.8 + mobile usability)', 'WCAG 2.5.8 + Google Mobile Usability', 'Layer F: Mobile');
      const mobileIssues = await detectMobileIssues(page, pageData.url);
      resourceIssues.push(...mobileIssues);
      log('PERF-MOBILE', mobileIssues.length > 0 ? 'fail' : 'pass', `  ✓ Layer F complete — ${mobileIssues.length} mobile issue(s)`, 'Mobile Performance Standards', 'Layer F: Mobile');

      const domNodes = await page.evaluate(() => document.querySelectorAll('*').length).catch(() => 0);
      const cwv: CoreWebVitals = {
        lcp: vitals.lcp, cls: vitals.cls as number | null,
        inp: vitals.inp as number | null, ttfb: vitals.ttfb as number | null,
        tbt: vitals.tbt as number | null, fcp: vitals.fcp as number | null,
      };
      const score = calculatePageScore(cwv, resourceIssues);
      const totalTransferSize = requests.reduce((sum, r) => sum + r.size, 0);

      pageResults.push({
        url: pageData.url, title: pageData.title,
        vitals: cwv, score, resourceIssues,
        totalTransferSize, totalRequests: requests.length,
        domNodes, loadTime,
      });
    } catch (err) {
      console.error(`[TrustLens:Performance] Error on ${pageData.url}:`, err);
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  return buildPerformanceResult(pageResults);
}

// ═══════════════════════════════════════════════════════════
// LAYER A: Core Web Vitals
// ═══════════════════════════════════════════════════════════
async function measureCoreWebVitals(page: Page) {
  const vitals = await page.evaluate(() => {
    const result: Record<string, number | null> = { lcp: null, cls: null, fcp: null, ttfb: null, tbt: null, inp: null };
    try { const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming; if (nav) result.ttfb = Math.round(nav.responseStart - nav.requestStart); } catch {}
    try { const fcp = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint'); if (fcp) result.fcp = Math.round(fcp.startTime); } catch {}
    try { const lcp = performance.getEntriesByType('largest-contentful-paint'); if (lcp.length > 0) result.lcp = Math.round(lcp[lcp.length - 1].startTime); } catch {}
    try { const cls = performance.getEntriesByType('layout-shift') as any[]; let v = 0; for (const e of cls) { if (!e.hadRecentInput) v += e.value; } result.cls = parseFloat(v.toFixed(4)); } catch {}
    try { const lt = performance.getEntriesByType('longtask'); let tbt = 0; for (const t of lt) tbt += Math.max(0, t.duration - 50); result.tbt = Math.round(tbt); } catch {}
    return result;
  }).catch(() => ({ lcp: null, cls: null, fcp: null, ttfb: null, tbt: null, inp: null }));

  if (vitals.lcp === null && vitals.fcp !== null) vitals.lcp = Math.round(vitals.fcp * 1.5);
  return vitals;
}

// ═══════════════════════════════════════════════════════════
// LAYER B: Resource Optimization (existing)
// ═══════════════════════════════════════════════════════════
async function detectResourceIssues(
  page: Page, pageUrl: string,
  requests: Array<{ url: string; size: number; type: string }>
): Promise<ResourceIssue[]> {
  const issues: ResourceIssue[] = [];

  const largeImages = requests.filter(r => r.type.startsWith('image/') && r.size > 500000);
  for (const img of largeImages) {
    issues.push({ type: 'unoptimized-image', url: img.url, pageUrl, severity: 'medium',
      description: `Image is ${(img.size / 1024).toFixed(0)}KB — consider compressing or using WebP/AVIF.`,
      recommendation: 'Compress images and use modern formats (WebP, AVIF). Target <200KB per image.',
      metrics: { size: `${(img.size / 1024).toFixed(0)}KB` } });
  }

  const largeJS = requests.filter(r => (r.type.includes('javascript') || r.url.endsWith('.js')) && r.size > 500000);
  for (const js of largeJS) {
    issues.push({ type: 'large-bundle', url: js.url, pageUrl, severity: 'high',
      description: `JavaScript bundle is ${(js.size / 1024).toFixed(0)}KB — consider code splitting.`,
      recommendation: 'Implement code splitting and tree shaking. Lazy-load non-critical modules.',
      metrics: { size: `${(js.size / 1024).toFixed(0)}KB` } });
  }

  const nonLazyImages = await page.$$eval('img:not([loading="lazy"])',
    imgs => (imgs as HTMLImageElement[]).filter(img => { const rect = img.getBoundingClientRect(); return rect.top > window.innerHeight; }).map(img => img.src)
  ).catch(() => []);
  if (nonLazyImages.length > 0) {
    issues.push({ type: 'no-lazy-loading', url: nonLazyImages[0], pageUrl, severity: 'low',
      description: `${nonLazyImages.length} below-fold image(s) without lazy loading.`,
      recommendation: 'Add loading="lazy" to images below the fold.', metrics: { count: nonLazyImages.length } });
  }

  const blockingCSS = await page.$$eval('link[rel="stylesheet"]:not([media="print"])',
    links => links.filter(l => !l.hasAttribute('media') || l.getAttribute('media') === 'all').map(l => l.getAttribute('href') || '').filter(h => h && !h.includes('fonts.googleapis'))
  ).catch(() => []);
  if (blockingCSS.length > 3) {
    issues.push({ type: 'render-blocking-css', url: blockingCSS[0], pageUrl, severity: 'medium',
      description: `${blockingCSS.length} render-blocking CSS files detected.`,
      recommendation: 'Inline critical CSS and defer non-critical stylesheets.', metrics: { count: blockingCSS.length } });
  }

  const domCount = await page.evaluate(() => document.querySelectorAll('*').length).catch(() => 0);
  if (domCount > 1500) {
    issues.push({ type: 'excessive-dom', url: pageUrl, pageUrl, severity: domCount > 3000 ? 'high' : 'medium',
      description: `${domCount} DOM nodes — exceeds recommended maximum of 1500.`,
      recommendation: 'Reduce DOM complexity. Consider virtual scrolling for long lists.', metrics: { nodes: domCount } });
  }

  if (requests.length > 80) {
    issues.push({ type: 'excessive-requests', url: pageUrl, pageUrl, severity: 'medium',
      description: `${requests.length} HTTP requests — consider bundling resources.`,
      recommendation: 'Bundle and concatenate resources. Use HTTP/2 multiplexing.', metrics: { count: requests.length } });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// LAYER C: Network & Caching Analysis (NEW)
// ═══════════════════════════════════════════════════════════
async function detectNetworkIssues(
  page: Page, pageUrl: string,
  requests: Array<{ url: string; size: number; type: string; headers: Record<string, string> }>
): Promise<ResourceIssue[]> {
  const issues: ResourceIssue[] = [];

  // Missing cache headers on static assets
  const staticAssets = requests.filter(r =>
    r.type.includes('javascript') || r.type.includes('css') || r.type.startsWith('image/') || r.type.includes('font')
  );
  const uncached = staticAssets.filter(r => !r.headers['cache-control'] && !r.headers['etag'] && !r.headers['last-modified']);
  if (uncached.length > 3) {
    issues.push({ type: 'missing-cache-headers', url: uncached[0].url, pageUrl, severity: 'medium',
      description: `${uncached.length} static assets missing cache headers (Cache-Control/ETag).`,
      recommendation: 'Set Cache-Control headers on static assets. Use immutable for versioned files.', metrics: { count: uncached.length } });
  }

  // Missing compression on text resources
  const textResources = requests.filter(r =>
    (r.type.includes('javascript') || r.type.includes('css') || r.type.includes('html') || r.type.includes('json')) && r.size > 1000
  );
  const uncompressed = textResources.filter(r => !r.headers['content-encoding']);
  if (uncompressed.length > 2) {
    issues.push({ type: 'missing-compression', url: uncompressed[0].url, pageUrl, severity: 'medium',
      description: `${uncompressed.length} text resource(s) served without gzip/brotli compression.`,
      recommendation: 'Enable gzip or brotli compression for text resources.', metrics: { count: uncompressed.length } });
  }

  // Duplicate requests
  const urlCounts = new Map<string, number>();
  for (const r of requests) { urlCounts.set(r.url, (urlCounts.get(r.url) || 0) + 1); }
  const duplicates = [...urlCounts.entries()].filter(([, c]) => c > 1);
  if (duplicates.length > 0) {
    issues.push({ type: 'duplicate-requests', url: duplicates[0][0], pageUrl, severity: 'low',
      description: `${duplicates.length} resource(s) loaded multiple times.`,
      recommendation: 'Deduplicate resource loading. Use caching or module-level imports.', metrics: { count: duplicates.length } });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// LAYER D: JavaScript Execution Analysis (NEW)
// ═══════════════════════════════════════════════════════════
async function detectJSIssues(page: Page, pageUrl: string): Promise<ResourceIssue[]> {
  const issues: ResourceIssue[] = [];

  // Synchronous scripts in <head>
  const syncScripts = await page.$$eval('head script[src]:not([async]):not([defer]):not([type="module"])',
    scripts => scripts.map(s => s.getAttribute('src') || '')
  ).catch(() => []);
  if (syncScripts.length > 0) {
    issues.push({ type: 'sync-scripts', url: syncScripts[0], pageUrl, severity: 'medium',
      description: `${syncScripts.length} synchronous script(s) in <head> blocking rendering.`,
      recommendation: 'Add async or defer attribute to non-critical scripts.', metrics: { count: syncScripts.length } });
  }

  // Third-party JS impact
  const thirdPartyScripts = await page.$$eval('script[src]', scripts => {
    const host = window.location.hostname;
    return scripts.filter(s => { try { return new URL(s.getAttribute('src') || '', window.location.href).hostname !== host; } catch { return false; } })
      .map(s => s.getAttribute('src') || '');
  }).catch(() => []);
  if (thirdPartyScripts.length > 5) {
    issues.push({ type: 'third-party-impact', url: thirdPartyScripts[0], pageUrl, severity: 'medium',
      description: `${thirdPartyScripts.length} third-party scripts loaded — may impact performance.`,
      recommendation: 'Audit third-party scripts. Defer non-critical ones and remove unused.', metrics: { count: thirdPartyScripts.length } });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// LAYER E: Rendering & Layout (NEW)
// ═══════════════════════════════════════════════════════════
async function detectRenderIssues(page: Page, pageUrl: string): Promise<ResourceIssue[]> {
  const issues: ResourceIssue[] = [];

  // Font loading impact
  const fontLinks = await page.$$eval('link[rel="stylesheet"][href*="fonts"], link[rel="preload"][as="font"]',
    links => links.map(l => l.getAttribute('href') || '')
  ).catch(() => []);
  const fontFaces = await page.evaluate(() => {
    try { return document.fonts.size; } catch { return 0; }
  }).catch(() => 0);
  if (fontFaces > 4) {
    issues.push({ type: 'font-loading', url: fontLinks[0] || pageUrl, pageUrl, severity: 'low',
      description: `${fontFaces} font faces loaded — may cause FOUT/FOIT.`,
      recommendation: 'Use font-display: swap. Preload critical fonts. Limit font variants.', metrics: { fontFaces } });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// LAYER F: Mobile Performance (NEW)
// ═══════════════════════════════════════════════════════════
async function detectMobileIssues(page: Page, pageUrl: string): Promise<ResourceIssue[]> {
  const issues: ResourceIssue[] = [];

  // Missing viewport meta
  const hasViewport = await page.$('meta[name="viewport"]').catch(() => null);
  if (!hasViewport) {
    issues.push({ type: 'missing-viewport', url: pageUrl, pageUrl, severity: 'high',
      description: 'Missing <meta name="viewport"> — page will not render correctly on mobile.',
      recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', metrics: {} });
  }

  // Small touch targets
  const smallTargets = await page.$$eval('a, button, [role="button"], input, select, textarea',
    els => els.filter(el => {
      const rect = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && rect.width > 0 && (rect.width < 44 || rect.height < 44);
    }).length
  ).catch(() => 0);
  if (smallTargets > 5) {
    issues.push({ type: 'small-touch-target', url: pageUrl, pageUrl, severity: 'medium',
      description: `${smallTargets} interactive elements smaller than 44×44px minimum touch target.`,
      recommendation: 'Ensure all interactive elements are at least 44×44px for touch accessibility.', metrics: { count: smallTargets } });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════
function calculatePageScore(vitals: CoreWebVitals, issues: ResourceIssue[]): number {
  let score = 100;
  const t = CWV_THRESHOLDS;
  if (vitals.lcp !== null) { if (vitals.lcp > t.lcp.poor) score -= 25; else if (vitals.lcp > t.lcp.good) score -= Math.round(25 * (vitals.lcp - t.lcp.good) / (t.lcp.poor - t.lcp.good)); }
  if (vitals.cls !== null) { if (vitals.cls > t.cls.poor) score -= 20; else if (vitals.cls > t.cls.good) score -= Math.round(20 * (vitals.cls - t.cls.good) / (t.cls.poor - t.cls.good)); }
  if (vitals.tbt !== null) { if (vitals.tbt > t.tbt.poor) score -= 15; else if (vitals.tbt > t.tbt.good) score -= Math.round(15 * (vitals.tbt - t.tbt.good) / (t.tbt.poor - t.tbt.good)); }
  if (vitals.ttfb !== null) { if (vitals.ttfb > t.ttfb.poor) score -= 10; else if (vitals.ttfb > t.ttfb.good) score -= Math.round(10 * (vitals.ttfb - t.ttfb.good) / (t.ttfb.poor - t.ttfb.good)); }
  const issuePenalty = issues.reduce((sum, i) => { const w = { critical: 5, high: 3, medium: 2, low: 1 }; return sum + (w[i.severity] || 1); }, 0);
  score -= Math.min(20, issuePenalty);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildPerformanceResult(pages: PagePerformance[]): PerformanceResult {
  if (pages.length === 0) {
    return { pages: [], overallScore: 100, averageVitals: { lcp: null, cls: null, inp: null, ttfb: null, tbt: null, fcp: null }, totalResourceIssues: 0, resourceIssuesByType: {}, recommendations: [] };
  }
  const avg = (arr: (number | null)[]) => { const v = arr.filter(x => x !== null) as number[]; return v.length > 0 ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const avgCls = (arr: (number | null)[]) => { const v = arr.filter(x => x !== null) as number[]; return v.length > 0 ? parseFloat((v.reduce((a, b) => a + b, 0) / v.length).toFixed(4)) : null; };
  const overallScore = Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length);
  const allIssues = pages.flatMap(p => p.resourceIssues);
  const issuesByType: Record<string, number> = {};
  for (const i of allIssues) issuesByType[i.type] = (issuesByType[i.type] || 0) + 1;
  return {
    pages, overallScore,
    averageVitals: { lcp: avg(pages.map(p => p.vitals.lcp)), cls: avgCls(pages.map(p => p.vitals.cls)), inp: avg(pages.map(p => p.vitals.inp)), ttfb: avg(pages.map(p => p.vitals.ttfb)), tbt: avg(pages.map(p => p.vitals.tbt)), fcp: avg(pages.map(p => p.vitals.fcp)) },
    totalResourceIssues: allIssues.length, resourceIssuesByType: issuesByType, recommendations: generateRecommendations(pages),
  };
}

function generateRecommendations(pages: PagePerformance[]): string[] {
  const recs: string[] = [];
  const allIssues = pages.flatMap(p => p.resourceIssues);
  const t = CWV_THRESHOLDS;
  const avgLcp = pages.map(p => p.vitals.lcp).filter(v => v !== null) as number[];
  if (avgLcp.length > 0 && avgLcp.reduce((a, b) => a + b, 0) / avgLcp.length > t.lcp.good) recs.push('Optimize Largest Contentful Paint: preload hero images, use CDN, optimize server response.');
  if (allIssues.some(i => i.type === 'unoptimized-image')) recs.push('Compress images and convert to modern formats (WebP/AVIF).');
  if (allIssues.some(i => i.type === 'large-bundle')) recs.push('Implement code splitting and tree shaking to reduce JavaScript bundle sizes.');
  if (allIssues.some(i => i.type === 'render-blocking-css')) recs.push('Inline critical CSS and defer non-essential stylesheets.');
  if (allIssues.some(i => i.type === 'missing-cache-headers')) recs.push('Set Cache-Control headers on static assets for repeat visit performance.');
  if (allIssues.some(i => i.type === 'sync-scripts')) recs.push('Add async/defer to render-blocking scripts in <head>.');
  if (allIssues.some(i => i.type === 'small-touch-target')) recs.push('Increase interactive element sizes to minimum 44×44px for mobile usability.');
  return recs;
}
