'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

// ── Types ────────────────────────────────────────────────────
interface Issue {
  id: string; testId: string; title: string; description: string;
  element: string; elementHtml?: string; pageUrl: string;
  wcagCriterion: string; wcagName: string; wcagLevel: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string; recommendation: string; codeFix?: string;
  category: string; source: string; confidence?: string;
}
interface Score {
  overall: number; categoryScores: Record<string, number>;
  complianceLevel: string; totalIssues: number; uniqueIssues?: number;
  issueBySeverity: Record<string, number>; issueByLevel: Record<string, number>;
  testsRun: number; testsPassed: number; testsFailed: number;
}
interface AuditData {
  id: string; status: string;
  config: { url?: string; type: string; wcagLevels?: string[]; standard?: string };
  pages: { url: string; title: string }[];
  issues: Issue[]; score: Score;
  report?: {
    testedLevel?: string;
    executiveSummary: string;
    groupedIssues?: GroupedIssue[];
    wcagMapping: { criterion: string; name: string; level: string; issueCount: number; status: string }[];
    pageBreakdown: PageBreak[];
    remediationPlan: RemStep[];
  };
  crawlCoverage?: { totalPagesFound: number; pagesAudited: number; coveragePercent: number };
  startedAt: string; completedAt?: string;
}
interface GroupedIssue {
  issueKey: string; title: string; wcagCriterion: string; wcagName: string;
  wcagLevel: string; severity: string; category: string;
  description: string; recommendation: string; codeFix?: string;
  occurrenceCount: number; affectedPages: string[]; frequency: number;
}
interface PageBreak { url: string; title: string; score: number; issueCount: number; criticalCount: number; highCount: number; mediumCount: number; lowCount: number; }
interface RemStep { priority: number; severity: string; title: string; description: string; affectedPages: string[]; estimatedEffort: string; frequency?: number; }

// ── Derived helpers ───────────────────────────────────────────
type TeamOwner = 'Frontend Dev' | 'Designer' | 'Content' | 'QA' | 'PDF Team' | 'Design System';
type EffortLabel = 'Quick Win' | '1 Sprint' | 'Half-day' | '1 hour';
type IssueStatus = 'Open' | 'In Review' | 'Fixed' | 'Verified';

function deriveTeam(issue: Issue): TeamOwner {
  const c = issue.wcagCriterion;
  if (['1.1.1','1.2.1','1.2.2','1.2.5'].includes(c)) return 'Content';
  if (['1.4.3','1.4.11','1.3.3'].includes(c)) return 'Designer';
  if (issue.source === 'pdf-analyzer' || issue.category === 'pdf') return 'PDF Team';
  if (['1.3.1','4.1.2','4.1.3'].includes(c)) return 'Design System';
  if (['3.3.1','3.3.2','3.3.3'].includes(c)) return 'Frontend Dev';
  if (issue.source === 'journey-test') return 'QA';
  return 'Frontend Dev';
}

function deriveEffort(issue: Issue): EffortLabel {
  if (issue.severity === 'low') return 'Quick Win';
  if (issue.severity === 'medium') return '1 hour';
  if (issue.severity === 'high') return 'Half-day';
  return '1 Sprint';
}

function deriveComponent(issue: Issue): string {
  const t = (issue.title + ' ' + issue.element).toLowerCase();
  if (t.includes('button') || t.includes('btn')) return 'Buttons';
  if (t.includes('form') || t.includes('input') || t.includes('label') || t.includes('select') || t.includes('textarea')) return 'Forms';
  if (t.includes('modal') || t.includes('dialog')) return 'Modals';
  if (t.includes('nav') || t.includes('menu') || t.includes('link')) return 'Navigation';
  if (t.includes('table') || t.includes('grid')) return 'Tables';
  if (t.includes('img') || t.includes('image') || t.includes('alt')) return 'Images';
  if (t.includes('pdf')) return 'PDF';
  if (t.includes('heading') || t.includes('h1') || t.includes('h2')) return 'Headings';
  if (t.includes('color') || t.includes('contrast')) return 'Colour & Contrast';
  if (t.includes('focus') || t.includes('keyboard')) return 'Keyboard & Focus';
  if (t.includes('aria') || t.includes('role')) return 'ARIA & Semantics';
  return 'General';
}

