'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface AuditData {
  id: string;
  status: string;
  progress: number;
  progressMessage: string;
  config: { url?: string; type: string };
  pages: { url: string; title: string }[];
  issues: Issue[];
  score: Score;
  report?: Report;
  error?: string;
}

interface Issue {
  id: string; testId: string; title: string; description: string;
  element: string; elementHtml?: string; pageUrl: string;
  wcagCriterion: string; wcagName: string; wcagLevel: string;
  severity: string; impact: string; recommendation: string;
  codeFix?: string; category: string; source: string;
}

interface Score {
  overall: number;
  categoryScores: Record<string, number>;
  complianceLevel: string;
  totalIssues: number;
  issueBySeverity: Record<string, number>;
  issueByLevel: Record<string, number>;
}

interface Report {
  executiveSummary: string;
  wcagMapping: { criterion: string; name: string; level: string; issueCount: number; status: string }[];
  remediationPlan: { priority: number; severity: string; title: string; description: string; affectedPages: string[]; estimatedEffort: string }[];
  pageBreakdown: { url: string; title: string; score: number; issueCount: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number }[];
}

const sevColors: Record<string, string> = { critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#3B82F6' };
const catLabels: Record<string, string> = { perceivable: 'Perceivable', operable: 'Operable', understandable: 'Understandable', robust: 'Robust', pdf: 'PDF' };
const compLabels: Record<string, string> = { 'non-compliant': 'Non-Compliant', 'partially-compliant': 'Partially Compliant', 'aa-compliant': 'WCAG AA Compliant', 'aaa-compliant': 'WCAG AAA Compliant' };

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 90 ? '#10B981' : score >= 75 ? '#3B82F6' : score >= 50 ? '#EAB308' : '#EF4444';
  const circumference = 2 * Math.PI * 85;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="score-gauge">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle cx="100" cy="100" r="85" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
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

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/audit/${id}`);
    if (res.ok) {
      const d = await res.json();
      setData(d);
      return d.status;
    }
    return 'error';
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(async () => {
      const status = await fetchData();
      if (status === 'complete' || status === 'error') clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data) return <div className="container" style={{ paddingTop: 80, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  // Loading state
  if (data.status !== 'complete' && data.status !== 'error') {
    return (
      <div className="container" style={{ paddingTop: 80, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div className="glass-card animate-glow">
          <div className="spinner" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Audit in Progress</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{data.progressMessage}</p>
          <div className="progress-bar" style={{ marginBottom: 8 }}>
            <div className="progress-fill" style={{ width: `${data.progress}%` }} />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{data.progress}% complete</span>
        </div>
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

  const filteredIssues = data.issues.filter(i =>
    (severityFilter === 'all' || i.severity === severityFilter) &&
    (categoryFilter === 'all' || i.category === categoryFilter)
  );

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `accessibility-report-${id}.json`; a.click();
  };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Audit Results</h1>
          <p className="page-subtitle">{data.config.url || 'PDF Upload'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={downloadJson}>📥 JSON</button>
          <a href="/audit" className="btn btn-primary btn-sm">+ New Audit</a>
        </div>
      </div>

      {/* Score + Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, marginBottom: 32 }}>
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
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {Object.entries(data.score.categoryScores).map(([cat, score]) => (
              <div key={cat} className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: (score as number) >= 75 ? '#10B981' : (score as number) >= 50 ? '#EAB308' : '#EF4444' }}>{score as number}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{catLabels[cat] || cat}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {['overview', 'issues', 'wcag-map', 'remediation', 'pages'].map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'wcag-map' ? 'WCAG Map' : t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && data.report && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Executive Summary</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{data.report.executiveSummary}</p>
          </div>
        </div>
      )}

      {/* Issues Tab */}
      {activeTab === 'issues' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="input-field" style={{ width: 'auto' }} value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select className="input-field" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {Object.entries(catLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 8 }}>{filteredIssues.length} issues</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredIssues.map(issue => (
              <div key={issue.id} className="issue-card" onClick={() => setSelectedIssue(issue)}>
                <div className="issue-card-header">
                  <span className="issue-card-title">{issue.title}</span>
                  <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                </div>
                <div className="issue-card-desc">{issue.description.substring(0, 180)}{issue.description.length > 180 ? '...' : ''}</div>
                <div className="issue-card-meta">
                  <span className="issue-card-tag">📋 {issue.wcagCriterion} {issue.wcagName}</span>
                  <span className="issue-card-tag">📂 {catLabels[issue.category] || issue.category}</span>
                  <span className="issue-card-tag">🔧 {issue.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WCAG Map Tab */}
      {activeTab === 'wcag-map' && data.report && (
        <div className="glass-card animate-fade-in" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Criterion</th><th>Name</th><th>Level</th><th>Issues</th><th>Status</th></tr></thead>
            <tbody>
              {data.report.wcagMapping.map(m => (
                <tr key={m.criterion}>
                  <td style={{ fontWeight: 600 }}>{m.criterion}</td>
                  <td>{m.name}</td>
                  <td><span className="badge badge-low">{m.level}</span></td>
                  <td>{m.issueCount}</td>
                  <td><span className={`badge ${m.status === 'pass' ? 'badge-pass' : 'badge-critical'}`}>{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Remediation Tab */}
      {activeTab === 'remediation' && data.report && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.report.remediationPlan.map(step => (
            <div key={step.priority} className="glass-card" style={{ borderLeft: `3px solid ${sevColors[step.severity]}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ background: sevColors[step.severity], color: 'white', borderRadius: 'var(--radius-full)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                  {step.priority}
                </span>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{step.title}</span>
                <span className={`badge badge-${step.severity}`} style={{ marginLeft: 'auto' }}>{step.severity}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.description}</p>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                Effort: {step.estimatedEffort} · Affects {step.affectedPages.length} page(s)
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pages Tab */}
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
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${page.score >= 75 ? '#10B981' : page.score >= 50 ? '#EAB308' : '#EF4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: page.score >= 75 ? '#10B981' : page.score >= 50 ? '#EAB308' : '#EF4444', flexShrink: 0 }}>
                {page.score}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <div className="modal-overlay" onClick={() => setSelectedIssue(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selectedIssue.title}</h3>
                <span className={`badge badge-${selectedIssue.severity}`}>{selectedIssue.severity}</span>
              </div>
              <button onClick={() => setSelectedIssue(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>Description</strong><p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>{selectedIssue.description}</p></div>
              <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>WCAG Criterion</strong><p style={{ fontSize: 14, marginTop: 4 }}>{selectedIssue.wcagCriterion} — {selectedIssue.wcagName} (Level {selectedIssue.wcagLevel})</p></div>
              <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>Affected Element</strong><pre className="code-block" style={{ marginTop: 4 }}>{selectedIssue.element}</pre></div>
              {selectedIssue.elementHtml && <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>Element HTML</strong><pre className="code-block" style={{ marginTop: 4 }}>{selectedIssue.elementHtml}</pre></div>}
              <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>Impact</strong><p style={{ fontSize: 14, marginTop: 4 }}>{selectedIssue.impact}</p></div>
              <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>Recommendation</strong><p style={{ fontSize: 14, marginTop: 4, color: 'var(--accent-emerald)' }}>{selectedIssue.recommendation}</p></div>
              {selectedIssue.codeFix && <div><strong style={{ fontSize: 13, color: 'var(--text-muted)' }}>Code Fix</strong><pre className="code-block" style={{ marginTop: 4 }}>{selectedIssue.codeFix}</pre></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
