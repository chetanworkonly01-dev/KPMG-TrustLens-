import PptxGenJS from 'pptxgenjs';
import { AuditResult, AccessibilityIssue, AuditScore } from '../types/audit';

// Color palette
const COLORS = {
  primary: '2563EB',
  primaryDark: '1E40AF',
  dark: '1E293B',
  gray: '64748B',
  lightGray: 'F1F5F9',
  white: 'FFFFFF',
  black: '0F172A',
  critical: 'DC2626',
  criticalBg: 'FEE2E2',
  high: 'EA580C',
  highBg: 'FFEDD5',
  medium: 'CA8A04',
  mediumBg: 'FEF9C3',
  low: '16A34A',
  lowBg: 'DCFCE7',
  bgDark: '0F172A',
  bgCard: '1E293B',
};

function severityColor(sev: string): string {
  switch (sev) {
    case 'critical': return COLORS.critical;
    case 'high': return COLORS.high;
    case 'medium': return COLORS.medium;
    case 'low': return COLORS.low;
    default: return COLORS.gray;
  }
}

function severityBgColor(sev: string): string {
  switch (sev) {
    case 'critical': return COLORS.criticalBg;
    case 'high': return COLORS.highBg;
    case 'medium': return COLORS.mediumBg;
    case 'low': return COLORS.lowBg;
    default: return COLORS.lightGray;
  }
}

function complianceLabel(level: string): string {
  const labels: Record<string, string> = {
    'non-compliant': 'Non-Compliant',
    'partially-compliant': 'Partially Compliant',
    'aa-compliant': 'WCAG AA Compliant',
    'aaa-compliant': 'WCAG AAA Compliant',
  };
  return labels[level] || level;
}

function addSlideNumber(slide: PptxGenJS.Slide, num: number) {
  slide.addText(`${num}`, {
    x: 9.1, y: 6.9, w: 0.5, h: 0.3,
    fontSize: 8, color: COLORS.gray,
    align: 'right',
  });
}

function addSlideAccent(slide: PptxGenJS.Slide) {
  // Top accent bar
  slide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 10, h: 0.06,
    fill: { color: COLORS.primary },
  });
  // Bottom accent
  slide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0, y: 7.44, w: 10, h: 0.06,
    fill: { color: COLORS.primary },
  });
}

