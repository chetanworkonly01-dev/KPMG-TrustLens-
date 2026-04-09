import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { LoginConfig, PageData, SkippedPage } from '../types/audit';

export interface CrawlOptions {
  url: string;
  maxPages: number;
  crawlDepth: number;
  loginConfig?: LoginConfig;
  onProgress?: (message: string, percent: number) => void;
}

export interface CrawlResult {
  pages: PageData[];
  context: BrowserContext;
  browser: Browser;
  totalFound: number;
  skippedPages: SkippedPage[];
  discoveryMethods: Record<string, number>;
}

// File extensions to skip
const SKIP_EXTENSIONS = /\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|mp4|mp3|avi|mov|ico|woff|woff2|ttf|eot|webp|avif|xlsx|docx|pptx)$/i;
// URL patterns to skip
const SKIP_PATTERNS = [
  /mailto:/i, /tel:/i, /javascript:/i,
  /\/(wp-admin|wp-login|wp-json|api\/|_next\/|__next|cdn-cgi|static\/)/i,
  /\?utm_/i, /\?(print|share|email)=/i,
  /#$/,
];

const CONCURRENCY = 3; // parallel page loads

export async function crawlWebsite(options: CrawlOptions): Promise<CrawlResult> {
  const { url, maxPages, crawlDepth, loginConfig, onProgress } = options;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AccessibilityAuditBot/2.0'
  });

  // Handle authentication if login config provided
  if (loginConfig) {
    onProgress?.('Performing login...', 5);
    await performLogin(context, loginConfig);
    onProgress?.('Login successful', 10);
  }

  const visitedUrls = new Set<string>();
  const pages: PageData[] = [];
  const skippedPages: SkippedPage[] = [];
  const discoveryMethods: Record<string, number> = {
    'seed-url': 0, 'navigation-menu': 0, 'footer-links': 0,
    'internal-links': 0, 'button-links': 0, 'sitemap': 0
  };
  const urlQueue: { url: string; depth: number; method: string }[] = [{ url, depth: 0, method: 'seed-url' }];
  const baseUrl = new URL(url);

  onProgress?.('Starting deep crawl...', 12);

  // Try to discover sitemap first
  const sitemapUrls = await discoverFromSitemap(context, baseUrl.origin);
  if (sitemapUrls.length > 0) {
    onProgress?.(`Found ${sitemapUrls.length} URLs from sitemap`, 14);
    for (const sUrl of sitemapUrls.slice(0, maxPages * 2)) {
      urlQueue.push({ url: sUrl, depth: 1, method: 'sitemap' });
    }
  }

  while (urlQueue.length > 0 && pages.length < maxPages) {
    // Process in batches for parallel crawling
    const batch: { url: string; depth: number; method: string }[] = [];
    while (batch.length < CONCURRENCY && urlQueue.length > 0 && (pages.length + batch.length) < maxPages) {
      const current = urlQueue.shift()!;
      const normalizedUrl = normalizeUrl(current.url);

      if (visitedUrls.has(normalizedUrl)) continue;

      // Check if URL should be skipped
      const skipReason = shouldSkipUrl(current.url, baseUrl.origin);
      if (skipReason) {
        skippedPages.push({ url: current.url, reason: skipReason });
        visitedUrls.add(normalizedUrl);
        continue;
      }

      visitedUrls.add(normalizedUrl);
      batch.push(current);
    }

    if (batch.length === 0) continue;

    // Crawl batch in parallel
    const results = await Promise.allSettled(
      batch.map(item => crawlSinglePage(context, item, baseUrl, crawlDepth))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const item = batch[i];

      if (result.status === 'fulfilled' && result.value) {
        const { pageData, discoveredLinks } = result.value;
        pages.push(pageData);
        discoveryMethods[item.method] = (discoveryMethods[item.method] || 0) + 1;

        const progress = 15 + Math.round((pages.length / maxPages) * 35);
        onProgress?.(`Crawled ${pages.length}/${maxPages}: ${pageData.title || item.url}`, progress);

        // Add discovered links to queue
        if (item.depth < crawlDepth) {
          for (const link of discoveredLinks) {
            const norm = normalizeUrl(link.url);
            if (!visitedUrls.has(norm) && urlQueue.length + pages.length < maxPages * 3) {
              urlQueue.push({ url: link.url, depth: item.depth + 1, method: link.method });
            }
          }
        }
      } else {
        const errorMsg = result.status === 'rejected' ? result.reason?.message : 'Unknown error';
        skippedPages.push({ url: item.url, reason: `Crawl failed: ${errorMsg}` });
      }
    }
  }

  // Track remaining queue items as skipped
  for (const remaining of urlQueue.slice(0, 50)) {
    if (!visitedUrls.has(normalizeUrl(remaining.url))) {
      skippedPages.push({ url: remaining.url, reason: 'Max page limit reached' });
    }
  }

  const totalFound = visitedUrls.size + urlQueue.length;
  onProgress?.(`Crawl complete. ${pages.length} pages collected. ${totalFound} total URLs discovered.`, 50);

  return { pages, context, browser, totalFound, skippedPages, discoveryMethods };
}

