'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const STANDARDS = [
  { value: 'WCAG 2.2', label: 'WCAG 2.2 (Web Content Accessibility Guidelines)' },
  { value: 'EN 301 549', label: 'EN 301 549 (European Standard)' },
  { value: 'Section 508', label: 'Section 508 (US Federal)' },
  { value: 'WCAG 2.1', label: 'WCAG 2.1 (Legacy)' },
];

export default function AuditPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'website' | 'pdf'>('website');
  const [url, setUrl] = useState('');
  const [crawlDepth, setCrawlDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(5);
  const [includeAI, setIncludeAI] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginUrl, setLoginUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameSelector, setUsernameSelector] = useState('#username');
  const [passwordSelector, setPasswordSelector] = useState('#password');
  const [submitSelector, setSubmitSelector] = useState('button[type="submit"]');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // WCAG level selection
  const [wcagLevelA, setWcagLevelA]     = useState(true);
  const [wcagLevelAA, setWcagLevelAA]   = useState(true);
  const [wcagLevelAAA, setWcagLevelAAA] = useState(false);
  const [standard, setStandard] = useState('WCAG 2.2');

  const getSelectedLevels = () => {
    const levels: ('A' | 'AA' | 'AAA')[] = [];
    if (wcagLevelA)   levels.push('A');
    if (wcagLevelAA)  levels.push('AA');
    if (wcagLevelAAA) levels.push('AAA');
    return levels.length > 0 ? levels : ['A', 'AA'] as ('A' | 'AA' | 'AAA')[];
  };

  const getConformanceLabel = () => {
    if (wcagLevelAAA) return 'AAA';
    if (wcagLevelAA)  return 'AA';
    return 'A';
  };

  const startWebsiteAudit = async () => {
    if (!url) { setError('Please enter a URL'); return; }
    const levels = getSelectedLevels();
    if (levels.length === 0) { setError('Select at least one WCAG level'); return; }
    setLoading(true); setError('');
    try {
      const body: Record<string, unknown> = {
        url, crawlDepth, maxPages, includeAI,
        wcagLevels: levels,
        standard,
      };
      if (showLogin && username && password) {
        body.loginConfig = { loginUrl: loginUrl || url, username, password, usernameSelector, passwordSelector, submitSelector };
      }
      const res = await fetch('/api/audit/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.auditId) router.push(`/audit/${data.auditId}`);
      else setError(data.error || 'Failed to start audit');
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const startPdfAudit = async () => {
    if (!pdfFile) { setError('Please select a PDF file'); return; }
    setLoading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', pdfFile);
      const res = await fetch('/api/audit/pdf', { method: 'POST', body: form });
      const data = await res.json();
      if (data.auditId) router.push(`/audit/${data.auditId}`);
      else setError(data.error || 'Failed to start audit');
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.toLowerCase().endsWith('.pdf')) setPdfFile(file);
    else setError('Only PDF files are accepted');
  };

  return (
    <div className="container" style={{ paddingTop: 36, paddingBottom: 80, maxWidth: 760, margin: '0 auto' }}>
      {/* KPMG Header */}
      <div className="page-header">
        <h1 className="page-title">New Accessibility Audit</h1>
        <p className="page-subtitle">Evaluate against WCAG 2.2 and international accessibility standards using AI-powered analysis</p>
      </div>

      {/* Standard + Conformance selector (always visible) */}
      <div className="glass-card animate-fade-in" style={{ marginBottom: 20, padding: '18px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>

          {/* Standard selector */}
          <div className="input-group">
            <label className="input-label">Accessibility Standard</label>
            <select className="input-field" value={standard} onChange={e => setStandard(e.target.value)}>
              {STANDARDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* WCAG Level selector */}
          <div className="input-group">
            <label className="input-label">Conformance Level</label>
            <div className="wcag-level-selector" style={{ paddingTop: 2 }}>
              <label
                className={`wcag-level-option ${wcagLevelA ? 'selected-a' : ''}`}
                title="WCAG Level A — Minimum accessibility requirements"
              >
                <input type="checkbox" checked={wcagLevelA} onChange={e => setWcagLevelA(e.target.checked)} />
                Level A
              </label>
              <label
                className={`wcag-level-option ${wcagLevelAA ? 'selected-aa' : ''}`}
                title="WCAG Level AA — Standard compliance (recommended)"
              >
                <input type="checkbox" checked={wcagLevelAA} onChange={e => setWcagLevelAA(e.target.checked)} />
                Level AA
              </label>
              <label
                className={`wcag-level-option ${wcagLevelAAA ? 'selected-aaa' : ''}`}
                title="WCAG Level AAA — Enhanced accessibility (optional)"
              >
                <input type="checkbox" checked={wcagLevelAAA} onChange={e => setWcagLevelAAA(e.target.checked)} />
                Level AAA
              </label>
            </div>
          </div>
        </div>

        {/* Audit scope summary chip */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Audit Scope:</span>
          <span className={`audit-level-chip ${getConformanceLabel().toLowerCase()}`}>
            {standard} — Level {getConformanceLabel()}
          </span>
          {wcagLevelAAA && (
            <span style={{ fontSize: 11, color: 'var(--accent-teal)', background: 'rgba(0,178,169,0.08)', padding: '3px 8px', borderRadius: 99, border: '1px solid rgba(0,178,169,0.2)' }}>
              ⚡ Enhanced AAA criteria included
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'website' ? 'active' : ''}`} onClick={() => setTab('website')}>
          🌐 Website / Portal
        </button>
        <button className={`tab ${tab === 'pdf' ? 'active' : ''}`} onClick={() => setTab('pdf')}>
          📄 PDF Document
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(232,0,45,0.08)', border: '1px solid rgba(232,0,45,0.25)', borderRadius: 'var(--radius-md)', color: '#FF3356', fontSize: 13, marginBottom: 18 }}>
          {error}
        </div>
      )}

      {tab === 'website' && (
        <div className="glass-card animate-fade-in">
          {/* URL Input */}
          <div className="input-group" style={{ marginBottom: 18 }}>
            <label className="input-label">Website URL *</label>
            <input
              className="input-field"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>

          {/* Crawl options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div className="input-group">
              <label className="input-label">Crawl Depth</label>
              <select className="input-field" value={crawlDepth} onChange={e => setCrawlDepth(+e.target.value)}>
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} level{v > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Max Pages</label>
              <select className="input-field" value={maxPages} onChange={e => setMaxPages(+e.target.value)}>
                {[1, 3, 5, 10, 20, 30, 50, 100, 200].map(v => <option key={v} value={v}>{v} pages</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">AI Analysis</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 0' }}>
                <input
                  type="checkbox"
                  checked={includeAI}
                  onChange={e => setIncludeAI(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Enable GPT-4o</span>
              </label>
            </div>
          </div>

          {/* Login Config */}
          <div style={{ marginBottom: 20 }}>
            <div className="collapsible-header" onClick={() => setShowLogin(!showLogin)}>
              <span>🔐 Login Configuration (authenticated portals)</span>
              <span style={{ transform: showLogin ? 'rotate(180deg)' : '', transition: 'var(--transition)', fontSize: 12 }}>▼</span>
            </div>
            {showLogin && (
              <div className="collapsible-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Login URL</label>
                    <input className="input-field" placeholder="https://example.com/login" value={loginUrl} onChange={e => setLoginUrl(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Submit Button Selector</label>
                    <input className="input-field" placeholder='button[type="submit"]' value={submitSelector} onChange={e => setSubmitSelector(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Username</label>
                    <input className="input-field" placeholder="user@example.com" value={username} onChange={e => setUsername(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Password</label>
                    <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Username Field Selector</label>
                    <input className="input-field" placeholder="#username" value={usernameSelector} onChange={e => setUsernameSelector(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Password Field Selector</label>
                    <input className="input-field" placeholder="#password" value={passwordSelector} onChange={e => setPasswordSelector(e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={startWebsiteAudit}
            disabled={loading}
          >
            {loading
              ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Running Audit...</>
              : `🚀 Start ${standard} Level ${getConformanceLabel()} Audit`
            }
          </button>
        </div>
      )}

      {tab === 'pdf' && (
        <div className="glass-card animate-fade-in">
          <div
            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf" hidden onChange={e => { if (e.target.files?.[0]) setPdfFile(e.target.files[0]); }} />
            <div style={{ fontSize: 44, marginBottom: 14 }}>📄</div>
            {pdfFile ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{pdfFile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(pdfFile.size / 1024).toFixed(1)} KB · PDF Document</div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Drop PDF here or click to browse</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports .pdf files up to 50MB · WCAG PDF/UA checks</div>
              </div>
            )}
          </div>
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 18 }}
            onClick={startPdfAudit}
            disabled={loading || !pdfFile}
          >
            {loading
              ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Analyzing PDF...</>
              : '📊 Analyze PDF Accessibility'
            }
          </button>
        </div>
      )}
    </div>
  );
}
