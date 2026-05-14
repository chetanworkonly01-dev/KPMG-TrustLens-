'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Audit {
  id: string; status: string;
  config: { url?: string; type: string; wcagLevels?: string[]; standard?: string; enabledPillars?: string[] };
  score: { overall: number; complianceLevel: string; totalIssues: number; testsRun?: number };
  trustScore?: { overall: number; trustLevel: string };
  progress: number; startedAt: string; completedAt?: string;
  crawlCoverage?: { totalPagesFound: number; pagesAudited: number; coveragePercent: number };
}

const PILLAR_META: Record<string, { icon: string; label: string; color: string; desc: string; regs: string[] }> = {
  accessibility: { icon: '♿', label: 'Accessibility', color: '#0091DA', desc: 'WCAG 2.2, EN 301 549, Section 508 — automated + AI visual + journey testing', regs: ['WCAG 2.2', 'EN 301 549', 'Section 508', 'WCAG 2.1'] },
  darkpatterns:  { icon: '🕵️', label: 'Dark Patterns', color: '#9B59B6', desc: 'Brignull 12-pattern taxonomy, EU DSA Art. 25, FTC §5, cognitive bias exploitation', regs: ['EU DSA', 'FTC §5', 'GDPR', 'DPDPA'] },
  performance:   { icon: '⚡', label: 'Performance', color: '#00BA8C', desc: 'Core Web Vitals (LCP/INP/CLS), RAIL model, Lighthouse scoring, mobile 4G', regs: ['CWV', 'RAIL', 'Lighthouse', 'HTTP/2'] },
  privacy:       { icon: '🔒', label: 'Privacy', color: '#E67E22', desc: 'GDPR Art. 5–37, CCPA/CPRA, DPDPA 2023, ePrivacy, ICO enforcement', regs: ['GDPR', 'CCPA', 'DPDPA', 'ePrivacy'] },
};

const compColors: Record<string, string> = { 'non-compliant': '#FF3356', 'partially-compliant': '#F0AB00', 'aa-compliant': '#0091DA', 'aaa-compliant': '#00B2A9' };
const compLabels: Record<string, string> = { 'non-compliant': 'Non-Compliant', 'partially-compliant': 'Partially Compliant', 'aa-compliant': 'AA Compliant', 'aaa-compliant': 'AAA Compliant' };

