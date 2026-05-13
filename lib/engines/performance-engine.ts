// ============================================================
// KPMG TrustLens — Performance & Core Web Vitals Engine
// ============================================================

import type { BrowserContext, Page } from 'playwright';
import type { PerformanceResult, PagePerformance, CoreWebVitals, ResourceIssue } from '../types/performance';
import { CWV_THRESHOLDS } from '../types/performance';

interface PageData { url: string; title: string; }

export async function runPerformanceAudit(
  context: BrowserContext,
  pages: PageData[]
): Promise<PerformanceResult> {
  const pageResults: PagePerformance[] = [];

  for (const pageData of pages) {
    let page: Page | null = null;
    try {
      page = await context.newPage();

      // Collect network requests
      const requests: Array<{ url: string; size: number; type: string; blocked: boolean }> = [];
      page.on('response', async (response) => {
        try {
          const headers = response.headers();
          const size = parseInt(headers['content-length'] || '0', 10);
          const type = headers['content-type'] || '';
          requests.push({ url: response.url(), size, type, blocked: false });
        } catch {}
      });

      const startTime = Date.now();
      await page.goto(pageData.url, { waitUntil: 'load', timeout: 30000 });
      const loadTime = Date.now() - startTime;

      await page.waitForTimeout(2000); // let late observers fire

      // Measure Core Web Vitals via injected PerformanceObserver
      const vitals = await page.evaluate(() => {
        const result: Record<string, number | null> = {
          lcp: null, cls: null, fcp: null, ttfb: null, tbt: null, inp: null,
        };

        // TTFB
        try {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (nav) result.ttfb = Math.round(nav.responseStart - nav.requestStart);
        } catch {}

        // FCP
        try {
          const fcp = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
          if (fcp) result.fcp = Math.round(fcp.startTime);
        } catch {}

        // LCP (from already-observed entries)
        try {
          const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
          if (lcpEntries.length > 0) {
            result.lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
          }
        } catch {}

        // CLS
        try {
          const clsEntries = performance.getEntriesByType('layout-shift') as any[];
          let clsValue = 0;
          for (const entry of clsEntries) {
            if (!entry.hadRecentInput) clsValue += entry.value;
          }
          result.cls = parseFloat(clsValue.toFixed(4));
        } catch {}

        // TBT (from long tasks)
        try {
          const longTasks = performance.getEntriesByType('longtask');
          let tbt = 0;
          for (const task of longTasks) {
            tbt += Math.max(0, task.duration - 50);
          }
          result.tbt = Math.round(tbt);
        } catch {}

        return result;
      }).catch(() => ({ lcp: null, cls: null, fcp: null, ttfb: null, tbt: null, inp: null }));

      // Fallback LCP estimate if observer didn't capture it
      if (vitals.lcp === null && vitals.fcp !== null) {
        vitals.lcp = Math.round(vitals.fcp * 1.5); // rough estimate
      }

      // DOM node count
      const domNodes = await page.evaluate(() => document.querySelectorAll('*').length).catch(() => 0);

      // Resource issues
      const resourceIssues = await detectResourceIssues(page, pageData.url, requests);

      // Calculate page score
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

async function detectResourceIssues(
  page: Page, pageUrl: string,
  requests: Array<{ url: string; size: number; type: string }>
): Promise<ResourceIssue[]> {
  const issues: ResourceIssue[] = [];

  // Unoptimized images (>500KB)
  const largeImages = requests.filter(r =>
    r.type.startsWith('image/') && r.size > 500000
  );
  for (const img of largeImages) {
    issues.push({
      type: 'unoptimized-image', url: img.url, pageUrl, severity: 'medium',
      description: `Image is ${(img.size / 1024).toFixed(0)}KB — consider compressing or using WebP/AVIF format.`,
      recommendation: 'Compress images and use modern formats (WebP, AVIF). Target <200KB per image.',
      metrics: { size: `${(img.size / 1024).toFixed(0)}KB` },
    });
  }

  // Large JS bundles (>500KB)
  const largeJS = requests.filter(r =>
    (r.type.includes('javascript') || r.url.endsWith('.js')) && r.size > 500000
  );
  for (const js of largeJS) {
    issues.push({
      type: 'large-bundle', url: js.url, pageUrl, severity: 'high',
      description: `JavaScript bundle is ${(js.size / 1024).toFixed(0)}KB — consider code splitting.`,
      recommendation: 'Implement code splitting and tree shaking. Lazy-load non-critical modules.',
      metrics: { size: `${(js.size / 1024).toFixed(0)}KB` },
    });
  }

  // Images without lazy loading
  const nonLazyImages = await page.$$eval(
    'img:not([loading="lazy"])',
    imgs => (imgs as HTMLImageElement[]).filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.top > window.innerHeight; // below fold
    }).map(img => img.src)
  ).catch(() => []);

  if (nonLazyImages.length > 0) {
    issues.push({
      type: 'no-lazy-loading', url: nonLazyImages[0], pageUrl, severity: 'low',
      description: `${nonLazyImages.length} below-fold image(s) without lazy loading.`,
      recommendation: 'Add loading="lazy" to images below the fold.',
      metrics: { count: nonLazyImages.length },
    });
  }

  // Render-blocking CSS check
  const blockingCSS = await page.$$eval(
    'link[rel="stylesheet"]:not([media="print"]):not([media="(prefers-color-scheme: dark)"])',
    links => links.filter(l => !l.hasAttribute('media') || l.getAttribute('media') === 'all')
      .map(l => l.getAttribute('href') || '')
      .filter(h => h && !h.includes('fonts.googleapis'))
  ).catch(() => []);

  if (blockingCSS.length > 3) {
    issues.push({
      type: 'render-blocking-css', url: blockingCSS[0], pageUrl, severity: 'medium',
      description: `${blockingCSS.length} render-blocking CSS files detected.`,
      recommendation: 'Inline critical CSS and defer non-critical stylesheets.',
      metrics: { count: blockingCSS.length },
    });
  }

  // Excessive DOM nodes
  const domCount = await page.evaluate(() => document.querySelectorAll('*').length).catch(() => 0);
  if (domCount > 1500) {
    issues.push({
      type: 'excessive-dom', url: pageUrl, pageUrl, severity: domCount > 3000 ? 'high' : 'medium',
      description: `${domCount} DOM nodes — exceeds recommended maximum of 1500.`,
      recommendation: 'Reduce DOM complexity. Consider virtual scrolling for long lists.',
      metrics: { nodes: domCount },
    });
  }

  // Excessive requests
  if (requests.length > 80) {
    issues.push({
      type: 'excessive-requests', url: pageUrl, pageUrl, severity: 'medium',
      description: `${requests.length} HTTP requests — consider bundling resources.`,
      recommendation: 'Bundle and concatenate resources. Use HTTP/2 multiplexing.',
      metrics: { count: requests.length },
    });
  }

  return issues;
}

function calculatePageScore(vitals: CoreWebVitals, issues: ResourceIssue[]): number {
  let score = 100;
  const t = CWV_THRESHOLDS;

  // LCP penalty (max 25)
  if (vitals.lcp !== null) {
    if (vitals.lcp > t.lcp.poor) score -= 25;
    else if (vitals.lcp > t.lcp.good) score -= Math.round(25 * (vitals.lcp - t.lcp.good) / (t.lcp.poor - t.lcp.good));
  }

  // CLS penalty (max 20)
  if (vitals.cls !== null) {
    if (vitals.cls > t.cls.poor) score -= 20;
    else if (vitals.cls > t.cls.good) score -= Math.round(20 * (vitals.cls - t.cls.good) / (t.cls.poor - t.cls.good));
  }

  // TBT penalty (max 15)
  if (vitals.tbt !== null) {
    if (vitals.tbt > t.tbt.poor) score -= 15;
    else if (vitals.tbt > t.tbt.good) score -= Math.round(15 * (vitals.tbt - t.tbt.good) / (t.tbt.poor - t.tbt.good));
  }

  // TTFB penalty (max 10)
  if (vitals.ttfb !== null) {
    if (vitals.ttfb > t.ttfb.poor) score -= 10;
    else if (vitals.ttfb > t.ttfb.good) score -= Math.round(10 * (vitals.ttfb - t.ttfb.good) / (t.ttfb.poor - t.ttfb.good));
  }

  // Resource issue penalties (max 20)
  const issuePenalty = issues.reduce((sum, i) => {
    const w = { critical: 5, high: 3, medium: 2, low: 1 };
    return sum + (w[i.severity] || 1);
  }, 0);
  score -= Math.min(20, issuePenalty);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildPerformanceResult(pages: PagePerformance[]): PerformanceResult {
  if (pages.length === 0) {
    return {
      pages: [], overallScore: 100, averageVitals: { lcp: null, cls: null, inp: null, ttfb: null, tbt: null, fcp: null },
      totalResourceIssues: 0, resourceIssuesByType: {}, recommendations: [],
    };
  }

  const avg = (arr: (number | null)[]) => {
    const valid = arr.filter(v => v !== null) as number[];
    return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  };

  const avgCls = (arr: (number | null)[]) => {
    const valid = arr.filter(v => v !== null) as number[];
    return valid.length > 0 ? parseFloat((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(4)) : null;
  };

  const overallScore = Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length);
  const allIssues = pages.flatMap(p => p.resourceIssues);
  const issuesByType: Record<string, number> = {};
  for (const i of allIssues) issuesByType[i.type] = (issuesByType[i.type] || 0) + 1;

  return {
    pages, overallScore,
    averageVitals: {
      lcp: avg(pages.map(p => p.vitals.lcp)),
      cls: avgCls(pages.map(p => p.vitals.cls)),
      inp: avg(pages.map(p => p.vitals.inp)),
      ttfb: avg(pages.map(p => p.vitals.ttfb)),
      tbt: avg(pages.map(p => p.vitals.tbt)),
      fcp: avg(pages.map(p => p.vitals.fcp)),
    },
    totalResourceIssues: allIssues.length,
    resourceIssuesByType: issuesByType,
    recommendations: generateRecommendations(pages),
  };
}

function generateRecommendations(pages: PagePerformance[]): string[] {
  const recs: string[] = [];
  const allIssues = pages.flatMap(p => p.resourceIssues);
  const t = CWV_THRESHOLDS;

  const avgLcp = pages.map(p => p.vitals.lcp).filter(v => v !== null) as number[];
  if (avgLcp.length > 0 && avgLcp.reduce((a, b) => a + b, 0) / avgLcp.length > t.lcp.good) {
    recs.push('Optimize Largest Contentful Paint: preload hero images, use CDN, optimize server response time.');
  }

  if (allIssues.some(i => i.type === 'unoptimized-image')) {
    recs.push('Compress images and convert to modern formats (WebP/AVIF) for significant size reduction.');
  }
  if (allIssues.some(i => i.type === 'large-bundle')) {
    recs.push('Implement code splitting and tree shaking to reduce JavaScript bundle sizes.');
  }
  if (allIssues.some(i => i.type === 'render-blocking-css')) {
    recs.push('Inline critical CSS and defer non-essential stylesheets to improve First Contentful Paint.');
  }

  return recs;
}