export async function generatePptx(audit: AuditResult): Promise<Buffer> {
  const report = audit.report!;
  const score = audit.score;
  const issues = audit.issues;
  const config = audit.config;
  const auditDate = new Date(audit.startedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const projectName = config.url || 'PDF Document';

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'AI Accessibility Audit Platform';
  pptx.title = `Accessibility Audit Report - ${projectName}`;

  let slideNum = 0;

  // ==============================
  // SLIDE 1: TITLE SLIDE
  // ==============================
  slideNum++;
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: COLORS.bgDark };

  // Accent bars
  titleSlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: COLORS.primary },
  });
  titleSlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0, y: 7.42, w: 10, h: 0.08,
    fill: { color: COLORS.primary },
  });

  // Left decorative element
  titleSlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0, y: 1.5, w: 0.08, h: 4.5,
    fill: { color: COLORS.primary },
  });

  // Title text
  titleSlide.addText('ACCESSIBILITY', {
    x: 0.8, y: 1.8, w: 8.5, h: 0.9,
    fontSize: 44, fontFace: 'Calibri',
    color: COLORS.primary, bold: true,
    align: 'left',
  });
  titleSlide.addText('AUDIT REPORT', {
    x: 0.8, y: 2.6, w: 8.5, h: 0.9,
    fontSize: 44, fontFace: 'Calibri',
    color: COLORS.white, bold: true,
    align: 'left',
  });

  // Decorative line
  titleSlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0.8, y: 3.6, w: 3, h: 0.04,
    fill: { color: COLORS.primary },
  });

  // Project name
  titleSlide.addText(projectName, {
    x: 0.8, y: 3.9, w: 8.5, h: 0.4,
    fontSize: 16, fontFace: 'Calibri',
    color: COLORS.gray, italic: true,
  });

  // Metadata row
  titleSlide.addText([
    { text: 'Date: ', options: { bold: true, color: COLORS.primary, fontSize: 11 } },
    { text: auditDate + '    ', options: { color: COLORS.gray, fontSize: 11 } },
    { text: 'Score: ', options: { bold: true, color: COLORS.primary, fontSize: 11 } },
    { text: `${score.overall}/100    `, options: { color: score.overall >= 75 ? COLORS.low : score.overall >= 50 ? COLORS.medium : COLORS.critical, fontSize: 11, bold: true } },
    { text: 'Issues: ', options: { bold: true, color: COLORS.primary, fontSize: 11 } },
    { text: String(score.totalIssues), options: { color: COLORS.gray, fontSize: 11 } },
  ], {
    x: 0.8, y: 4.6, w: 8.5, h: 0.4,
    fontFace: 'Calibri',
  });

  // Compliance badge
  titleSlide.addShape('roundRect' as unknown as PptxGenJS.ShapeType, {
    x: 0.8, y: 5.2, w: 2.5, h: 0.45,
    rectRadius: 0.1,
    fill: { color: score.complianceLevel.includes('compliant') && !score.complianceLevel.includes('non') ? COLORS.lowBg : COLORS.criticalBg },
  });
  titleSlide.addText(complianceLabel(score.complianceLevel), {
    x: 0.8, y: 5.2, w: 2.5, h: 0.45,
    fontSize: 11, fontFace: 'Calibri', bold: true,
    color: score.complianceLevel.includes('compliant') && !score.complianceLevel.includes('non') ? COLORS.low : COLORS.critical,
    align: 'center', valign: 'middle',
  });

  // Score circle on right
  titleSlide.addShape('ellipse' as unknown as PptxGenJS.ShapeType, {
    x: 7.5, y: 2.0, w: 2, h: 2,
    fill: { color: COLORS.bgCard },
    line: { color: COLORS.primary, width: 3 },
  });
  titleSlide.addText(`${score.overall}`, {
    x: 7.5, y: 2.0, w: 2, h: 1.6,
    fontSize: 40, fontFace: 'Calibri', bold: true,
    color: score.overall >= 75 ? COLORS.low : score.overall >= 50 ? COLORS.medium : COLORS.critical,
    align: 'center', valign: 'middle',
  });
  titleSlide.addText('SCORE', {
    x: 7.5, y: 3.2, w: 2, h: 0.4,
    fontSize: 10, fontFace: 'Calibri',
    color: COLORS.gray,
    align: 'center',
  });

  addSlideNumber(titleSlide, slideNum);

  // ==============================
  // SLIDE 2: EXECUTIVE SUMMARY
  // ==============================
  slideNum++;
  const summarySlide = pptx.addSlide();
  summarySlide.background = { color: COLORS.white };
  addSlideAccent(summarySlide);

  summarySlide.addText('Executive Summary', {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 28, fontFace: 'Calibri', bold: true,
    color: COLORS.dark,
  });

  // Separator
  summarySlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0.5, y: 0.85, w: 2, h: 0.04,
    fill: { color: COLORS.primary },
  });

  // Summary text
  const summaryText = report.executiveSummary || `This accessibility audit evaluated ${projectName} against WCAG 2.2 Level A and AA standards. A total of ${score.totalIssues} issues were identified across ${audit.pages.length} page(s).`;
  summarySlide.addText(summaryText.substring(0, 500), {
    x: 0.5, y: 1.1, w: 9, h: 1.2,
    fontSize: 11, fontFace: 'Calibri',
    color: COLORS.gray,
    lineSpacingMultiple: 1.3,
    paraSpaceAfter: 6,
  });

  // Severity cards
  const severities = ['critical', 'high', 'medium', 'low'] as const;
  const cardW = 2.1;
  const cardGap = 0.15;
  const startX = 0.5;

  severities.forEach((sev, i) => {
    const x = startX + i * (cardW + cardGap);
    // Card bg
    summarySlide.addShape('roundRect' as unknown as PptxGenJS.ShapeType, {
      x, y: 2.6, w: cardW, h: 1.5,
      rectRadius: 0.1,
      fill: { color: severityBgColor(sev) },
      line: { color: severityColor(sev), width: 1 },
    });
    // Count
    summarySlide.addText(String(score.issueBySeverity[sev]), {
      x, y: 2.8, w: cardW, h: 0.7,
      fontSize: 36, fontFace: 'Calibri', bold: true,
      color: severityColor(sev),
      align: 'center', valign: 'middle',
    });
    // Label
    summarySlide.addText(sev.toUpperCase(), {
      x, y: 3.5, w: cardW, h: 0.4,
      fontSize: 11, fontFace: 'Calibri', bold: true,
      color: severityColor(sev),
      align: 'center',
    });
  });

  // Category scores
  summarySlide.addText('Category Scores', {
    x: 0.5, y: 4.5, w: 5, h: 0.4,
    fontSize: 16, fontFace: 'Calibri', bold: true,
    color: COLORS.dark,
  });

  const categories = Object.entries(score.categoryScores).filter(([, v]) => v > 0);
  const catW = categories.length > 0 ? Math.min(1.7, 9 / categories.length - 0.1) : 1.7;
  categories.forEach(([cat, catScore], i) => {
    const x = 0.5 + i * (catW + 0.1);
    const catNames: Record<string, string> = { perceivable: 'Perceivable', operable: 'Operable', understandable: 'Understandable', robust: 'Robust', pdf: 'PDF' };
    const color = catScore >= 75 ? COLORS.low : catScore >= 50 ? COLORS.medium : COLORS.critical;

    summarySlide.addShape('roundRect' as unknown as PptxGenJS.ShapeType, {
      x, y: 5.0, w: catW, h: 1.2,
      rectRadius: 0.1,
      fill: { color: COLORS.lightGray },
    });
    summarySlide.addText(String(catScore), {
      x, y: 5.1, w: catW, h: 0.6,
      fontSize: 24, fontFace: 'Calibri', bold: true,
      color, align: 'center', valign: 'middle',
    });
    summarySlide.addText(catNames[cat] || cat, {
      x, y: 5.7, w: catW, h: 0.35,
      fontSize: 9, fontFace: 'Calibri',
      color: COLORS.gray, align: 'center',
    });
  });

  addSlideNumber(summarySlide, slideNum);

  // ==============================
  // SLIDE 3+: ISSUES OVERVIEW TABLE
  // ==============================
  const issuesPerTableSlide = 10;
  for (let batch = 0; batch < issues.length; batch += issuesPerTableSlide) {
    slideNum++;
    const tableSlide = pptx.addSlide();
    tableSlide.background = { color: COLORS.white };
    addSlideAccent(tableSlide);

    const batchEnd = Math.min(batch + issuesPerTableSlide, issues.length);
    const batchLabel = batch === 0 ? '' : ` (Continued ${batch + 1}-${batchEnd})`;

    tableSlide.addText(`Issues Overview${batchLabel}`, {
      x: 0.5, y: 0.2, w: 9, h: 0.5,
      fontSize: 22, fontFace: 'Calibri', bold: true,
      color: COLORS.dark,
    });

    tableSlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
      x: 0.5, y: 0.7, w: 2, h: 0.04,
      fill: { color: COLORS.primary },
    });

    const batchIssues = issues.slice(batch, batchEnd);
    const headerRow: PptxGenJS.TableRow = [
      { text: 'ID', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9, align: 'center' } },
      { text: 'Issue Title', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
      { text: 'WCAG SC', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9 } },
      { text: 'Severity', options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 9, align: 'center' } },
    ];

    const dataRows: PptxGenJS.TableRow[] = batchIssues.map((issue, idx) => [
      { text: `A11Y-${String(batch + idx + 1).padStart(3, '0')}`, options: { fontSize: 8, bold: true, color: COLORS.dark, align: 'center' as const, fill: { color: idx % 2 === 0 ? COLORS.lightGray : COLORS.white } } },
      { text: issue.title, options: { fontSize: 8, color: COLORS.dark, fill: { color: idx % 2 === 0 ? COLORS.lightGray : COLORS.white } } },
      { text: `${issue.wcagCriterion} ${issue.wcagName}`, options: { fontSize: 8, color: COLORS.gray, fill: { color: idx % 2 === 0 ? COLORS.lightGray : COLORS.white } } },
      { text: issue.severity.toUpperCase(), options: { fontSize: 8, bold: true, color: severityColor(issue.severity), fill: { color: severityBgColor(issue.severity) }, align: 'center' as const } },
    ]);

    tableSlide.addTable([headerRow, ...dataRows], {
      x: 0.3, y: 0.9, w: 9.4,
      colW: [0.9, 3.8, 3.0, 1.3],
      border: { type: 'solid', pt: 0.5, color: 'E2E8F0' },
      rowH: batchIssues.length <= 8 ? 0.5 : 0.42,
      autoPage: false,
    });

    addSlideNumber(tableSlide, slideNum);
  }

  // ==============================
  // INDIVIDUAL ISSUE SLIDES
  // ==============================
  issues.forEach((issue, idx) => {
    slideNum++;
    const issueSlide = pptx.addSlide();
    issueSlide.background = { color: COLORS.white };
    addSlideAccent(issueSlide);

    const issueId = `A11Y-${String(idx + 1).padStart(3, '0')}`;

    // Issue ID badge
    issueSlide.addShape('roundRect' as unknown as PptxGenJS.ShapeType, {
      x: 0.3, y: 0.2, w: 1.2, h: 0.35,
      rectRadius: 0.08,
      fill: { color: COLORS.primary },
    });
    issueSlide.addText(issueId, {
      x: 0.3, y: 0.2, w: 1.2, h: 0.35,
      fontSize: 10, fontFace: 'Calibri', bold: true,
      color: COLORS.white, align: 'center', valign: 'middle',
    });

    // Severity badge
    issueSlide.addShape('roundRect' as unknown as PptxGenJS.ShapeType, {
      x: 1.6, y: 0.2, w: 1.0, h: 0.35,
      rectRadius: 0.08,
      fill: { color: severityBgColor(issue.severity) },
      line: { color: severityColor(issue.severity), width: 1 },
    });
    issueSlide.addText(issue.severity.toUpperCase(), {
      x: 1.6, y: 0.2, w: 1.0, h: 0.35,
      fontSize: 9, fontFace: 'Calibri', bold: true,
      color: severityColor(issue.severity),
      align: 'center', valign: 'middle',
    });

    // WCAG badge
    issueSlide.addShape('roundRect' as unknown as PptxGenJS.ShapeType, {
      x: 2.7, y: 0.2, w: 2.5, h: 0.35,
      rectRadius: 0.08,
      fill: { color: COLORS.lightGray },
    });
    issueSlide.addText(`WCAG ${issue.wcagCriterion} — Level ${issue.wcagLevel}`, {
      x: 2.7, y: 0.2, w: 2.5, h: 0.35,
      fontSize: 9, fontFace: 'Calibri',
      color: COLORS.gray,
      align: 'center', valign: 'middle',
    });

    // Issue title
    issueSlide.addText(issue.title, {
      x: 0.3, y: 0.7, w: 9.4, h: 0.5,
      fontSize: 20, fontFace: 'Calibri', bold: true,
      color: COLORS.dark,
    });

    // Separator
    issueSlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
      x: 0.3, y: 1.2, w: 2, h: 0.03,
      fill: { color: COLORS.primary },
    });

    // Description section
    issueSlide.addText('Description', {
      x: 0.3, y: 1.4, w: 4.5, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', bold: true,
      color: COLORS.primary,
    });
    issueSlide.addText(issue.description.substring(0, 300) + (issue.description.length > 300 ? '...' : ''), {
      x: 0.3, y: 1.7, w: 4.5, h: 1.2,
      fontSize: 9, fontFace: 'Calibri',
      color: COLORS.gray,
      lineSpacingMultiple: 1.3,
      valign: 'top',
    });

    // Impact section
    issueSlide.addText('Impact', {
      x: 5.2, y: 1.4, w: 4.5, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', bold: true,
      color: COLORS.primary,
    });
    issueSlide.addText(issue.impact.substring(0, 300) + (issue.impact.length > 300 ? '...' : ''), {
      x: 5.2, y: 1.7, w: 4.5, h: 1.2,
      fontSize: 9, fontFace: 'Calibri',
      color: COLORS.gray,
      lineSpacingMultiple: 1.3,
      valign: 'top',
    });

    // Remediation section
    issueSlide.addShape('roundRect' as unknown as PptxGenJS.ShapeType, {
      x: 0.3, y: 3.1, w: 9.4, h: issue.codeFix ? 1.6 : 2.2,
      rectRadius: 0.1,
      fill: { color: COLORS.lowBg },
      line: { color: COLORS.low, width: 0.5 },
    });
    issueSlide.addText('✅ Remediation Guidance', {
      x: 0.5, y: 3.2, w: 9, h: 0.3,
      fontSize: 12, fontFace: 'Calibri', bold: true,
      color: COLORS.low,
    });
    issueSlide.addText(issue.recommendation.substring(0, 400) + (issue.recommendation.length > 400 ? '...' : ''), {
      x: 0.5, y: 3.5, w: 9, h: issue.codeFix ? 1.0 : 1.5,
      fontSize: 9, fontFace: 'Calibri',
      color: COLORS.dark,
      lineSpacingMultiple: 1.3,
      valign: 'top',
    });

    // Code fix section
    if (issue.codeFix) {
      const codeY = 4.9;
      issueSlide.addShape('roundRect' as unknown as PptxGenJS.ShapeType, {
        x: 0.3, y: codeY, w: 9.4, h: 2.2,
        rectRadius: 0.1,
        fill: { color: 'F8FAFC' },
        line: { color: 'E2E8F0', width: 0.5 },
      });
      // Code label bar
      issueSlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
        x: 0.3, y: codeY, w: 9.4, h: 0.35,
        fill: { color: COLORS.bgCard },
      });
      issueSlide.addText('💻 Code Example', {
        x: 0.5, y: codeY, w: 9, h: 0.35,
        fontSize: 10, fontFace: 'Calibri', bold: true,
        color: COLORS.white,
        valign: 'middle',
      });
      issueSlide.addText(issue.codeFix.substring(0, 500), {
        x: 0.5, y: codeY + 0.4, w: 9, h: 1.6,
        fontSize: 8, fontFace: 'Consolas',
        color: COLORS.dark,
        lineSpacingMultiple: 1.2,
        valign: 'top',
      });
    }

    addSlideNumber(issueSlide, slideNum);
  });

  // ==============================
  // FINAL SLIDE: THANK YOU
  // ==============================
  slideNum++;
  const endSlide = pptx.addSlide();
  endSlide.background = { color: COLORS.bgDark };

  endSlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0, y: 0, w: 10, h: 0.08,
    fill: { color: COLORS.primary },
  });
  endSlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 0, y: 7.42, w: 10, h: 0.08,
    fill: { color: COLORS.primary },
  });

  endSlide.addText('Thank You', {
    x: 0, y: 2.5, w: 10, h: 1,
    fontSize: 44, fontFace: 'Calibri', bold: true,
    color: COLORS.white, align: 'center',
  });
  endSlide.addShape('rect' as unknown as PptxGenJS.ShapeType, {
    x: 4, y: 3.6, w: 2, h: 0.04,
    fill: { color: COLORS.primary },
  });
  endSlide.addText('Generated by AI Accessibility Audit Platform', {
    x: 0, y: 3.9, w: 10, h: 0.5,
    fontSize: 14, fontFace: 'Calibri',
    color: COLORS.gray, align: 'center',
  });
  endSlide.addText(auditDate, {
    x: 0, y: 4.4, w: 10, h: 0.4,
    fontSize: 12, fontFace: 'Calibri',
    color: COLORS.gray, align: 'center',
  });

  addSlideNumber(endSlide, slideNum);

  // Generate buffer
  const data = await pptx.write({ outputType: 'nodebuffer' });
  return data as Buffer;
}
