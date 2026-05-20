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
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'website' | 'pdf' | 'image' | 'video'>('website');
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoProcessing, setVideoProcessing] = useState(false);

  // Scope mode
  const [scopeMode, setScopeMode] = useState<'general'|'specific'|'predefined'|'director'>('general');
  const [specificUrls, setSpecificUrls] = useState('');
  const [selectedJourney, setSelectedJourney] = useState<string|null>(null);
  const [aiDirection, setAiDirection] = useState('');
  const [journeySteps, setJourneySteps] = useState<{id:string;label:string;url:string}[]>([]);

  // WCAG level selection
  const [wcagLevelA, setWcagLevelA]     = useState(true);
  const [wcagLevelAA, setWcagLevelAA]   = useState(true);
  const [wcagLevelAAA, setWcagLevelAAA] = useState(false);
  const [standard, setStandard] = useState('WCAG 2.2');

  // TrustLens pillar toggles
  const [pillarA11y, setPillarA11y] = useState(true);
  const [pillarDP, setPillarDP] = useState(true);
  const [pillarPerf, setPillarPerf] = useState(true);
  const [pillarPrivacy, setPillarPrivacy] = useState(true);

  const getEnabledPillars = () => {
    const p: string[] = [];
    if (pillarA11y) p.push('accessibility');
    if (pillarDP) p.push('darkpatterns');
    if (pillarPerf) p.push('performance');
    if (pillarPrivacy) p.push('privacy');
    return p;
  };

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
    if (scopeMode === 'specific' && !specificUrls.trim()) { setError('Please enter at least one page URL'); return; }
    if (scopeMode === 'predefined' && !selectedJourney) { setError('Please select a journey'); return; }
    if (scopeMode === 'director' && journeySteps.length === 0) { setError('Add at least one step in Director Mode'); return; }
    const levels = getSelectedLevels();
    if (levels.length === 0) { setError('Select at least one WCAG level'); return; }
    setLoading(true); setError('');
    try {
      const body: Record<string, unknown> = {
        url, crawlDepth, maxPages, includeAI,
        wcagLevels: levels,
        standard,
        enabledPillars: getEnabledPillars(),
        // New scope fields
        scopeMode,
        specificUrls: scopeMode === 'specific' ? specificUrls.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
        selectedJourney: scopeMode === 'predefined' ? selectedJourney : undefined,
        journeySteps: scopeMode === 'director' ? journeySteps : undefined,
        aiDirection: (scopeMode === 'director' && aiDirection) ? aiDirection : undefined,
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

  const startImageAudit = async () => {
    if (!imageFile) { setError('Please select an image file'); return; }
    setLoading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', imageFile);
      form.append('pillars', getEnabledPillars().join(','));
      const res = await fetch('/api/audit/image', { method: 'POST', body: form });
      const data = await res.json();
      if (data.auditId) router.push(`/audit/${data.auditId}`);
      else setError(data.error || 'Failed to start image audit');
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const startVideoAudit = async () => {
    if (!videoFile) { setError('Please select a video file'); return; }
    setLoading(true); setVideoProcessing(true); setError('');
    try {
      // Client-side frame extraction via <canvas>
      const frames = await extractVideoFrames(videoFile, 8);
      const res = await fetch('/api/audit/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames, pillars: getEnabledPillars(), filename: videoFile.name }),
      });
      const data = await res.json();
      if (data.auditId) router.push(`/audit/${data.auditId}`);
      else setError(data.error || 'Failed to start video audit');
    } catch (e) { setError(e instanceof Error ? e.message : 'Video processing failed'); }
    setLoading(false); setVideoProcessing(false);
  };

  const extractVideoFrames = (file: File, count: number): Promise<Array<{ base64: string; mimeType: string; timestampMs: number }>> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = url; video.preload = 'metadata'; video.muted = true;
      video.onloadedmetadata = () => {
        const duration = video.duration;
        const times = Array.from({ length: count }, (_, i) => (duration / (count + 1)) * (i + 1) * 1000);
        const frames: Array<{ base64: string; mimeType: string; timestampMs: number }> = [];
        let idx = 0;
        const capture = () => {
          if (idx >= times.length) { URL.revokeObjectURL(url); resolve(frames); return; }
          video.currentTime = times[idx] / 1000;
          video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(video.videoWidth, 1280);
            canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
            canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push({ base64: canvas.toDataURL('image/jpeg', 0.7).split(',')[1], mimeType: 'image/jpeg', timestampMs: times[idx] });
            idx++; capture();
          };
        };
        capture();
      };
      video.onerror = () => reject(new Error('Failed to load video. Try MP4 or WebM format.'));
    });
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
        <h1 className="page-title">New TrustLens Audit</h1>
        <p className="page-subtitle">AI-powered 6-pillar digital trust audit: Accessibility · Dark Patterns · Performance · Privacy · Compliance Intelligence · Design Governance</p>
      </div>

      {/* TrustLens Pillar Selection */}
      <div className="glass-card animate-fade-in" style={{ marginBottom: 20, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>🛡️ Audit Pillars</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Select which compliance domains to audit</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { key: 'a11y', icon: '♿', label: 'Accessibility', desc: 'WCAG 2.2 compliance', color: '#0091DA', checked: pillarA11y, set: setPillarA11y },
            { key: 'dp', icon: '🕵️', label: 'Dark Patterns', desc: 'Ethical UX analysis', color: '#9B59B6', checked: pillarDP, set: setPillarDP },
            { key: 'perf', icon: '⚡', label: 'Performance', desc: 'Core Web Vitals', color: '#00BA8C', checked: pillarPerf, set: setPillarPerf },
            { key: 'priv', icon: '🔒', label: 'Privacy', desc: 'Tracker & cookie audit', color: '#E67E22', checked: pillarPrivacy, set: setPillarPrivacy },
          ].map(p => (
            <label key={p.key} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '14px 10px', borderRadius: 'var(--radius-md)',
              border: `2px solid ${p.checked ? p.color : 'var(--border)'}`,
              background: p.checked ? `${p.color}10` : 'transparent',
              cursor: 'pointer', transition: 'var(--transition)', textAlign: 'center',
            }}>
              <input type="checkbox" checked={p.checked} onChange={e => p.set(e.target.checked)}
                style={{ display: 'none' }} />
              <span style={{ fontSize: 24 }}>{p.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: p.checked ? p.color : 'var(--text-muted)' }}>{p.label}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.desc}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: 99,
                background: p.checked ? `${p.color}20` : 'rgba(255,255,255,0.05)',
                color: p.checked ? p.color : 'var(--text-muted)',
              }}>{p.checked ? '✓ Enabled' : 'Disabled'}</span>
            </label>
          ))}
        </div>
        {/* Coming Soon Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          {[
            { icon: '⚖️', label: 'Compliance Intelligence', desc: 'CCPA, RBI, SEBI, DPDPA governance mapping', color: '#06B6D4' },
            { icon: '🎨', label: 'Design Governance', desc: 'Design tokens, CTA hierarchy, brand compliance', color: '#EC4899' },
          ].map(p => (
            <div key={p.label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 'var(--radius-md)',
              border: `2px dashed ${p.color}50`,
              background: `${p.color}06`,
              opacity: 0.8, position: 'relative',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: p.color, marginBottom: 2 }}>{p.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.desc}</div>
              </div>
              <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: `${p.color}20`, color: p.color, border: `1px solid ${p.color}40`, whiteSpace: 'nowrap' }}>COMING SOON</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          {getEnabledPillars().length} of 4 active pillars enabled · Unified TrustLens Score calculated across all selected domains
        </div>
      </div>

      {/* WCAG Standard + Conformance — only when Accessibility pillar is enabled */}
      {pillarA11y && (
        <div className="glass-card animate-fade-in" style={{ marginBottom: 20, padding: '18px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
            <div className="input-group">
              <label className="input-label">Accessibility Standard</label>
              <select className="input-field" value={standard} onChange={e => setStandard(e.target.value)}>
                {STANDARDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Conformance Level</label>
              <div className="wcag-level-selector" style={{ paddingTop: 2 }}>
                <label className={`wcag-level-option ${wcagLevelA ? 'selected-a' : ''}`} title="WCAG Level A">
                  <input type="checkbox" checked={wcagLevelA} onChange={e => setWcagLevelA(e.target.checked)} /> Level A
                </label>
                <label className={`wcag-level-option ${wcagLevelAA ? 'selected-aa' : ''}`} title="WCAG Level AA">
                  <input type="checkbox" checked={wcagLevelAA} onChange={e => setWcagLevelAA(e.target.checked)} /> Level AA
                </label>
                <label className={`wcag-level-option ${wcagLevelAAA ? 'selected-aaa' : ''}`} title="WCAG Level AAA">
                  <input type="checkbox" checked={wcagLevelAAA} onChange={e => setWcagLevelAAA(e.target.checked)} /> Level AAA
                </label>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Audit Scope:</span>
            <span className={`audit-level-chip ${getConformanceLabel().toLowerCase()}`}>
              {standard} — Level {getConformanceLabel()}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'website' ? 'active' : ''}`} onClick={() => setTab('website')}>🌐 Website / Portal</button>
        <button className={`tab ${tab === 'pdf' ? 'active' : ''}`} onClick={() => setTab('pdf')}>📄 PDF Document</button>
        <button className={`tab ${tab === 'image' ? 'active' : ''}`} onClick={() => setTab('image')} style={{ position: 'relative' }}>
          📸 Screenshot / Image
          <span style={{ marginLeft: 5, fontSize: 8, padding: '1px 5px', borderRadius: 99, background: '#9B59B620', color: '#9B59B6', border: '1px solid #9B59B640', fontWeight: 700, verticalAlign: 'middle' }}>AI Vision</span>
        </button>
        <button className={`tab ${tab === 'video' ? 'active' : ''}`} onClick={() => setTab('video')} style={{ position: 'relative' }}>
          🎥 Video Recording
          <span style={{ marginLeft: 5, fontSize: 8, padding: '1px 5px', borderRadius: 99, background: '#E67E2220', color: '#E67E22', border: '1px solid #E67E2240', fontWeight: 700, verticalAlign: 'middle' }}>AI Vision</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(232,0,45,0.08)', border: '1px solid rgba(232,0,45,0.25)', borderRadius: 'var(--radius-md)', color: '#FF3356', fontSize: 13, marginBottom: 18 }}>
          {error}
        </div>
      )}

      {tab === 'website' && (
        <div className="glass-card animate-fade-in">
          {/* Base URL — always required */}
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Website URL *</label>
            <input id="website-url" className="input-field" type="url" placeholder="https://example.com" value={url} onChange={e => setUrl(e.target.value)} />
          </div>

          {/* ── AUDIT SCOPE — 4-mode selector ── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>📋 Audit Scope</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {([
                { id: 'general',    icon: '🌐', label: 'General Site Audit',  desc: 'Crawl & audit the full site automatically',    tags: ['URL + crawl depth', 'Max pages', 'Auto-discover'], rec: false },
                { id: 'specific',   icon: '📄', label: 'Specific Page(s)',     desc: 'Paste exact URLs — deep single-pass per page', tags: ['Named pages', 'Multi-URL input', 'No crawling'],  rec: false },
                { id: 'predefined', icon: '🗺️', label: 'Predefined Journey',   desc: 'Pick a known user flow — context-aware checks', tags: ['Journey-aware', 'Stage-by-stage', 'Pre-mapped'],  rec: true  },
                { id: 'director',   icon: '⭐', label: 'Director Mode',        desc: 'Build your own flow + AI direction prompt',    tags: ['Page sequencing', 'AI direction', 'Step notes'],  rec: false },
              ] as { id: 'general'|'specific'|'predefined'|'director'; icon: string; label: string; desc: string; tags: string[]; rec: boolean }[]).map(m => (
                <button key={m.id} id={`scope-mode-${m.id}`} onClick={() => setScopeMode(m.id)}
                  style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: `2px solid ${scopeMode === m.id ? '#9B59B6' : 'var(--border)'}`, background: scopeMode === m.id ? 'rgba(155,89,182,0.08)' : 'transparent', cursor: 'pointer', transition: 'var(--transition)', position: 'relative' }}>
                  {m.rec && <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 8, padding: '2px 6px', borderRadius: 99, background: '#9B59B620', color: '#9B59B6', border: '1px solid #9B59B640', fontWeight: 700 }}>★ REC</span>}
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{m.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: scopeMode === m.id ? '#9B59B6' : 'var(--text-primary)', marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>{m.desc}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {m.tags.map(t => <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{t}</span>)}
                  </div>
                </button>
              ))}
            </div>

            {/* MODE 1 — General */}
            {scopeMode === 'general' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="input-group">
                  <label className="input-label">Crawl Depth</label>
                  <select className="input-field" value={crawlDepth} onChange={e => setCrawlDepth(+e.target.value)}>
                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} level{v>1?'s':''}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Max Pages</label>
                  <select className="input-field" value={maxPages} onChange={e => setMaxPages(+e.target.value)}>
                    {[1,3,5,10,20,30,50,100,200].map(v => <option key={v} value={v}>{v} pages</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">AI Analysis</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 0' }}>
                    <input type="checkbox" checked={includeAI} onChange={e => setIncludeAI(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Enable GPT-4o</span>
                  </label>
                </div>
              </div>
            )}

            {/* MODE 2 — Specific Pages */}
            {scopeMode === 'specific' && (
              <div>
                <div className="input-group" style={{ marginBottom: 8 }}>
                  <label className="input-label">Page URLs (one per line)</label>
                  <textarea id="specific-urls" className="input-field" rows={4} placeholder={"https://example.com/checkout\nhttps://example.com/pricing\nhttps://example.com/account/cancel"} value={specificUrls} onChange={e => setSpecificUrls(e.target.value)} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>No crawling — each URL gets a deep single-pass audit. Best for targeted transactional pages.</div>
              </div>
            )}

            {/* MODE 3 — Predefined Journey */}
            {scopeMode === 'predefined' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select a Journey</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                  {([
                    { id:'login',        icon:'🔐', label:'Login Flow',            flow:'Landing → Login form → Auth → Dashboard',         checks:'Forced continuity, confirmshaming', stages:4 },
                    { id:'account',      icon:'👤', label:'Account Creation',       flow:'Signup → Verify → Onboarding → Dashboard',         checks:'Trick questions, consent bundling',  stages:4 },
                    { id:'checkout',     icon:'🛒', label:'Checkout Flow',          flow:'Cart → Shipping → Payment → Confirmation',         checks:'Hidden costs, fake urgency, sneak-in-basket', stages:4 },
                    { id:'cancel',       icon:'❌', label:'Cancellation',           flow:'Account settings → Cancel → Retention → Done',     checks:'Roach Motel detection',             stages:4 },
                    { id:'consent',      icon:'🍪', label:'Consent & Cookie Flow',  flow:'Banner → Preference centre → Privacy settings',    checks:'Pre-ticked boxes, reject hiding',    stages:3 },
                    { id:'subscription', icon:'📈', label:'Subscription Upgrade',   flow:'Plan page → Compare → Payment → Confirm',          checks:'Price anchoring, free trial traps',  stages:4 },
                    { id:'search',       icon:'🔍', label:'Search & Discovery',     flow:'Search → Filter → Listing → Product Detail',       checks:'Misdirection, fake scarcity',        stages:4 },
                    { id:'profile',      icon:'⚙️', label:'Profile & Data Settings',flow:'Profile → Data sharing → Notifications → Privacy', checks:'Privacy Zuckering, hard-to-find opt-outs', stages:4 },
                    { id:'custom',       icon:'➕', label:'Create Custom Journey',   flow:'Define your own flow from scratch',                 checks:'Director Mode unlocked',             stages:0 },
                  ]).map(j => (
                    <button key={j.id} id={`journey-${j.id}`} onClick={() => { setSelectedJourney(j.id); if (j.id === 'custom') setScopeMode('director'); }}
                      style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: `2px solid ${selectedJourney===j.id ? '#9B59B6' : 'var(--border)'}`, background: selectedJourney===j.id ? 'rgba(155,89,182,0.08)' : 'transparent', cursor: 'pointer', transition: 'var(--transition)' }}>
                      <div style={{ fontSize: 16, marginBottom: 3 }}>{j.icon}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: selectedJourney===j.id ? '#9B59B6' : 'var(--text-primary)', marginBottom: 3 }}>{j.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, lineHeight: 1.4 }}>{j.flow}</div>
                      <div style={{ fontSize: 9, color: '#9B59B6', opacity: 0.8 }}>{j.stages > 0 ? `${j.stages} stages` : ''}</div>
                    </button>
                  ))}
                </div>
                {selectedJourney && selectedJourney !== 'custom' && (
                  <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(155,89,182,0.05)', border: '1px solid rgba(155,89,182,0.2)', fontSize: 11, color: 'var(--text-secondary)' }}>
                    ✓ Journey selected. The audit engine will navigate these steps in sequence and apply context-aware dark pattern checks at each stage.
                  </div>
                )}
              </div>
            )}

            {/* MODE 4 — Director Mode */}
            {scopeMode === 'director' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step-by-Step Page Flow</div>
                <div style={{ marginBottom: 10 }}>
                  {journeySteps.map((step, i) => (
                    <div key={step.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#9B59B6', textAlign: 'center' }}>{i+1}</span>
                      <input className="input-field" placeholder="Page label (e.g. Checkout)" value={step.label} onChange={e => setJourneySteps(s => s.map(x => x.id===step.id ? {...x,label:e.target.value} : x))} style={{ fontSize: 12 }} />
                      <input className="input-field" placeholder="https://example.com/checkout" value={step.url} onChange={e => setJourneySteps(s => s.map(x => x.id===step.id ? {...x,url:e.target.value} : x))} style={{ fontSize: 12 }} />
                      <button onClick={() => setJourneySteps(s => s.filter(x => x.id!==step.id))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                  ))}
                  <button id="add-journey-step" onClick={() => setJourneySteps(s => [...s, {id:crypto.randomUUID(),label:'',url:''}])}
                    style={{ fontSize: 12, color: '#9B59B6', background: 'none', border: '1px dashed rgba(155,89,182,0.4)', borderRadius: 'var(--radius-sm)', padding: '6px 14px', cursor: 'pointer', width: '100%', marginTop: 4 }}>
                    + Add step
                  </button>
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ color: '#9B59B6' }}>AI Audit Direction <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 10 }}>— natural language instruction to the audit engine</span></label>
                  <textarea id="ai-direction" className="input-field" rows={3} placeholder={'Focus on hidden cost patterns between pricing and checkout. Flag any pre-ticked add-ons, detect urgency signals, and check if the free trial converts silently to paid.'} value={aiDirection} onChange={e => setAiDirection(e.target.value)} style={{ resize: 'vertical', fontSize: 12, fontStyle: aiDirection ? 'normal' : 'italic' }} />
                </div>
              </div>
            )}
          </div>

          {/* Login Config */}
          <div style={{ marginBottom: 16 }}>
            <div className="collapsible-header" onClick={() => setShowLogin(!showLogin)}>
              <span>🔐 Login Configuration (authenticated portals)</span>
              <span style={{ transform: showLogin ? 'rotate(180deg)' : '', transition: 'var(--transition)', fontSize: 12 }}>▼</span>
            </div>
            {showLogin && (
              <div className="collapsible-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="input-group"><label className="input-label">Login URL</label><input className="input-field" placeholder="https://example.com/login" value={loginUrl} onChange={e => setLoginUrl(e.target.value)} /></div>
                  <div className="input-group"><label className="input-label">Submit Selector</label><input className="input-field" placeholder='button[type="submit"]' value={submitSelector} onChange={e => setSubmitSelector(e.target.value)} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="input-group"><label className="input-label">Username</label><input className="input-field" placeholder="user@example.com" value={username} onChange={e => setUsername(e.target.value)} /></div>
                  <div className="input-group"><label className="input-label">Password</label><input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group"><label className="input-label">Username Selector</label><input className="input-field" placeholder="#username" value={usernameSelector} onChange={e => setUsernameSelector(e.target.value)} /></div>
                  <div className="input-group"><label className="input-label">Password Selector</label><input className="input-field" placeholder="#password" value={passwordSelector} onChange={e => setPasswordSelector(e.target.value)} /></div>
                </div>
              </div>
            )}
          </div>

          <button id="start-audit-btn" className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={startWebsiteAudit} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Running Audit...</> : `🚀 Start TrustLens Audit (${getEnabledPillars().length} pillars)`}
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
          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 18 }} onClick={startPdfAudit} disabled={loading || !pdfFile}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Analyzing PDF...</> : '📊 Analyze PDF Accessibility'}
          </button>
        </div>
      )}

      {/* ── IMAGE AUDIT TAB ──────────────────────────────────── */}
      {tab === 'image' && (
        <div className="glass-card animate-fade-in">
          <div style={{ padding: '10px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>📸</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Screenshot / Image Audit</span>
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: '#9B59B620', color: '#9B59B6', border: '1px solid #9B59B640', fontWeight: 700 }}>GPT-4o Vision</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Upload a screenshot or UI image. GPT-4o will analyse it across your selected pillars. ~70% confidence — complements DOM auditing.
            </p>
          </div>

          <div
            className="upload-area"
            onClick={() => imageRef.current?.click()}
            style={{ borderColor: imageFile ? '#9B59B6' : undefined, background: imageFile ? 'rgba(155,89,182,0.06)' : undefined }}
          >
            <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden
              onChange={e => { if (e.target.files?.[0]) { setImageFile(e.target.files[0]); setError(''); } }} />
            <div style={{ fontSize: 44, marginBottom: 14 }}>📸</div>
            {imageFile ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#9B59B6', marginBottom: 4 }}>{imageFile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(imageFile.size / 1024).toFixed(1)} KB · {imageFile.type}</div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Click to upload screenshot or UI image</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports JPEG, PNG, WebP, GIF · Max 20MB</div>
              </div>
            )}
          </div>

          <div style={{ margin: '14px 0', padding: '10px 14px', borderRadius: 8, background: 'rgba(155,89,182,0.06)', border: '1px solid rgba(155,89,182,0.2)', fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: '#9B59B6', marginBottom: 4 }}>🔬 What Vision AI checks per pillar:</div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <span style={{ color: '#0091DA', fontWeight: 600 }}>♿ A11Y:</span> Contrast, focus indicators, label visibility, text size, heading hierarchy<br/>
              <span style={{ color: '#9B59B6', fontWeight: 600 }}>🕵️ Dark Patterns:</span> Consent asymmetry, urgency cues, confirmshaming, disguised CTAs<br/>
              <span style={{ color: '#00BA8C', fontWeight: 600 }}>⚡ Performance:</span> Loading states, layout shifts, image density, font rendering<br/>
              <span style={{ color: '#E67E22', fontWeight: 600 }}>🔒 Privacy:</span> Consent banner quality, reject option, privacy policy link visibility
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={startImageAudit} disabled={loading || !imageFile}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Analysing with GPT-4o...</> : `👁️ Analyse Image (${getEnabledPillars().length} pillar${getEnabledPillars().length !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}

      {/* ── VIDEO AUDIT TAB ──────────────────────────────────── */}
      {tab === 'video' && (
        <div className="glass-card animate-fade-in">
          <div style={{ padding: '10px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>🎥</span>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Video Recording Audit</span>
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: '#E67E2220', color: '#E67E22', border: '1px solid #E67E2240', fontWeight: 700 }}>Frame Sampling</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Upload a screen recording. 8 frames are extracted automatically in your browser via Canvas API, then analysed by GPT-4o. ~60% confidence.
            </p>
          </div>

          <div
            className="upload-area"
            onClick={() => videoRef.current?.click()}
            style={{ borderColor: videoFile ? '#E67E22' : undefined, background: videoFile ? 'rgba(230,126,34,0.06)' : undefined }}
          >
            <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/mov,video/quicktime" hidden
              onChange={e => { if (e.target.files?.[0]) { setVideoFile(e.target.files[0]); setError(''); } }} />
            <div style={{ fontSize: 44, marginBottom: 14 }}>🎥</div>
            {videoFile ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#E67E22', marginBottom: 4 }}>{videoFile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(videoFile.size / 1024 / 1024).toFixed(1)} MB · {videoFile.type || 'video'}</div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Click to upload screen recording</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports MP4, WebM, MOV · Max 500MB</div>
              </div>
            )}
          </div>

          <div style={{ margin: '14px 0', padding: '10px 14px', borderRadius: 8, background: 'rgba(230,126,34,0.06)', border: '1px solid rgba(230,126,34,0.2)', fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: '#E67E22', marginBottom: 6 }}>🎬 How video analysis works:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div>✦ 8 frames extracted evenly from video duration</div>
              <div>✦ Frame extraction happens in your browser (Canvas API)</div>
              <div>✦ Each frame analysed by GPT-4o per selected pillar</div>
              <div>✦ Duplicate findings automatically deduplicated</div>
              <div>✦ Results same as a standard audit report</div>
              <div>✦ No video data stored — frames only</div>
            </div>
          </div>

          {videoProcessing && (
            <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.3)', fontSize: 12, color: '#E67E22', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(230,126,34,0.3)', borderTopColor: '#E67E22' }} />
              Extracting frames from video in browser... this may take a moment.
            </div>
          )}

          <button className="btn btn-primary btn-lg" style={{ width: '100%', background: 'linear-gradient(135deg, #E67E22, #D35400)' }} onClick={startVideoAudit} disabled={loading || !videoFile}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {videoProcessing ? 'Extracting frames...' : 'Analysing...'}</> : `🎬 Analyse Video (${getEnabledPillars().length} pillar${getEnabledPillars().length !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}
    </div>
  );
}

