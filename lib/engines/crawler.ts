import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { LoginConfig, PageData } from '../types/audit';

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
}

export async function crawlWebsite(options: CrawlOptions): Promise<CrawlResult> {
  const { url, maxPages, crawlDepth, loginConfig, onProgress } = options;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'AccessibilityAuditBot/1.0'
  });

  // Handle authentication if login config provided
  if (loginConfig) {
    onProgress?.('Performing login...', 5);
    await performLogin(context, loginConfig);
    onProgress?.('Login successful', 10);
  }

  const visitedUrls = new Set<string>();
  const pages: PageData[] = [];
  const urlQueue: { url: string; depth: number }[] = [{ url, depth: 0 }];
  const baseUrl = new URL(url);

  onProgress?.('Starting crawl...', 15);

  while (urlQueue.length > 0 && pages.length < maxPages) {
    const current = urlQueue.shift();
    if (!current) break;

    const normalizedUrl = normalizeUrl(current.url);
    if (visitedUrls.has(normalizedUrl)) continue;
    visitedUrls.add(normalizedUrl);

    try {
      const page = await context.newPage();
      await page.goto(current.url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for dynamic content
      await page.waitForTimeout(2000);

      const title = await page.title();
      const html = await page.content();

      let screenshot: string | undefined;
      try {
        const buffer = await page.screenshot({ fullPage: true, type: 'png' });
        screenshot = buffer.toString('base64');
      } catch {
        // screenshot may fail on very large pages
      }

      pages.push({
        url: current.url,
        title: title || 'Untitled Page',
        html,
        screenshot,
        timestamp: new Date().toISOString()
      });

      const progress = 15 + Math.round((pages.length / maxPages) * 35);
      onProgress?.(`Crawled ${pages.length}/${maxPages}: ${title || current.url}`, progress);

      // Discover links for deeper crawling
      if (current.depth < crawlDepth) {
        const links = await discoverLinks(page, baseUrl.origin);
        for (const link of links) {
          if (!visitedUrls.has(normalizeUrl(link)) && urlQueue.length + pages.length < maxPages * 2) {
            urlQueue.push({ url: link, depth: current.depth + 1 });
          }
        }
      }

      await page.close();
    } catch (error) {
      console.error(`Failed to crawl ${current.url}:`, error);
    }
  }

  onProgress?.(`Crawl complete. ${pages.length} pages collected.`, 50);

  return { pages, context, browser };
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

async function discoverLinks(page: Page, baseOrigin: string): Promise<string[]> {
  const links = await page.evaluate((origin: string) => {
    const anchors = document.querySelectorAll('a[href]');
    const hrefs: string[] = [];
    anchors.forEach(a => {
      const href = (a as HTMLAnchorElement).href;
      if (href && href.startsWith(origin) && !href.includes('#') &&
          !href.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|mp4|mp3)$/i)) {
        hrefs.push(href);
      }
    });
    return [...new Set(hrefs)];
  }, baseOrigin);

  return links.slice(0, 50); // cap discovery
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
