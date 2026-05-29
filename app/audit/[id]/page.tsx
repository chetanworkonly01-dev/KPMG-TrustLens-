'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

// ===== TYPE INTERFACES =====
interface AuditData {
  id: string; status: string; progress: number; progressMessage: string;
  config: { url?: string; type: string; wcagLevels?: string[]; standard?: string; enabledPillars?: string[]; scopeMode?: string; selectedJourney?: string; journeySteps?: { id: string; label: string; url: string; action?: string }[] };
  pages: { url: string; title: string }[];
  issues: Issue[]; score: Score; report?: Report; crawlCoverage?: CrawlCoverage;
  testResults: TestResultItem[]; testLog: TestLogEntry[];
  inapplicableCriteria?: string[];
  error?: string;
  // TrustLens
  trustScore?: { overall: number; trustLevel: string; pillarScores: Record<string, { pillar: string; score: number; weight: number; totalFindings: number; status: string }> };
  pillarResults?: {
    darkpatterns?: { findings: DPFinding[]; ethicsScore: number; principleScores: Record<string, number>; categoryBreakdown: Record<string, number>; consentIntegrity: number; choiceSymmetry: number; manipulationIndex: number; totalFindings: number; findingsBySeverity: Record<string, number>; regulatoryRisks: string[]; coverageCapApplied?: boolean; funnelVerified?: boolean };
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
  complianceExemption?: {
    category: string; regulation: string; rationale: string;
    validationNote: string; exemptionLabel: string; scoreReductionFactor: number;
  };
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
    const dlPillars = data.config?.enabledPillars || ['accessibility'];
    const dlLabel = dlPillars.length === 4 ? 'trustlens-4pillar-report'
      : dlPillars.length === 1 ? ({ accessibility: 'accessibility-report', darkpatterns: 'dark-pattern-report', performance: 'performance-report', privacy: 'privacy-report' } as Record<string,string>)[dlPillars[0]] || 'trustlens-report'
      : 'trustlens-report';
    a.download = `kpmg-${dlLabel}-${id}.json`; a.click();
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
           PAGES TAB — pillar-aware per-page breakdown
         ══════════════════════════════════════════════════════ */}
      {activeTab === 'pages' && (() => {
        const scopeMode = data.config?.scopeMode || 'general';
        const journeySteps = data.config?.journeySteps || [];
        const baseUrl = data.config?.url || '';
        const selectedJourney = data.config?.selectedJourney;

        // Build url→title map from all available sources
        const urlMap = new Map<string, string>();
        data.pages?.forEach(p => urlMap.set(p.url, p.title || p.url));
        data.report?.pageBreakdown?.forEach(p => { if (p.title) urlMap.set(p.url, p.title); });
        data.pillarResults?.performance?.pages?.forEach(p => { if (p.title) urlMap.set(p.url, p.title); });

        // Set of actually crawled/audited URLs
        const crawledUrls = new Set<string>(data.pages?.map(p => p.url) || []);

        // Helper: find the closest crawled URL to a template path by matching path segments
        const findClosestCrawledUrl = (targetUrl: string): string | null => {
          try {
            const targetPath = new URL(targetUrl).pathname.toLowerCase().replace(/\/$/, '');
            const targetSegs = targetPath.split('/').filter(Boolean);
            if (targetSegs.length === 0) return null;
            let bestMatch: string | null = null;
            let bestScore = 0;
            crawledUrls.forEach(crawledUrl => {
              try {
                const crawledPath = new URL(crawledUrl).pathname.toLowerCase().replace(/\/$/, '');
                const crawledSegs = crawledPath.split('/').filter(Boolean);
                let score = 0;
                const minLen = Math.min(targetSegs.length, crawledSegs.length);
                for (let i = 0; i < minLen; i++) {
                  if (targetSegs[i] === crawledSegs[i]) score++;
                  else break;
                }
                if (score > bestScore) { bestScore = score; bestMatch = crawledUrl; }
              } catch { /* skip */ }
            });
            return bestScore > 0 ? bestMatch : null;
          } catch { return null; }
        };

        // Helper: gather per-page findings across all enabled pillars
        const getPageFindings = (url: string) => ({
          a11y:        a11yEnabled ? data.report?.pageBreakdown?.find(p => p.url === url) : undefined,
          dpFindings:  dpEnabled   ? (data.pillarResults?.darkpatterns?.findings || []).filter(f => f.pageUrl === url) : [],
          perfPage:    perfEnabled ? data.pillarResults?.performance?.pages?.find(p => p.url === url) : undefined,
          privFindings: privEnabled ? (data.pillarResults?.privacy?.findings || []).filter(f => f.pageUrl === url) : [],
        });

        // Helper: compute unified score for a page (only when audited)
        const computeScore = (findings: ReturnType<typeof getPageFindings>) => {
          const { a11y, dpFindings, perfPage, privFindings } = findings;
          const scores: number[] = [];
          if (a11yEnabled && a11y) scores.push(a11y.score);
          const dpCrit = dpFindings.filter(f => f.severity === 'critical').length;
          const dpHigh = dpFindings.filter(f => f.severity === 'high').length;
          const dpMed  = dpFindings.filter(f => f.severity === 'medium').length;
          const dpLow  = dpFindings.filter(f => f.severity === 'low').length;
          if (dpEnabled) scores.push(dpFindings.length === 0 ? 100 : Math.max(0, 100 - dpCrit * 25 - dpHigh * 15 - dpMed * 8 - dpLow * 3));
          if (perfEnabled && perfPage) scores.push(perfPage.score);
          if (privEnabled) scores.push(privFindings.length === 0 ? 100 : Math.max(40, 100 - privFindings.length * 10));
          return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
        };

        // Render per-pillar findings rows
        const renderPillarFindings = (findings: ReturnType<typeof getPageFindings>, wasAudited: boolean) => {
          const { a11y, dpFindings, perfPage, privFindings } = findings;
          const dpCrit = dpFindings.filter(f => f.severity === 'critical').length;
          const dpHigh = dpFindings.filter(f => f.severity === 'high').length;
          const dpMed  = dpFindings.filter(f => f.severity === 'medium').length;
          const dpLow  = dpFindings.filter(f => f.severity === 'low').length;

          if (!wasAudited) return (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
              ⚠ This page was not accessible during the audit — URL may differ on the actual site
            </div>
          );

          const hasAnyFindings = (a11y && a11y.issueCount > 0) || dpFindings.length > 0 || (perfPage && perfPage.resourceIssues.length > 0) || privFindings.length > 0;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {a11yEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#0091DA', textTransform: 'uppercase', minWidth: 100 }}>♿ Accessibility</span>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {a11y ? (
                      <>
                        {a11y.criticalCount > 0 && <span className="badge badge-critical">{a11y.criticalCount} Critical</span>}
                        {a11y.highCount > 0 && <span className="badge badge-high">{a11y.highCount} High</span>}
                        {a11y.mediumCount > 0 && <span className="badge badge-medium">{a11y.mediumCount} Medium</span>}
                        {a11y.lowCount > 0 && <span className="badge badge-low">{a11y.lowCount} Low</span>}
                        {a11y.issueCount === 0 && <span className="badge badge-pass">No Issues</span>}
                      </>
                    ) : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Not scanned</span>}
                  </div>
                </div>
              )}
              {dpEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#9B59B6', textTransform: 'uppercase', minWidth: 100 }}>🕵️ Dark Patterns</span>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {dpCrit > 0 && <span className="badge badge-critical">{dpCrit} Critical</span>}
                    {dpHigh > 0 && <span className="badge badge-high">{dpHigh} High</span>}
                    {dpMed  > 0 && <span className="badge badge-medium">{dpMed} Medium</span>}
                    {dpLow  > 0 && <span className="badge badge-low">{dpLow} Low</span>}
                    {dpFindings.length === 0 && <span className="badge badge-pass">No Issues</span>}
                    {dpFindings.length > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {[...new Set(dpFindings.map(f => f.category))].slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {perfEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#00BA8C', textTransform: 'uppercase', minWidth: 100 }}>⚡ Performance</span>
                  {perfPage ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: perfPage.score >= 75 ? '#00BA8C' : perfPage.score >= 50 ? '#F0AB00' : '#FF3356' }}>
                        Score: {perfPage.score}
                      </span>
                      {(['lcp', 'fid', 'cls'] as const).map(v => {
                        const val = perfPage?.vitals?.[v] ?? null;
                        if (val === null) return null;
                        return <span key={v} style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{v.toUpperCase()}: {typeof val === 'number' ? val.toFixed(2) : val}</span>;
                      })}
                      {perfPage.resourceIssues.length > 0 && <span className="badge badge-medium">{perfPage.resourceIssues.length} resource issues</span>}
                    </div>
                  ) : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Not measured</span>}
                </div>
              )}
              {privEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#E67E22', textTransform: 'uppercase', minWidth: 100 }}>🔒 Privacy</span>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {privFindings.length === 0
                      ? <span className="badge badge-pass">No Issues</span>
                      : <>
                          {privFindings.filter(f => f.severity === 'critical').length > 0 && <span className="badge badge-critical">{privFindings.filter(f => f.severity === 'critical').length} Critical</span>}
                          {privFindings.filter(f => f.severity === 'high').length > 0 && <span className="badge badge-high">{privFindings.filter(f => f.severity === 'high').length} High</span>}
                          {privFindings.filter(f => f.severity === 'medium').length > 0 && <span className="badge badge-medium">{privFindings.filter(f => f.severity === 'medium').length} Med</span>}
                        </>
                    }
                  </div>
                </div>
              )}
              {!hasAnyFindings && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No issues detected on this page — verify manually for edge cases
                </div>
              )}
            </div>
          );
        };

        // ── PREDEFINED / DIRECTOR MODE: Journey-step-first display ──
        if ((scopeMode === 'predefined' || scopeMode === 'director') && journeySteps.length > 0) {
          const journeyLabels: Record<string, { icon: string; label: string; primaryPillar: string }> = {
            login: { icon: '🔐', label: 'Login Flow', primaryPillar: 'Dark Patterns' },
            account: { icon: '👤', label: 'Account Creation', primaryPillar: 'Dark Patterns' },
            checkout: { icon: '🛒', label: 'Checkout Flow', primaryPillar: 'Dark Patterns' },
            cancel: { icon: '❌', label: 'Cancellation Flow', primaryPillar: 'Dark Patterns' },
            consent: { icon: '🍪', label: 'Consent & Cookie Flow', primaryPillar: 'Privacy' },
            subscription: { icon: '📈', label: 'Subscription Upgrade', primaryPillar: 'Dark Patterns' },
            search: { icon: '🔍', label: 'Search & Discovery', primaryPillar: 'Dark Patterns' },
            profile: { icon: '⚙️', label: 'Profile & Data Settings', primaryPillar: 'Privacy' },
          };
          const journeyMeta = selectedJourney ? journeyLabels[selectedJourney] : null;

          return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Journey context header */}
              <div className="glass-card" style={{ padding: '14px 18px', borderLeft: '4px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{journeyMeta?.icon || '🗺️'}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {scopeMode === 'predefined' ? (journeyMeta?.label || 'Predefined Journey') : 'Director Mode'} — {journeySteps.length} Steps Audited
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Each step shows findings from the audited URL. Steps marked ⚡ use the nearest matching page when an exact URL was not found.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(254,113,65,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(254,113,65,0.3)', fontWeight: 700 }}>
                    {journeySteps.filter(s => { try { const r = new URL(s.url, baseUrl).href; return crawledUrls.has(r) || !!findClosestCrawledUrl(r); } catch { return crawledUrls.has(s.url); } }).length}/{journeySteps.length} steps resolved
                  </span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(0,178,169,0.1)', color: '#00B2A9', border: '1px solid rgba(0,178,169,0.3)', fontWeight: 700 }}>
                    {enabledPillars.length} pillar{enabledPillars.length !== 1 ? 's' : ''} active
                  </span>
                </div>
              </div>

              {journeySteps.map((step, stepIdx) => {
                let resolvedUrl = step.url;
                try { resolvedUrl = new URL(step.url, baseUrl).href; } catch { /* keep as-is */ }

                const wasAudited = crawledUrls.has(resolvedUrl);
                // Fuzzy fallback: find nearest crawled URL by path-segment prefix match
                const closestUrl = !wasAudited ? findClosestCrawledUrl(resolvedUrl) : null;
                const isApproximate = !wasAudited && !!closestUrl;
                const effectiveUrl = wasAudited ? resolvedUrl : (closestUrl || resolvedUrl);
                const findings = (wasAudited || isApproximate) ? getPageFindings(effectiveUrl) : getPageFindings(resolvedUrl);
                const score = (wasAudited || isApproximate) ? computeScore(findings) : null;
                const scoreColor = score === null ? '#5B7198' : score >= 75 ? '#00BA8C' : score >= 50 ? '#F0AB00' : '#FF3356';
                const totalIssues = (findings.a11y?.issueCount || 0) + findings.dpFindings.length + (findings.perfPage?.resourceIssues.length || 0) + findings.privFindings.length;

                return (
                  <div key={step.id || stepIdx} className="glass-card" style={{ borderLeft: `3px solid ${(wasAudited || isApproximate) ? (totalIssues > 0 ? scoreColor : '#00B2A9') : '#5B7198'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'Geist Mono, monospace' }}>
                            Step {stepIdx + 1}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{step.label}</span>
                          {wasAudited
                            ? <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(0,178,169,0.1)', color: '#00B2A9', border: '1px solid rgba(0,178,169,0.3)', fontWeight: 700 }}>✓ Audited</span>
                            : isApproximate
                              ? <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(240,171,0,0.1)', color: '#F0AB00', border: '1px solid rgba(240,171,0,0.3)', fontWeight: 700 }}>⚡ Nearest Match</span>
                              : <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: 'rgba(232,0,45,0.08)', color: '#E8002D', border: '1px solid rgba(232,0,45,0.2)', fontWeight: 700 }}>⚠ Not Accessible</span>
                          }
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: (step.action || isApproximate) ? 4 : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {resolvedUrl}
                        </div>
                        {isApproximate && (
                          <div style={{ fontSize: 10, color: '#F0AB00', marginBottom: step.action ? 4 : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Geist Mono, monospace' }}>
                            ↳ Showing nearest: {closestUrl}
                          </div>
                        )}
                        {step.action && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 6, lineHeight: 1.4 }}>
                            Checks: {step.action}
                          </div>
                        )}
                      </div>
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%', flexShrink: 0, marginLeft: 16,
                        border: `3px solid ${scoreColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: 0,
                      }}>
                        {score !== null
                          ? <span style={{ fontWeight: 300, fontSize: 16, color: scoreColor, lineHeight: 1 }}>{score}</span>
                          : <span style={{ fontSize: 10, color: '#5B7198', textAlign: 'center', lineHeight: 1.2 }}>N/A</span>
                        }
                      </div>
                    </div>
                    {renderPillarFindings(findings, wasAudited || isApproximate)}
                  </div>
                );
              })}
            </div>
          );
        }

        // ── GENERAL / SPECIFIC MODE: Standard per-page display ──
        const urlSet = new Set<string>();
        if (a11yEnabled) data.report?.pageBreakdown?.forEach(p => urlSet.add(p.url));
        if (dpEnabled) data.pillarResults?.darkpatterns?.findings?.forEach(f => urlSet.add(f.pageUrl));
        if (perfEnabled) data.pillarResults?.performance?.pages?.forEach(p => urlSet.add(p.url));
        if (privEnabled) data.pillarResults?.privacy?.findings?.forEach(f => urlSet.add(f.pageUrl));
        if (urlSet.size === 0) data.pages?.forEach(p => urlSet.add(p.url));

        const unifiedPages = Array.from(urlSet).map(url => ({
          url,
          title: urlMap.get(url) || url,
          wasAudited: crawledUrls.has(url),
          findings: getPageFindings(url),
        }));

        if (unifiedPages.length === 0) return (
          <div className="glass-card animate-fade-in" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No page data available.
          </div>
        );

        return (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'Geist Mono, monospace' }}>
              {unifiedPages.length} page{unifiedPages.length !== 1 ? 's' : ''} audited · {enabledPillars.length} pillar{enabledPillars.length !== 1 ? 's' : ''} active
            </div>
            {unifiedPages.map(page => {
              const score = computeScore(page.findings);
              const scoreColor = score === null ? '#5B7198' : score >= 75 ? '#00BA8C' : score >= 50 ? '#F0AB00' : '#FF3356';
              const totalIssues = (page.findings.a11y?.issueCount || 0) + page.findings.dpFindings.length + (page.findings.perfPage?.resourceIssues.length || 0) + page.findings.privFindings.length;
              return (
                <div key={page.url} className="glass-card" style={{ borderLeft: `3px solid ${score !== null ? (totalIssues > 0 ? scoreColor : '#00B2A9') : '#5B7198'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.url}</div>
                    </div>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', flexShrink: 0, marginLeft: 16,
                      border: `3px solid ${scoreColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 300, fontSize: 16, color: scoreColor,
                    }}>
                      {score !== null ? score : '—'}
                    </div>
                  </div>
                  {renderPillarFindings(page.findings, page.wasAudited)}
                </div>
              );
            })}
          </div>
        );
      })()}

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

            {/* ── Coverage Confidence Warning — surfaces when static scan found 0 issues but funnel unverified ── */}
            {dp.coverageCapApplied && (
              <div style={{ background: 'rgba(240,171,0,0.12)', border: '1px solid rgba(240,171,0,0.5)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#F0AB00', marginBottom: 4 }}>Unverified Funnel — Score Capped at 82</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Static page scan found <strong>0 dark patterns</strong>, but no interaction flows were simulated. For transactional sites (insurance, fintech, e-commerce), the most harmful dark patterns — preselected add-ons, drip pricing, phone gates, confirmshaming — only appear during user journeys. The Ethics Score has been capped pending manual funnel verification or interaction simulation. <strong>Do not issue a clean bill of health until quote/checkout flows are tested.</strong>
                  </div>
                </div>
              </div>
            )}

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

            {/* ── Detection Intelligence Dashboard ── */}
            {(dp as any).findingsBySource || (dp as any).findingsByPhase ? (
              <div className="glass-card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>🔬 Detection Intelligence</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'rgba(205,171,254,0.15)', color: 'var(--accent-purple)', border: '1px solid rgba(205,171,254,0.3)', fontWeight: 700, fontFamily: 'Geist Mono, monospace' }}>MULTI-ENGINE</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Detection Source Breakdown */}
                  {(dp as any).findingsBySource && Object.keys((dp as any).findingsBySource).length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase' }}>By Detection Source</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {Object.entries((dp as any).findingsBySource as Record<string, number>).map(([src, count]) => {
                          const srcMeta: Record<string, { icon: string; color: string; label: string }> = {
                            'rule':       { icon: '📋', color: '#0091DA', label: 'DOM + NLP Rules' },
                            'ai-vision':  { icon: '👁️', color: '#9B59B6', label: 'GPT-4o Vision (Phase 8)' },
                            'temporal':   { icon: '⏱️', color: '#E67E22', label: 'Temporal Scanner (Gap 3)' },
                            'cta-scorer': { icon: '⚖️', color: '#E74C3C', label: 'CTA Prominence Scorer (Gap 4)' },
                            'ai':         { icon: '🤖', color: '#27AE60', label: 'AI Classification' },
                            'journey':    { icon: '🗺️', color: '#F39C12', label: 'Journey Tester' },
                          };
                          const meta = srcMeta[src] || { icon: '📌', color: 'var(--text-secondary)', label: src };
                          return (
                            <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ fontSize: 11 }}>{meta.icon}</span>
                              <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, (count / dp.totalFindings) * 100)}%`, background: meta.color, borderRadius: 99, transition: 'width 0.5s ease' }} />
                              </div>
                              <span style={{ fontSize: 10, color: meta.color, fontWeight: 700, minWidth: 18, textAlign: 'right' }}>{count}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 140 }}>{meta.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Phase Breakdown */}
                  {(dp as any).findingsByPhase && Object.keys((dp as any).findingsByPhase).length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase' }}>By Detection Phase</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {Object.entries((dp as any).findingsByPhase as Record<string, number>).sort(([,a],[,b]) => b - a).map(([phase, count]) => (
                          <div key={phase} style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px',
                            borderRadius: 99, fontSize: 10, fontWeight: 700, fontFamily: 'Geist Mono, monospace',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                          }}>
                            <span style={{ color: 'var(--accent-purple)' }}>{count}</span>
                            <span>{phase}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Brignull Taxonomy Distribution */}
                {dp.findings.some((f: any) => f.brignullPattern) && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase' }}>Brignull Taxonomy Distribution</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {(() => {
                        const brignullCounts: Record<string, { count: number; number: number }> = {};
                        for (const f of dp.findings) {
                          const bp = (f as any).brignullPattern;
                          const bn = (f as any).brignullNumber;
                          if (bp) brignullCounts[bp] = { count: (brignullCounts[bp]?.count || 0) + 1, number: bn || 0 };
                        }
                        return Object.entries(brignullCounts).sort(([,a],[,b]) => b.count - a.count).map(([pattern, { count, number }]) => (
                          <div key={pattern} style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px',
                            borderRadius: 99, fontSize: 10, fontWeight: 700,
                            background: 'rgba(205,171,254,0.1)', border: '1px solid rgba(205,171,254,0.3)',
                            color: 'var(--pillar-dp)',
                          }}>
                            {number > 0 && <span style={{ opacity: 0.6 }}>#{number}</span>}
                            <span>{pattern}</span>
                            <span style={{ background: 'rgba(205,171,254,0.2)', borderRadius: 99, padding: '0 5px', minWidth: 16, textAlign: 'center' }}>{count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* ── Compliance Context Panel (IRDAI / RBI / SEBI) ── */}
            {(dp as any).complianceExemptions > 0 && (
              <div className="glass-card" style={{ marginBottom: 20, borderLeft: '3px solid #F0AB00', background: 'rgba(240,171,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>📋</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#F0AB00' }}>Regulatory Compliance Context</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'rgba(240,171,0,0.12)', color: '#F0AB00', border: '1px solid rgba(240,171,0,0.3)', fontWeight: 700, fontFamily: 'Geist Mono, monospace' }}>IRDAI / RBI / SEBI</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#F0AB00', background: 'rgba(240,171,0,0.12)', border: '1px solid rgba(240,171,0,0.3)', borderRadius: 99, padding: '2px 9px' }}>{(dp as any).complianceExemptions} flagged</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.6 }}>
                  The following findings have been flagged as <strong>potentially compliance-driven</strong> under Indian financial services regulations (IRDAI, RBI, SEBI). These patterns may appear as dark patterns under general UX heuristics but could be mandated by applicable regulatory frameworks. <strong>Backend validation is required before any enforcement action.</strong>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries((dp as any).complianceExemptionsByCategory as Record<string, number> || {}).map(([cat, count]) => {
                    const catIconMap: Record<string, string> = {
                      'urgency-legitimate-offer': '📅',
                      'mandatory-regulatory-disclosure': '📋',
                      'kyc-authentication-gate': '🔐',
                      'regulated-default-selection': '🏦',
                      'underwriting-data-capture': '📝',
                    };
                    const catLabelMap: Record<string, string> = {
                      'urgency-legitimate-offer': 'Legitimate Time-Limited Offer',
                      'mandatory-regulatory-disclosure': 'Mandatory Regulatory Disclosure',
                      'kyc-authentication-gate': 'KYC / Auth Gate',
                      'regulated-default-selection': 'Regulated Product Default',
                      'underwriting-data-capture': 'Underwriting / Personalization Gate',
                    };
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: 'rgba(240,171,0,0.08)', border: '1px solid rgba(240,171,0,0.25)', color: '#D97706' }}>
                        <span>{catIconMap[cat] || '📋'}</span>
                        <span>{catLabelMap[cat] || cat}</span>
                        <span style={{ background: 'rgba(240,171,0,0.2)', borderRadius: 99, padding: '0 5px', minWidth: 16, textAlign: 'center', color: '#F0AB00' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: 'rgba(240,171,0,0.06)', border: '1px solid rgba(240,171,0,0.15)', fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span>⚠</span>
                  <span>Compliance-flagged findings are shown with a <strong style={{ color: '#F0AB00' }}>yellow banner</strong> below. Score impact is proportionally reduced. Final classification requires cross-referencing applicable regulation text and backend campaign/product logic.</span>
                </div>
              </div>
            )}

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
              {dp.findings.map((f: DPFinding) => {
                const sourceMeta: Record<string, { icon: string; color: string; label: string }> = {
                  'rule':       { icon: '📋', color: '#0091DA', label: 'DOM/NLP' },
                  'ai-vision':  { icon: '👁️', color: '#9B59B6', label: 'Visual AI' },
                  'temporal':   { icon: '⏱️', color: '#E67E22', label: 'Temporal' },
                  'cta-scorer': { icon: '⚖️', color: '#E74C3C', label: 'CTA Scorer' },
                  'ai':         { icon: '🤖', color: '#27AE60', label: 'AI' },
                  'journey':    { icon: '🗺️', color: '#F39C12', label: 'Journey' },
                };
                const srcMeta = sourceMeta[(f as any).source] || sourceMeta['rule'];
                return (
                <div key={f.id} className="dp-finding-card">
                  {/* Header: always shown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{f.title}</span>
                    <span className={`badge badge-${f.severity}`}>{f.severity}</span>
                    <span className="dp-category-badge">{catIcons[f.category] || '📋'} {f.category}</span>
                    {/* Source badge */}
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: `${srcMeta.color}18`, color: srcMeta.color, border: `1px solid ${srcMeta.color}35`, fontWeight: 700, fontFamily: 'Geist Mono, monospace' }}>
                      {srcMeta.icon} {srcMeta.label}
                    </span>
                    {/* Brignull badge */}
                    {(f as any).brignullPattern && (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: 'rgba(205,171,254,0.1)', color: 'var(--pillar-dp)', border: '1px solid rgba(205,171,254,0.25)', fontWeight: 600 }}>
                        {(f as any).brignullNumber ? `#${(f as any).brignullNumber} ` : ''}{(f as any).brignullPattern}
                      </span>
                    )}
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
                    {/* Compliance Exemption badge */}
                    {f.complianceExemption && (
                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, fontWeight: 700, background: 'rgba(240,171,0,0.12)', color: '#D97706', border: '1px solid rgba(240,171,0,0.3)' }}>
                        📋 {f.complianceExemption.exemptionLabel}
                      </span>
                    )}
                    {/* Fix priority */}
                    {(f as any).fixPriority && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, fontFamily: 'Geist Mono, monospace', marginLeft: 'auto',
                        background: (f as any).fixPriority === 'P0' ? 'rgba(232,0,45,0.12)' : (f as any).fixPriority === 'P1' ? 'rgba(254,113,65,0.12)' : 'rgba(217,119,6,0.1)',
                        color: (f as any).fixPriority === 'P0' ? '#E8002D' : (f as any).fixPriority === 'P1' ? '#FE7141' : '#D97706',
                        border: `1px solid ${(f as any).fixPriority === 'P0' ? 'rgba(232,0,45,0.3)' : (f as any).fixPriority === 'P1' ? 'rgba(254,113,65,0.3)' : 'rgba(217,119,6,0.25)'}`,
                      }}>
                        {(f as any).fixPriority}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{f.description}</div>
                  {/* Compliance Exemption detail strip */}
                  {f.complianceExemption && (
                    <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 6, background: 'rgba(240,171,0,0.05)', border: '1px solid rgba(240,171,0,0.2)', fontSize: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ fontWeight: 700, color: '#D97706' }}>📋 Compliance Context</span>
                        <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: 'rgba(240,171,0,0.12)', color: '#F0AB00', border: '1px solid rgba(240,171,0,0.25)', fontWeight: 700 }}>
                          {Math.round((1 - f.complianceExemption.scoreReductionFactor) * 100)}% score reduction applied
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', margin: '0 0 5px 0', lineHeight: 1.5 }}>{f.complianceExemption.rationale}</p>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                        <span style={{ color: '#F0AB00', fontWeight: 700, whiteSpace: 'nowrap' }}>Regulation:</span>
                        <span style={{ color: 'var(--text-muted)' }}>{f.complianceExemption.regulation}</span>
                      </div>
                      <div style={{ marginTop: 5, padding: '4px 8px', borderRadius: 4, background: 'rgba(240,171,0,0.08)', display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                        <span style={{ color: '#F0AB00', fontWeight: 700, whiteSpace: 'nowrap' }}>⚠ Validation required:</span>
                        <span style={{ color: 'var(--text-muted)' }}>{f.complianceExemption.validationNote}</span>
                      </div>
                    </div>
                  )}
                  {/* Temporal T=0→T=30 diff strip */}
                  {(f as any).source === 'temporal' && (f as any).temporalT0Value && (
                    <div style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(230,126,34,0.07)', border: '1px solid rgba(230,126,34,0.25)', fontSize: 11 }}>
                      <span style={{ fontWeight: 700, color: '#E67E22', marginRight: 8 }}>⏱️ Temporal diff:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>T=0s: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 4 }}>{(f as any).temporalT0Value}</code></span>
                      <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>→</span>
                      <span style={{ color: 'var(--text-secondary)' }}>T=30s: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 4 }}>{(f as any).temporalT30Value}</code></span>
                    </div>
                  )}
                  {/* CTA area ratio bar */}
                  {(f as any).source === 'cta-scorer' && (f as any).ctaAreaRatio && (
                    <div style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(231,76,60,0.07)', border: '1px solid rgba(231,76,60,0.25)', fontSize: 11 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                        <span style={{ fontWeight: 700, color: '#E74C3C' }}>⚖️ CTA Prominence:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>"{(f as any).ctaPrimaryLabel}" is <strong style={{ color: '#E74C3C' }}>{(f as any).ctaAreaRatio?.toFixed(1)}×</strong> larger than "{(f as any).ctaSecondaryLabel}"</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, height: 8, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ flex: (f as any).ctaAreaRatio, background: '#E74C3C', borderRadius: '99px 0 0 99px' }} />
                        <div style={{ flex: 1, background: '#27AE60', borderRadius: '0 99px 99px 0' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>
                        <span style={{ color: '#E74C3C' }}>Primary (accept)</span>
                        <span style={{ color: '#27AE60' }}>Secondary (reject)</span>
                      </div>
                    </div>
                  )}

                  {/* ── DEVELOPER VIEW ── */}
                  {audienceView === 'developer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* Priority + effort row */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, fontFamily: 'Geist Mono, monospace',
                          background: f.severity === 'critical' ? 'rgba(232,0,45,0.15)' : f.severity === 'high' ? 'rgba(254,113,65,0.15)' : 'rgba(217,119,6,0.15)',
                          color: f.severity === 'critical' ? '#E8002D' : f.severity === 'high' ? '#FE7141' : '#D97706',
                          border: `1px solid ${f.severity === 'critical' ? 'rgba(232,0,45,0.3)' : f.severity === 'high' ? 'rgba(254,113,65,0.3)' : 'rgba(217,119,6,0.3)'}`,
                        }}>
                          {(f as any).fixPriority || (f.severity === 'critical' ? 'P0' : f.severity === 'high' ? 'P1' : 'P2')} — {f.severity === 'critical' ? 'Fix immediately' : f.severity === 'high' ? 'Fix this sprint' : f.severity === 'medium' ? 'Fix this quarter' : 'Backlog'}
                        </span>
                        {(f as any).estimatedEffort && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(0,145,218,0.1)', color: '#0091DA', border: '1px solid rgba(0,145,218,0.25)', fontFamily: 'Geist Mono, monospace' }}>
                            ⏳ Effort: {(f as any).estimatedEffort}
                          </span>
                        )}
                        {(f as any).dsaArticle && (
                          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'rgba(254,113,65,0.1)', color: '#FE7141', border: '1px solid rgba(254,113,65,0.25)' }}>
                            DSA {(f as any).dsaArticle}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>🎯 {f.confidence} confidence</span>
                      </div>
                      {/* Regulation articles */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {f.regulation.map(r => <span key={r} className="dp-regulation-badge">{r}</span>)}
                      </div>
                      {/* Evidence */}
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '5px 9px', background: 'rgba(0,0,0,0.18)', borderRadius: 6, lineHeight: 1.5 }}>
                        <strong>Evidence:</strong> {f.evidence.summary}
                        {f.evidence.details.length > 0 && (
                          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {f.evidence.details.slice(0, 3).map((d, i) => (
                              <div key={i} style={{ fontSize: 10, color: 'var(--text-muted)' }}>• {d}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Code fix */}
                      {(f as any).developerFix ? (
                        <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(0,145,218,0.06)', border: '1px solid rgba(0,145,218,0.2)' }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#0091DA', marginBottom: 3, fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase' }}>👨‍💻 Code Fix</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{(f as any).developerFix}</div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#00BA8C', lineHeight: 1.5 }}>💡 {f.recommendation}</div>
                      )}
                    </div>
                  )}

                  {/* ── DESIGNER VIEW ── */}
                  {audienceView === 'designer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {(f as any).brignullPattern && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(205,171,254,0.12)', color: 'var(--pillar-dp)', border: '1px solid rgba(205,171,254,0.3)', fontFamily: 'Geist Mono, monospace' }}>
                            🎭 Brignull {(f as any).brignullNumber ? `#${(f as any).brignullNumber}` : ''}: {(f as any).brignullPattern}
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
                      {/* Enforcement context — use legalSummary if available */}
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '5px 9px', background: 'rgba(0,0,0,0.18)', borderRadius: 6, lineHeight: 1.5 }}>
                        {(f as any).legalSummary || f.description}
                      </div>
                      {/* Remediation framing */}
                      <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(0,186,140,0.05)', border: '1px solid rgba(0,186,140,0.2)' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#00BA8C', marginBottom: 3, fontFamily: 'Geist Mono, monospace', textTransform: 'uppercase' }}>Recommended Remediation</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.recommendation}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {f.severity === 'critical' ? '⏱ Remediate within 30 days — critical regulatory risk' : f.severity === 'high' ? '⏱ Remediate within 90 days — high enforcement risk' : '⏱ Remediate within 6 months — compliance gap'}
                          </span>
                          {(f as any).estimatedEffort && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(0,186,140,0.12)', color: '#00BA8C', border: '1px solid rgba(0,186,140,0.25)', fontFamily: 'Geist Mono, monospace' }}>
                              Effort: {(f as any).estimatedEffort}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}

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
