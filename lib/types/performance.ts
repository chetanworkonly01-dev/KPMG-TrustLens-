// ============================================================
// KPMG TrustLens — Performance & Core Web Vitals Types
// ============================================================

export interface CoreWebVitals {
  lcp: number | null;     // Largest Contentful Paint (ms)
  cls: number | null;     // Cumulative Layout Shift (score)
  inp: number | null;     // Interaction to Next Paint (ms)
  ttfb: number | null;    // Time to First Byte (ms)
  tbt: number | null;     // Total Blocking Time (ms)
  fcp: number | null;     // First Contentful Paint (ms)
}

export type ResourceIssueType =
  | 'unoptimized-image'       // Large/uncompressed images
  | 'render-blocking-css'     // CSS blocking first paint
  | 'render-blocking-js'      // JS blocking first paint
  | 'no-lazy-loading'         // Images without lazy loading
  | 'large-bundle'            // Oversized JS bundles
  | 'no-compression'          // Missing gzip/brotli
  | 'no-caching'              // Missing cache headers
  | 'excessive-dom'           // Too many DOM nodes
  | 'excessive-requests'      // Too many HTTP requests
  // ── Network & Caching (NEW) ──
  | 'missing-cache-headers'   // No Cache-Control/ETag
  | 'missing-compression'     // No gzip/brotli on text resources
  | 'http1-usage'             // Not using HTTP/2+
  | 'duplicate-requests'      // Same resource loaded multiple times
  // ── JS Execution (NEW) ──
  | 'long-tasks'              // Main thread blocking > 50ms
  | 'sync-scripts'            // Missing async/defer on scripts
  | 'third-party-impact'      // Slow third-party JS
  // ── Rendering (NEW) ──
  | 'font-loading'            // FOUT/FOIT flash
  // ── Mobile (NEW) ──
  | 'missing-viewport'        // Missing responsive viewport meta
  | 'small-touch-target';     // Interactive elements < 44px

export interface ResourceIssue {
  type: ResourceIssueType;
  url: string;
  pageUrl: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  metrics?: Record<string, string | number>;  // e.g. { size: '2.4MB', optimizedSize: '340KB' }
}

export interface PagePerformance {
  url: string;
  title: string;
  vitals: CoreWebVitals;
  score: number;               // 0-100
  resourceIssues: ResourceIssue[];
  totalTransferSize: number;   // bytes
  totalRequests: number;
  domNodes: number;
  loadTime: number;            // ms
}

// Thresholds based on Google's Core Web Vitals guidelines
export const CWV_THRESHOLDS = {
  lcp:  { good: 2500, poor: 4000 },     // ms
  cls:  { good: 0.1,  poor: 0.25 },     // score
  inp:  { good: 200,  poor: 500 },      // ms
  ttfb: { good: 800,  poor: 1800 },     // ms
  tbt:  { good: 200,  poor: 600 },      // ms
  fcp:  { good: 1800, poor: 3000 },     // ms
} as const;

export interface PerformanceResult {
  pages: PagePerformance[];
  overallScore: number;                // 0-100
  averageVitals: CoreWebVitals;
  totalResourceIssues: number;
  resourceIssuesByType: Record<string, number>;
  recommendations: string[];
}