function deriveAcceptanceCriteria(issue: Issue): string[] {
  const criteria: string[] = [];
  const c = issue.wcagCriterion;
  if (c === '2.1.1' || c === '2.1.2') { criteria.push('Keyboard navigation works fully without a mouse', 'No keyboard trap exists'); }
  if (c === '2.4.7' || c === '1.4.11') { criteria.push('Focus indicator is clearly visible on all interactive elements', 'Focus contrast ratio meets 3:1 minimum'); }
  if (c === '1.4.3') { criteria.push('Text contrast ratio meets 4.5:1 (normal text) or 3:1 (large text)', 'Verified with a contrast analyser tool'); }
  if (c === '1.1.1') { criteria.push('All meaningful images have descriptive alt text', 'Decorative images have empty alt="" or aria-hidden="true"'); }
  if (c === '4.1.2') { criteria.push('Screen reader announces the control name, role and state correctly', 'ARIA attributes are valid and reference existing elements'); }
  if (c.startsWith('3.3')) { criteria.push('Error messages are programmatically associated with the input', 'Error is announced by screen reader without requiring visual reference'); }
  if (c === '2.4.1') { criteria.push('"Skip to main content" link is the first focusable element', 'Link becomes visible on focus'); }
  if (criteria.length === 0) {
    criteria.push('Issue is no longer reproducible by the steps provided', 'Screen reader announces the element correctly', 'WCAG ' + c + ' criterion is met');
  }
  return criteria;
}

// ── Palette ────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string>  = { critical: '#E8002D', high: '#FF6B00', medium: '#F0AB00', low: '#0091DA' };
const SEV_BG: Record<string, string>     = { critical: 'rgba(232,0,45,0.08)', high: 'rgba(255,107,0,0.08)', medium: 'rgba(240,171,0,0.08)', low: 'rgba(0,145,218,0.08)' };
const TEAM_COLOR: Record<string, string> = { 'Frontend Dev': '#0091DA', 'Designer': '#A78BFA', 'Content': '#00B2A9', 'QA': '#00BA8C', 'PDF Team': '#F0AB00', 'Design System': '#FF6B00' };
const EFFORT_COLOR: Record<string, string> = { 'Quick Win': '#00BA8C', '1 hour': '#0091DA', 'Half-day': '#F0AB00', '1 Sprint': '#FF6B00' };
const COMP_ICON: Record<string, string>  = { Buttons: '🔘', Forms: '📋', Modals: '🪟', Navigation: '🧭', Tables: '📊', Images: '🖼️', PDF: '📄', Headings: '📝', 'Colour & Contrast': '🎨', 'Keyboard & Focus': '⌨️', 'ARIA & Semantics': '♿', General: '🔍' };

