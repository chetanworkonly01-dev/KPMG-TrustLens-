'use client';
import { useState, useEffect } from 'react';

interface AuditSummary {
  id: string;
  type: string;
  url: string;
  status: string;
  score: number;
  complianceLevel: string;
  totalIssues: number;
  startedAt: string;
  completedAt?: string;
}

const complianceLabels: Record<string, string> = {
  'non-compliant': 'Non-Compliant',
  'partially-compliant': 'Partially Compliant',
  'aa-compliant': 'WCAG AA',
  'aaa-compliant': 'WCAG AAA'
};

const complianceBadge: Record<string, string> = {
  'non-compliant': 'badge-critical',
  'partially-compliant': 'badge-medium',
  'aa-compliant': 'badge-pass',
  'aaa-compliant': 'badge-pass'
};

function getScoreColor(score: number) {
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#3B82F6';
  if (score >= 50) return '#EAB308';
  return '#EF4444';
}

export default function HomePage() {
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit/list')
      .then(r => r.json())
      .then(data => { setAudits(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <h1 className="hero-title animate-fade-in">
          AI-Powered <span>Accessibility</span><br />Audit Platform
        </h1>
        <p className="hero-subtitle animate-fade-in stagger-1">
          Comprehensive WCAG 2.2 analysis for websites, authenticated portals, and PDF documents.
          57 automated tests powered by AI intelligence.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }} className="animate-fade-in stagger-2">
          <a href="/audit" className="btn btn-primary btn-lg">Start New Audit</a>
          <a href="#features" className="btn btn-secondary btn-lg">Learn More</a>
        </div>
      </section>

      {/* Stats */}
      <div className="container" style={{ marginTop: '-20px' }}>
        <div className="grid-4 animate-fade-in stagger-3">
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>57</div>
            <div className="stat-label">Accessibility Tests</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>WCAG 2.2</div>
            <div className="stat-label">Standard Compliance</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>AI</div>
            <div className="stat-label">Enhanced Analysis</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>3-in-1</div>
            <div className="stat-label">Web + Portal + PDF</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container" id="features" style={{ marginTop: 60 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>How It Works</h2>
        <div className="grid-3">
          {[
            { icon: '🌐', title: 'Website Audit', desc: 'Enter any URL — we crawl multiple pages, handle SPAs, and run 50+ tests against every element.' },
            { icon: '🔐', title: 'Portal Audit', desc: 'Provide login credentials — we authenticate, navigate post-login pages, and audit protected content.' },
            { icon: '📄', title: 'PDF Audit', desc: 'Upload any PDF — we check tagged structure, reading order, alt text, fonts, and language settings.' }
          ].map((f, i) => (
            <div key={i} className="glass-card" style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Test Categories */}
      <div className="container" style={{ marginTop: 60 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>57 Tests Across 5 Categories</h2>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {[
            { name: 'Perceivable', count: 14, color: '#3B82F6', items: 'Alt text, contrast, captions, headings, reflow' },
            { name: 'Operable', count: 15, color: '#8B5CF6', items: 'Keyboard, focus, skip nav, target size, timeouts' },
            { name: 'Understandable', count: 13, color: '#06B6D4', items: 'Labels, errors, language, consistency, auth' },
            { name: 'Robust', count: 8, color: '#F97316', items: 'ARIA roles, HTML validity, SVGs, live regions' },
            { name: 'PDF', count: 7, color: '#10B981', items: 'Tags, reading order, fonts, tables, metadata' }
          ].map((c, i) => (
            <div key={i} className="glass-card" style={{ borderLeft: `3px solid ${c.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</span>
                <span style={{ color: c.color, fontWeight: 800, fontSize: 18 }}>{c.count}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{c.items}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Audits */}
      <div className="container" style={{ marginTop: 60, paddingBottom: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Recent Audits</h2>
          <a href="/audit" className="btn btn-primary btn-sm">+ New Audit</a>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : audits.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No audits yet</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Start your first accessibility audit to see results here.</p>
            <a href="/audit" className="btn btn-primary">Start First Audit</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {audits.map(audit => (
              <a key={audit.id} href={`/audit/${audit.id}`} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit', padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 24 }}>{audit.type === 'pdf' ? '📄' : audit.type === 'portal' ? '🔐' : '🌐'}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{audit.url}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(audit.startedAt).toLocaleDateString()} · {audit.totalIssues} issues
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {audit.status === 'complete' && (
                    <>
                      <span className={`badge ${complianceBadge[audit.complianceLevel] || 'badge-medium'}`}>
                        {complianceLabels[audit.complianceLevel] || audit.complianceLevel}
                      </span>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${getScoreColor(audit.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: getScoreColor(audit.score) }}>
                        {audit.score}
                      </div>
                    </>
                  )}
                  {audit.status !== 'complete' && (
                    <span className="badge badge-medium">{audit.status}</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