interface DiscoveredLink {
  url: string;
  method: string;
}

async function crawlSinglePage(
  context: BrowserContext,
  item: { url: string; depth: number },
  baseUrl: URL,
  maxDepth: number
): Promise<{ pageData: PageData; discoveredLinks: DiscoveredLink[] }> {
  const page = await context.newPage();

  try {
    // Navigate with retry
    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for network idle with shorter timeout
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Handle lazy-loaded content: scroll to trigger loading
    await triggerLazyContent(page);

    const title = await page.title();
    const html = await page.content();

    // Capture screenshot
    let screenshot: string | undefined;
    try {
      const buffer = await page.screenshot({ fullPage: true, type: 'png', timeout: 10000 });
      screenshot = buffer.toString('base64');
    } catch {
      // screenshot may fail on very large pages
    }

    const pageData: PageData = {
      url: item.url,
      title: title || 'Untitled Page',
      html,
      screenshot,
      timestamp: new Date().toISOString()
    };

    // Discover links using deep methods
    let discoveredLinks: DiscoveredLink[] = [];
    if (item.depth < maxDepth) {
      discoveredLinks = await discoverAllLinks(page, baseUrl.origin);
    }

    await page.close();
    return { pageData, discoveredLinks };
  } catch (error) {
    await page.close();
    throw error;
  }
}

/**
 * Trigger lazy-loaded content by scrolling the page
 */
async function triggerLazyContent(page: Page): Promise<void> {
  try {
    await page.evaluate(async () => {
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      const scrollHeight = document.body.scrollHeight;
      const viewportHeight = window.innerHeight;
      let currentScroll = 0;
      const step = viewportHeight * 0.8;

      // Scroll down in steps
      while (currentScroll < scrollHeight) {
        currentScroll += step;
        window.scrollTo(0, currentScroll);
        await delay(300);
        // Check if new content loaded (height changed)
        if (document.body.scrollHeight > scrollHeight) break;
      }

      // Scroll back to top
      window.scrollTo(0, 0);
      await delay(500);
    });
  } catch {
    // ignore scroll errors
  }
}

/**
 * Discover ALL links using multiple strategies
 */
async function discoverAllLinks(page: Page, baseOrigin: string): Promise<DiscoveredLink[]> {
  const links: DiscoveredLink[] = [];
  const seen = new Set<string>();

  const addLink = (url: string, method: string) => {
    if (!seen.has(url) && url.startsWith(baseOrigin) && !SKIP_EXTENSIONS.test(url)) {
      seen.add(url);
      links.push({ url, method });
    }
  };

  try {
    const discovered = await page.evaluate((origin: string) => {
      const result: { navLinks: string[]; footerLinks: string[]; internalLinks: string[]; buttonLinks: string[] } = {
        navLinks: [], footerLinks: [], internalLinks: [], buttonLinks: []
      };

      // 1. Navigation menu links
      const navElements = document.querySelectorAll('nav a[href], [role="navigation"] a[href], header a[href], .nav a[href], .navbar a[href], .menu a[href], .navigation a[href]');
      navElements.forEach(el => {
        const href = (el as HTMLAnchorElement).href;
        if (href && href.startsWith(origin)) result.navLinks.push(href);
      });

      // 2. Footer links
      const footerElements = document.querySelectorAll('footer a[href], [role="contentinfo"] a[href], .footer a[href]');
      footerElements.forEach(el => {
        const href = (el as HTMLAnchorElement).href;
        if (href && href.startsWith(origin)) result.footerLinks.push(href);
      });

      // 3. All internal links (body)
      const allLinks = document.querySelectorAll('a[href]');
      allLinks.forEach(el => {
        const href = (el as HTMLAnchorElement).href;
        if (href && href.startsWith(origin) && !href.includes('#')) {
          result.internalLinks.push(href);
        }
      });

      // 4. Buttons that might trigger routes (data-href, onclick with location)
      const buttons = document.querySelectorAll('button[data-href], [role="link"], [data-url], [data-link]');
      buttons.forEach(el => {
        const href = el.getAttribute('data-href') || el.getAttribute('data-url') || el.getAttribute('data-link');
        if (href) {
          try {
            const fullUrl = new URL(href, origin).href;
            if (fullUrl.startsWith(origin)) result.buttonLinks.push(fullUrl);
          } catch {}
        }
      });

      return result;
    }, baseOrigin);

    // Add all discovered links with their discovery method
    [...new Set(discovered.navLinks)].forEach(u => addLink(u, 'navigation-menu'));
    [...new Set(discovered.footerLinks)].forEach(u => addLink(u, 'footer-links'));
    [...new Set(discovered.internalLinks)].slice(0, 100).forEach(u => addLink(u, 'internal-links'));
    [...new Set(discovered.buttonLinks)].forEach(u => addLink(u, 'button-links'));
  } catch (error) {
    console.error('Link discovery error:', error);
  }

  return links;
}

