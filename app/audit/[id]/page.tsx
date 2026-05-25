'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

// ===== TYPE INTERFACES =====
interface AuditData {
  id: string; status: string; progress: number; progressMessage: string;
  config: { url?: string; type: string; wcagLevels?: string[]; standard?: string; enabledPillars?: string[] };
  pages: { url: string; title: string }[];
  issues: Issue[]; score: Score; report?: Report; crawlCoverage?: CrawlCoverage;
  testResults: TestResultItem[]; testLog: TestLogEntry[];
  inapplicableCriteria?: string[];
  error?: string;
  // TrustLens
  trustScore?: { overall: number; trustLevel: string; pillarScores: Record<string, { pillar: string; score: number; weight: number; totalFindings: number; status: string }> };
  pillarResults?: {
    darkpatterns?: { findings: DPFinding[]; ethicsScore: number; principleScores: Record<string, number>; categoryBreakdown: Record<string, number>; consentIntegrity: number; choiceSymmetry: number; manipulationIndex: number; totalFindings: number; findingsBySeverity: Record<string, number>; regulatoryRisks: string[] };
    performance?: { pages: PerfPage[]; overallScore: number; averageVitals: Record<string, number | null>; totalResourceIssues: number; recommendations: string[] };
    privacy?: { findings: PrivFinding[]; overallScore: number; cookies: any[]; trackers: TrackerInfo[]; totalTrackers: number; hasConsentBanner: boolean; hasPrivacyPolicy: boolean; findingsBySeverity: Record<string, number>; regulatoryRisks: string[] };
  };
  // Phase 2 fields
  pillarProgress?: { accessibility?: number; darkpatterns?: number; performance?: number; privacy?: number };
  auditIntegrity?: { status: 'clean' | 'warning' | 'partial'; message?: string; failedPillars?: string[] };
  siteProfile?: string;
}
interface Issue {
  id: string; testId: string; title: string; description: string;
  element: string; elementHtml?: string; pageUrl: string;
  wcagCriterion: string; wcagName: string; wcagLevel: string;
  severity: string; impact: string; recommendation: string;
  codeFix?: string; category: string; source: string; confidence?: string;
}
interface Score {
  overall: number; categoryScores: Record<string, number>;
  complianceLevel: string; totalIssues: number; uniqueIssues?: number;
  issueBySeverity: Record<string, number>; issueByLevel: Record<string, number>;
  journeyScore?: number; testsRun: number; testsPassed: number; testsFailed: number;
}
interface TestResultItem {
  testId: string; testName: string; pageUrl: string; status: string;
  wcagCriterion: string; wcagName: string; wcagLevel: string;
  severity: string; confidence: string;
  evidence: { summary: string; elementsChecked: number; elementsFailed: number; details: string[] };
  issues: Issue[]; executionTime: number; error?: string;
}
interface TestLogEntry {
  timestamp: string; testId: string; testName: string; wcag: string;
  status: string; message: string; pageUrl?: string;
  pillar?: 'accessibility' | 'darkpatterns' | 'performance' | 'privacy';
  methodology?: string;
  phase?: string;
}
interface GroupedIssue {
  issueKey: string; title: string; testId: string;
  wcagCriterion: string; wcagName: string; wcagLevel: string;
  severity: string; category: string; description: string;
  recommendation: string; codeFix?: string; confidence: string;
  occurrenceCount: number; affectedPages: string[]; frequency: number;
}
interface JourneyResult {
  journeyName: string; description: string;
  steps: { name: string; action: string; passed: boolean; issue?: string }[];
  passed: boolean;
}
interface CrawlCoverage {
  totalPagesFound: number; pagesAudited: number; pagesSkipped: number;
  coveragePercent: number; skippedPages: { url: string; reason: string }[];
  discoveryMethods: Record<string, number>;
}
interface DPFinding {
  id: string; ruleId: string; category: string; principle: string;
  title: string; description: string; pageUrl: string;
  severity: string; regulation: string[]; confidence: string;
  recommendation: string; userImpact: string;
  evidence: { summary: string; details: string[]; measurements?: Record<string, any> };
}
interface PerfPage {
  url: string; title: string; score: number;
  vitals: Record<string, number | null>;
  totalTransferSize: number; totalRequests: number; domNodes: number; loadTime: number;
  resourceIssues: { type: string; url: string; severity: string; description: string }[];
}
interface PrivFinding {
  id: string; category: string; title: string; description: string;
  pageUrl: string; severity: string; regulation: string[];
  recommendation: string; evidence: { summary: string; details: string[] };
}
interface TrackerInfo {
  domain: string; company: string; category: string; pageUrls: string[]; requestCount: number;
}
interface Report {
  testedLevel?: string;
  executiveSummary: string; groupedIssues?: GroupedIssue[]; topCritical?: GroupedIssue[];
  journeyResults?: JourneyResult[]; testResults?: TestResultItem[];
  wcagMapping: { criterion: string; name: string; level: string; issueCount: number; status: string }[];
  remediationPlan: { priority: number; severity: string; title: string; description: string; affectedPages: string[]; estimatedEffort: string; frequency?: number }[];
  pageBreakdown: { url: string; title: string; score: number; issueCount: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number }[];
}

// ===== COLOURS =====
const sevColors: Record<string, string>  = { critical: '#E8002D', high: '#FE7141', medium: '#D97706', low: '#0091DA' };
const catLabels: Record<string, string>  = { perceivable: 'Perceivable', operable: 'Operable', understandable: 'Understandable', robust: 'Robust', pdf: 'PDF' };
const compLabels: Record<string, string> = {
  'non-compliant': 'Non-Compliant',
  'partially-compliant': 'Partially Compliant',
  'aa-compliant': 'WCAG AA Compliant',
  'aaa-compliant': 'WCAG AAA Compliant'
};
const compBadge: Record<string, string> = {
  'non-compliant': 'badge-critical',
  'partially-compliant': 'badge-medium',
  'aa-compliant': 'badge-pass',
  'aaa-compliant': 'badge-info'
};
const confColors: Record<string, string> = { high: '#00BA8C', medium: '#D97706', low: '#FE7141' };
const statusIcons: Record<string, string>  = { pass: '✔', fail: '✗', error: '⚠', running: '⏳', pending: '⏸', 'needs-review': '?', warn: '⚠' };
const statusColors: Record<string, string> = { pass: '#00BA8C', fail: '#E8002D', error: '#FE7141', running: '#FE7141', pending: '#5B7198', warn: '#D97706' };

// N/A status display
const wcagStatusConfig: Record<string, { label: string; badgeClass: string; icon: string }> = {
  pass:       { label: 'Pass',       badgeClass: 'badge-pass',   icon: '✔' },
  fail:       { label: 'Fail',       badgeClass: 'badge-critical', icon: '✗' },
  'not-tested': { label: 'N/A',      badgeClass: 'badge-na',     icon: '—' },
};

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 90 ? '#00BA8C' : score >= 75 ? '#0091DA' : score >= 50 ? '#F0AB00' : '#FF3356';
  const circ = 2 * Math.PI * 85;
  const off = circ - (score / 100) * circ;
  return (
    <div className="score-gauge">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle cx="100" cy="100" r="85" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
      </svg>
      <span className="score-value" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{score}</span>
      <span className="score-label">Score</span>
    </div>
  );
}

