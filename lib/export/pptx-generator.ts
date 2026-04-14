import PptxGenJS from 'pptxgenjs';
import { AuditResult, AccessibilityIssue } from '../types/audit';

// ── KPMG Brand Palette ────────────────────────────────────────
const K = {
  navy:        '00338D',
  blue:        '005EB8',
  lightBlue:   '0091DA',
  teal:        '00B2A9',
  white:       'FFFFFF',
  offWhite:    'F5F7FA',
  lightGrey:   'EEF2F7',
  midGrey:     '8BA3C7',
  darkGrey:    '4A5568',
  nearBlack:   '1A2638',
  bgDark:      '020D1F',
  bgCard:      '0D1F3E',
  critical:    'E8002D',
  criticalBg:  'FFF0F3',
  high:        'FF6B00',
  highBg:      'FFF3E8',
  medium:      'F0AB00',
  mediumBg:    'FFFBE8',
  pass:        '00BA8C',
  passBg:      'E8FAF9',
};

const TEAM_COLOR: Record<string, string> = {
  'Frontend Dev': K.lightBlue, 'Designer': 'A78BFA',
  'Content': K.teal, 'QA': K.pass, 'PDF Team': K.medium, 'Design System': K.high,
};

function sevColor(s: string) { return ({critical: K.critical, high: K.high, medium: K.medium, low: K.lightBlue} as Record<string,string>)[s] || K.midGrey; }
function sevBg(s: string)    { return ({critical: K.criticalBg, high: K.highBg, medium: K.mediumBg, low: 'E8F6FF'} as Record<string,string>)[s] || K.lightGrey; }
function compLabel(l: string){ return ({
  'non-compliant':'Non-Compliant','partially-compliant':'Partially Compliant',
  'aa-compliant':'WCAG AA Compliant','aaa-compliant':'WCAG AAA Compliant',
} as Record<string,string>)[l] || l; }

function deriveTeam(issue: AccessibilityIssue): string {
  const c = issue.wcagCriterion;
  if (['1.1.1','1.2.1','1.2.2','1.2.5'].includes(c)) return 'Content';
  if (['1.4.3','1.4.11','1.3.3'].includes(c)) return 'Designer';
  if (issue.source === 'pdf-analyzer' || issue.category === 'pdf') return 'PDF Team';
  if (['1.3.1','4.1.2','4.1.3'].includes(c)) return 'Design System';
  if (['3.3.1','3.3.2','3.3.3'].includes(c)) return 'Frontend Dev';
  if (issue.source === 'journey-test') return 'QA';
  return 'Frontend Dev';
}

function deriveEffort(issue: AccessibilityIssue): string {
  return ({critical:'1 Sprint', high:'Half-day', medium:'1 hour', low:'Quick Win'} as Record<string,string>)[issue.severity] || '1 hour';
}

type Slide = PptxGenJS.Slide;

// ── Slide scaffolding helpers ─────────────────────────────────

/** KPMG dark background — used for title/section slides */
function darkSlide(pptx: PptxGenJS): Slide {
  const s = pptx.addSlide();
  s.background = { color: K.bgDark };
  // Navy top bar
  s.addShape('rect' as unknown as PptxGenJS.ShapeType, { x:0, y:0, w:10, h:0.07, fill:{ color: K.navy } });
  // Teal bottom bar
  s.addShape('rect' as unknown as PptxGenJS.ShapeType, { x:0, y:7.43, w:10, h:0.07, fill:{ color: K.teal } });
  return s;
}

/** White content slide with KPMG header strip */
function lightSlide(pptx: PptxGenJS): Slide {
  const s = pptx.addSlide();
  s.background = { color: K.white };
  // Navy top bar (thicker)
  s.addShape('rect' as unknown as PptxGenJS.ShapeType, { x:0, y:0, w:10, h:0.09, fill:{ color: K.navy } });
  // Light blue bottom accent
  s.addShape('rect' as unknown as PptxGenJS.ShapeType, { x:0, y:7.43, w:10, h:0.04, fill:{ color: K.lightBlue } });
  return s;
}