/**
 * Try to discover pages from sitemap.xml
 */
async function discoverFromSitemap(context: BrowserContext, origin: string): Promise<string[]> {
  const urls: string[] = [];
  const page = await context.newPage();

  try {
    const sitemapUrls = [
      `${origin}/sitemap.xml`,
      `${origin}/sitemap_index.xml`,
      `${origin}/sitemap/sitemap.xml`
    ];

    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await page.goto(sitemapUrl, { timeout: 10000, waitUntil: 'domcontentloaded' });
        if (response && response.ok()) {
          const content = await page.content();
          const locRegex = /<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/gi;
          let match;
          while ((match = locRegex.exec(content)) !== null) {
            const u = match[1].trim();
            if (u.startsWith(origin)) urls.push(u);
          }
          if (urls.length > 0) break;
        }
      } catch {
        // sitemap not available
      }
    }
  } catch {
    // ignore
  } finally {
    await page.close();
  }

  return [...new Set(urls)];
}

/**
 * Check if a URL should be skipped and return reason
 */
function shouldSkipUrl(url: string, baseOrigin: string): string | null {
  if (!url.startsWith(baseOrigin)) return 'External domain';
  if (SKIP_EXTENSIONS.test(url)) return 'Non-HTML resource';
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(url)) return `Matches skip pattern: ${pattern.source}`;
  }
  // Skip extremely long URLs (likely dynamic/generated)
  if (url.length > 500) return 'URL too long (likely generated)';
  return null;
}

async function performLogin(context: BrowserContext, config: LoginConfig): Promise<void> {
  const page = await context.newPage();

  try {
    await page.goto(config.loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Fill username
    await page.waitForSelector(config.usernameSelector, { timeout: 10000 });
    await page.fill(config.usernameSelector, config.username);

    // Fill password
    await page.waitForSelector(config.passwordSelector, { timeout: 10000 });
    await page.fill(config.passwordSelector, config.password);

    // Handle OTP if provided
    if (config.otpSelector && config.otpValue) {
      await page.waitForSelector(config.otpSelector, { timeout: 5000 }).catch(() => {});
      if (await page.isVisible(config.otpSelector)) {
        await page.fill(config.otpSelector, config.otpValue);
      }
    }

    // Submit
    await page.click(config.submitSelector);
    await page.waitForTimeout(3000);

    // Wait for success indicator
    if (config.successIndicator) {
      await page.waitForSelector(config.successIndicator, { timeout: 15000 });
    } else {
      await page.waitForLoadState('networkidle');
    }

    // Store the auth state
    await context.storageState({ path: undefined }); // keeps cookies in context
  } finally {
    await page.close();
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    // Remove trailing slash
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    parsed.pathname = path;
    // Remove common tracking params
    parsed.searchParams.delete('utm_source');
    parsed.searchParams.delete('utm_medium');
    parsed.searchParams.delete('utm_campaign');
    parsed.searchParams.delete('ref');
    return parsed.toString();
  } catch {
    return url;
  }
}

export async function closeCrawler(browser: Browser): Promise<void> {
  try {
    await browser.close();
  } catch {
    // ignore
  }
}
