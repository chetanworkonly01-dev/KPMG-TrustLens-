'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

  const startWebsiteAudit = async () => {
    if (!url) { setError('Please enter a URL'); return; }
    setLoading(true); setError('');
    try {
      const body: Record<string, unknown> = { url, crawlDepth, maxPages, includeAI };
      if (showLogin && username && password) {
        body.loginConfig = { loginUrl: loginUrl || url, username, password, usernameSelector, passwordSelector, submitSelector };
      }
      const res = await fetch('/api/audit/website', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
    <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">New Accessibility Audit</h1>
        <p className="page-subtitle">Analyze websites, portals, or PDFs against WCAG 2.2 standards</p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button className={`tab ${tab === 'website' ? 'active' : ''}`} onClick={() => setTab('website')}>🌐 Website / Portal</button>
        <button className={`tab ${tab === 'pdf' ? 'active' : ''}`} onClick={() => setTab('pdf')}>📄 PDF Document</button>
      </div>

      {error && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#EF4444', fontSize: 14, marginBottom: 20 }}>{error}</div>}

      {tab === 'website' && (
        <div className="glass-card animate-fade-in">
          {/* URL Input */}
          <div className="input-group" style={{ marginBottom: 20 }}>
            <label className="input-label">Website URL *</label>
            <input className="input-field" type="url" placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} />
          </div>

          {/* Options Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="input-group">
              <label className="input-label">Crawl Depth</label>
              <select className="input-field" value={crawlDepth} onChange={e => setCrawlDepth(+e.target.value)}>
                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} level{v > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Max Pages</label>
              <select className="input-field" value={maxPages} onChange={e => setMaxPages(+e.target.value)}>
                {[1,3,5,10,15,20].map(v => <option key={v} value={v}>{v} pages</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">AI Analysis</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '12px 0' }}>
                <input type="checkbox" checked={includeAI} onChange={e => setIncludeAI(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent-blue)' }} />
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Enable GPT-4</span>
              </label>
            </div>
          </div>

          {/* Login Config */}
          <div style={{ marginBottom: 20 }}>
            <div className="collapsible-header" onClick={() => setShowLogin(!showLogin)}>
              <span>🔐 Login Configuration (optional)</span>
              <span style={{ transform: showLogin ? 'rotate(180deg)' : '', transition: 'var(--transition)' }}>▼</span>
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

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={startWebsiteAudit} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Running Audit...</> : '🚀 Start Accessibility Audit'}
          </button>
        </div>
      )}

      {tab === 'pdf' && (
        <div className="glass-card animate-fade-in">
          <div className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept=".pdf" hidden onChange={e => { if (e.target.files?.[0]) setPdfFile(e.target.files[0]); }} />
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            {pdfFile ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{pdfFile.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(pdfFile.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Drop PDF here or click to browse</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Supports .pdf files up to 50MB</div>
              </div>
            )}
          </div>
          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 20 }} onClick={startPdfAudit} disabled={loading || !pdfFile}>
            {loading ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Analyzing...</> : '📊 Analyze PDF Accessibility'}
          </button>
        </div>
      )}
    </div>
  );
}
