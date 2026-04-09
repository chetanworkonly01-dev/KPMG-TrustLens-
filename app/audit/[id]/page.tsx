'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

// ===== TYPE INTERFACES =====
interface AuditData {
  id: string; status: string; progress: number; progressMessage: string;
  config: { url?: string; type: string }; pages: { url: string; title: string }[];
  issues: Issue[]; score: Score; report?: Report; crawlCoverage?: CrawlCoverage;
  testResults: TestResultItem[]; testLog: TestLogEntry[];
  error?: string;
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
interface Report {
  executiveSummary: string; groupedIssues?: GroupedIssue[]; topCritical?: GroupedIssue[];
  journeyResults?: JourneyResult[]; testResults?: TestResultItem[];
  wcagMapping: { criterion: string; name: string; level: string; issueCount: number; status: string }[];
  remediationPlan: { priority: number; severity: string; title: string; description: string; affectedPages: string[]; estimatedEffort: string; frequency?: number }[];
  pageBreakdown: { url: string; title: string; score: number; issueCount: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number }[];
}

const sevColors: Record<string, string> = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#3B82F6' };
const catLabels: Record<string, string> = { perceivable: 'Perceivable', operable: 'Operable', understandable: 'Understandable', robust: 'Robust', pdf: 'PDF' };
const compLabels: Record<string, string> = { 'non-compliant': 'Non-Compliant', 'partially-compliant': 'Partially Compliant', 'aa-compliant': 'WCAG AA Compliant', 'aaa-compliant': 'WCAG AAA Compliant' };
const confColors: Record<string, string> = { high: '#10B981', medium: '#EAB308', low: '#F97316' };
const statusIcons: Record<string, string> = { pass: '✔', fail: '❌', error: '⚠', running: '⏳', pending: '⏸', 'needs-review': '❓' };
const statusColors: Record<string, string> = { pass: '#10B981', fail: '#EF4444', error: '#F97316', running: '#3B82F6', pending: '#6B7280' };

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 90 ? '#10B981' : score >= 75 ? '#3B82F6' : score >= 50 ? '#EAB308' : '#EF4444';
  const circ = 2 * Math.PI * 85;
  const off = circ - (score / 100) * circ;
  return (
    <div className="score-gauge">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle cx="100" cy="100" r="85" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
      </svg>
      <span className="score-value" style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{score}</span>
      <span className="score-label">Score</span>
    </div>
  );
}