// ── Stat Tile ─────────────────────────────────────────────────
function Tile({ val, label, color, sub }: { val: string | number; label: string; color: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, borderRadius: 'var(--radius-md)', padding: '16px 18px' }}>
      <div style={{ fontSize: 28, fontWeight: 300, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{val}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Issue Card ────────────────────────────────────────────────
function IssueCard({ issue, idx, status, onStatusChange }: {
  issue: Issue; idx: number;
  status: IssueStatus; onStatusChange: (id: string, s: IssueStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const team = deriveTeam(issue);
  const effort = deriveEffort(issue);
  const component = deriveComponent(issue);
  const acceptance = deriveAcceptanceCriteria(issue);
  const statusColors: Record<IssueStatus, string> = { Open: '#FF3356', 'In Review': '#F0AB00', Fixed: '#0091DA', Verified: '#00BA8C' };

  return (
    <div style={{
      border: `1px solid ${open ? 'var(--border-hover)' : 'var(--border)'}`,
      borderLeft: `3px solid ${SEV_COLOR[issue.severity]}`,
      borderRadius: 'var(--radius-md)',
      background: open ? 'var(--bg-card-hover)' : 'var(--bg-card)',
      marginBottom: 8, transition: 'var(--transition)'
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', flexWrap: 'wrap' }}
           onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', flexShrink: 0 }}>#{String(idx).padStart(3,'0')}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{issue.title}</span>
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>{issue.pageUrl.replace(/^https?:\/\/[^/]+/, '') || '/'}</span>
        </div>
        {/* Badges row */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: SEV_BG[issue.severity], color: SEV_COLOR[issue.severity], border: `1px solid ${SEV_COLOR[issue.severity]}40`, textTransform: 'uppercase' }}>
            {issue.severity}
          </span>
          <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${TEAM_COLOR[team]}15`, color: TEAM_COLOR[team], border: `1px solid ${TEAM_COLOR[team]}30` }}>
            {team}
          </span>
          <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${EFFORT_COLOR[effort]}15`, color: EFFORT_COLOR[effort], border: `1px solid ${EFFORT_COLOR[effort]}30` }}>
            {effort}
          </span>
          <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: 'rgba(0,145,218,0.1)', color: '#0091DA' }}>
            {issue.wcagCriterion}
          </span>
          {/* Status picker */}
          <select
            value={status}
            onChange={e => { e.stopPropagation(); onStatusChange(issue.id, e.target.value as IssueStatus); }}
            onClick={e => e.stopPropagation()}
            style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700, border: `1px solid ${statusColors[status]}40`, background: `${statusColors[status]}15`, color: statusColors[status], cursor: 'pointer', fontFamily: 'Open Sans, sans-serif', outline: 'none' }}
          >
            {(['Open','In Review','Fixed','Verified'] as IssueStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : '', transition: '0.2s', userSelect: 'none' }}>▼</span>
        </div>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ padding: '0 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 4 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Left col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Section label="WCAG Reference">
                <strong>{issue.wcagCriterion}</strong> — {issue.wcagName} <span style={{ padding: '1px 6px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: 'rgba(0,145,218,0.1)', color: '#0091DA', marginLeft: 4 }}>Level {issue.wcagLevel}</span>
              </Section>
              <Section label="Component">
                {COMP_ICON[component] || '🔍'} {component}
              </Section>
              <Section label="Steps to Reproduce">
                <ol style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>Navigate to: <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>{issue.pageUrl}</code></li>
                  <li>Locate: <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3 }}>{issue.element.substring(0,60)}</code></li>
                  <li>Attempt to interact using keyboard only (Tab, Enter, Space)</li>
                  <li>Enable a screen reader (NVDA/JAWS/VoiceOver) and navigate to the element</li>
                </ol>
              </Section>
              <Section label="Current vs Expected Behaviour">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: 'rgba(232,0,45,0.06)', border: '1px solid rgba(232,0,45,0.2)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#FF3356', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>❌ Current</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{issue.description.substring(0, 200)}</div>
                  </div>
                  <div style={{ background: 'rgba(0,186,140,0.06)', border: '1px solid rgba(0,186,140,0.2)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#00BA8C', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>✅ Expected</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{issue.recommendation.substring(0, 200)}</div>
                  </div>
                </div>
              </Section>
            </div>

            {/* Right col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Section label="Affected Element (HTML)">
                {issue.elementHtml
                  ? <pre style={{ margin: 0, fontSize: 11, background: '#010B1A', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 10px', overflowX: 'auto', color: '#B0D4F0', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{issue.elementHtml.substring(0, 400)}</pre>
                  : <code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{issue.element}</code>
                }
              </Section>
              {issue.codeFix && (
                <Section label="Recommended Code Fix">
                  <pre style={{ margin: 0, fontSize: 11, background: '#010B1A', border: '1px solid rgba(0,186,140,0.25)', borderRadius: 4, padding: '8px 10px', overflowX: 'auto', color: '#86EFAC', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{issue.codeFix.substring(0, 500)}</pre>
                </Section>
              )}
              <Section label="✅ Done When (Acceptance Criteria)">
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {acceptance.map((a, i) => (
                    <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 2 }}>{a}</li>
                  ))}
                </ul>
              </Section>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${TEAM_COLOR[team]}15`, color: TEAM_COLOR[team], border: `1px solid ${TEAM_COLOR[team]}30` }}>
                  👤 Owner: {team}
                </span>
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: 'rgba(107,114,128,0.1)', color: '#8BA3C7', border: '1px solid rgba(107,114,128,0.2)' }}>
                  🔍 Source: {issue.source}
                </span>
                {issue.confidence && (
                  <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: 'rgba(0,145,218,0.08)', color: '#0091DA', border: '1px solid rgba(0,145,218,0.2)' }}>
                    🎯 Confidence: {issue.confidence}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

// ── Main Report Page ──────────────────────────────────────────
export default function FinalReportPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<AuditData | null>(null);
  const [activeTab, setActiveTab] = useState('executive');
  const [statusMap, setStatusMap] = useState<Record<string, IssueStatus>>({});
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [sevFilter, setSevFilter] = useState<string>('all');
  const [effortFilter, setEffortFilter] = useState<string>('all');
  const [compFilter, setCompFilter] = useState<string>('all');
  const [printMode, setPrintMode] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/audit/${id}`);
    if (res.ok) setData(await res.json());
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = (issueId: string, s: IssueStatus) => {
    setStatusMap(prev => ({ ...prev, [issueId]: s }));
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['ID','Title','Page','WCAG','Level','Severity','Team','Effort','Component','Status','Description','Acceptance Criteria']
    ];
    data.issues.forEach((issue, i) => {
      rows.push([
        `#${String(i+1).padStart(3,'0')}`,
        issue.title,
        issue.pageUrl,
        issue.wcagCriterion,
        issue.wcagLevel,
        issue.severity,
        deriveTeam(issue),
        deriveEffort(issue),
        deriveComponent(issue),
        statusMap[issue.id] || 'Open',
        `"${issue.description.replace(/"/g,'""')}"`,
        `"${deriveAcceptanceCriteria(issue).join(' | ')}"`,
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `kpmg-accessibility-backlog-${id}.csv`; a.click();
  };

  if (!data) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><div className="spinner" /></div>;
  if (data.status !== 'complete') return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <div style={{ fontSize: 42, marginBottom: 12 }}>⏳</div>
      <h2>Audit still in progress…</h2>
      <a href={`/audit/${id}`} className="btn btn-primary" style={{ marginTop: 16 }}>View Live Progress →</a>
    </div>
  );

  const issues = data.issues || [];
  const score = data.score;
  const testedLevel = data.report?.testedLevel || 'AA';
  const standard = data.config?.standard || 'WCAG 2.2';
  const reportDate = data.completedAt ? new Date(data.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';

  // Derived issue augmentation
  const augmented   = issues.map(i => ({ ...i, team: deriveTeam(i), effort: deriveEffort(i), component: deriveComponent(i) }));
  const quickWins   = augmented.filter(i => i.effort === 'Quick Win');
  const critical    = augmented.filter(i => i.severity === 'critical');
  const highPri     = augmented.filter(i => i.severity === 'high');
  const medPri      = augmented.filter(i => i.severity === 'medium');

  // Filtered issues for backlog
  const filtered = augmented.filter(i =>
    (teamFilter === 'all' || i.team === teamFilter) &&
    (sevFilter === 'all' || i.severity === sevFilter) &&
    (effortFilter === 'all' || i.effort === effortFilter) &&
    (compFilter === 'all' || i.component === compFilter)
  );

  // Component groups
  const compGroups: Record<string, typeof augmented> = {};
  augmented.forEach(i => { if (!compGroups[i.component]) compGroups[i.component] = []; compGroups[i.component].push(i); });

  // Team groups for Remediation tab
  const teamGroups: Record<string, typeof augmented> = {};
  augmented.forEach(i => { if (!teamGroups[i.team]) teamGroups[i.team] = []; teamGroups[i.team].push(i); });

  const TEAM_NOTES: Record<string, string> = {
    'Frontend Dev': 'Focus on semantic HTML structure, keyboard event handlers, ARIA attributes, focus management, and form error handling. Use native HTML elements before ARIA.',
    'Designer': 'Review color contrast ratios, focus indicator visibility, touch target sizing, and visual hierarchy. Update design tokens in the design system to prevent recurrence.',
    'Content': 'Provide descriptive alt text for all meaningful images, rewrite vague link text, ensure heading hierarchy reflects page structure, and update button labels.',
    'Design System': 'These issues indicate a systemic problem. Fixing the component at the design-system level will resolve all instances across every page automatically.',
    'QA': 'Convert each issue into a regression test case. Add keyboard-only and screen-reader test runs to your CI/CD pipeline to prevent recurrence.',
    'PDF Team': 'Ensure all PDF documents are tagged, have a logical reading order, include alt text for images, and declare the document language.',
  };

  const REMEDIATION_GUIDES: Record<string, { icon: string; items: string[] }> = {
    'Frontend Dev': { icon: '💻', items: [
      'Use semantic HTML elements: <button>, <nav>, <main>, <header>, <footer>, <article>',
      'Never remove focus indicators without providing an equivalent: outline or box-shadow',
      'Manage focus explicitly after modal open/close and route changes',
      'Associate every form input with a <label> for="id" or aria-label',
      'Use aria-live="assertive" only for errors; aria-live="polite" for status updates',
      'Add keyboard handlers (Enter/Space) alongside click handlers on custom widgets',
      'Avoid positive tabindex values; use DOM order for logical tab sequence',
    ]},
    'Designer': { icon: '🎨', items: [
      'Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text (≥18pt or 14pt bold)',
      'UI component contrast (borders, icons): minimum 3:1 against background',
      'Touch targets: minimum 44×44px (WCAG 2.5.5) or 24×24px with spacing (WCAG 2.5.8)',
      'Never rely on color alone to convey information—add text, icons, or pattern',
      'Ensure focus state is visible with a 3:1 contrast ratio against adjacent color',
      'Design a visible, styled skip-link that appears on keyboard focus',
    ]},
    'Content': { icon: '✏️', items: [
      'Alt text: describe the purpose of the image, not its appearance. Decorative → alt=""',
      'Link text must describe the destination without relying on surrounding context',
      'Button labels must clearly state the action (not "Click here" or "Submit")',
      'Each page must have a unique, descriptive <title> tag',
      'Heading levels (h1→h2→h3) must follow a logical outline—never skip levels',
      'Provide transcripts for audio and captions for video content',
    ]},
    'PDF Team': { icon: '📄', items: [
      'Tag all PDF elements: headings, paragraphs, lists, tables, figures, and form fields',
      'Set the document language in Document Properties → Accessibility',
      'Specify logical reading order in the Tags panel—must match visual order',
      'All images must have alt text in the tag properties',
      'Tables must have header cells tagged as <TH> with scope="col" or "row"',
      'Form fields must have tooltips or accessibility descriptions set',
      'Set tab order to use document structure order',
    ]},
    'QA': { icon: '🧪', items: [
      'Run Axe or Wave on every PR as part of CI/CD pipeline',
      'Test keyboard-only navigation on every interactive page component',
      'Test with screen readers: NVDA+Chrome, JAWS+IE Edge, VoiceOver+Safari',
      'Verify focus never gets lost after dynamic content changes (modal, drawer, toast)',
      'Check that all form errors are announced by the screen reader without refresh',
      'Zoom to 200%—verify no horizontal scrolling and no content overlap',
    ]},
    'Design System': { icon: '🧩', items: [
      'Audit every base component (Button, Input, Select, Modal, Tab, Table)',
      'Bake accessibility into component defaults—do not leave it to implementation',
      'Document keyboard interaction patterns for every interactive component',
      'Store accessible color tokens in the design system; flag non-compliant combos',
      'Write automated accessibility unit tests using jest-axe for every component',
      'Add WCAG checklist to the component contribution template',
    ]},
  };

  const TABS = [
    { id: 'executive',    label: '📊 Executive Summary' },
    { id: 'backlog',      label: '🐛 Issue Backlog' },
    { id: 'components',   label: '🧩 Components' },
    { id: 'remediation',  label: '🔧 Remediation Guide' },
    { id: 'priority',     label: '🎯 Priority Matrix' },
    { id: 'acceptance',   label: '✅ Acceptance / QA' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* ── Report Header ───────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #00338D 0%, #005EB8 60%, #0091DA 100%)',
        padding: '32px 0 28px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -60, right: -80, width: 380, height: 380, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div className="container" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <Image src="/kpmg-logo-dark.svg" alt="KPMG" width={100} height={30} style={{ width: 100, height: 'auto' }} priority />
                <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.3)' }} />
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Accessibility Audit</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Final Delivery Report</div>
                </div>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 300, color: 'white', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
                Accessibility Audit Report
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                {data.config?.url || 'PDF Document'} &nbsp;·&nbsp; {standard} Level {testedLevel} &nbsp;·&nbsp; {reportDate}
              </p>
            </div>
            {/* Score circle */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                border: `3px solid ${score.overall >= 75 ? '#00BA8C' : score.overall >= 50 ? '#F0AB00' : '#FF3356'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.25)'
              }}>
                <div style={{ fontSize: 30, fontWeight: 300, color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>{score.overall}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Score</div>
              </div>
              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={exportCSV} className="btn btn-secondary btn-sm" style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>
                  📥 Export Backlog CSV
                </button>
                <button onClick={() => window.print()} className="btn btn-secondary btn-sm" style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}>
                  🖨️ Print / PDF
                </button>
                <a href={`/audit/${id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', textDecoration: 'none', textAlign: 'center' }}>
                  ← Live Results
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────── */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 66, zIndex: 50 }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '13px 18px', border: 'none', borderBottom: `2px solid ${activeTab === t.id ? 'var(--accent-blue)' : 'transparent'}`,
                background: 'transparent', color: activeTab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)',
                fontWeight: activeTab === t.id ? 700 : 500, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'Open Sans, sans-serif', transition: 'var(--transition)'
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────── */}
      <div className="container" style={{ paddingTop: 28, paddingBottom: 80 }}>

        {/* ══════════ 1. EXECUTIVE SUMMARY ══════════ */}
        {activeTab === 'executive' && (
          <div className="animate-fade-in">
            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
              <Tile val={score.overall} label="Overall Score" color={score.overall >= 75 ? '#00BA8C' : score.overall >= 50 ? '#F0AB00' : '#FF3356'} sub="/100" />
              <Tile val={issues.length} label="Total Issues" color="#FF6B00" />
              <Tile val={score.issueBySeverity.critical} label="Critical Blockers" color="#E8002D" />
              <Tile val={score.issueBySeverity.high} label="High Priority" color="#FF6B00" />
              <Tile val={quickWins.length} label="Quick Wins" color="#00BA8C" sub="fix in <30 min" />
            </div>

            {/* Business Impact + Risk Heat Map */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
              {/* Business Impact */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 22 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>📋 Business Impact Statement</h3>
                {score.overall < 50 && (
                  <div style={{ padding: '10px 14px', background: 'rgba(232,0,45,0.07)', border: '1px solid rgba(232,0,45,0.2)', borderRadius: 6, marginBottom: 10, fontSize: 13, color: '#FF3356' }}>
                    ⚠️ <strong>High Legal Risk</strong> — Current state may not meet statutory accessibility obligations (ADA / EN 301 549 / Section 508).
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {[
                    { icon: '🦯', label: 'Screen Reader Users', impact: `${score.issueBySeverity.critical + score.issueBySeverity.high} issues directly block assistive technology users` },
                    { icon: '⌨️', label: 'Keyboard-Only Users', impact: `Focus management failures affect any user who cannot use a mouse` },
                    { icon: '👁️', label: 'Low Vision Users', impact: `${score.categoryScores.perceivable < 70 ? 'Colour contrast and visual clarity issues detected' : 'Perceivable category is passing'}` },
                    { icon: '🌍', label: 'Global Reach', impact: `~15% of population lives with a disability — this affects real users today` },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{r.icon}</span>
                      <div><strong style={{ fontSize: 12 }}>{r.label}</strong><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.impact}</div></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Heat Map */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 22 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🌡️ Risk Heat Map</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(score.categoryScores).filter(([k]) => k !== 'pdf' || score.categoryScores.pdf < 100).map(([cat, val]) => {
                    const s = val as number;
                    const color = s >= 80 ? '#00BA8C' : s >= 60 ? '#F0AB00' : '#FF3356';
                    const catMap: Record<string, string> = { perceivable: 'Perceivable', operable: 'Operable', understandable: 'Understandable', robust: 'Robust', pdf: 'PDF' };
                    return (
                      <div key={cat} style={{ padding: '12px 14px', background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{catMap[cat] || cat}</span>
                          <span style={{ fontSize: 16, fontWeight: 300, color, letterSpacing: '-0.02em' }}>{s}</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${s}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Test coverage */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              <Tile val={score.testsRun} label="Tests Run" color="var(--accent-blue)" />
              <Tile val={score.testsPassed} label="Tests Passed" color="#00BA8C" />
              <Tile val={score.testsFailed} label="Tests Failed" color="#FF3356" />
              <Tile val={`${data.crawlCoverage?.coveragePercent ?? '—'}%`} label="Page Coverage" color="#A78BFA" sub={`${data.crawlCoverage?.pagesAudited ?? '—'} of ${data.crawlCoverage?.totalPagesFound ?? '—'} pages`} />
            </div>

            {/* Executive narrative */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 22 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📝 Audit Narrative</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-line', margin: 0 }}>
                {data.report?.executiveSummary || 'No summary available.'}
              </p>
            </div>

            {/* Top 5 critical actions */}
            {critical.length > 0 && (
              <div style={{ marginTop: 18, background: 'rgba(232,0,45,0.04)', border: '1px solid rgba(232,0,45,0.2)', borderRadius: 'var(--radius-md)', padding: 22 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#FF3356' }}>🔥 Top {Math.min(5, critical.length)} Critical Actions — Fix This Sprint</h3>
                {critical.slice(0, 5).map((issue, i) => (
                  <div key={issue.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '9px 0', borderBottom: i < Math.min(4, critical.length - 1) ? '1px solid rgba(232,0,45,0.1)' : 'none' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#E8002D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i+1}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{issue.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        WCAG {issue.wcagCriterion} · {issue.pageUrl.replace(/^https?:\/\/[^/]+/, '') || '/'} · Owner: <strong style={{ color: TEAM_COLOR[issue.team] }}>{issue.team}</strong>
                      </div>
                    </div>
                    <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${EFFORT_COLOR[issue.effort]}15`, color: EFFORT_COLOR[issue.effort], border: `1px solid ${EFFORT_COLOR[issue.effort]}30`, flexShrink: 0 }}>
                      {issue.effort}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ 2. ISSUE BACKLOG ══════════ */}
        {activeTab === 'backlog' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Filter by:</span>
              {[
                { label: 'Team', val: teamFilter, set: setTeamFilter, opts: ['all', 'Frontend Dev', 'Designer', 'Content', 'QA', 'PDF Team', 'Design System'] },
                { label: 'Severity', val: sevFilter, set: setSevFilter, opts: ['all', 'critical', 'high', 'medium', 'low'] },
                { label: 'Effort', val: effortFilter, set: setEffortFilter, opts: ['all', 'Quick Win', '1 hour', 'Half-day', '1 Sprint'] },
                { label: 'Component', val: compFilter, set: setCompFilter, opts: ['all', ...Object.keys(compGroups).sort()] },
              ].map(f => (
                <select key={f.label} className="input-field" style={{ width: 'auto', fontSize: 12 }} value={f.val} onChange={e => f.set(e.target.value)}>
                  <option value="all">All {f.label}s</option>
                  {f.opts.filter(o => o !== 'all').map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {issues.length} issues
              </span>
              <button onClick={exportCSV} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>📥 Export CSV</button>
            </div>

            {filtered.map((issue, i) => (
              <IssueCard
                key={issue.id} issue={issue} idx={i + 1}
                status={statusMap[issue.id] || 'Open'}
                onStatusChange={handleStatusChange}
              />
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 56, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                <div>No issues match the current filters.</div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ 3. COMPONENT FINDINGS ══════════ */}
        {activeTab === 'components' && (
          <div className="animate-fade-in">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
              Issues grouped by UI component. Fixing the root cause at the component or design-system level resolves all instances simultaneously.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
              {Object.entries(compGroups).sort((a,b) => b[1].length - a[1].length).map(([comp, compIssues]) => {
                const critCount = compIssues.filter(i => i.severity === 'critical').length;
                const dsImpact = compIssues.length >= 3;
                const sevBreak = ['critical','high','medium','low'].filter(s => compIssues.some(i => i.severity === s));
                return (
                  <div key={comp} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, borderTop: critCount > 0 ? '3px solid #E8002D' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                      <span style={{ fontSize: 24 }}>{COMP_ICON[comp] || '🔍'}</span>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{comp}</span>
                        {dsImpact && <div style={{ fontSize: 10, color: '#FF6B00', fontWeight: 700 }}>⚡ Design System Impact</div>}
                      </div>
                      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 300, color: critCount > 0 ? '#E8002D' : '#F0AB00', letterSpacing: '-0.02em' }}>{compIssues.length}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Issues</div>
                      </div>
                    </div>
                    {/* Severity breakdown */}
                    <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                      {sevBreak.map(s => (
                        <span key={s} style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: SEV_BG[s], color: SEV_COLOR[s], border: `1px solid ${SEV_COLOR[s]}40` }}>
                          {compIssues.filter(i => i.severity === s).length} {s}
                        </span>
                      ))}
                    </div>
                    {dsImpact && (
                      <div style={{ padding: '7px 10px', background: 'rgba(255,107,0,0.07)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 5, fontSize: 11, color: '#FF8533', marginBottom: 9 }}>
                        ❗ Fixing this component in the design system resolves <strong>{compIssues.length} instances</strong> across {new Set(compIssues.map(i => i.pageUrl)).size} page(s).
                      </div>
                    )}
                    {/* Top issues */}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {compIssues.slice(0, 3).map(i => (
                        <div key={i.id} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: SEV_COLOR[i.severity], flexShrink: 0 }} />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</span>
                        </div>
                      ))}
                      {compIssues.length > 3 && <div style={{ paddingTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>+{compIssues.length - 3} more…</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ 4. REMEDIATION GUIDE ══════════ */}
        {activeTab === 'remediation' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Practical implementation guidance by team. Each team focuses only on their issues — no noise from other disciplines.
            </p>
            {Object.entries(teamGroups).map(([team, tIssues]) => {
              const guide = REMEDIATION_GUIDES[team];
              const critCount = tIssues.filter(i => i.severity === 'critical').length;
              return (
                <details key={team} open={tIssues.some(i => i.severity === 'critical')}>
                  <summary style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '14px 18px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                    fontWeight: 700, fontSize: 14, listStyle: 'none', transition: 'var(--transition)'
                  }}>
                    <span style={{ fontSize: 22 }}>{guide?.icon || '🔧'}</span>
                    <span style={{ flex: 1 }}>{team}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {critCount > 0 && <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: SEV_BG.critical, color: SEV_COLOR.critical, border: `1px solid ${SEV_COLOR.critical}40` }}>{critCount} Critical</span>}
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: 'rgba(0,145,218,0.1)', color: '#0091DA' }}>{tIssues.length} Issues</span>
                    </div>
                  </summary>
                  <div style={{ padding: '16px 18px', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)', background: 'rgba(13,31,62,0.4)' }}>
                    {/* Team note */}
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, padding: '10px 14px', background: `${TEAM_COLOR[team as TeamOwner]}0A`, border: `1px solid ${TEAM_COLOR[team as TeamOwner]}25`, borderRadius: 6 }}>
                      {TEAM_NOTES[team]}
                    </p>
                    {/* Implementation checklist */}
                    {guide && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Implementation Checklist</div>
                        {guide.items.map((item, i) => (
                          <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', padding: '5px 0' }}>
                            <input type="checkbox" style={{ marginTop: 2, accentColor: TEAM_COLOR[team as TeamOwner] || '#0091DA' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {/* Top 5 issues for this team */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Issues Assigned to This Team</div>
                    {tIssues.slice(0, 5).map(issue => (
                      <div key={issue.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', marginBottom: 4, background: 'var(--bg-card)', borderRadius: 6, border: `1px solid ${SEV_COLOR[issue.severity]}30` }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: SEV_COLOR[issue.severity], flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12 }}>{issue.title}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>WCAG {issue.wcagCriterion}</span>
                        <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${EFFORT_COLOR[issue.effort]}15`, color: EFFORT_COLOR[issue.effort] }}>{issue.effort}</span>
                      </div>
                    ))}
                    {tIssues.length > 5 && <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 6 }}>+ {tIssues.length - 5} more — see Issue Backlog tab with {team} filter</div>}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {/* ══════════ 5. PRIORITY MATRIX ══════════ */}
        {activeTab === 'priority' && (
          <div className="animate-fade-in">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Use this matrix to assign items to the right sprint. Quick wins can be done immediately. Critical blockers must be scheduled this sprint.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Critical Blockers */}
              <div style={{ background: 'rgba(232,0,45,0.05)', border: '2px solid rgba(232,0,45,0.3)', borderRadius: 'var(--radius-md)', padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 22 }}>🔴</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#E8002D' }}>Critical Blockers</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fix this sprint — users blocked</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 300, color: '#E8002D' }}>{critical.length}</span>
                </div>
                {critical.slice(0, 8).map(i => (
                  <div key={i.id} style={{ padding: '7px 0', borderBottom: '1px solid rgba(232,0,45,0.08)', fontSize: 12 }}>
                    <span>{i.title}</span>
                    <span style={{ float: 'right', fontSize: 10, color: TEAM_COLOR[i.team], fontWeight: 700 }}>{i.team}</span>
                  </div>
                ))}
              </div>
              {/* High Priority */}
              <div style={{ background: 'rgba(255,107,0,0.05)', border: '2px solid rgba(255,107,0,0.3)', borderRadius: 'var(--radius-md)', padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 22 }}>🟠</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#FF6B00' }}>High Priority</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Next sprint — significant impact</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 300, color: '#FF6B00' }}>{highPri.length}</span>
                </div>
                {highPri.slice(0, 8).map(i => (
                  <div key={i.id} style={{ padding: '7px 0', borderBottom: '1px solid rgba(255,107,0,0.08)', fontSize: 12 }}>
                    <span>{i.title}</span>
                    <span style={{ float: 'right', fontSize: 10, color: TEAM_COLOR[i.team], fontWeight: 700 }}>{i.team}</span>
                  </div>
                ))}
              </div>
              {/* Medium Priority */}
              <div style={{ background: 'rgba(240,171,0,0.05)', border: '2px solid rgba(240,171,0,0.3)', borderRadius: 'var(--radius-md)', padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 22 }}>🟡</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#F0AB00' }}>Medium Priority</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>This quarter — notable impact</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 300, color: '#F0AB00' }}>{medPri.length}</span>
                </div>
                {medPri.slice(0, 8).map(i => (
                  <div key={i.id} style={{ padding: '7px 0', borderBottom: '1px solid rgba(240,171,0,0.08)', fontSize: 12 }}>
                    <span>{i.title}</span>
                    <span style={{ float: 'right', fontSize: 10, color: TEAM_COLOR[i.team], fontWeight: 700 }}>{i.team}</span>
                  </div>
                ))}
              </div>
              {/* Quick Wins */}
              <div style={{ background: 'rgba(0,186,140,0.05)', border: '2px solid rgba(0,186,140,0.3)', borderRadius: 'var(--radius-md)', padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 22 }}>🟢</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#00BA8C' }}>Quick Wins</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fix today — under 30 minutes each</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 300, color: '#00BA8C' }}>{quickWins.length}</span>
                </div>
                {quickWins.slice(0, 8).map(i => (
                  <div key={i.id} style={{ padding: '7px 0', borderBottom: '1px solid rgba(0,186,140,0.08)', fontSize: 12 }}>
                    <span>{i.title}</span>
                    <span style={{ float: 'right', fontSize: 10, color: TEAM_COLOR[i.team], fontWeight: 700 }}>{i.team}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How to use this */}
            <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📌 How to Use This in Your Sprint Planning</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div><strong style={{ color: '#E8002D' }}>Sprint 1 →</strong> All Critical Blockers. These are user-blocking and may be legal liability.</div>
                <div><strong style={{ color: '#FF6B00' }}>Sprint 2 →</strong> High Priority issues. Significant UX impact for assistive technology users.</div>
                <div><strong style={{ color: '#F0AB00' }}>Q2 Backlog →</strong> Medium issues + design system component updates to prevent recurrence.</div>
                <div><strong style={{ color: '#00BA8C' }}>Today →</strong> Quick wins can be done by any developer in under 30 minutes each.</div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ 6. ACCEPTANCE / QA ══════════ */}
        {activeTab === 'acceptance' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Auto-generated "Done When" acceptance criteria for each issue. Use these as QA test cases and regression checks.
              </p>
              <button onClick={exportCSV} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>📥 Export QA Test Cases</button>
            </div>

            {/* Regression prevention banner */}
            <div style={{ padding: '14px 18px', background: 'rgba(0,178,169,0.07)', border: '1px solid rgba(0,178,169,0.2)', borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#00B2A9', marginBottom: 8 }}>🔄 Regression Prevention Recommendations</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div>⚙️ <strong>CI/CD Gate</strong> — Run axe-core on every pull request. Fail the build if new violations are introduced.</div>
                <div>🧪 <strong>Component Tests</strong> — Add jest-axe accessibility assertions to every component unit test.</div>
                <div>📋 <strong>PR Template</strong> — Add a mandatory accessibility checklist to your pull-request review template.</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {augmented.slice(0, 30).map((issue, i) => {
                const acceptance = deriveAcceptanceCriteria(issue);
                return (
                  <div key={issue.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${SEV_COLOR[issue.severity]}`, borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{String(i+1).padStart(3,'0')}</span>
                      <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{issue.title}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: SEV_BG[issue.severity], color: SEV_COLOR[issue.severity], border: `1px solid ${SEV_COLOR[issue.severity]}40` }}>{issue.severity}</span>
                      <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, background: 'rgba(0,145,218,0.1)', color: '#0091DA', fontWeight: 700 }}>WCAG {issue.wcagCriterion}</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>✅ Done When:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {acceptance.map((criterion, ci) => (
                        <label key={ci} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', cursor: 'pointer' }}>
                          <input type="checkbox" style={{ marginTop: 2, accentColor: '#00BA8C' }} />
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{criterion}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .navbar { display: none; }
          body { background: white; color: black; }
          [style*="background: var(--bg"] { background: white !important; }
        }
      `}</style>
    </div>
  );
}