export default function AuditResultPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<AuditData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [tabInitialized, setTabInitialized] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [wcagFilter, setWcagFilter] = useState<'all' | 'fail' | 'pass' | 'not-tested'>('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [issueView, setIssueView] = useState<'grouped' | 'all'>('grouped');
  const [audienceView, setAudienceView] = useState<'developer' | 'designer' | 'legal'>('developer');
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'docx' | 'pdf' | 'pptx') => {
    setExportLoading(format);
    try {
      const res = await fetch(`/api/export-report?id=${id}&format=${format}`);
      if (!res.ok) { alert('Export failed'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      const d = res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/);
      a.download = d ? d[1] : `audit-report.${format}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url); setShowExportMenu(false);
    } catch { alert('Export failed.'); } finally { setExportLoading(null); }
  };

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/audit/${id}`);
    if (res.ok) { const d = await res.json(); setData(d); return d.status; }
    return 'error';
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(async () => {
      const status = await fetchData();
      if (status === 'complete' || status === 'error') clearInterval(interval);
    }, 1500);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.testLog?.length]);

  // ===== PILLAR HELPERS =====
  const enabledPillars: string[] = data?.config?.enabledPillars || ['accessibility', 'darkpatterns', 'performance', 'privacy'];
  const a11yEnabled = enabledPillars.includes('accessibility');
  const dpEnabled = enabledPillars.includes('darkpatterns');
  const perfEnabled = enabledPillars.includes('performance');
  const privEnabled = enabledPillars.includes('privacy');

  // Bug 5 fix: set default tab based on primary enabled pillar
  useEffect(() => {
    if (data && !tabInitialized && data.status === 'complete') {
      setTabInitialized(true);
      if (!a11yEnabled && dpEnabled) setActiveTab('dark-patterns');
      else if (!a11yEnabled && perfEnabled) setActiveTab('perf');
      else if (!a11yEnabled && privEnabled) setActiveTab('privacy');
    }
  }, [data, tabInitialized, a11yEnabled, dpEnabled, perfEnabled, privEnabled]);

  const pillarMeta: Record<string, { icon: string; label: string; color: string }> = {
    accessibility: { icon: '♿', label: 'Accessibility', color: 'var(--pillar-a11y)' },
    darkpatterns: { icon: '🕵️', label: 'Dark Patterns', color: 'var(--pillar-dp)' },
    performance: { icon: '⚡', label: 'Performance', color: 'var(--pillar-perf)' },
    privacy: { icon: '🔒', label: 'Privacy', color: 'var(--pillar-priv)' },
  };

  // ── Helper: extract current phase label for a pillar from testLog ──
  const getPillarPhase = (pillar: string): string | null => {
    if (!data?.testLog) return null;
    const logs = data.testLog.filter((l: TestLogEntry) => l.pillar === pillar && l.phase);
    if (logs.length === 0) return null;
    return logs[logs.length - 1].phase || null;
  };

  const getPillarStatus = (pillar: string): 'running' | 'complete' | 'error' | 'queued' => {
    const pct = data?.pillarProgress?.[pillar as keyof typeof data.pillarProgress];
    if (pct === undefined) return 'queued';
    if (pct === -1) return 'error';
    if (pct === 100) return 'complete';
    return 'running';
  };

  if (!data) return <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  // ===== IN-PROGRESS VIEW =====
  if (data.status !== 'complete' && data.status !== 'error') {
    const testedLevels = data.config?.wcagLevels || ['A', 'AA'];
    const levelLabel = testedLevels.includes('AAA') ? 'AAA' : testedLevels.includes('AA') ? 'AA' : 'A';
    return (
      <div className="container" style={{ paddingTop: 44, maxWidth: 820, margin: '0 auto' }}>
        <div className="glass-card animate-glow" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div className="spinner" style={{ width: 30, height: 30, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Audit in Progress</h2>
                {a11yEnabled && (
                  <span className={`audit-level-chip ${levelLabel.toLowerCase()}`}>
                    {data.config?.standard || 'WCAG 2.2'} — Level {levelLabel}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 12, wordBreak: 'break-all', overflowWrap: 'anywhere', maxWidth: '100%' }}>{data.config?.url}</p>
            </div>
            <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--accent-primary)', letterSpacing: '-0.02em', fontFamily: 'Geist Mono, monospace' }}>{data.progress}%</div>
          </div>

          {/* Active Pillars */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {enabledPillars.map(p => {
              const m = pillarMeta[p];
              if (!m) return null;
              return (
                <span key={p} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 99,
                  fontSize: 11, fontWeight: 700,
                  background: `${m.color}18`, color: m.color,
                  border: `1px solid ${m.color}40`,
                }}>
                  {m.icon} {m.label}
                </span>
              );
            })}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {enabledPillars.length} pillar{enabledPillars.length !== 1 ? 's' : ''} active
            </span>
          </div>

          {/* ── Pillar Pipeline — Real-time per-pillar status with phase labels ── */}
          <div className="pillar-pipeline">
            {(['accessibility', 'darkpatterns', 'performance', 'privacy'] as const).map(p => {
              if (!enabledPillars.includes(p)) return null;
              const meta = pillarMeta[p];
              if (!meta) return null;
              const pct = data.pillarProgress?.[p];
              const status = getPillarStatus(p);
              const phase = getPillarPhase(p);
              const ringPct = pct === undefined ? 0 : pct === -1 ? 100 : Math.max(0, Math.min(100, pct));
              const statusLabel = { running: 'Running', complete: 'Done', error: 'Error', queued: 'Queued' }[status];
              const statusClass = { running: 'status-running', complete: 'status-complete', error: 'status-error', queued: 'status-queued' }[status];
              return (
                <div key={p} className={`pipeline-pillar ${statusClass}`}>
                  <div className="pipeline-pillar-icon">{meta.icon}</div>
                  <div className="pipeline-pillar-name">{meta.label}</div>
                  <div className="pipeline-pillar-bar">
                    <div className="pipeline-pillar-fill" style={{
                      width: `${ringPct}%`,
                      background: status === 'error' ? '#E8002D' : status === 'complete' ? '#00BA8C' : 'var(--gradient-primary)',
                    }} />
                  </div>
                  <div className={`pipeline-pillar-status pipeline-status-${status === 'complete' ? 'done' : status}`}>
                    {statusLabel} {pct !== undefined && pct >= 0 && pct < 100 ? `${pct}%` : ''}
                  </div>
                  {phase && status === 'running' && (
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'Geist Mono, monospace', lineHeight: 1.3, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {phase}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="progress-bar" style={{ marginBottom: 6 }}>
            <div className="progress-fill" style={{ width: `${data.progress}%` }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{data.progressMessage}</p>
        </div>

        {data.testLog && data.testLog.length > 0 && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* ── Log Header ── */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>🔬 Live AI Audit Execution</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {/* Active pillar indicators */}
                {(['darkpatterns', 'performance', 'privacy', 'accessibility'] as const).filter(p =>
                  data.testLog.some((l: TestLogEntry) => l.pillar === p)
                ).map(p => {
                  const pc: Record<string, string> = { accessibility: '#0091DA', darkpatterns: '#CDABFE', performance: '#00BA8C', privacy: '#FE7141' };
                  const pi: Record<string, string> = { accessibility: '♿', darkpatterns: '🕵️', performance: '⚡', privacy: '🔒' };
                  const pl: Record<string, string> = { accessibility: 'A11Y', darkpatterns: 'Dark Patterns', performance: 'Performance', privacy: 'Privacy' };
                  return (
                    <span key={p} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: `${pc[p]}20`, color: pc[p], border: `1px solid ${pc[p]}50`, fontWeight: 700 }}>
                      {pi[p]} {pl[p]}
                    </span>
                  );
                })}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {data.testLog.filter((l: TestLogEntry) => l.status === 'pass').length} passed ·{' '}
                  {data.testLog.filter((l: TestLogEntry) => l.status === 'fail').length} failed
                </span>
              </div>
            </div>

            {/* ── Log Entries ── */}
            <div style={{ maxHeight: 520, overflowY: 'auto', padding: '4px 0', fontFamily: "'Geist Mono', 'Cascadia Code', 'Fira Code', monospace", fontSize: 11 }}>
              {data.testLog.map((entry: TestLogEntry, i: number) => {
                const pillarColor: Record<string, string> = { accessibility: '#0091DA', darkpatterns: '#9B59B6', performance: '#00BA8C', privacy: '#E67E22' };
                const borderColor = entry.pillar ? pillarColor[entry.pillar] : (statusColors[entry.status] || '#5B7198');
                const isPhaseHeader = entry.message.startsWith('━━━');
                const isSubStep    = !isPhaseHeader && entry.message.trimStart().startsWith('→');
                const isSummary    = !isPhaseHeader && entry.message.trimStart().startsWith('✓');

                // ── Phase separator / header ──
                if (isPhaseHeader) {
                  return (
                    <div key={i} style={{
                      margin: '10px 0 2px',
                      padding: '7px 14px',
                      borderLeft: `3px solid ${borderColor}`,
                      background: entry.pillar ? `${pillarColor[entry.pillar]}14` : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                      animation: entry.status === 'running' ? 'pulse 2s ease infinite' : 'none',
                    }}>
                      <span style={{ color: borderColor, fontWeight: 700, fontSize: 11, letterSpacing: '0.02em' }}>
                        {entry.message.replace('━━━', '').trim()}
                      </span>
                      {entry.methodology && (
                        <span style={{
                          fontSize: 9, padding: '2px 8px', borderRadius: 99,
                          background: `${borderColor}22`, color: borderColor,
                          border: `1px solid ${borderColor}55`, fontWeight: 700, letterSpacing: '0.03em',
                        }}>
                          {entry.methodology}
                        </span>
                      )}
                      {entry.status === 'running' && (
                        <span style={{ fontSize: 10, color: borderColor, marginLeft: 'auto', opacity: 0.8 }}>⏳ scanning…</span>
                      )}
                    </div>
                  );
                }

                // ── Sub-step or summary row ──
                return (
                  <div key={i} style={{
                    padding: isSubStep ? '2px 14px 2px 22px' : '4px 14px',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    background: entry.status === 'running' && !isSubStep ? `${borderColor}09` : 'transparent',
                    borderLeft: `3px solid ${isSubStep ? borderColor + '55' : isSummary ? borderColor : borderColor + '35'}`,
                    opacity: isSubStep && entry.status !== 'running' ? 0.7 : 1,
                    animation: entry.status === 'running' ? 'pulse 2s ease infinite' : 'none',
                  }}>
                    {/* status icon */}
                    <span style={{
                      color: isSubStep ? borderColor + '90' : statusColors[entry.status],
                      fontSize: 11, flexShrink: 0, width: 14, textAlign: 'center', marginTop: 1,
                    }}>
                      {isSubStep ? '·' : (statusIcons[entry.status] || '·')}
                    </span>

                    {/* message + methodology badge */}
                    <div style={{ flex: 1, lineHeight: 1.55 }}>
                      <span style={{
                        color: entry.status === 'running' ? borderColor
                             : entry.status === 'fail'    ? '#FF3356'
                             : entry.status === 'pass'    ? '#00BA8C'
                             : isSubStep ? 'var(--text-muted)' : 'var(--text-secondary)',
                        fontSize: isSubStep ? 10 : 11,
                      }}>
                        {entry.message}
                        {entry.wcag && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>(WCAG {entry.wcag})</span>}
                      </span>
                      {/* methodology badge — shown on sub-steps & summaries */}
                      {entry.methodology && !isPhaseHeader && (
                        <span style={{
                          display: 'inline-block', marginLeft: 7, verticalAlign: 'middle',
                          fontSize: 8, padding: '1px 6px', borderRadius: 99,
                          background: `${borderColor}18`, color: borderColor,
                          border: `1px solid ${borderColor}40`, fontWeight: 700, letterSpacing: '0.02em',
                        }}>
                          {entry.methodology}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (data.status === 'error') {
    return (
      <div className="container" style={{ paddingTop: 80, maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ borderColor: 'rgba(232,0,45,0.3)' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>❌</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Audit Failed</h2>
          <p style={{ color: '#FF3356', fontSize: 14 }}>{data.error}</p>
          <a href="/audit" className="btn btn-primary" style={{ marginTop: 20 }}>Try Again</a>
        </div>
      </div>
    );
  }

  // ===== COMPLETE RESULTS =====
  const testedLevel = data.report?.testedLevel || (data.config?.wcagLevels?.includes('AAA') ? 'AAA' : data.config?.wcagLevels?.includes('AA') ? 'AA' : 'A') || 'AA';
  const standard = data.config?.standard || 'WCAG 2.2';

  const filteredIssues = data.issues.filter(i =>
    (severityFilter === 'all' || i.severity === severityFilter) &&
    (categoryFilter === 'all' || i.category === categoryFilter)
  );

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `kpmg-accessibility-report-${id}.json`; a.click();
  };

  const tabs: string[] = ['overview'];
  // Accessibility-specific tabs — only when accessibility pillar is enabled
  if (a11yEnabled) {
    tabs.push('tests', 'issues');
    if (data.report?.journeyResults && data.report.journeyResults.length > 0) tabs.push('journeys');
    tabs.push('wcag-map', 'remediation');
  }
  // Pillar-specific tabs — based on selection AND data availability
  if (dpEnabled) tabs.push('dark-patterns');
  if (perfEnabled) tabs.push('perf');
  if (privEnabled) tabs.push('privacy');
  // Pages tab always shown
  tabs.push('pages');

  // WCAG map filtered counts
  const wcagMapEntries = data.report?.wcagMapping || [];
  const wFail = wcagMapEntries.filter(m => m.status === 'fail').length;
  const wPass = wcagMapEntries.filter(m => m.status === 'pass').length;
  const wNA   = wcagMapEntries.filter(m => m.status === 'not-tested').length;

  return (
    <div className="container" style={{ paddingTop: 28, paddingBottom: 80 }}>
      {/* ── Integrity Warning Banner ── */}
      {data.auditIntegrity && data.auditIntegrity.status !== 'clean' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
          background: data.auditIntegrity.status === 'partial' ? 'rgba(231,76,60,0.08)' : 'rgba(243,156,18,0.08)',
          border: `1px solid ${data.auditIntegrity.status === 'partial' ? 'rgba(231,76,60,0.3)' : 'rgba(243,156,18,0.3)'}`,
          borderRadius: 'var(--radius-md)', marginBottom: 16
        }}>
          <span style={{ fontSize: 18 }}>{data.auditIntegrity.status === 'partial' ? '🔴' : '⚠️'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: data.auditIntegrity.status === 'partial' ? '#e74c3c' : '#f39c12', marginBottom: 2 }}>
              {data.auditIntegrity.status === 'partial' ? 'Partial Audit' : 'Audit Integrity Warning'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{data.auditIntegrity.message}</div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 className="page-title">Audit Results</h1>
            {a11yEnabled && (
              <span className={`audit-level-chip ${testedLevel.toLowerCase()}`}>
                {standard} · Level {testedLevel}
              </span>
            )}
            {data.siteProfile && (
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'rgba(155,89,182,0.12)', color: '#9B59B6', border: '1px solid rgba(155,89,182,0.25)', fontWeight: 600 }}>
                🏭 {data.siteProfile}
              </span>
            )}
          </div>

          {/* Per-pillar progress mini indicators */}
          {data.pillarProgress && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              {(['accessibility','darkpatterns','performance','privacy'] as const).map(p => {
                if (!enabledPillars.includes(p)) return null;
                const pct = data.pillarProgress?.[p];
                const meta = pillarMeta[p];
                if (!meta) return null;
                const failed = pct === -1;
                return (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `conic-gradient(${failed ? '#e74c3c' : meta.color} ${(pct ?? 0) * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10
                    }}>{meta.icon}</div>
                    <span style={{ color: failed ? '#e74c3c' : 'var(--text-secondary)' }}>
                      {meta.label} {failed ? 'failed' : pct === 100 ? '✓' : `${pct ?? 0}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active pillar badges */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            {enabledPillars.map(p => {
              const m = pillarMeta[p];
              if (!m) return null;
              return (
                <span key={p} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}35`,
                }}>
                  {m.icon} {m.label}
                </span>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', overflowWrap: 'anywhere', maxWidth: '100%', lineHeight: 1.5 }}>
            {data.config?.url || 'PDF Upload'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Export dropdown */}
          <div style={{ position: 'relative' }}>
            <button id="export-dropdown-toggle" className="btn btn-secondary btn-sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>📥</span> Download
              <span style={{ fontSize: 9, marginLeft: 2, transform: showExportMenu ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {showExportMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowExportMenu(false)} />
                <div className="animate-fade-in" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 5, minWidth: 210, zIndex: 50, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                  <div style={{ padding: '5px 10px', marginBottom: 3 }}><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Export Format</span></div>
                  {[{ key: 'docx', icon: '📄', label: 'Word Document', sub: '.docx' }, { key: 'pdf', icon: '📕', label: 'PDF Report', sub: '.pdf' }, { key: 'pptx', icon: '📊', label: 'PowerPoint', sub: '.pptx' }].map(item => (
                    <button key={item.key} onClick={() => handleExport(item.key as 'docx' | 'pdf' | 'pptx')} disabled={!!exportLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: exportLoading ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Open Sans, sans-serif', textAlign: 'left', transition: 'background 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <div><div style={{ fontWeight: 600 }}>{item.label}</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.sub}</div></div>
                      {exportLoading === item.key && <div className="spinner" style={{ width: 16, height: 16, marginLeft: 'auto', borderWidth: 2 }} />}
                    </button>
                  ))}
                  <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
                  <button onClick={() => { downloadJson(); setShowExportMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12, fontFamily: 'Open Sans, sans-serif', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 18 }}>🔧</span><div><div style={{ fontWeight: 600 }}>Raw JSON</div><div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Developer format</div></div>
                  </button>
                </div>
              </>
            )}
          </div>
          <a href={`/audit/${id}/report`} className="btn-report" aria-label="View Final Delivery Report">
            📋 Final Report
          </a>
          <a href="/audit" className="btn btn-primary btn-sm">+ New Audit</a>
        </div>
      </div>

      {/* ── Score + Summary Cards — only when accessibility pillar ran ── */}
      {a11yEnabled && (
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, marginBottom: 20 }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ScoreGauge score={data.score.overall} />
          <div className={`badge ${compBadge[data.score.complianceLevel] || 'badge-medium'}`}>
            {compLabels[data.score.complianceLevel] || data.score.complianceLevel}
          </div>
          <div className={`audit-level-chip ${testedLevel.toLowerCase()}`} style={{ marginTop: 2 }}>
            Level {testedLevel} Tested
          </div>
        </div>
        <div>
          {/* Issue severity breakdown */}
          <div className="grid-4" style={{ marginBottom: 14 }}>
            {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
              <div key={sev} className="stat-card">
                <div className="stat-value" style={{ color: sevColors[sev] }}>{data.score.issueBySeverity[sev]}</div>
                <div className="stat-label" style={{ textTransform: 'capitalize' }}>{sev}</div>
              </div>
            ))}
          </div>
          {/* Test stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
            <div className="stat-card" style={{ textAlign: 'center', padding: 10, borderLeft: '3px solid var(--accent-blue)' }}>
              <div style={{ fontSize: 20, fontWeight: 300, color: 'var(--accent-blue)' }}>{data.score.testsRun}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tests Run</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center', padding: 10, borderLeft: '3px solid #00BA8C' }}>
              <div style={{ fontSize: 20, fontWeight: 300, color: '#00BA8C' }}>{data.score.testsPassed}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Passed</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center', padding: 10, borderLeft: '3px solid #FF3356' }}>
              <div style={{ fontSize: 20, fontWeight: 300, color: '#FF3356' }}>{data.score.testsFailed}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Failed</div>
            </div>
          </div>
          {/* Category scores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {Object.entries(data.score.categoryScores).map(([cat, score]) => (
              <div key={cat} className="stat-card" style={{ textAlign: 'center', padding: 10 }}>
                <div style={{ fontSize: 17, fontWeight: 300, color: (score as number) >= 75 ? '#00BA8C' : (score as number) >= 50 ? '#F0AB00' : '#FF3356', letterSpacing: '-0.02em' }}>{score as number}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{catLabels[cat] || cat}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* ── TrustLens Pillar Scores ── */}
      {data.trustScore && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>🛡️ TrustLens Score</h3>
            <span className={`trust-score-badge trust-level-${data.trustScore.trustLevel}`}>
              {data.trustScore.trustLevel === 'trusted' ? '✓ Trusted' : data.trustScore.trustLevel === 'moderate' ? '⚠ Moderate Risk' : data.trustScore.trustLevel === 'at-risk' ? '⚠ At Risk' : '✗ Critical Risk'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 24, fontWeight: 300, letterSpacing: '-0.03em', color: data.trustScore.overall >= 80 ? '#00BA8C' : data.trustScore.overall >= 60 ? '#F0AB00' : data.trustScore.overall >= 40 ? '#FF8533' : '#FF3356' }}>
              {data.trustScore.overall}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span>
            </span>
          </div>
          {/* Smart trust score context note — Gap 3 */}
          {data.auditIntegrity && data.auditIntegrity.status !== 'clean' && data.auditIntegrity.failedPillars ? (
            <div style={{ fontSize: 11, color: '#f39c12', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️</span>
              <span>Score based on <strong>{enabledPillars.length - data.auditIntegrity.failedPillars.length}</strong> of {enabledPillars.length} pillars — {data.auditIntegrity.failedPillars.map(p => pillarMeta[p]?.label || p).join(', ')} did not complete</span>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
              ✓ All {enabledPillars.length} pillar{enabledPillars.length !== 1 ? 's' : ''} reporting
            </div>
          )}
          <div className="pillar-scores-grid">
            {Object.entries(data.trustScore.pillarScores).map(([key, ps]) => {
              const icons: Record<string, string> = { accessibility: '♿', darkpatterns: '🕵️', performance: '⚡', privacy: '🔒' };
              const colors: Record<string, string> = { accessibility: '#0091DA', darkpatterns: '#9B59B6', performance: '#00BA8C', privacy: '#E67E22' };
              const labels: Record<string, string> = { accessibility: 'Accessibility', darkpatterns: 'Dark Patterns', performance: 'Performance', privacy: 'Privacy' };
              const c = ps.score >= 80 ? '#00BA8C' : ps.score >= 50 ? '#F0AB00' : '#FF3356';
              return (
                <div key={key} className={`pillar-score-card pillar-${key}`}>
                  <div className="pillar-score-icon">{icons[key] || '📊'}</div>
                  <div className="pillar-score-value" style={{ color: c }}>{ps.score}</div>
                  <div className="pillar-score-label" style={{ color: colors[key] }}>{labels[key] || key}</div>
                  <div className={`pillar-score-status pillar-status-${ps.status}`}>{ps.status}</div>
                  {ps.totalFindings > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{ps.totalFindings} finding{ps.totalFindings !== 1 ? 's' : ''}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Scoring Explainability ── */}
      <details style={{ marginBottom: 20 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)', padding: '8px 0' }}>
          ℹ️ How are these scores calculated?
        </summary>
        <div className="glass-card" style={{ marginTop: 8, padding: 16 }}>
          {a11yEnabled && (
            <div style={{ marginBottom: a11yEnabled && (dpEnabled || perfEnabled || privEnabled) ? 16 : 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>♿ Accessibility Score</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Severity Weights</div>
                  <div>🔴 Critical = 10 pts</div><div>🟠 High = 5 pts</div><div>🟡 Medium = 2 pts</div><div>🔵 Low = 0.5 pts</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Level Multipliers</div>
                  <div>Level A = ×1.5</div><div>Level AA = ×1.0</div><div>Level AAA = ×0.5</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Confidence</div>
                  <div>🎯 High = ×1.0</div><div>🎯 Medium = ×0.7</div><div>🎯 Low = ×0.4</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <strong>Formula:</strong> Score = 100 − Σ(severity × level × confidence) per issue. Logarithmic cap prevents collapse to 0 on large sites.
              </div>
            </div>
          )}
          {dpEnabled && (
            <div style={{ marginBottom: perfEnabled || privEnabled ? 16 : 0, paddingTop: a11yEnabled ? 12 : 0, borderTop: a11yEnabled ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#9B59B6', marginBottom: 8 }}>🕵️ Dark Patterns Score</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Ethics Score starts at 100 and deducts based on detected manipulative patterns weighted by severity and ethical principle impact.
                Consent Integrity measures clarity of opt-in/opt-out flows. Manipulation Index aggregates social pressure, urgency, and emotional manipulation signals.
              </div>
            </div>
          )}
          {perfEnabled && (
            <div style={{ marginBottom: privEnabled ? 16 : 0, paddingTop: a11yEnabled || dpEnabled ? 12 : 0, borderTop: a11yEnabled || dpEnabled ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#00BA8C', marginBottom: 8 }}>⚡ Performance Score</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Based on Core Web Vitals (LCP, CLS, FCP, TTFB, TBT) measured against Google&apos;s good/poor thresholds. Resource optimization issues are factored in.
              </div>
            </div>
          )}
          {privEnabled && (
            <div style={{ paddingTop: a11yEnabled || dpEnabled || perfEnabled ? 12 : 0, borderTop: a11yEnabled || dpEnabled || perfEnabled ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#E67E22', marginBottom: 8 }}>🔒 Privacy Score</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Evaluates tracker presence, cookie compliance, consent banner implementation, and privacy policy availability against GDPR/CCPA requirements.
              </div>
            </div>
          )}
        </div>
      </details>

      {/* ── Page Coverage (fixed) ── */}
      {data.crawlCoverage && (
        <div className="glass-card animate-fade-in" style={{ marginBottom: 20, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>📊 Page Coverage</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {data.crawlCoverage.pagesAudited} of {data.crawlCoverage.totalPagesFound} pages audited
              </span>
              <span style={{
                fontSize: 18, fontWeight: 300, letterSpacing: '-0.02em',
                color: data.crawlCoverage.coveragePercent >= 80 ? '#00BA8C' :
                       data.crawlCoverage.coveragePercent >= 50 ? '#F0AB00' : '#FF3356'
              }}>
                {data.crawlCoverage.coveragePercent}%
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 300, color: 'var(--accent-blue)' }}>{data.crawlCoverage.totalPagesFound}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Discovered</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 300, color: '#00BA8C' }}>{data.crawlCoverage.pagesAudited}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Audited</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 300, color: '#FF8533' }}>{data.crawlCoverage.pagesSkipped}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Skipped</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 300 }}>{data.score.uniqueIssues ?? '—'}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Unique Issues</div>
            </div>
          </div>
          <div className="coverage-bar">
            <div style={{
              height: '100%', borderRadius: 'var(--radius-full)', transition: 'width 1s ease',
              width: `${data.crawlCoverage.coveragePercent}%`,
              background: data.crawlCoverage.coveragePercent >= 80 ? '#00BA8C' :
                          data.crawlCoverage.coveragePercent >= 50 ? '#F0AB00' : '#FF3356'
            }} />
          </div>
          {data.crawlCoverage.coveragePercent < 100 && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
              ℹ️ Coverage is limited by the configured max page setting. Increase "Max Pages" for broader analysis.
            </p>
          )}
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'overview' ? '📋 Overview' : t === 'wcag-map' ? '📊 WCAG Map' : t === 'journeys' ? '🚶 Journeys' : t === 'tests' ? '🧪 Tests' : t === 'issues' ? '⚠️ Issues' : t === 'remediation' ? '🔧 Remediation' : t === 'dark-patterns' ? '🕵️ Dark Patterns' : t === 'perf' ? '⚡ Performance' : t === 'privacy' ? '🔒 Privacy' : t === 'pages' ? '📄 Pages' : t}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
           OVERVIEW TAB
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && data.report && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Executive Summary</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{data.report.executiveSummary}</p>
          </div>

          {/* Accessibility overview sections — only when a11y enabled */}
          {a11yEnabled && data.report.topCritical && data.report.topCritical.length > 0 && (
            <div className="glass-card" style={{ marginBottom: 20, borderLeft: '3px solid #FF3356' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🔥 Top Critical Accessibility Issues</h3>
              {data.report.topCritical.map((g, idx) => (
                <div key={g.issueKey} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderBottom: idx < data.report!.topCritical!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ background: sevColors[g.severity], color: 'white', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{g.title}</span>
                      <span className={`badge badge-${g.severity}`}>{g.severity}</span>
                      <span className="badge badge-na" style={{ marginLeft: 2 }}>WCAG {g.wcagCriterion}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>{g.description.substring(0, 150)}</div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span>📄 {g.affectedPages.length} page{g.affectedPages.length > 1 ? 's' : ''}</span>
                      <span>🔄 {g.occurrenceCount}×</span>
                      <span>📊 {g.frequency}% frequency</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {a11yEnabled && data.report.journeyResults && data.report.journeyResults.length > 0 && (
            <div className="glass-card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🚶 User Journey Tests</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {data.report.journeyResults.map(j => (
                  <div key={j.journeyName} style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: j.passed ? 'rgba(0,186,140,0.07)' : 'rgba(232,0,45,0.07)', border: `1px solid ${j.passed ? 'rgba(0,186,140,0.2)' : 'rgba(232,0,45,0.2)'}` }}>
                    <div style={{ fontSize: 18, marginBottom: 5 }}>{j.passed ? '✅' : '❌'}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{j.journeyName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{j.steps.filter(s => s.passed).length}/{j.steps.length} steps passed</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dark Patterns overview summary — only when DP enabled */}
          {dpEnabled && data.pillarResults?.darkpatterns && (
            <div className="glass-card" style={{ marginBottom: 20, borderLeft: '3px solid #9B59B6' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🕵️ Dark Patterns Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 300, color: data.pillarResults.darkpatterns.ethicsScore >= 80 ? '#00BA8C' : data.pillarResults.darkpatterns.ethicsScore >= 50 ? '#F0AB00' : '#FF3356' }}>{data.pillarResults.darkpatterns.ethicsScore}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ethics Score</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 300, color: data.pillarResults.darkpatterns.totalFindings === 0 ? '#00BA8C' : '#FF3356' }}>{data.pillarResults.darkpatterns.totalFindings}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Patterns Found</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 300, color: data.pillarResults.darkpatterns.manipulationIndex <= 20 ? '#00BA8C' : '#FF3356' }}>{data.pillarResults.darkpatterns.manipulationIndex}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Manipulation Index</div>
                </div>
              </div>
              {data.pillarResults.darkpatterns.totalFindings > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Top categories: {Object.entries(data.pillarResults.darkpatterns.categoryBreakdown).filter(([,v]) => v > 0).sort(([,a],[,b]) => b - a).slice(0, 3).map(([k,v]) => `${k} (${v})`).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Performance overview summary — only when perf enabled */}
          {perfEnabled && data.pillarResults?.performance && (
            <div className="glass-card" style={{ marginBottom: 20, borderLeft: '3px solid #00BA8C' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>⚡ Performance Summary</h3>
              <div style={{ fontSize: 28, fontWeight: 300, color: data.pillarResults.performance.overallScore >= 80 ? '#00BA8C' : data.pillarResults.performance.overallScore >= 50 ? '#F0AB00' : '#FF3356', marginBottom: 6 }}>
                {data.pillarResults.performance.overallScore}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {data.pillarResults.performance.totalResourceIssues} resource issues · {data.pillarResults.performance.pages.length} pages analyzed
              </div>
            </div>
          )}

          {/* Privacy overview summary — only when privacy enabled */}
          {privEnabled && data.pillarResults?.privacy && (
            <div className="glass-card" style={{ marginBottom: 20, borderLeft: '3px solid #E67E22' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>🔒 Privacy Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 300, color: data.pillarResults.privacy.overallScore >= 80 ? '#00BA8C' : '#FF3356' }}>{data.pillarResults.privacy.overallScore}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 300, color: data.pillarResults.privacy.totalTrackers > 5 ? '#FF3356' : '#F0AB00' }}>{data.pillarResults.privacy.totalTrackers}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trackers</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 300, color: data.pillarResults.privacy.hasConsentBanner ? '#00BA8C' : '#FF3356' }}>{data.pillarResults.privacy.hasConsentBanner ? '✓' : '✗'}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Consent</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 300, color: data.pillarResults.privacy.hasPrivacyPolicy ? '#00BA8C' : '#FF3356' }}>{data.pillarResults.privacy.hasPrivacyPolicy ? '✓' : '✗'}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Policy</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           TESTS TAB
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'tests' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Tests', val: data.testResults.length, color: 'var(--accent-blue)' },
              { label: 'Passed', val: data.testResults.filter(r => r.status === 'pass').length, color: '#00BA8C' },
              { label: 'Failed', val: data.testResults.filter(r => r.status === 'fail').length, color: '#FF3356' },
              { label: 'Errors', val: data.testResults.filter(r => r.status === 'error').length, color: '#FF8533' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
                <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.testResults.map((tr, idx) => (
              <div key={idx} className="glass-card" style={{
                padding: '13px 15px', display: 'flex', alignItems: 'flex-start', gap: 12,
                borderLeft: `3px solid ${statusColors[tr.status] || '#5B7198'}`,
                background: tr.status === 'pass' ? 'rgba(0,186,140,0.03)' : tr.status === 'fail' ? 'rgba(232,0,45,0.03)' : undefined,
              }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                  {tr.status === 'pass' ? '✅' : tr.status === 'fail' ? '❌' : '⚠️'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{tr.testName}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'rgba(0,145,218,0.1)', color: '#0091DA', fontWeight: 700 }}>{tr.testId}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>WCAG {tr.wcagCriterion}</span>
                    <span className={`badge badge-level-${tr.wcagLevel.toLowerCase()}`}>{tr.wcagLevel}</span>
                    <span className={`badge ${tr.status === 'pass' ? 'badge-pass' : `badge-${tr.severity}`}`} style={{ marginLeft: 'auto' }}>
                      {tr.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>{tr.evidence.summary}</div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>🔍 {tr.evidence.elementsChecked} checked</span>
                    <span style={{ color: tr.evidence.elementsFailed > 0 ? '#FF3356' : '#00BA8C' }}>
                      {tr.evidence.elementsFailed > 0 ? `✗ ${tr.evidence.elementsFailed} failed` : '✓ All passed'}
                    </span>
                    <span>⏱ {tr.executionTime}ms</span>
                    <span style={{ color: confColors[tr.confidence] }}>🎯 {tr.confidence}</span>
                  </div>
                  {tr.evidence.details.length > 0 && tr.status === 'fail' && (
                    <details style={{ marginTop: 7 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>
                        View Evidence ({tr.evidence.details.length} items)
                      </summary>
                      <div style={{ marginTop: 7, padding: 10, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontFamily: "'Cascadia Code', monospace", fontSize: 10, lineHeight: 1.6, maxHeight: 180, overflowY: 'auto' }}>
                        {tr.evidence.details.map((d, i) => (
                          <div key={i} style={{ color: d.startsWith('✔') ? '#00BA8C' : d.startsWith('✗') || d.startsWith('⚠') || d.startsWith('❌') ? '#FF3356' : 'var(--text-secondary)' }}>{d}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           ISSUES TAB
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'issues' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <button onClick={() => setIssueView('grouped')} style={{ padding: '6px 13px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Open Sans', background: issueView === 'grouped' ? 'var(--accent-blue)' : 'transparent', color: issueView === 'grouped' ? 'white' : 'var(--text-muted)' }}>Grouped</button>
              <button onClick={() => setIssueView('all')}     style={{ padding: '6px 13px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'Open Sans', background: issueView === 'all' ? 'var(--accent-blue)' : 'transparent', color: issueView === 'all' ? 'white' : 'var(--text-muted)' }}>All</button>
            </div>
            <select className="input-field" style={{ width: 'auto' }} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select className="input-field" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {Object.entries(catLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {issueView === 'grouped' && data.report?.groupedIssues && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {data.report.groupedIssues
                .filter(g => (severityFilter === 'all' || g.severity === severityFilter) && (categoryFilter === 'all' || g.category === categoryFilter))
                .map(g => (
                  <div key={g.issueKey} className="issue-card">
                    <div className="issue-card-header">
                      <span className="issue-card-title">{g.title}</span>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                        {g.occurrenceCount > 1 && <span style={{ background: 'rgba(123,79,187,0.12)', color: '#A78BFA', fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700 }}>{g.occurrenceCount}× · {g.affectedPages.length} page{g.affectedPages.length > 1 ? 's' : ''}</span>}
                        <span className={`badge badge-${g.severity}`}>{g.severity}</span>
                      </div>
                    </div>
                    <div className="issue-card-desc">{g.description.substring(0, 180)}</div>
                    <div className="issue-card-meta">
                      <span className="issue-card-tag">📋 {g.wcagCriterion} {g.wcagName}</span>
                      <span className={`badge badge-level-${g.wcagLevel.toLowerCase()}`}>{g.wcagLevel}</span>
                      <span className="issue-card-tag">📂 {catLabels[g.category] || g.category}</span>
                      <span className="issue-card-tag" style={{ color: confColors[g.confidence] }}>🎯 {g.confidence} confidence</span>
                      {g.frequency > 50 && <span className="badge badge-high">Widespread {g.frequency}%</span>}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {issueView === 'all' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {filteredIssues.map(issue => (
                <div key={issue.id} className="issue-card" onClick={() => setSelectedIssue(issue)}>
                  <div className="issue-card-header">
                    <span className="issue-card-title">{issue.title}</span>
                    <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                  </div>
                  <div className="issue-card-desc">{issue.description.substring(0, 180)}</div>
                  <div className="issue-card-meta">
                    <span className="issue-card-tag">📋 {issue.wcagCriterion}</span>
                    <span className={`badge badge-level-${issue.wcagLevel.toLowerCase()}`}>{issue.wcagLevel}</span>
                    <span className="issue-card-tag">🔧 {issue.source}</span>
                    {issue.confidence && <span className="issue-card-tag" style={{ color: confColors[issue.confidence] }}>🎯 {issue.confidence}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           JOURNEYS TAB
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'journeys' && data.report?.journeyResults && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.report.journeyResults.map(j => (
            <div key={j.journeyName} className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 26 }}>{j.passed ? '✅' : '❌'}</span>
                <div><h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{j.journeyName}</h3><p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{j.description}</p></div>
                <span className={`badge ${j.passed ? 'badge-pass' : 'badge-critical'}`} style={{ marginLeft: 'auto' }}>{j.passed ? 'PASSED' : 'FAILED'}</span>
              </div>
              {j.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px', marginBottom: 5, background: s.passed ? 'rgba(0,186,140,0.05)' : 'rgba(232,0,45,0.05)', borderRadius: 'var(--radius-sm)', border: `1px solid ${s.passed ? 'rgba(0,186,140,0.15)' : 'rgba(232,0,45,0.15)'}` }}>
                  <span style={{ fontSize: 14 }}>{s.passed ? '✅' : '❌'}</span>
                  <div><div style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.action}</div>{s.issue && <div style={{ fontSize: 11, color: '#FF3356', marginTop: 3 }}>⚠ {s.issue}</div>}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           WCAG MAP TAB — with N/A support
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'wcag-map' && data.report && (
        <div className="animate-fade-in">
          {/* Filter + Stats row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'fail', 'pass', 'not-tested'] as const).map(f => (
                <button key={f} onClick={() => setWcagFilter(f)} style={{
                  padding: '5px 12px', fontSize: 11, fontWeight: 700, border: `1px solid ${wcagFilter === f ? 'var(--accent-blue)' : 'var(--border)'}`,
                  borderRadius: 99, cursor: 'pointer', fontFamily: 'Open Sans',
                  background: wcagFilter === f ? 'rgba(0,145,218,0.12)' : 'transparent',
                  color: wcagFilter === f ? 'var(--accent-blue)' : 'var(--text-muted)',
                  transition: 'var(--transition)'
                }}>
                  {f === 'not-tested' ? 'N/A' : f.charAt(0).toUpperCase() + f.slice(1)}
                  {' '}({f === 'all' ? wcagMapEntries.length : f === 'fail' ? wFail : f === 'pass' ? wPass : wNA})
                </button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>📋 Audited against <strong style={{ color: 'var(--text-primary)' }}>{standard} Level {testedLevel}</strong></span>
            </div>
          </div>

          <div className="glass-card" style={{ overflow: 'auto', padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Criterion</th>
                  <th>Name</th>
                  <th>Level</th>
                  <th>Issues</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {wcagMapEntries
                  .filter(m => wcagFilter === 'all' || m.status === wcagFilter)
                  .map(m => {
                    const cfg = wcagStatusConfig[m.status] || wcagStatusConfig['not-tested'];
                    return (
                      <tr key={m.criterion}>
                        <td><span style={{ fontWeight: 700, fontFamily: "'Cascadia Code', monospace", fontSize: 12 }}>{m.criterion}</span></td>
                        <td>{m.name}</td>
                        <td><span className={`badge badge-level-${m.level.toLowerCase()}`}>{m.level}</span></td>
                        <td>
                          {m.status === 'not-tested'
                            ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                            : <span style={{ fontWeight: 700, color: m.issueCount > 0 ? '#FF3356' : '#00BA8C' }}>{m.issueCount}</span>
                          }
                        </td>
                        <td>
                          <span className={`badge ${cfg.badgeClass}`} title={m.status === 'not-tested' ? 'This criterion was not applicable to the audited content (e.g. no video → captions N/A)' : ''}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* N/A explanation */}
          <div className="kpmg-banner" style={{ marginTop: 14, marginBottom: 0 }}>
            <span className="kpmg-banner-icon">ℹ️</span>
            <span><strong>N/A (Not Applicable)</strong> — These criteria were identified as not applicable to the audited content. For example: captions criteria when no video is present, or error prevention when no forms exist. This is not a failure.</span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           REMEDIATION TAB
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'remediation' && data.report && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.report.remediationPlan.map(step => (
            <div key={step.priority} className="glass-card" style={{ borderLeft: `3px solid ${sevColors[step.severity]}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 7 }}>
                <span style={{ background: sevColors[step.severity], color: 'white', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{step.priority}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{step.title}</span>
                <span className={`badge badge-${step.severity}`} style={{ marginLeft: 'auto' }}>{step.severity}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.description}</p>
              <div style={{ marginTop: 7, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 14 }}>
                <span>💪 Effort: {step.estimatedEffort}</span>
                <span>📄 {step.affectedPages.length} page{step.affectedPages.length > 1 ? 's' : ''}</span>
                {step.frequency && <span>📊 {step.frequency}% of pages</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           PAGES TAB
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'pages' && data.report && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.report.pageBreakdown.map(page => (
            <div key={page.url} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.url}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {page.criticalCount > 0 && <span className="badge badge-critical">{page.criticalCount} Critical</span>}
                  {page.highCount > 0     && <span className="badge badge-high">{page.highCount} High</span>}
                  {page.mediumCount > 0   && <span className="badge badge-medium">{page.mediumCount} Medium</span>}
                  {page.lowCount > 0      && <span className="badge badge-low">{page.lowCount} Low</span>}
                  {page.issueCount === 0  && <span className="badge badge-pass">No Issues</span>}
                </div>
              </div>
              <div style={{
                width: 54, height: 54, borderRadius: '50%', flexShrink: 0, marginLeft: 16,
                border: `3px solid ${page.score >= 75 ? '#00BA8C' : page.score >= 50 ? '#F0AB00' : '#FF3356'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 300, fontSize: 17, letterSpacing: '-0.02em',
                color: page.score >= 75 ? '#00BA8C' : page.score >= 50 ? '#F0AB00' : '#FF3356'
              }}>
                {page.score}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
           DARK PATTERNS TAB
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'dark-patterns' && data.pillarResults?.darkpatterns && (() => {
        const dp = data.pillarResults.darkpatterns!;
        const principleLabels: Record<string, string> = { 'informed-consent': 'Informed Consent', 'symmetry-of-choice': 'Symmetry of Choice', 'transparency': 'Transparency', 'user-autonomy': 'User Autonomy', 'accessibility-clarity': 'Accessibility & Clarity' };
        const catIcons: Record<string, string> = { 'interface-interference': '🎭', 'obstruction': '🚧', 'sneaking': '🐍', 'forced-action': '⛓️', 'nagging': '📢', 'scarcity-urgency': '⏰', 'social-pressure': '👥', 'privacy-zuckering': '🔓', 'confirmshaming': '😔', 'misdirection': '🎯' };
        return (
          <div className="animate-fade-in">
            {/* Ethics Score Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="glass-card" style={{ textAlign: 'center', borderTop: '3px solid #9B59B6' }}>
                <div style={{ fontSize: 32, fontWeight: 300, color: dp.ethicsScore >= 80 ? '#00BA8C' : dp.ethicsScore >= 50 ? '#F0AB00' : '#FF3356' }}>{dp.ethicsScore}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ethics Score</div>
              </div>
              <div className="glass-card" style={{ textAlign: 'center', borderTop: '3px solid #0091DA' }}>
                <div style={{ fontSize: 32, fontWeight: 300, color: dp.consentIntegrity >= 80 ? '#00BA8C' : '#F0AB00' }}>{dp.consentIntegrity}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Consent Integrity</div>
              </div>
              <div className="glass-card" style={{ textAlign: 'center', borderTop: '3px solid #E67E22' }}>
                <div style={{ fontSize: 32, fontWeight: 300, color: dp.manipulationIndex <= 20 ? '#00BA8C' : '#FF3356' }}>{dp.manipulationIndex}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Manipulation Index</div>
              </div>
            </div>

            {/* Principle Scores */}
            <div className="glass-card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📐 Ethical Principle Scores</h3>
              <div className="ethics-bar-container">
                {Object.entries(dp.principleScores).map(([key, score]) => (
                  <div key={key} className="ethics-bar-row">
                    <div className="ethics-bar-label">{principleLabels[key] || key}</div>
                    <div className="ethics-bar-track">
                      <div className="ethics-bar-fill" style={{ width: `${score}%`, background: score >= 80 ? '#00BA8C' : score >= 50 ? '#F0AB00' : '#FF3356' }} />
                    </div>
                    <div className="ethics-bar-value" style={{ color: score >= 80 ? '#00BA8C' : score >= 50 ? '#F0AB00' : '#FF3356' }}>{score}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="grid-4" style={{ marginBottom: 20 }}>
              {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
                <div key={sev} className="stat-card" style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ color: sevColors[sev] }}>{dp.findingsBySeverity[sev] || 0}</div>
                  <div className="stat-label" style={{ textTransform: 'capitalize' }}>{sev}</div>
                </div>
              ))}
            </div>

            {/* ── Audience-Segmented Report Toggle ── */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'Geist Mono, monospace' }}>VIEW AS:</div>
                {([
                  { key: 'developer', icon: '👨‍💻', label: 'Developer', desc: 'Code fixes, selectors, priority queue' },
                  { key: 'designer',  icon: '🎨', label: 'Designer',  desc: 'Visual evidence, CTA weights, design tokens' },
                  { key: 'legal',     icon: '⚖️', label: 'Legal',     desc: 'Regulation articles, risk tiers, precedents' },
                ] as const).map(v => (
                  <button key={v.key} onClick={() => setAudienceView(v.key)}
                    title={v.desc}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                      borderRadius: 99, border: `1px solid ${audienceView === v.key ? 'var(--pillar-dp)' : 'var(--border)'}`,
                      background: audienceView === v.key ? 'rgba(205,171,254,0.12)' : 'transparent',
                      color: audienceView === v.key ? 'var(--pillar-dp)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s ease',
                    }}>
                    <span>{v.icon}</span> {v.label}
                  </button>
                ))}
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>— tailors finding detail for each audience</span>
              </div>

              {/* Developer View hint bar */}
              {audienceView === 'developer' && (
                <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(0,145,218,0.07)', border: '1px solid rgba(0,145,218,0.2)', fontSize: 11, color: '#0091DA', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>👨‍💻</span>
                  <span><strong>Developer view:</strong> Shows WCAG/DSA article violated, element selector, P0–P3 priority, and a ready-to-use code fix for each finding.</span>
                </div>
              )}
              {audienceView === 'designer' && (
                <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(205,171,254,0.07)', border: '1px solid rgba(205,171,254,0.2)', fontSize: 11, color: 'var(--pillar-dp)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>🎨</span>
                  <span><strong>Designer view:</strong> Shows Brignull pattern category, CTA prominence ratios, visual evidence description, and design-token fix recommendations.</span>
                </div>
              )}
              {audienceView === 'legal' && (
                <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(254,113,65,0.07)', border: '1px solid rgba(254,113,65,0.2)', fontSize: 11, color: '#FE7141', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>⚖️</span>
                  <span><strong>Legal view:</strong> Shows regulation articles violated (GDPR/DSA/FTC/CCPA), risk tier, enforcement precedent context, and remediation deadline framing.</span>
                </div>
              )}
            </div>

            {/* Findings List */}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🕵️ Dark Pattern Findings ({dp.totalFindings})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dp.findings.map((f: DPFinding) => (
                <div key={f.id} className="dp-finding-card">
                  {/* Header: always shown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{f.title}</span>
                    <span className={`badge badge-${f.severity}`}>{f.severity}</span>
                    <span className="dp-category-badge">{catIcons[f.category] || '📋'} {f.category}</span>
                    {(f as any).findingVerdict && (
                      <span style={{
                        fontSize: 9, padding: '2px 7px', borderRadius: 99, fontWeight: 700,
                        background: (f as any).findingVerdict === 'verdict' ? 'rgba(0,186,140,0.12)' : 'rgba(243,156,18,0.12)',
                        color: (f as any).findingVerdict === 'verdict' ? '#00BA8C' : '#f39c12',
                        border: `1px solid ${(f as any).findingVerdict === 'verdict' ? 'rgba(0,186,140,0.3)' : 'rgba(243,156,18,0.3)'}`,
                      }}>
                        {(f as any).findingVerdict === 'verdict' ? '✓ Verdict' : '⚑ Signal'}
                      </span>
                    )}
                    {(f as any).detectionBasis && (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: 'rgba(155,89,182,0.1)', color: '#9B59B6', border: '1px solid rgba(155,89,182,0.25)', fontWeight: 600 }}>
                        {(f as any).detectionBasis}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{f.description}</div>

                  {/* ── DEVELOPER VIEW ── */}
                  {audienceView === 'developer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* Priority badge */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, fontFamily: 'Geist Mono, monospace',
                          background: f.severity === 'critical' ? 'rgba(232,0,45,0.15)' : f.severity === 'high' ? 'rgba(254,113,65,0.15)' : 'rgba(217,119,6,0.15)',
                          color: f.severity === 'critical' ? '#E8002D' : f.severity === 'high' ? '#FE7141' : '#D97706',
                          border: `1px solid ${f.severity === 'critical' ? 'rgba(232,0,45,0.3)' : f.severity === 'high' ? 'rgba(254,113,65,0.3)' : 'rgba(217,119,6,0.3)'}`,
                        }}>
                          {f.severity === 'critical' ? 'P0 — Fix immediately' : f.severity === 'high' ? 'P1 — Fix this sprint' : f.severity === 'medium' ? 'P2 — Fix this quarter' : 'P3 — Backlog'}
                        </span>
                        {f.regulation.map(r => <span key={r} className="dp-regulation-badge">{r}</span>)}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>🎯 {f.confidence} confidence</span>
                      </div>
                      {/* Evidence */}
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '5px 9px', background: 'rgba(0,0,0,0.18)', borderRadius: 6 }}>
                        <strong>Evidence:</strong> {f.evidence.summary}
                      </div>
                      {/* Code fix */}
                      {(f as any).developerFix ? (
                        <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(0,145,218,0.06)', border: '1px solid rgba(0,145,218,0.2)' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#0091DA', marginBottom: 3, fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase' }}>👨‍💻 Code Fix</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{(f as any).developerFix}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#00BA8C' }}>💡 {f.recommendation}</div>
                      )}
                    </div>
                  )}

                  {/* ── DESIGNER VIEW ── */}
                  {audienceView === 'designer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {(f as any).brignullPattern && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(205,171,254,0.12)', color: 'var(--pillar-dp)', border: '1px solid rgba(205,171,254,0.3)', fontFamily: 'Geist Mono, monospace' }}>
                            🎭 Brignull: {(f as any).brignullPattern}
                          </span>
                        )}
                        <span className="dp-principle-badge">📐 {principleLabels[f.principle] || f.principle}</span>
                      </div>
                      {/* Visual evidence */}
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '5px 9px', background: 'rgba(0,0,0,0.18)', borderRadius: 6 }}>
                        <strong>Visual evidence:</strong> {f.evidence.summary}
                        {f.evidence.details.length > 0 && <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{f.evidence.details[0]}</div>}
                      </div>
                      {/* Designer fix */}
                      {(f as any).designerFix ? (
                        <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(205,171,254,0.06)', border: '1px solid rgba(205,171,254,0.2)' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--pillar-dp)', marginBottom: 3, fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase' }}>🎨 Design Fix</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{(f as any).designerFix}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#00BA8C' }}>💡 {f.recommendation}</div>
                      )}
                    </div>
                  )}

                  {/* ── LEGAL VIEW ── */}
                  {audienceView === 'legal' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* Risk tier */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, fontFamily: 'Geist Mono, monospace',
                          background: f.severity === 'critical' ? 'rgba(232,0,45,0.12)' : f.severity === 'high' ? 'rgba(254,113,65,0.12)' : 'rgba(217,119,6,0.12)',
                          color: f.severity === 'critical' ? '#E8002D' : f.severity === 'high' ? '#FE7141' : '#D97706',
                          border: `1px solid ${f.severity === 'critical' ? 'rgba(232,0,45,0.3)' : f.severity === 'high' ? 'rgba(254,113,65,0.3)' : 'rgba(217,119,6,0.3)'}`,
                        }}>
                          ⚖️ {f.severity === 'critical' ? 'Critical Risk — Regulatory Enforcement Likely' : f.severity === 'high' ? 'High Risk — Investigation Risk' : 'Medium Risk — Compliance Gap'}
                        </span>
                      </div>
                      {/* Regulation articles */}
                      <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(254,113,65,0.05)', border: '1px solid rgba(254,113,65,0.2)' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#FE7141', marginBottom: 4, fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase' }}>Regulation Articles Violated</div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {f.regulation.map(r => <span key={r} className="dp-regulation-badge">{r}</span>)}
                          {(f as any).dsaArticle && <span className="dp-regulation-badge">{(f as any).dsaArticle}</span>}
                        </div>
                      </div>
                      {/* Enforcement context */}
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '5px 9px', background: 'rgba(0,0,0,0.18)', borderRadius: 6, lineHeight: 1.5 }}>
                        <strong>Finding summary:</strong> {f.description}
                      </div>
                      {/* Remediation framing */}
                      <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(0,186,140,0.05)', border: '1px solid rgba(0,186,140,0.2)' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#00BA8C', marginBottom: 3, fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase' }}>Recommended Remediation</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.recommendation}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                          {f.severity === 'critical' ? '⏱ Remediate within 30 days — critical regulatory risk' : f.severity === 'high' ? '⏱ Remediate within 90 days — high enforcement risk' : '⏱ Remediate within 6 months — compliance gap'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {dp.totalFindings === 0 && (
                <div className="glass-card" style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>No Dark Patterns Detected</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>This interface appears to respect user autonomy and ethical design principles.</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
           PERFORMANCE TAB
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'perf' && data.pillarResults?.performance && (() => {
        const perf = data.pillarResults.performance!;
        const vitalColor = (val: number | null, good: number, poor: number) => val === null ? 'var(--text-muted)' : val <= good ? '#00BA8C' : val <= poor ? '#F0AB00' : '#FF3356';
        return (
          <div className="animate-fade-in">
            <div className="glass-card" style={{ marginBottom: 20, textAlign: 'center', borderTop: '3px solid #00BA8C' }}>
              <div style={{ fontSize: 40, fontWeight: 300, color: perf.overallScore >= 80 ? '#00BA8C' : perf.overallScore >= 50 ? '#F0AB00' : '#FF3356' }}>{perf.overallScore}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Performance Score</div>
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚡ Core Web Vitals (Average)</h3>
            <div className="cwv-grid" style={{ marginBottom: 20 }}>
              {[
                { key: 'lcp', label: 'LCP', unit: 'ms', good: 2500, poor: 4000 },
                { key: 'cls', label: 'CLS', unit: '', good: 0.1, poor: 0.25 },
                { key: 'fcp', label: 'FCP', unit: 'ms', good: 1800, poor: 3000 },
                { key: 'ttfb', label: 'TTFB', unit: 'ms', good: 800, poor: 1800 },
                { key: 'tbt', label: 'TBT', unit: 'ms', good: 200, poor: 600 },
              ].map(m => {
                const val = perf.averageVitals[m.key];
                return (
                  <div key={m.key} className="cwv-card">
                    <div className="cwv-value" style={{ color: vitalColor(val, m.good, m.poor) }}>
                      {val !== null && val !== undefined ? (m.key === 'cls' ? val.toFixed(3) : Math.round(val)) : '—'}
                    </div>
                    <div className="cwv-label">{m.label}</div>
                    <div className="cwv-threshold">Good: ≤{m.key === 'cls' ? m.good : m.good + 'ms'}</div>
                  </div>
                );
              })}
            </div>
            {perf.recommendations.length > 0 && (
              <div className="glass-card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>💡 Recommendations</h3>
                {perf.recommendations.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0', borderBottom: i < perf.recommendations.length - 1 ? '1px solid var(--border)' : 'none' }}>• {r}</div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
           PRIVACY TAB
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'privacy' && data.pillarResults?.privacy && (() => {
        const priv = data.pillarResults.privacy!;
        return (
          <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <div className="stat-card" style={{ textAlign: 'center', borderTop: '3px solid #E67E22' }}>
                <div className="stat-value" style={{ color: priv.overallScore >= 80 ? '#00BA8C' : '#FF3356' }}>{priv.overallScore}</div>
                <div className="stat-label">Privacy Score</div>
              </div>
              <div className="stat-card" style={{ textAlign: 'center', borderTop: '3px solid #FF3356' }}>
                <div className="stat-value" style={{ color: priv.totalTrackers > 5 ? '#FF3356' : priv.totalTrackers > 0 ? '#F0AB00' : '#00BA8C' }}>{priv.totalTrackers}</div>
                <div className="stat-label">Trackers</div>
              </div>
              <div className="stat-card" style={{ textAlign: 'center', borderTop: `3px solid ${priv.hasConsentBanner ? '#00BA8C' : '#FF3356'}` }}>
                <div className="stat-value" style={{ color: priv.hasConsentBanner ? '#00BA8C' : '#FF3356' }}>{priv.hasConsentBanner ? '✓' : '✗'}</div>
                <div className="stat-label">Consent Banner</div>
              </div>
              <div className="stat-card" style={{ textAlign: 'center', borderTop: `3px solid ${priv.hasPrivacyPolicy ? '#00BA8C' : '#FF3356'}` }}>
                <div className="stat-value" style={{ color: priv.hasPrivacyPolicy ? '#00BA8C' : '#FF3356' }}>{priv.hasPrivacyPolicy ? '✓' : '✗'}</div>
                <div className="stat-label">Privacy Policy</div>
              </div>
            </div>
            {priv.trackers.length > 0 && (
              <div className="glass-card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔍 Detected Trackers</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {priv.trackers.map((t: TrackerInfo) => (
                    <div key={t.domain} className="tracker-card">
                      <div>
                        <div className="tracker-company">{t.company}</div>
                        <div className="tracker-domain">{t.domain} · {t.requestCount} requests</div>
                      </div>
                      <span className={`tracker-category-badge tracker-cat-${t.category}`}>{t.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔒 Privacy Findings ({priv.findings.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {priv.findings.map((f: PrivFinding) => (
                <div key={f.id} className="glass-card" style={{ borderLeft: `3px solid ${sevColors[f.severity] || '#E67E22'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{f.title}</span>
                    <span className={`badge badge-${f.severity}`}>{f.severity}</span>
                    {f.regulation.map(r => <span key={r} className="dp-regulation-badge">{r}</span>)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{f.description}</div>
                  <div style={{ fontSize: 11, color: '#00BA8C' }}>💡 {f.recommendation}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
           ISSUE MODAL
         ══════════════════════════════════════════════════════ */}
      {selectedIssue && (
        <div className="modal-overlay" onClick={() => setSelectedIssue(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 5 }}>{selectedIssue.title}</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={`badge badge-${selectedIssue.severity}`}>{selectedIssue.severity}</span>
                  <span className={`badge badge-level-${selectedIssue.wcagLevel.toLowerCase()}`}>{selectedIssue.wcagLevel}</span>
                </div>
              </div>
              <button onClick={() => setSelectedIssue(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><strong style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</strong><p style={{ fontSize: 13, lineHeight: 1.65, marginTop: 5 }}>{selectedIssue.description}</p></div>
              <div><strong style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>WCAG Criterion</strong><p style={{ fontSize: 13, marginTop: 5 }}>{selectedIssue.wcagCriterion} — {selectedIssue.wcagName} (Level {selectedIssue.wcagLevel})</p></div>
              <div><strong style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Impact</strong><p style={{ fontSize: 13, marginTop: 5, color: 'var(--text-secondary)' }}>{selectedIssue.impact}</p></div>
              {selectedIssue.elementHtml && <div><strong style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Element</strong><pre className="code-block" style={{ marginTop: 5 }}>{selectedIssue.elementHtml}</pre></div>}
              <div><strong style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommendation</strong><p style={{ fontSize: 13, marginTop: 5, color: '#00BA8C' }}>{selectedIssue.recommendation}</p></div>
              {selectedIssue.codeFix && <div><strong style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Code Fix</strong><pre className="code-block" style={{ marginTop: 5 }}>{selectedIssue.codeFix}</pre></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