export default function AuditResultPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<AuditData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [issueView, setIssueView] = useState<'grouped' | 'all'>('grouped');
  const logEndRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'docx' | 'pdf' | 'pptx') => {
    setExportLoading(format);
    try {
      const res = await fetch(`/api/export-report?id=${id}&format=${format}`);
      if (!res.ok) { alert('Export failed'); return; }
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      const d = res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/);
      a.download = d ? d[1] : `audit-report.${format}`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
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

  // Auto-scroll test log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.testLog?.length]);

  if (!data) return <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  // ===== IN-PROGRESS: LIVE TEST LOG =====
  if (data.status !== 'complete' && data.status !== 'error') {
    return (
      <div className="container" style={{ paddingTop: 48, maxWidth: 800, margin: '0 auto' }}>
        <div className="glass-card animate-glow" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div className="spinner" style={{ width: 32, height: 32, flexShrink: 0 }} />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Audit in Progress</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 14 }}>{data.config.url}</p>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 24, fontWeight: 800, color: 'var(--accent-blue)' }}>{data.progress}%</div>
          </div>
          <div className="progress-bar" style={{ marginBottom: 8 }}>
            <div className="progress-fill" style={{ width: `${data.progress}%` }} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{data.progressMessage}</p>
        </div>

        {/* Live Test Execution Log */}
        {data.testLog && data.testLog.length > 0 && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>🧪 Live Test Execution</h3>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {data.testLog.filter(l => l.status === 'pass').length} passed · {data.testLog.filter(l => l.status === 'fail').length} failed
              </span>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12 }}>
              {data.testLog.map((entry, i) => (
                <div key={i} style={{
                  padding: '6px 16px', display: 'flex', alignItems: 'flex-start', gap: 8,
                  background: entry.status === 'running' ? 'rgba(59,130,246,0.06)' : 'transparent',
                  borderLeft: `3px solid ${statusColors[entry.status] || '#6B7280'}`,
                  animation: entry.status === 'running' ? 'pulse 2s ease infinite' : 'none',
                }}>
                  <span style={{ color: statusColors[entry.status], fontSize: 13, flexShrink: 0, width: 16, textAlign: 'center' }}>
                    {statusIcons[entry.status] || '·'}
                  </span>
                  <span style={{ color: entry.status === 'running' ? 'var(--accent-blue)' : entry.status === 'fail' ? '#EF4444' : entry.status === 'pass' ? '#10B981' : 'var(--text-secondary)', flex: 1, lineHeight: 1.4 }}>
                    {entry.message}
                    {entry.wcag && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>(WCAG {entry.wcag})</span>}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (data.status === 'error') {
    return (
      <div className="container" style={{ paddingTop: 80, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Audit Failed</h2>
          <p style={{ color: '#EF4444' }}>{data.error}</p>
          <a href="/audit" className="btn btn-primary" style={{ marginTop: 20 }}>Try Again</a>
        </div>
      </div>
    );
  }

  // ===== COMPLETE RESULTS =====
  const filteredIssues = data.issues.filter(i =>
    (severityFilter === 'all' || i.severity === severityFilter) &&
    (categoryFilter === 'all' || i.category === categoryFilter)
  );

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `accessibility-report-${id}.json`; a.click();
  };

  const tabs = ['overview', 'tests', 'issues', 'wcag-map', 'remediation', 'pages'];
  if (data.report?.journeyResults && data.report.journeyResults.length > 0) tabs.splice(3, 0, 'journeys');

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Audit Results</h1>
          <p className="page-subtitle">{data.config.url || 'PDF Upload'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button id="export-dropdown-toggle" className="btn btn-secondary btn-sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>📥</span> Download Report
              <span style={{ display: 'inline-block', fontSize: 10, marginLeft: 2, transform: showExportMenu ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}>▼</span>
            </button>
            {showExportMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowExportMenu(false)} />
                <div className="animate-fade-in" style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 6, minWidth: 220, zIndex: 50, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                  <div style={{ padding: '6px 12px', marginBottom: 4 }}><span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Export Format</span></div>
                  {[{ key: 'docx', icon: '📄', label: 'Word Document', sub: '.docx' }, { key: 'pdf', icon: '📕', label: 'PDF Document', sub: '.pdf' }, { key: 'pptx', icon: '📊', label: 'PowerPoint', sub: '.pptx' }].map(item => (
                    <button key={item.key} onClick={() => handleExport(item.key as 'docx' | 'pdf' | 'pptx')} disabled={!!exportLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: exportLoading ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif', textAlign: 'left', transition: 'background 0.2s', opacity: exportLoading && exportLoading !== item.key ? 0.5 : 1 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ fontSize: 20 }}>{item.icon}</span>
                      <div><div style={{ fontWeight: 600 }}>{item.label}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sub}</div></div>
                      {exportLoading === item.key && <div className="spinner" style={{ width: 18, height: 18, marginLeft: 'auto', borderWidth: 2 }} />}
                    </button>
                  ))}
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <button onClick={() => { downloadJson(); setShowExportMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter, sans-serif', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span style={{ fontSize: 20 }}>🔧</span><div><div style={{ fontWeight: 600 }}>Raw JSON</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Developer format</div></div>
                  </button>
                </div>
              </>
            )}
          </div>
          <a href="/audit" className="btn btn-primary btn-sm">+ New Audit</a>
        </div>
      </div>

      {/* Score + Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, marginBottom: 24 }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <ScoreGauge score={data.score.overall} />
          <div className={`badge ${data.score.complianceLevel === 'aa-compliant' || data.score.complianceLevel === 'aaa-compliant' ? 'badge-pass' : data.score.complianceLevel === 'partially-compliant' ? 'badge-medium' : 'badge-critical'}`} style={{ marginTop: 12 }}>
            {compLabels[data.score.complianceLevel] || data.score.complianceLevel}
          </div>
        </div>
        <div>
          <div className="grid-4" style={{ marginBottom: 16 }}>
            {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
              <div key={sev} className="stat-card">
                <div className="stat-value" style={{ color: sevColors[sev] }}>{data.score.issueBySeverity[sev]}</div>
                <div className="stat-label" style={{ textTransform: 'capitalize' }}>{sev}</div>
              </div>
            ))}
          </div>
          {/* Test Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            <div className="stat-card" style={{ textAlign: 'center', padding: 10, borderLeft: '3px solid var(--accent-blue)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-blue)' }}>{data.score.testsRun}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tests Run</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center', padding: 10, borderLeft: '3px solid #10B981' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#10B981' }}>{data.score.testsPassed}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Passed</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center', padding: 10, borderLeft: '3px solid #EF4444' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#EF4444' }}>{data.score.testsFailed}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Failed</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {Object.entries(data.score.categoryScores).map(([cat, score]) => (
              <div key={cat} className="stat-card" style={{ textAlign: 'center', padding: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: (score as number) >= 75 ? '#10B981' : (score as number) >= 50 ? '#EAB308' : '#EF4444' }}>{score as number}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{catLabels[cat] || cat}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Crawl Coverage */}
      {data.crawlCoverage && (
        <div className="glass-card animate-fade-in" style={{ marginBottom: 24, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📊 Page Coverage</h3>
            <span style={{ fontSize: 24, fontWeight: 800, color: data.crawlCoverage.coveragePercent >= 80 ? '#10B981' : '#EAB308' }}>{data.crawlCoverage.coveragePercent}%</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-blue)' }}>{data.crawlCoverage.totalPagesFound}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Found</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>{data.crawlCoverage.pagesAudited}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Audited</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#F97316' }}>{data.crawlCoverage.pagesSkipped}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Skipped</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800 }}>{data.score.uniqueIssues || '—'}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unique Issues</div></div>
          </div>
          <div className="progress-bar" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${data.crawlCoverage.coveragePercent}%`, background: data.crawlCoverage.coveragePercent >= 80 ? '#10B981' : '#EAB308' }} /></div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'wcag-map' ? 'WCAG Map' : t === 'journeys' ? '🚶 Journeys' : t === 'tests' ? '🧪 Tests' : t}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && data.report && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Executive Summary</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{data.report.executiveSummary}</p>
          </div>
          {data.report.topCritical && data.report.topCritical.length > 0 && (
            <div className="glass-card" style={{ marginBottom: 24, borderLeft: '3px solid #EF4444' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🔥 Top Critical Issues</h3>
              {data.report.topCritical.map((g, idx) => (
                <div key={g.issueKey} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: idx < data.report!.topCritical!.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ background: sevColors[g.severity], color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{g.title}</span>
                      <span className={`badge badge-${g.severity}`}>{g.severity}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{g.description.substring(0, 150)}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>📋 {g.wcagCriterion}</span>
                      <span>📄 {g.affectedPages.length} page(s)</span>
                      <span>🔄 {g.occurrenceCount}×</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Journey summary cards */}
          {data.report.journeyResults && data.report.journeyResults.length > 0 && (
            <div className="glass-card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🚶 User Journey Tests</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {data.report.journeyResults.map(j => (
                  <div key={j.journeyName} style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: j.passed ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${j.passed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{j.passed ? '✅' : '❌'}</div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{j.journeyName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{j.steps.filter(s => s.passed).length}/{j.steps.length} steps passed</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 🧪 TESTS TAB ===== */}
      {activeTab === 'tests' && (
        <div className="animate-fade-in">
          {/* Test Summary Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <div className="stat-card" style={{ textAlign: 'center', borderTop: '3px solid var(--accent-blue)' }}>
              <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>{data.testResults.length}</div>
              <div className="stat-label">Total Tests</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center', borderTop: '3px solid #10B981' }}>
              <div className="stat-value" style={{ color: '#10B981' }}>{data.testResults.filter(r => r.status === 'pass').length}</div>
              <div className="stat-label">Passed</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center', borderTop: '3px solid #EF4444' }}>
              <div className="stat-value" style={{ color: '#EF4444' }}>{data.testResults.filter(r => r.status === 'fail').length}</div>
              <div className="stat-label">Failed</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center', borderTop: '3px solid #F97316' }}>
              <div className="stat-value" style={{ color: '#F97316' }}>{data.testResults.filter(r => r.status === 'error').length}</div>
              <div className="stat-label">Errors</div>
            </div>
          </div>

          {/* Test Results Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.testResults.map((tr, idx) => (
              <div key={idx} className="glass-card" style={{
                padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
                borderLeft: `3px solid ${statusColors[tr.status] || '#6B7280'}`,
                background: tr.status === 'pass' ? 'rgba(16,185,129,0.03)' : tr.status === 'fail' ? 'rgba(239,68,68,0.03)' : undefined,
              }}>
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>
                  {tr.status === 'pass' ? '✅' : tr.status === 'fail' ? '❌' : '⚠️'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{tr.testName}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.1)', color: '#818CF8', fontWeight: 600 }}>{tr.testId}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>WCAG {tr.wcagCriterion}</span>
                    <span className={`badge badge-${tr.status === 'pass' ? 'pass' : tr.severity}`} style={{ marginLeft: 'auto' }}>
                      {tr.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{tr.evidence.summary}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>🔍 {tr.evidence.elementsChecked} checked</span>
                    <span style={{ color: tr.evidence.elementsFailed > 0 ? '#EF4444' : '#10B981' }}>
                      {tr.evidence.elementsFailed > 0 ? `❌ ${tr.evidence.elementsFailed} failed` : '✅ All passed'}
                    </span>
                    <span>⏱ {tr.executionTime}ms</span>
                    <span style={{ color: confColors[tr.confidence] }}>🎯 {tr.confidence}</span>
                  </div>
                  {/* Evidence Details (collapsed) */}
                  {tr.evidence.details.length > 0 && tr.status === 'fail' && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600 }}>View Evidence ({tr.evidence.details.length} items)</summary>
                      <div style={{ marginTop: 8, padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.6, maxHeight: 200, overflowY: 'auto' }}>
                        {tr.evidence.details.map((d, i) => (
                          <div key={i} style={{ color: d.startsWith('✔') ? '#10B981' : d.startsWith('❌') || d.startsWith('⚠') ? '#EF4444' : 'var(--text-secondary)' }}>{d}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Test Execution Log */}
          {data.testLog && data.testLog.length > 0 && (
            <div className="glass-card" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>📋 Full Execution Log</h3>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', padding: '8px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                {data.testLog.map((entry, i) => (
                  <div key={i} style={{ padding: '4px 16px', borderLeft: `2px solid ${statusColors[entry.status] || '#6B7280'}`, color: entry.status === 'fail' ? '#EF4444' : entry.status === 'pass' ? '#10B981' : 'var(--text-secondary)' }}>
                    {statusIcons[entry.status] || '·'} {entry.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ISSUES TAB ===== */}
      {activeTab === 'issues' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <button onClick={() => setIssueView('grouped')} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Inter', background: issueView === 'grouped' ? 'var(--accent-blue)' : 'transparent', color: issueView === 'grouped' ? 'white' : 'var(--text-muted)' }}>Grouped</button>
              <button onClick={() => setIssueView('all')} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Inter', background: issueView === 'all' ? 'var(--accent-blue)' : 'transparent', color: issueView === 'all' ? 'white' : 'var(--text-muted)' }}>All</button>
            </div>
            <select className="input-field" style={{ width: 'auto' }} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
              <option value="all">All Severities</option>
              <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
            <select className="input-field" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {Object.entries(catLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {issueView === 'grouped' && data.report?.groupedIssues && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.report.groupedIssues
                .filter(g => (severityFilter === 'all' || g.severity === severityFilter) && (categoryFilter === 'all' || g.category === categoryFilter))
                .map(g => (
                  <div key={g.issueKey} className="issue-card">
                    <div className="issue-card-header">
                      <span className="issue-card-title">{g.title}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {g.occurrenceCount > 1 && <span style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA', fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>{g.occurrenceCount}× on {g.affectedPages.length} page(s)</span>}
                        <span className={`badge badge-${g.severity}`}>{g.severity}</span>
                      </div>
                    </div>
                    <div className="issue-card-desc">{g.description.substring(0, 180)}</div>
                    <div className="issue-card-meta">
                      <span className="issue-card-tag">📋 {g.wcagCriterion} {g.wcagName}</span>
                      <span className="issue-card-tag">📂 {catLabels[g.category] || g.category}</span>
                      <span className="issue-card-tag" style={{ color: confColors[g.confidence] }}>🎯 {g.confidence}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
          {issueView === 'all' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredIssues.map(issue => (
                <div key={issue.id} className="issue-card" onClick={() => setSelectedIssue(issue)}>
                  <div className="issue-card-header">
                    <span className="issue-card-title">{issue.title}</span>
                    <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                  </div>
                  <div className="issue-card-desc">{issue.description.substring(0, 180)}</div>
                  <div className="issue-card-meta">
                    <span className="issue-card-tag">📋 {issue.wcagCriterion}</span>
                    <span className="issue-card-tag">🔧 {issue.source}</span>
                    {issue.confidence && <span className="issue-card-tag" style={{ color: confColors[issue.confidence] }}>🎯 {issue.confidence}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== JOURNEYS TAB ===== */}
      {activeTab === 'journeys' && data.report?.journeyResults && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.report.journeyResults.map(j => (
            <div key={j.journeyName} className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>{j.passed ? '✅' : '❌'}</span>
                <div><h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{j.journeyName}</h3><p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{j.description}</p></div>
                <span className={`badge ${j.passed ? 'badge-pass' : 'badge-critical'}`} style={{ marginLeft: 'auto' }}>{j.passed ? 'PASSED' : 'FAILED'}</span>
              </div>
              {j.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', marginBottom: 6, background: s.passed ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', borderRadius: 'var(--radius-sm)', border: `1px solid ${s.passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{s.passed ? '✅' : '❌'}</span>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.action}</div>{s.issue && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>⚠ {s.issue}</div>}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ===== WCAG MAP TAB ===== */}
      {activeTab === 'wcag-map' && data.report && (
        <div className="glass-card animate-fade-in" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Criterion</th><th>Name</th><th>Level</th><th>Issues</th><th>Status</th></tr></thead>
            <tbody>
              {data.report.wcagMapping.map(m => (
                <tr key={m.criterion}><td style={{ fontWeight: 600 }}>{m.criterion}</td><td>{m.name}</td><td><span className="badge badge-low">{m.level}</span></td><td>{m.issueCount}</td><td><span className={`badge ${m.status === 'pass' ? 'badge-pass' : 'badge-critical'}`}>{m.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== REMEDIATION TAB ===== */}
      {activeTab === 'remediation' && data.report && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.report.remediationPlan.map(step => (
            <div key={step.priority} className="glass-card" style={{ borderLeft: `3px solid ${sevColors[step.severity]}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ background: sevColors[step.severity], color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{step.priority}</span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{step.title}</span>
                <span className={`badge badge-${step.severity}`} style={{ marginLeft: 'auto' }}>{step.severity}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.description}</p>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                <span>💪 {step.estimatedEffort}</span><span>📄 {step.affectedPages.length} page(s)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== PAGES TAB ===== */}
      {activeTab === 'pages' && data.report && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.report.pageBreakdown.map(page => (
            <div key={page.url} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{page.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{page.url}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {page.criticalCount > 0 && <span className="badge badge-critical">{page.criticalCount} Critical</span>}
                  {page.highCount > 0 && <span className="badge badge-high">{page.highCount} High</span>}
                  {page.mediumCount > 0 && <span className="badge badge-medium">{page.mediumCount} Medium</span>}
                  {page.lowCount > 0 && <span className="badge badge-low">{page.lowCount} Low</span>}
                </div>
              </div>
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${page.score >= 75 ? '#10B981' : page.score >= 50 ? '#EAB308' : '#EF4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: page.score >= 75 ? '#10B981' : page.score >= 50 ? '#EAB308' : '#EF4444', flexShrink: 0 }}>{page.score}</div>
            </div>
          ))}
        </div>
      )}

      {/* Issue Modal */}
      {selectedIssue && (
        <div className="modal-overlay" onClick={() => setSelectedIssue(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div><h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selectedIssue.title}</h3><span className={`badge badge-${selectedIssue.severity}`}>{selectedIssue.severity}</span></div>
              <button onClick={() => setSelectedIssue(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>Description</strong><p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>{selectedIssue.description}</p></div>
              <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>WCAG</strong><p style={{ fontSize: 14, marginTop: 4 }}>{selectedIssue.wcagCriterion} — {selectedIssue.wcagName} (Level {selectedIssue.wcagLevel})</p></div>
              {selectedIssue.elementHtml && <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>Element</strong><pre className="code-block" style={{ marginTop: 4 }}>{selectedIssue.elementHtml}</pre></div>}
              <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>Recommendation</strong><p style={{ fontSize: 14, marginTop: 4, color: '#10B981' }}>{selectedIssue.recommendation}</p></div>
              {selectedIssue.codeFix && <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>Code Fix</strong><pre className="code-block" style={{ marginTop: 4 }}>{selectedIssue.codeFix}</pre></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