export default function HomePage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudits = async () => {
      try { const res = await fetch('/api/audit/list'); if (res.ok) setAudits(await res.json()); } catch { /* ignore */ }
      setLoading(false);
    };
    fetchAudits();
    const i = setInterval(fetchAudits, 4000);
    return () => clearInterval(i);
  }, []);

  const running   = audits.filter(a => a.status !== 'complete' && a.status !== 'error');
  const completed = audits.filter(a => a.status === 'complete');
  const avgScore  = completed.length ? Math.round(completed.reduce((s, a) => s + a.score.overall, 0) / completed.length) : 0;

  return (
    <div>
      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <div className="hero">
        <div style={{ marginBottom: 18 }}>
          <span className="kpmg-ai-badge" style={{ fontSize: 12 }}>
            <span className="kpmg-ai-dot" />
            KPMG AI — GPT-4o · Playwright · axe-core
          </span>
        </div>

        <h1 className="hero-title">
          KPMG <span>TrustLens</span><br />
          Enterprise AI Governance &amp; Experience Audit
        </h1>

        <p className="hero-subtitle" style={{ maxWidth: 620, margin: '0 auto 36px' }}>
          The only 4-pillar audit platform that combines DOM analysis, AI vision,
          behavioural simulation and regulatory mapping in a single pipeline.
          Accessibility · Dark Patterns · Performance · Privacy.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
          <Link href="/audit" className="btn btn-primary btn-lg">🚀 Start Free Audit</Link>
          <a href="#audits" className="btn btn-secondary btn-lg">📋 View History</a>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[
            { val: '6 Pillars', label: 'Audit Domains',          color: 'var(--accent-blue)' },
            { val: '7 Layers', label: 'Per-Engine Depth',        color: '#9B59B6' },
            { val: 'GDPR+DSA', label: 'Regulation Coverage',     color: '#E67E22' },
            { val: 'GPT-4o',   label: 'Vision AI Engine',        color: '#A78BFA' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 3 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="container">

        {/* ══ 4-PILLAR CARDS ════════════════════════════════════════════ */}
        <div style={{ marginBottom: 44 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>TrustLens Audit Pillars</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Each pillar runs independently or combined — scored into a unified TrustLens Score</p>
          </div>
          <div className="grid-4 animate-slide-up stagger-1">
            {Object.entries(PILLAR_META).map(([key, p]) => (
              <div key={key} className="glass-card" style={{ borderTop: `3px solid ${p.color}`, padding: '20px 18px' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{p.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: p.color }}>{p.label}</h3>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 12 }}>{p.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {p.regs.map(r => (
                    <span key={r} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 99, background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}35`, fontWeight: 700 }}>{r}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Coming Soon Pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            {[
              {
                icon: '⚖️', label: 'Compliance Intelligence', color: '#06B6D4',
                desc: 'Map findings against CCPA, RBI principles, SEBI investor protection, DPDP consent, and enterprise governance standards.',
                regs: ['CCPA', 'RBI', 'SEBI', 'DPDPA', 'Governance'],
              },
              {
                icon: '🎨', label: 'Design Governance', color: '#EC4899',
                desc: 'Audit design tokens, component consistency, CTA hierarchy, accessibility violations, and non-approved UI patterns.',
                regs: ['Design Tokens', 'CTA Audit', 'UI Patterns', 'Brand'],
              },
            ].map(p => (
              <div key={p.label} className="glass-card" style={{ borderTop: `3px solid ${p.color}`, padding: '20px 18px', opacity: 0.75, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${p.color}20`, color: p.color, border: `1px solid ${p.color}40`, letterSpacing: '0.05em' }}>COMING SOON</div>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{p.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: p.color }}>{p.label}</h3>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 12 }}>{p.desc}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {p.regs.map(r => (
                    <span key={r} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 99, background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}35`, fontWeight: 700 }}>{r}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ AI CAPABILITIES ════════════════════════════════════════════ */}
        <div className="glass-card animate-slide-up stagger-2" style={{ marginBottom: 44, padding: '22px 28px', background: 'linear-gradient(135deg, rgba(0,51,141,0.12) 0%, rgba(155,89,182,0.08) 100%)', border: '1px solid rgba(0,145,218,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span style={{ fontSize: 22 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>How the AI thinks</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Multi-source intelligence layered per pillar</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { icon: '🌐', title: 'DOM Analysis',        desc: 'Playwright full-page crawl, axe-core engine, custom WCAG rule tests',   color: '#0091DA' },
              { icon: '👁️', title: 'Vision AI (GPT-4o)', desc: 'Screenshot analysis for contrast, layout, dark patterns, consent UI',   color: '#9B59B6' },
              { icon: '🎭', title: 'Behavioural Sim',     desc: 'Journey testing, interaction flow, subscribe vs cancel path ratio',      color: '#00BA8C' },
              { icon: '⚖️', title: 'Regulatory Map',      desc: 'GDPR, DSA, FTC, DPDPA — mapped to each finding automatically',         color: '#E67E22' },
              { icon: '📊', title: 'Confidence Scoring',  desc: 'High/Medium/Low confidence per finding with evidence chain',            color: '#A78BFA' },
              { icon: '🔬', title: '7-Layer Engines',     desc: 'DOM → Visual → NLP → Deep Code → A11Y → Flow → Regulatory',            color: '#F0AB00' },
            ].map(c => (
              <div key={c.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12, color: c.color, marginBottom: 3 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ MULTI-INPUT SHOWCASE ══════════════════════════════════════ */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Audit Any Digital Asset</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Multiple input modes — from live websites to video recordings</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 0 }}>
            {[
              { icon: '🌐', mode: 'Website / Portal', conf: '95% confidence', desc: 'Full DOM audit, multi-page crawl, live interaction', color: '#0091DA', available: true },
              { icon: '📄', mode: 'PDF Document',      conf: '85% confidence', desc: 'PDF/UA, tagged structure, reading order, alt text',  color: '#00BA8C', available: true },
              { icon: '📸', mode: 'Screenshot/Image',  conf: '70% confidence', desc: 'GPT-4o visual analysis — contrast, layout, consent', color: '#9B59B6', available: true },
              { icon: '🎥', mode: 'Video Recording',   conf: '60% confidence', desc: 'Frame-by-frame behavioural pattern detection',       color: '#E67E22', available: true },
            ].map(m => (
              <div key={m.mode} className="glass-card" style={{ padding: '16px', borderLeft: `3px solid ${m.color}`, position: 'relative' }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{m.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{m.mode}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{m.desc}</div>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: `${m.color}18`, color: m.color, border: `1px solid ${m.color}40`, fontWeight: 700 }}>{m.conf}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ HOW IT WORKS ════════════════════════════════════════════════ */}
        <div className="glass-card animate-slide-up stagger-3" style={{ marginBottom: 44, padding: '24px 28px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>How TrustLens Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { step: '01', icon: '⚙️', title: 'Configure', desc: 'Select your input (URL, PDF, image, video), choose which pillars to audit, set crawl depth and WCAG level.' },
              { step: '02', icon: '🔬', title: 'AI Analysis', desc: '7-layer engines run simultaneously. DOM, visual AI, NLP, deep code inspection, journey testing, regulatory mapping.' },
              { step: '03', icon: '📋', title: 'Enterprise Report', desc: 'Pillar-specific PDF/DOCX/PPTX with issue register, remediation roadmap, team matrix, and compliance certificates.' },
            ].map(s => (
              <div key={s.step} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', letterSpacing: '0.1em', marginBottom: 8 }}>STEP {s.step}</div>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ COMPLIANCE GRID ════════════════════════════════════════════ */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Regulation & Standards Coverage</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Every finding is automatically mapped to applicable regulations</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {[
              ['♿ WCAG 2.2','#0091DA'], ['♿ EN 301 549','#0091DA'], ['♿ Section 508','#0091DA'], ['♿ WCAG 2.1','#0091DA'],
              ['🛡️ GDPR Art. 5–37','#9B59B6'], ['🛡️ CCPA / CPRA','#9B59B6'], ['🛡️ IN-DPDPA 2023','#9B59B6'], ['🛡️ ePrivacy','#9B59B6'],
              ['⚖️ EU DSA Art. 25','#E67E22'], ['⚖️ FTC §5','#E67E22'], ['⚖️ ICO Guidance','#E67E22'], ['⚖️ CNIL','#E67E22'],
              ['⚡ Core Web Vitals','#00BA8C'], ['⚡ RAIL Model','#00BA8C'], ['⚡ Lighthouse','#00BA8C'],
            ].map(([label, color]) => (
              <span key={label} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 99, background: `${color}14`, color, border: `1px solid ${color}35`, fontWeight: 600 }}>{label}</span>
            ))}
          </div>
        </div>

        {/* ══ SUMMARY STATS ══════════════════════════════════════════════ */}
        {completed.length > 0 && (
          <div className="grid-4 animate-slide-up" style={{ marginBottom: 28 }}>
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

        {/* ══ RUNNING AUDITS ══════════════════════════════════════════════ */}
        {running.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>⏳ Running Audits</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {running.map(a => (
                <Link key={a.id} href={`/audit/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div className="glass-card animate-glow" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
                      <div className="animate-spin" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(0,145,218,0.2)', borderTopColor: 'var(--accent-blue)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.config?.url || 'PDF Audit'}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                          {(a.config?.enabledPillars || []).map(p => {
                            const m = PILLAR_META[p]; if (!m) return null;
                            return <span key={p} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: `${m.color}18`, color: m.color, border: `1px solid ${m.color}40`, fontWeight: 700 }}>{m.icon} {m.label}</span>;
                          })}
                        </div>
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

        {/* ══ AUDIT HISTORY ══════════════════════════════════════════════ */}
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
              <div style={{ fontSize: 52, marginBottom: 16 }}>🛡️</div>
              <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 18 }}>No Audits Yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 10, fontSize: 14 }}>
                Start your first TrustLens audit to get enterprise-grade digital trust insights.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 24 }}>
                Covers Accessibility · Dark Patterns · Performance · Privacy in one run
              </p>
              <Link href="/audit" className="btn btn-primary btn-lg">🚀 Start First Audit</Link>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {completed.map(a => {
              const level      = a.config?.wcagLevels?.includes('AAA') ? 'AAA' : a.config?.wcagLevels?.includes('AA') ? 'AA' : 'A';
              const scoreColor = a.score.overall >= 75 ? '#00BA8C' : a.score.overall >= 50 ? '#F0AB00' : '#FF3356';
              const pillars    = a.config?.enabledPillars || [];
              const trustColor = a.trustScore ? (a.trustScore.overall >= 80 ? '#00BA8C' : a.trustScore.overall >= 60 ? '#F0AB00' : '#FF3356') : scoreColor;
              return (
                <Link key={a.id} href={`/audit/${a.id}`} style={{ textDecoration: 'none' }}>
                  <div className="glass-card" style={{ cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}>
                    {/* Score circle */}
                    <div style={{ width: 56, height: 56, borderRadius: '50%', border: `2.5px solid ${trustColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 300, color: trustColor, lineHeight: 1 }}>
                        {a.trustScore ? a.trustScore.overall : a.score.overall}
                      </div>
                      <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {a.trustScore ? 'Trust' : 'Score'}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                          {a.config?.url || 'PDF Document'}
                        </span>
                        {pillars.includes('accessibility') && (
                          <span className={`audit-level-chip ${level.toLowerCase()}`} style={{ fontSize: 9, padding: '2px 7px' }}>
                            {a.config?.standard || 'WCAG 2.2'} {level}
                          </span>
                        )}
                      </div>
                      {/* Pillar badges */}
                      {pillars.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                          {pillars.map(p => {
                            const m = PILLAR_META[p]; if (!m) return null;
                            return <span key={p} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}35`, fontWeight: 700 }}>{m.icon} {m.label}</span>;
                          })}
                        </div>
                      )}
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