function addLogo(s: Slide, dark = false) {
  s.addText('KPMG', {
    x:0.3, y:0.01, w:1.2, h:0.12,
    fontSize: 9, fontFace:'Calibri', bold:true,
    color: dark ? K.white : K.white,
    valign:'middle',
  });
}

function addPageNum(s: Slide, n: number) {
  s.addText(String(n), { x:9.2, y:7.3, w:0.5, h:0.25, fontSize:8, color: K.midGrey, align:'right', fontFace:'Calibri' });
}

function addSlideTitle(s: Slide, title: string, sub?: string) {
  s.addText(title, { x:0.4, y:0.22, w:9.2, h:0.55, fontSize:26, fontFace:'Calibri', bold:true, color: K.navy });
  s.addShape('rect' as unknown as PptxGenJS.ShapeType, { x:0.4, y:0.82, w:1.8, h:0.035, fill:{ color: K.lightBlue } });
  if (sub) s.addText(sub, { x:0.4, y:0.88, w:9.2, h:0.3, fontSize:10, fontFace:'Calibri', color: K.midGrey });
}

// ── Main Export ───────────────────────────────────────────────
export async function generatePptx(audit: AuditResult): Promise<Buffer> {
  const report      = audit.report!;
  const score       = audit.score;
  const issues      = audit.issues;
  const config      = audit.config;
  const testedLevel = report.testedLevel || 'AA';
  const standard    = config.standard || 'WCAG 2.2';
  const auditDate   = new Date(audit.startedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  const projectName = config.url || 'PDF Document';

  const critical  = issues.filter(i => i.severity === 'critical');
  const high      = issues.filter(i => i.severity === 'high');
  const medium    = issues.filter(i => i.severity === 'medium');
  const quickWins = issues.filter(i => i.severity === 'low');

  const pptx = new PptxGenJS();
  pptx.layout    = 'LAYOUT_16x9';
  pptx.author    = 'KPMG Accessibility Audit';
  pptx.company   = 'KPMG';
  pptx.title     = `KPMG Accessibility Audit — ${projectName}`;
  pptx.subject   = 'Accessibility Audit Final Delivery Report';

  let n = 0;

  // ══════════════════════════════════════════════════
  // SLIDE 1 — TITLE
  // ══════════════════════════════════════════════════
  n++;
  const title = darkSlide(pptx);

  // Left accent bar
  title.addShape('rect' as unknown as PptxGenJS.ShapeType, { x:0, y:1.0, w:0.07, h:5.5, fill:{ color: K.lightBlue } });

  title.addText('KPMG', { x:0.4, y:1.2, w:9, h:0.8, fontSize:48, fontFace:'Calibri', bold:true, color: K.navy });
  title.addText('Accessibility Audit', { x:0.4, y:1.9, w:9, h:0.7, fontSize:36, fontFace:'Calibri', bold:false, color: K.white });
  title.addText('Final Delivery Report', { x:0.4, y:2.55, w:9, h:0.55, fontSize:22, fontFace:'Calibri', color: K.teal });
  title.addShape('rect' as unknown as PptxGenJS.ShapeType, { x:0.4, y:3.25, w:2.8, h:0.035, fill:{ color: K.lightBlue } });
  title.addText(projectName, { x:0.4, y:3.4, w:8.5, h:0.4, fontSize:13, fontFace:'Calibri', color: K.midGrey, italic:true });
  title.addText([
    { text: `${standard} Level ${testedLevel}   ·   `, options:{ bold:true, color: K.lightBlue, fontSize:11 } },
    { text: auditDate + '   ·   ', options:{ color: K.midGrey, fontSize:11 } },
    { text: `Score: `, options:{ bold:true, color: K.lightBlue, fontSize:11 } },
    { text: `${score.overall}/100`, options:{ bold:true, color: score.overall >= 75 ? K.teal : score.overall >= 50 ? K.medium : K.critical, fontSize:11 } },
  ], { x:0.4, y:4.0, w:9, h:0.4, fontFace:'Calibri' });

  // Score circle
  title.addShape('ellipse' as unknown as PptxGenJS.ShapeType, { x:7.6, y:2.0, w:2.0, h:2.0, fill:{ color: K.bgCard }, line:{ color: K.lightBlue, width:3 } });
  title.addText(String(score.overall), { x:7.6, y:2.0, w:2.0, h:1.6, fontSize:44, fontFace:'Calibri', bold:true, color: score.overall >= 75 ? K.teal : score.overall >= 50 ? K.medium : K.critical, align:'center', valign:'middle' });
  title.addText('SCORE', { x:7.6, y:3.4, w:2.0, h:0.4, fontSize:9, fontFace:'Calibri', color: K.midGrey, align:'center' });
  title.addText('Confidential / KPMG Internal', { x:0, y:6.85, w:10, h:0.35, fontSize:8, fontFace:'Calibri', color: K.midGrey, align:'center', italic:true });
  addPageNum(title, n);

  // ══════════════════════════════════════════════════
  // SLIDE 2 — AGENDA
  // ══════════════════════════════════════════════════
  n++;
  const agenda = lightSlide(pptx);
  addLogo(agenda);
  addSlideTitle(agenda, 'Report Agenda');

  const agendaItems = [
    ['01', 'Executive Summary', 'Score, risk heat map, business impact, KPIs'],
    ['02', 'Issue Backlog', 'Developer-format issues with WCAG refs, team owner, effort'],
    ['03', 'Component Findings', 'Issues grouped by UI component — fix once, resolve many'],
    ['04', 'Remediation Guidance', 'Practical notes per team: Frontend, Designer, Content, QA, PDF'],
    ['05', 'Priority Matrix', 'Critical → Sprint 1, High → Sprint 2, Medium → Q2, Quick Wins → Today'],
    ['06', 'Acceptance Criteria', '"Done When" checklist — use as QA regression test cases'],
  ];

  agendaItems.forEach(([num, heading, desc], i) => {
    const y = 1.2 + i * 0.9;
    agenda.addShape('roundRect' as unknown as PptxGenJS.ShapeType, { x:0.4, y, w:0.55, h:0.55, rectRadius:0.06, fill:{ color: K.navy } });
    agenda.addText(num, { x:0.4, y, w:0.55, h:0.55, fontSize:12, fontFace:'Calibri', bold:true, color: K.white, align:'center', valign:'middle' });
    agenda.addText(heading, { x:1.1, y: y+0.02, w:4, h:0.3, fontSize:13, fontFace:'Calibri', bold:true, color: K.nearBlack });
    agenda.addText(desc, { x:1.1, y: y+0.3, w:8.5, h:0.25, fontSize:9, fontFace:'Calibri', color: K.midGrey });
  });
  addPageNum(agenda, n);

  // ══════════════════════════════════════════════════
  // SLIDE 3 — EXECUTIVE SUMMARY
  // ══════════════════════════════════════════════════
  n++;
  const exec = darkSlide(pptx);
  addLogo(exec);
  exec.addText('Executive Summary', { x:0.4, y:0.22, w:9, h:0.55, fontSize:26, fontFace:'Calibri', bold:true, color: K.white });
  exec.addShape('rect' as unknown as PptxGenJS.ShapeType, { x:0.4, y:0.82, w:1.8, h:0.035, fill:{ color: K.lightBlue } });

  // 4 KPI cards
  const sevs = [
    { label:'Critical', count: score.issueBySeverity.critical, color: K.critical },
    { label:'High',     count: score.issueBySeverity.high,     color: K.high },
    { label:'Medium',   count: score.issueBySeverity.medium,   color: K.medium },
    { label:'Quick Wins', count: quickWins.length,             color: K.teal },
  ];
  sevs.forEach(({ label, count, color }, i) => {
    const x = 0.4 + i * 2.3;
    exec.addShape('roundRect' as unknown as PptxGenJS.ShapeType, { x, y:1.1, w:2.1, h:1.4, rectRadius:0.1, fill:{ color: K.bgCard }, line:{ color, width:1 } });
    exec.addText(String(count), { x, y:1.15, w:2.1, h:0.85, fontSize:42, fontFace:'Calibri', bold:true, color, align:'center', valign:'middle' });
    exec.addText(label.toUpperCase(), { x, y:2.0, w:2.1, h:0.35, fontSize:9, fontFace:'Calibri', bold:true, color, align:'center' });
  });

  // Category scores strip
  const cats = [['Perceivable','perceivable'],['Operable','operable'],['Understandable','understandable'],['Robust','robust']];
  cats.forEach(([label, key], i) => {
    const v = score.categoryScores[key as keyof typeof score.categoryScores] || 0;
    const col = v >= 75 ? K.teal : v >= 50 ? K.medium : K.critical;
    const x = 0.4 + i * 2.3;
    exec.addShape('roundRect' as unknown as PptxGenJS.ShapeType, { x, y:2.8, w:2.1, h:1.1, rectRadius:0.08, fill:{ color: K.bgCard } });
    exec.addText(String(v), { x, y:2.85, w:2.1, h:0.55, fontSize:28, fontFace:'Calibri', bold:true, color:col, align:'center', valign:'middle' });
    exec.addText('/100', { x, y:3.28, w:2.1, h:0.22, fontSize:8, fontFace:'Calibri', color: K.midGrey, align:'center' });
    exec.addText(label, { x, y:3.5, w:2.1, h:0.3, fontSize:9, fontFace:'Calibri', color: K.midGrey, align:'center' });
  });

  // Summary text
  const summaryText = (report.executiveSummary || '').substring(0, 350);
  exec.addText(summaryText, { x:0.4, y:4.1, w:9.2, h:1.6, fontSize:9.5, fontFace:'Calibri', color: K.midGrey, lineSpacingMultiple:1.4, valign:'top' });

  // Compliance badge
  const compText = compLabel(score.complianceLevel);
  const compColor = score.complianceLevel.includes('non') ? K.critical : K.teal;
  exec.addShape('roundRect' as unknown as PptxGenJS.ShapeType, { x:0.4, y:5.85, w:3.2, h:0.42, rectRadius:0.08, fill:{ color: K.bgCard }, line:{ color:compColor, width:1.5 } });
  exec.addText(compText, { x:0.4, y:5.85, w:3.2, h:0.42, fontSize:11, fontFace:'Calibri', bold:true, color:compColor, align:'center', valign:'middle' });

  // Page coverage
  if (audit.crawlCoverage) {
    exec.addText(`Page Coverage: ${audit.crawlCoverage.coveragePercent}%  (${audit.crawlCoverage.pagesAudited} of ${audit.crawlCoverage.totalPagesFound} pages)`, {
      x:3.8, y:5.92, w:5.8, h:0.3, fontSize:9, fontFace:'Calibri', color: K.midGrey, align:'right',
    });
  }
  addPageNum(exec, n);

  // ══════════════════════════════════════════════════
  // SLIDE 4 — BUSINESS IMPACT
  // ══════════════════════════════════════════════════
  n++;
  const impact = lightSlide(pptx);
  addLogo(impact);
  addSlideTitle(impact, 'Business Impact', 'Why this matters to your users and your organisation');

  const impacts = [
    { icon:'🦯', label:'Screen Reader Users', text:`${critical.length + high.length} issues directly block assistive technology users from completing tasks.` },
    { icon:'⌨️', label:'Keyboard-Only Users', text:'Focus management failures prevent users who rely on keyboard navigation.' },
    { icon:'👁️', label:'Low Vision Users', text: score.categoryScores.perceivable < 70 ? 'Colour contrast and visual clarity issues detected across multiple pages.' : 'Perceivable category is above threshold — colour/contrast issues are low.' },
    { icon:'⚖️', label:'Legal Exposure', text:`${standard} Level ${testedLevel} non-compliance may violate ADA, EN 301 549, or Section 508 obligations.` },
    { icon:'🌍', label:'Reach & Inclusivity', text:'~15% of the global population lives with a disability — these are real users today.' },
    { icon:'🔄', label:'Regression Prevention', text:'Converting these issues into QA test cases stops the same defects returning in future releases.' },
  ];

  impacts.forEach(({ icon, label, text }, i) => {
    const col = i < 2 ? 0 : 1;
    const row = i % 3;
    const x = 0.3 + col * 4.9;
    const y = 1.15 + row * 1.7;
    impact.addShape('roundRect' as unknown as PptxGenJS.ShapeType, { x, y, w:4.6, h:1.5, rectRadius:0.1, fill:{ color: K.offWhite }, line:{ color:'D1DCE8', width:0.5 } });
    impact.addText(icon, { x: x+0.12, y: y+0.08, w:0.5, h:0.5, fontSize:22, valign:'middle' });
    impact.addText(label, { x: x+0.65, y: y+0.1, w:3.8, h:0.32, fontSize:12, fontFace:'Calibri', bold:true, color: K.navy });
    impact.addText(text, { x: x+0.65, y: y+0.42, w:3.8, h:0.9, fontSize:9, fontFace:'Calibri', color: K.darkGrey, lineSpacingMultiple:1.3, valign:'top' });
  });
  addPageNum(impact, n);

  // ══════════════════════════════════════════════════
  // SLIDE 5 — PRIORITY MATRIX
  // ══════════════════════════════════════════════════
  n++;
  const pri = lightSlide(pptx);
  addLogo(pri);
  addSlideTitle(pri, 'Priority Matrix', 'Sprint planning guide — assign the right issues to the right sprint');

  const quadrants = [
    { label:'🔴 Critical Blockers', sub:'Fix This Sprint', issues: critical, color: K.critical, bg: K.criticalBg, x:0.3, y:1.15, w:4.65, h:2.9 },
    { label:'🟠 High Priority',     sub:'Next Sprint',    issues: high,     color: K.high,     bg: K.highBg,     x:5.1,  y:1.15, w:4.65, h:2.9 },
    { label:'🟡 Medium Priority',   sub:'This Quarter',   issues: medium,   color: K.medium,   bg: K.mediumBg,   x:0.3,  y:4.2,  w:4.65, h:2.9 },
    { label:'🟢 Quick Wins',        sub:'Fix Today < 30min', issues: quickWins, color: K.teal, bg: K.passBg,   x:5.1,  y:4.2,  w:4.65, h:2.9 },
  ];

  quadrants.forEach(({ label, sub, issues: qIssues, color, bg, x, y, w, h }) => {
    pri.addShape('roundRect' as unknown as PptxGenJS.ShapeType, { x, y, w, h, rectRadius:0.1, fill:{ color: bg }, line:{ color, width:1.5 } });
    pri.addText(label, { x: x+0.1, y: y+0.1, w: w-0.2, h:0.35, fontSize:12, fontFace:'Calibri', bold:true, color, align:'left' });
    pri.addText(`(${qIssues.length} issues — ${sub})`, { x: x+0.1, y: y+0.42, w: w-0.2, h:0.22, fontSize:8, fontFace:'Calibri', color, italic:true });
    pri.addShape('rect' as unknown as PptxGenJS.ShapeType, { x: x+0.1, y: y+0.68, w: w-0.2, h:0.02, fill:{ color } });
    qIssues.slice(0, 6).forEach((iss, i) => {
      pri.addText(`• ${iss.title.substring(0,52)}`, { x: x+0.12, y: y+0.76 + i*0.33, w: w-0.25, h:0.3, fontSize:8.5, fontFace:'Calibri', color: K.nearBlack });
    });
    if (qIssues.length > 6) pri.addText(`+${qIssues.length - 6} more — see Issue Backlog`, { x: x+0.12, y: y+h-0.38, w: w-0.25, h:0.28, fontSize:8, fontFace:'Calibri', color, italic:true });
  });
  addPageNum(pri, n);

  // ══════════════════════════════════════════════════
  // SLIDE 6 — COMPONENT FINDINGS
  // ══════════════════════════════════════════════════
  n++;
  const compFn = (i: AccessibilityIssue) => {
    const t = (i.title + ' ' + i.element).toLowerCase();
    if (t.includes('button') || t.includes('btn')) return 'Buttons';
    if (t.includes('form') || t.includes('input') || t.includes('select')) return 'Forms';
    if (t.includes('modal') || t.includes('dialog')) return 'Modals';
    if (t.includes('nav') || t.includes('link')) return 'Navigation';
    if (t.includes('img') || t.includes('alt')) return 'Images';
    if (t.includes('heading')) return 'Headings';
    if (t.includes('color') || t.includes('contrast')) return 'Colour';
    if (t.includes('focus') || t.includes('keyboard')) return 'Focus/KB';
    return 'Other';
  };
  const byComp: Record<string, AccessibilityIssue[]> = {};
  issues.forEach(i => { const c = compFn(i); if (!byComp[c]) byComp[c] = []; byComp[c].push(i); });
  const topComponents = Object.entries(byComp).sort((a,b) => b[1].length - a[1].length).slice(0, 6);

  const comp = lightSlide(pptx);
  addLogo(comp);
  addSlideTitle(comp, 'Component-Level Findings', 'Fix the component once — resolve all instances across every page');

  topComponents.forEach(([name, cIssues], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.3 + col * 3.15;
    const y = 1.15 + row * 2.95;
    const critC = cIssues.filter(x => x.severity === 'critical').length;
    const dsImpact = cIssues.length >= 3;
    const topColor = critC > 0 ? K.critical : dsImpact ? K.high : K.navy;

    comp.addShape('roundRect' as unknown as PptxGenJS.ShapeType, { x, y, w:3.0, h:2.7, rectRadius:0.1, fill:{ color: K.offWhite }, line:{ color:'D1DCE8', width:0.5 } });
    comp.addShape('rect' as unknown as PptxGenJS.ShapeType, { x, y, w:3.0, h:0.06, fill:{ color: topColor } });
    comp.addText(name, { x: x+0.12, y: y+0.12, w:2.2, h:0.35, fontSize:13, fontFace:'Calibri', bold:true, color: K.nearBlack });
    comp.addText(String(cIssues.length), { x: x+2.3, y: y+0.1, w:0.6, h:0.4, fontSize:24, fontFace:'Calibri', bold:true, color:topColor, align:'center' });
    if (dsImpact) comp.addText('⚡ DS Impact', { x: x+0.12, y: y+0.48, w:2.7, h:0.22, fontSize:8.5, fontFace:'Calibri', bold:true, color: K.high });
    const sevText = (['critical','high','medium','low'] as const).filter(s => cIssues.some(i => i.severity === s)).map(s => `${cIssues.filter(i=>i.severity===s).length} ${s}`).join('  ');
    comp.addText(sevText, { x: x+0.12, y: y+0.72, w:2.7, h:0.22, fontSize:8, fontFace:'Calibri', color: K.darkGrey });
    comp.addShape('rect' as unknown as PptxGenJS.ShapeType, { x: x+0.1, y: y+0.97, w:2.8, h:0.01, fill:{ color:'D1DCE8' } });
    cIssues.slice(0, 4).forEach((iss, j) => {
      comp.addText(`• ${iss.title.substring(0,38)}`, { x: x+0.12, y: y+1.05 + j*0.38, w:2.8, h:0.34, fontSize:8, fontFace:'Calibri', color: K.darkGrey });
    });
  });
  addPageNum(comp, n);

  // ══════════════════════════════════════════════════
  // SLIDE 7 — REMEDIATION BY TEAM
  // ══════════════════════════════════════════════════
  n++;
  const rem = lightSlide(pptx);
  addLogo(rem);
  addSlideTitle(rem, 'Remediation Responsibility', 'Each issue routed to the team who can fix it');

  const byTeam: Record<string, AccessibilityIssue[]> = {};
  issues.forEach(i => { const t = deriveTeam(i); if (!byTeam[t]) byTeam[t] = []; byTeam[t].push(i); });

  const teamEntries = Object.entries(byTeam).sort((a,b) => b[1].length - a[1].length).slice(0,6);
  teamEntries.forEach(([team, tIssues], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.3 + col * 3.15;
    const y = 1.15 + row * 2.95;
    const c = TEAM_COLOR[team] || K.lightBlue;
    const critCount = tIssues.filter(x => x.severity === 'critical').length;

    rem.addShape('roundRect' as unknown as PptxGenJS.ShapeType, { x, y, w:3.0, h:2.7, rectRadius:0.1, fill:{ color: K.offWhite }, line:{ color:'D1DCE8', width:0.5 } });
    rem.addShape('rect' as unknown as PptxGenJS.ShapeType, { x, y, w:3.0, h:0.06, fill:{ color:`${c}` } });
    rem.addText(team, { x: x+0.12, y: y+0.12, w:2.2, h:0.35, fontSize:12, fontFace:'Calibri', bold:true, color: K.nearBlack });
    rem.addText(String(tIssues.length), { x: x+2.3, y: y+0.1, w:0.6, h:0.4, fontSize:24, fontFace:'Calibri', bold:true, color:`${c}`, align:'center' });
    if (critCount > 0) {
      rem.addShape('roundRect' as unknown as PptxGenJS.ShapeType, { x: x+0.12, y: y+0.5, w:1.5, h:0.25, rectRadius:0.04, fill:{ color: K.criticalBg }, line:{ color: K.critical, width:0.5 } });
      rem.addText(`${critCount} Critical`, { x: x+0.12, y: y+0.5, w:1.5, h:0.25, fontSize:8, fontFace:'Calibri', bold:true, color: K.critical, align:'center', valign:'middle' });
    }
    rem.addShape('rect' as unknown as PptxGenJS.ShapeType, { x: x+0.1, y: y+0.82, w:2.8, h:0.01, fill:{ color:'D1DCE8' } });
    tIssues.slice(0, 4).forEach((iss, j) => {
      rem.addText(`• ${iss.title.substring(0,38)}`, { x: x+0.12, y: y+0.9 + j*0.38, w:2.8, h:0.34, fontSize:8, fontFace:'Calibri', color: K.darkGrey });
    });
  });
  addPageNum(rem, n);

  // ══════════════════════════════════════════════════
  // SLIDE 8 — ISSUE TABLE SLIDES (10 per slide)
  // ══════════════════════════════════════════════════
  const perPage = 10;
  for (let batch = 0; batch < issues.length; batch += perPage) {
    n++;
    const batchIssues = issues.slice(batch, batch + perPage);
    const tableSlide = lightSlide(pptx);
    addLogo(tableSlide);
    addSlideTitle(tableSlide, `Issue Backlog${batch === 0 ? '' : ' (cont.)'}`, `Issues ${batch+1}–${Math.min(batch+perPage, issues.length)} of ${issues.length}`);

    const headerRow: PptxGenJS.TableRow = [
      { text:'#',          options:{ bold:true, color:K.white, fill:{ color:K.navy }, fontSize:8, align:'center' } },
      { text:'Title',      options:{ bold:true, color:K.white, fill:{ color:K.navy }, fontSize:8 } },
      { text:'WCAG',       options:{ bold:true, color:K.white, fill:{ color:K.navy }, fontSize:8, align:'center' } },
      { text:'Severity',   options:{ bold:true, color:K.white, fill:{ color:K.navy }, fontSize:8, align:'center' } },
      { text:'Team Owner', options:{ bold:true, color:K.white, fill:{ color:K.navy }, fontSize:8 } },
      { text:'Effort',     options:{ bold:true, color:K.white, fill:{ color:K.navy }, fontSize:8, align:'center' } },
    ];

    const dataRows: PptxGenJS.TableRow[] = batchIssues.map((iss, idx) => [
      { text:`#${String(batch+idx+1).padStart(3,'0')}`, options:{ fontSize:8, bold:true, color:K.nearBlack, align:'center' as const, fill:{ color: idx%2===0 ? K.offWhite : K.white } } },
      { text:iss.title.substring(0,55), options:{ fontSize:8, color:K.nearBlack, fill:{ color: idx%2===0 ? K.offWhite : K.white } } },
      { text:`${iss.wcagCriterion} (${iss.wcagLevel})`, options:{ fontSize:8, color:K.lightBlue, fill:{ color: idx%2===0 ? K.offWhite : K.white } } },
      { text:iss.severity.toUpperCase(), options:{ fontSize:8, bold:true, color:sevColor(iss.severity), fill:{ color:sevBg(iss.severity) }, align:'center' as const } },
      { text:deriveTeam(iss), options:{ fontSize:8, color:K.nearBlack, fill:{ color: idx%2===0 ? K.offWhite : K.white } } },
      { text:deriveEffort(iss), options:{ fontSize:8, color:K.darkGrey, fill:{ color: idx%2===0 ? K.offWhite : K.white }, align:'center' as const } },
    ]);

    tableSlide.addTable([headerRow, ...dataRows], {
      x:0.3, y:1.1, w:9.4,
      colW:[0.65, 3.4, 1.1, 0.95, 1.7, 1.0],
      border:{ type:'solid', pt:0.4, color:'D1DCE8' },
      rowH: batchIssues.length <= 8 ? 0.56 : 0.48,
      autoPage:false,
    });

    addPageNum(tableSlide, n);
  }

  // ══════════════════════════════════════════════════
  // SLIDE — NEXT STEPS & THANK YOU
  // ══════════════════════════════════════════════════
  n++;
  const end = darkSlide(pptx);
  end.addShape('rect' as unknown as PptxGenJS.ShapeType, { x:0, y:1.0, w:0.07, h:5.5, fill:{ color: K.lightBlue } });
  end.addText('Next Steps', { x:0.4, y:1.3, w:9, h:0.7, fontSize:36, fontFace:'Calibri', bold:true, color: K.white });
  end.addShape('rect' as unknown as PptxGenJS.ShapeType, { x:0.4, y:2.1, w:2.0, h:0.035, fill:{ color: K.lightBlue } });

  const steps = [
    ['01', 'Assign critical blockers to Sprint 1 backlog — schedule immediately.'],
    ['02', 'Route each issue to the correct team owner using the Issue Backlog tab.'],
    ['03', 'Fix design-system-level issues once to resolve all instances site-wide.'],
    ['04', 'Add "Done When" criteria to each ticket as acceptance criteria.'],
    ['05', 'Add axe-core to CI/CD — run on every pull request to catch regressions.'],
    ['06', 'Schedule a verification audit after Sprint 2 to confirm fixes are complete.'],
  ];
  steps.forEach(([num, text], i) => {
    const y = 2.3 + i * 0.68;
    end.addShape('roundRect' as unknown as PptxGenJS.ShapeType, { x:0.4, y, w:0.44, h:0.44, rectRadius:0.06, fill:{ color: K.navy } });
    end.addText(num, { x:0.4, y, w:0.44, h:0.44, fontSize:10, fontFace:'Calibri', bold:true, color: K.white, align:'center', valign:'middle' });
    end.addText(text, { x:0.95, y: y+0.04, w:8.6, h:0.36, fontSize:10.5, fontFace:'Calibri', color: K.midGrey });
  });

  end.addText('KPMG Accessibility Audit — Confidential', { x:0, y:6.85, w:10, h:0.25, fontSize:8, fontFace:'Calibri', color: K.midGrey, align:'center', italic:true });
  addPageNum(end, n);

  const data = await pptx.write({ outputType:'nodebuffer' });
  return data as Buffer;
}
