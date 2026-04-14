'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Audit {
  id: string; status: string; config: { url?: string; type: string; wcagLevels?: string[]; standard?: string };
  score: { overall: number; complianceLevel: string; totalIssues: number; testsRun?: number };
  progress: number; startedAt: string; completedAt?: string;
  crawlCoverage?: { totalPagesFound: number; pagesAudited: number; coveragePercent: number };
}

const compColors: Record<string, string> = {
  'non-compliant': '#FF3356', 'partially-compliant': '#F0AB00',
  'aa-compliant': '#0091DA', 'aaa-compliant': '#00B2A9'
};
const compLabels: Record<string, string> = {
  'non-compliant': 'Non-Compliant', 'partially-compliant': 'Partially Compliant',
  'aa-compliant': 'AA Compliant', 'aaa-compliant': 'AAA Compliant'
};

export default function HomePage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const res = await fetch('/api/audit/list');
        if (res.ok) setAudits(await res.json());
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchAudits();
    const i = setInterval(fetchAudits, 4000);
    return () => clearInterval(i);
  }, []);

  const running = audits.filter(a => a.status !== 'complete' && a.status !== 'error');
  const completed = audits.filter(a => a.status === 'complete');

  const avgScore = completed.length
    ? Math.round(completed.reduce((s, a) => s + a.score.overall, 0) / completed.length)
    : 0;

  return (
    <div>
      {/* ── KPMG Hero ── */}
      <div className="hero">
        <div style={{ marginBottom: 20 }}>
          <span className="kpmg-ai-badge" style={{ fontSize: 12 }}>
            <span className="kpmg-ai-dot" />
            KPMG AI — Powered by GPT-4o
          </span>
        </div>

        <h1 className="hero-title">
          KPMG <span>Accessibility</span><br />Audit Platform
        </h1>

        <p className="hero-subtitle">
          Enterprise-grade WCAG 2.2 A/AA/AAA accessibility auditing powered by AI.
          Automated scanning, AI-powered analysis, and actionable remediation guidance for websites, portals, and PDFs.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
          <Link href="/audit" className="btn btn-primary btn-lg">
            🚀 Start New Audit
          </Link>
          <a href="#audits" className="btn btn-secondary btn-lg">
            📊 View History
          </a>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 36, flexWrap: 'wrap' }}>
          {[
            { val: '57+', label: 'Automated Tests', color: 'var(--accent-blue)' },
            { val: 'WCAG 2.2', label: 'Standard Coverage', color: 'var(--kpmg-teal)' },
            { val: 'GPT-4o', label: 'AI Engine', color: '#A78BFA' },
            { val: 'PPTX · DOCX · PDF', label: 'Export Formats', color: 'var(--accent-yellow)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 3 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="container">
        {/* Feature Cards */}
        <div className="grid-3 animate-slide-up stagger-1" style={{ marginBottom: 44 }}>
          {[
            {
              icon: '🌐', title: 'Website Auditing', color: 'var(--kpmg-light-blue)',
              desc: 'Deep multi-page crawl with Playwright, axe-core engine, custom WCAG rule tests, and journey simulation.'
            },
            {
              icon: '🔐', title: 'Portal Access', color: 'var(--accent-teal)',
              desc: 'Authenticated portal auditing with login flow automation — test behind sign-in pages.'
            },
            {
              icon: '📄', title: 'PDF Accessibility', color: '#A78BFA',
              desc: 'PDF/UA and WCAG PDF technique compliance checking including tagged structure, reading order, and alt text.'
            },
          ].map(f => (
            <div key={f.title} className="glass-card" style={{ borderTop: `3px solid ${f.color}` }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* WCAG levels info strip */}
        <div className="glass-card animate-slide-up stagger-2" style={{ marginBottom: 44, padding: '18px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>Standards Covered</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Select your required conformance level before starting an audit</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="audit-level-chip a">Level A — Minimum</div>
              <div className="audit-level-chip aa">Level AA — Standard</div>
              <div className="audit-level-chip aaa">Level AAA — Enhanced</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-info">WCAG 2.2</span>
              <span className="badge badge-na">EN 301 549</span>
              <span className="badge badge-na">Section 508</span>
            </div>
          </div>
        </div>

        {/* ── Summary Stats (if audits exist) ── */}
        {completed.length > 0 && (
          <div className="grid-4 animate-slide-up stagger-3" style={{ marginBottom: 28 }}>
            {[
              { val: completed.length, label: 'Audits Completed', color: 'var(--accent-blue)' },
              { val: avgScore, label: 'Average Score', color: avgScore >= 75 ? '#00BA8C' : avgScore >= 50 ? '#F0AB00' : '#FF3356' },
              { val: completed.reduce((s, a) => s + a.score.totalIssues, 0), label: 'Total Issues Found', color: '#FF8533' },
              { val: completed.reduce((s, a) => s + (a.score.testsRun || 0), 0), label: 'Tests Executed', color: 'var(--kpmg-teal)' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Running Audits ── */}
        {running.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>⏳ Running Audits</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {running.map(a => (
                <Link key={a.id} href={`/audit/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div className="glass-card animate-glow" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
                      <div className="animate-spin" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(0,145,218,0.2)', borderTopColor: 'var(--accent-blue)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.config.url || 'PDF Audit'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.status} · {a.progress}%</div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 300, color: 'var(--accent-blue)' }}>{a.progress}%</div>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${a.progress}%` }} /></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Audit History ── */}
        <div id="audits">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>📋 Audit History</h2>
            <Link href="/audit" className="btn btn-primary btn-sm">+ New Audit</Link>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: 44 }}>
              <div className="spinner" style={{ margin: '0 auto', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading audits...</p>
            </div>
          )}

          {!loading && completed.length === 0 && (
            <div className="glass-card" style={{ textAlign: 'center', padding: 56 }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>♿</div>
              <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 18 }}>No Audits Yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 22, fontSize: 14 }}>
                Start your first KPMG accessibility audit to see results here.
              </p>
              <Link href="/audit" className="btn btn-primary btn-lg">🚀 Start First Audit</Link>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {completed.map(a => {
              const level = a.config.wcagLevels?.includes('AAA') ? 'AAA' : a.config.wcagLevels?.includes('AA') ? 'AA' : 'A';
              const scoreColor = a.score.overall >= 75 ? '#00BA8C' : a.score.overall >= 50 ? '#F0AB00' : '#FF3356';
              return (
                <Link key={a.id} href={`/audit/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div className="glass-card" style={{ cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'center' }}>
                    {/* Score circle */}
                    <div style={{ width: 58, height: 58, borderRadius: '50%', border: `2.5px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 300, color: scoreColor, letterSpacing: '-0.02em', lineHeight: 1 }}>{a.score.overall}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                          {a.config.url || 'PDF Document'}
                        </span>
                        <span className={`audit-level-chip ${level.toLowerCase()}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                          {a.config.standard || 'WCAG 2.2'} {level}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>📄 {a.crawlCoverage?.pagesAudited ?? '—'} pages</span>
                        <span>🔍 {a.score.totalIssues} issues</span>
                        {a.crawlCoverage && <span>📊 {a.crawlCoverage.coveragePercent}% coverage</span>}
                        <span>📅 {new Date(a.startedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, fontWeight: 700, background: `${compColors[a.score.complianceLevel]}18`, color: compColors[a.score.complianceLevel], border: `1px solid ${compColors[a.score.complianceLevel]}40` }}>
                        {compLabels[a.score.complianceLevel] || a.score.complianceLevel}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
