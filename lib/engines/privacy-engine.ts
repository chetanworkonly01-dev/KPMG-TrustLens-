// ============================================================
// KPMG TrustLens — Privacy & Compliance Engine
// ============================================================

import type { BrowserContext, Page } from 'playwright';
import type {
  PrivacyResult, PrivacyFinding, CookieInfo, TrackerInfo, CookiePurpose,
} from '../types/privacy';
import { KNOWN_TRACKERS } from '../types/privacy';

interface PageData { url: string; title: string; }

export async function runPrivacyAudit(
  context: BrowserContext,
  pages: PageData[]
): Promise<PrivacyResult> {
  const findings: PrivacyFinding[] = [];
  const allCookies: CookieInfo[] = [];
  const trackerMap = new Map<string, TrackerInfo>();
  let hasConsentBanner = false;
  let hasPrivacyPolicy = false;
  let hasMixedContent = false;
  let findingId = 0;
  const trackedRequests: Array<{ url: string; pageUrl: string }> = [];

  for (const pageData of pages) {
    let page: Page | null = null;
    try {
      page = await context.newPage();
      page.on('request', (req) => {
        trackedRequests.push({ url: req.url(), pageUrl: pageData.url });
      });

      await page.goto(pageData.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Cookie analysis
      const cookies = await context.cookies(pageData.url);
      for (const cookie of cookies) {
        allCookies.push({
          name: cookie.name, domain: cookie.domain, path: cookie.path,
          purpose: classifyCookie(cookie.name, cookie.domain),
          secure: cookie.secure, httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expires: cookie.expires > 0 ? new Date(cookie.expires * 1000).toISOString() : null,
        });
      }

      // Consent banner detection
      const consentDetected = await page.$$eval(
        '[class*="cookie"], [class*="consent"], [class*="gdpr"], [id*="cookie"], [id*="consent"]',
        els => els.filter(el => {
          const s = window.getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden';
        }).length
      ).catch(() => 0);
      if (consentDetected > 0) hasConsentBanner = true;

      // Privacy policy link
      const privacyLink = await page.$$eval('a', links =>
        links.some(l => /privacy\s*(policy|notice|statement)/i.test(l.textContent || ''))
      ).catch(() => false);
      if (privacyLink) hasPrivacyPolicy = true;

      // Mixed content
      const mixedContent = await page.evaluate(() => {
        if (window.location.protocol !== 'https:') return [];
        const http: string[] = [];
        document.querySelectorAll('img, script, link, iframe').forEach(el => {
          const src = el.getAttribute('src') || el.getAttribute('href') || '';
          if (src.startsWith('http://')) http.push(src);
        });
        return http;
      }).catch(() => []);

      if (mixedContent.length > 0) {
        hasMixedContent = true;
        findings.push({
          id: `priv-${++findingId}`, category: 'mixed-content',
          title: 'Mixed Content Detected (HTTP on HTTPS)',
          description: `${mixedContent.length} resource(s) loaded over insecure HTTP.`,
          pageUrl: pageData.url, severity: 'high', regulation: ['GDPR'],
          recommendation: 'Serve all resources over HTTPS.',
          evidence: { summary: `${mixedContent.length} insecure resources`, details: mixedContent.slice(0, 5) },
        });
      }

      // Data storage analysis
      const storageAnalysis = await page.evaluate(() => {
        let ls = 0, ss = 0;
        try { ls = localStorage.length; } catch {}
        try { ss = sessionStorage.length; } catch {}
        return { ls, ss };
      }).catch(() => ({ ls: 0, ss: 0 }));

      if (storageAnalysis.ls + storageAnalysis.ss > 20) {
        findings.push({
          id: `priv-${++findingId}`, category: 'data-storage',
          title: 'Excessive Client-Side Data Storage',
          description: `${storageAnalysis.ls + storageAnalysis.ss} items in localStorage/sessionStorage.`,
          pageUrl: pageData.url, severity: 'medium', regulation: ['GDPR', 'ePrivacy'],
          recommendation: 'Review storage usage and ensure data minimization.',
          evidence: { summary: `${storageAnalysis.ls} localStorage + ${storageAnalysis.ss} sessionStorage`, details: [] },
        });
      }
    } catch (err) {
      console.error(`[TrustLens:Privacy] Error on ${pageData.url}:`, err);
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  // Classify tracked requests
  for (const req of trackedRequests) {
    try {
      const domain = new URL(req.url).hostname;
      for (const [td, info] of Object.entries(KNOWN_TRACKERS)) {
        if (domain.includes(td)) {
          const existing = trackerMap.get(td);
          if (existing) {
            existing.requestCount++;
            if (!existing.pageUrls.includes(req.pageUrl)) existing.pageUrls.push(req.pageUrl);
          } else {
            trackerMap.set(td, { domain: td, company: info.company, category: info.category, pageUrls: [req.pageUrl], requestCount: 1 });
          }
          break;
        }
      }
    } catch {}
  }

  const trackers = [...trackerMap.values()];

  if (trackers.length > 0) {
    findings.push({
      id: `priv-${++findingId}`, category: 'third-party-tracker',
      title: `${trackers.length} Third-Party Tracker(s) Detected`,
      description: `${trackers.length} tracking service(s) detected loading without verified consent.`,
      pageUrl: pages[0]?.url || '', severity: trackers.length > 5 ? 'critical' : 'high',
      regulation: ['GDPR', 'CCPA', 'ePrivacy'],
      recommendation: 'Ensure all trackers require explicit consent before loading.',
      evidence: { summary: `${trackers.length} trackers`, details: trackers.map(t => `${t.company} (${t.domain}) — ${t.requestCount} reqs`) },
    });
  }

  if (!hasConsentBanner && trackers.length > 0) {
    findings.push({
      id: `priv-${++findingId}`, category: 'cookie-consent',
      title: 'No Cookie Consent Banner Detected',
      description: 'Tracking cookies/scripts load without a consent banner.',
      pageUrl: pages[0]?.url || '', severity: 'critical', regulation: ['GDPR', 'ePrivacy', 'CCPA'],
      recommendation: 'Implement a GDPR/CCPA-compliant cookie consent banner.',
      evidence: { summary: 'No consent mechanism', details: ['Trackers loading without consent'] },
    });
  }

  if (!hasPrivacyPolicy) {
    findings.push({
      id: `priv-${++findingId}`, category: 'privacy-policy',
      title: 'No Privacy Policy Link Found',
      description: 'No link to a privacy policy was detected.',
      pageUrl: pages[0]?.url || '', severity: 'high', regulation: ['GDPR', 'CCPA'],
      recommendation: 'Add a visible privacy policy link in footer or navigation.',
      evidence: { summary: 'Privacy policy not found', details: [] },
    });
  }

  // Build result
  const findingsBySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const cookiesByPurpose: Record<string, number> = { necessary: 0, analytics: 0, marketing: 0, functional: 0, unknown: 0 };
  for (const f of findings) findingsBySeverity[f.severity]++;
  for (const c of allCookies) cookiesByPurpose[c.purpose]++;

  const sevW = { critical: 20, high: 10, medium: 4, low: 1 };
  let ded = 0;
  for (const f of findings) ded += (sevW as any)[f.severity] || 1;
  const overallScore = Math.max(0, Math.min(100, Math.round(100 - ded)));

  return {
    findings, overallScore, cookies: allCookies, cookiesByPurpose: cookiesByPurpose as any,
    trackers, totalTrackers: trackers.length,
    hasConsentBanner, hasPrivacyPolicy, hasMixedContent,
    regulatoryRisks: [...new Set(findings.flatMap(f => f.regulation))] as any[],
    findingsBySeverity, pagesScanned: pages.length,
  };
}

function classifyCookie(name: string, _domain: string): CookiePurpose {
  const n = name.toLowerCase();
  if (/^(_ga|_gid|_gat|_gtag|hjid|_hj|_clarity|mp_|ajs_)/.test(n)) return 'analytics';
  if (/^(_fbp|_fbc|fr|_gcl|_ttp|IDE|test_cookie|NID)/.test(n)) return 'marketing';
  if (/^(lang|locale|theme|timezone|currency|pref)/.test(n)) return 'functional';
  if (/^(session|sess|sid|csrf|xsrf|token|auth)/.test(n)) return 'necessary';
  return 'unknown';
}
