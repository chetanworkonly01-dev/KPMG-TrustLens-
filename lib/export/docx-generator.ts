import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel,
  ShadingType, Header, Footer, PageNumber, NumberFormat,
  TableOfContents, SectionType, convertInchesToTwip,
  LevelFormat, INumberingOptions
} from 'docx';
import { AuditResult, AccessibilityIssue, AuditScore } from '../types/audit';

// Color palette
const COLORS = {
  primary: '2563EB',
  primaryLight: 'DBEAFE',
  dark: '1E293B',
  gray: '64748B',
  lightGray: 'F1F5F9',
  white: 'FFFFFF',
  critical: 'DC2626',
  criticalBg: 'FEE2E2',
  high: 'EA580C',
  highBg: 'FFEDD5',
  medium: 'CA8A04',
  mediumBg: 'FEF9C3',
  low: '16A34A',
  lowBg: 'DCFCE7',
  border: 'E2E8F0',
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

function makeCell(text: string, opts?: {
  bold?: boolean; color?: string; bg?: string; width?: number;
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  fontSize?: number;
}): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: opts?.alignment || AlignmentType.LEFT,
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({
            text,
            bold: opts?.bold,
            color: opts?.color || COLORS.dark,
            size: opts?.fontSize || 20,
            font: 'Calibri',
          }),
        ],
      }),
    ],
    width: opts?.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts?.bg ? { type: ShadingType.SOLID, color: opts.bg, fill: opts.bg } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  });
}

function sectionDivider(): Paragraph {
  return new Paragraph({ spacing: { before: 200, after: 200 } });
}

export async function generateDocx(audit: AuditResult): Promise<Buffer> {
  const report = audit.report!;
  const score = audit.score;
  const issues = audit.issues;
  const config = audit.config;
  const auditDate = new Date(audit.startedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const projectName = config.url || 'PDF Document';

  const numbering: INumberingOptions = {
    config: [{
      reference: 'bullet-list',
      levels: [{
        level: 0,
        format: LevelFormat.BULLET,
        text: '\u2022',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } }
      }]
    }]
  };

  const doc = new Document({
    numbering,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: COLORS.dark },
        },
        heading1: {
          run: { font: 'Calibri', size: 36, bold: true, color: COLORS.primary },
          paragraph: { spacing: { before: 360, after: 200 } },
        },
        heading2: {
          run: { font: 'Calibri', size: 28, bold: true, color: COLORS.dark },
          paragraph: { spacing: { before: 300, after: 160 } },
        },
        heading3: {
          run: { font: 'Calibri', size: 24, bold: true, color: COLORS.primary },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
      },
    },
    sections: [
      // SECTION 1: COVER PAGE
      {
        properties: {
          page: {
            margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.2), right: convertInchesToTwip(1.2) },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'Accessibility Audit Report', color: COLORS.gray, size: 16, font: 'Calibri', italics: true }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', color: COLORS.gray, size: 16, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], color: COLORS.gray, size: 16, font: 'Calibri' }),
                  new TextRun({ text: ' of ', color: COLORS.gray, size: 16, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: COLORS.gray, size: 16, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Spacer
          new Paragraph({ spacing: { before: 1200 } }),
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'ACCESSIBILITY', font: 'Calibri', size: 56, bold: true, color: COLORS.primary }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: 'AUDIT REPORT', font: 'Calibri', size: 56, bold: true, color: COLORS.dark }),
            ],
          }),
          // Decorative line
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', font: 'Calibri', size: 24, color: COLORS.primary }),
            ],
          }),
          // Subtitle / project
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun({ text: projectName, font: 'Calibri', size: 28, color: COLORS.gray, italics: true }),
            ],
          }),
          // Cover metadata table
          new Table({
            width: { size: 60, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.CENTER,
            rows: [
              new TableRow({
                children: [
                  makeCell('Audit Date', { bold: true, color: COLORS.primary, width: 40, fontSize: 22 }),
                  makeCell(auditDate, { width: 60, fontSize: 22 }),
                ],
              }),
              new TableRow({
                children: [
                  makeCell('Pages Audited', { bold: true, color: COLORS.primary, width: 40, fontSize: 22 }),
                  makeCell(String(audit.pages.length), { width: 60, fontSize: 22 }),
                ],
              }),
              new TableRow({
                children: [
                  makeCell('Accessibility Score', { bold: true, color: COLORS.primary, width: 40, fontSize: 22 }),
                  makeCell(`${score.overall}/100`, { width: 60, fontSize: 22, color: score.overall >= 75 ? COLORS.low : score.overall >= 50 ? COLORS.medium : COLORS.critical }),
                ],
              }),
              new TableRow({
                children: [
                  makeCell('Compliance Level', { bold: true, color: COLORS.primary, width: 40, fontSize: 22 }),
                  makeCell(complianceLabel(score.complianceLevel), { width: 60, fontSize: 22 }),
                ],
              }),
              new TableRow({
                children: [
                  makeCell('Total Issues', { bold: true, color: COLORS.primary, width: 40, fontSize: 22 }),
                  makeCell(String(score.totalIssues), { width: 60, fontSize: 22 }),
                ],
              }),
              new TableRow({
                children: [
                  makeCell('Audit Type', { bold: true, color: COLORS.primary, width: 40, fontSize: 22 }),
                  makeCell(config.type.toUpperCase(), { width: 60, fontSize: 22 }),
                ],
              }),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
            },
          }),

          // ==================
          // SECTION 2: EXECUTIVE SUMMARY
          // ==================
          sectionDivider(),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: '1. Executive Summary', font: 'Calibri' })],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: report.executiveSummary || `This accessibility audit evaluated ${projectName} against WCAG 2.2 Level A and AA standards. The audit identified ${score.totalIssues} accessibility issues across ${audit.pages.length} page(s).`,
                font: 'Calibri', size: 22, color: COLORS.dark,
              }),
            ],
          }),
          // Severity summary
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Issue Breakdown by Severity', font: 'Calibri' })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  makeCell('Severity', { bold: true, bg: COLORS.primary, color: COLORS.white, width: 25 }),
                  makeCell('Count', { bold: true, bg: COLORS.primary, color: COLORS.white, width: 25, alignment: AlignmentType.CENTER }),
                  makeCell('Percentage', { bold: true, bg: COLORS.primary, color: COLORS.white, width: 25, alignment: AlignmentType.CENTER }),
                  makeCell('Priority', { bold: true, bg: COLORS.primary, color: COLORS.white, width: 25, alignment: AlignmentType.CENTER }),
                ],
              }),
              ...(['critical', 'high', 'medium', 'low'] as const).map((sev, idx) =>
                new TableRow({
                  children: [
                    makeCell(sev.charAt(0).toUpperCase() + sev.slice(1), {
                      bold: true, color: severityColor(sev),
                      bg: idx % 2 === 0 ? COLORS.lightGray : COLORS.white,
                    }),
                    makeCell(String(score.issueBySeverity[sev]), {
                      alignment: AlignmentType.CENTER,
                      bg: idx % 2 === 0 ? COLORS.lightGray : COLORS.white,
                    }),
                    makeCell(
                      score.totalIssues > 0
                        ? `${Math.round((score.issueBySeverity[sev] / score.totalIssues) * 100)}%`
                        : '0%',
                      {
                        alignment: AlignmentType.CENTER,
                        bg: idx % 2 === 0 ? COLORS.lightGray : COLORS.white,
                      }
                    ),
                    makeCell(
                      sev === 'critical' ? 'Immediate' : sev === 'high' ? 'High' : sev === 'medium' ? 'Moderate' : 'Low',
                      {
                        alignment: AlignmentType.CENTER,
                        bg: idx % 2 === 0 ? COLORS.lightGray : COLORS.white,
                        color: severityColor(sev),
                        bold: true,
                      }
                    ),
                  ],
                })
              ),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
            },
          }),

          // ==================
          // SECTION 3: SUMMARY TABLE
          // ==================
          sectionDivider(),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: '2. Summary of Findings', font: 'Calibri' })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header
              new TableRow({
                children: [
                  makeCell('Issue ID', { bold: true, bg: COLORS.primary, color: COLORS.white, width: 15 }),
                  makeCell('Issue Title', { bold: true, bg: COLORS.primary, color: COLORS.white, width: 40 }),
                  makeCell('WCAG SC', { bold: true, bg: COLORS.primary, color: COLORS.white, width: 25 }),
                  makeCell('Severity', { bold: true, bg: COLORS.primary, color: COLORS.white, width: 20, alignment: AlignmentType.CENTER }),
                ],
              }),
              // Data rows
              ...issues.map((issue, idx) =>
                new TableRow({
                  children: [
                    makeCell(`A11Y-${String(idx + 1).padStart(3, '0')}`, {
                      bold: true,
                      bg: idx % 2 === 0 ? COLORS.lightGray : COLORS.white,
                      fontSize: 18,
                    }),
                    makeCell(issue.title, {
                      bg: idx % 2 === 0 ? COLORS.lightGray : COLORS.white,
                      fontSize: 18,
                    }),
                    makeCell(`${issue.wcagCriterion} ${issue.wcagName}`, {
                      bg: idx % 2 === 0 ? COLORS.lightGray : COLORS.white,
                      fontSize: 18,
                    }),
                    makeCell(issue.severity.toUpperCase(), {
                      bold: true,
                      color: severityColor(issue.severity),
                      bg: severityBgColor(issue.severity),
                      alignment: AlignmentType.CENTER,
                      fontSize: 18,
                    }),
                  ],
                })
              ),
            ],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
            },
          }),

          // ==================
          // SECTION 4: DETAILED ISSUES
          // ==================
          sectionDivider(),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: '3. Detailed Issue Analysis', font: 'Calibri' })],
          }),
          ...issues.flatMap((issue, idx) => {
            const issueId = `A11Y-${String(idx + 1).padStart(3, '0')}`;
            const parts: (Paragraph | Table)[] = [
              // Issue heading
              new Paragraph({
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 300 },
                children: [
                  new TextRun({ text: `${issueId}: ${issue.title}`, font: 'Calibri' }),
                ],
              }),
              // Severity + WCAG tag line
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({ text: '⚠ Severity: ', font: 'Calibri', bold: true, size: 20 }),
                  new TextRun({ text: issue.severity.toUpperCase(), font: 'Calibri', bold: true, size: 20, color: severityColor(issue.severity) }),
                  new TextRun({ text: '    |    ', font: 'Calibri', size: 20, color: COLORS.gray }),
                  new TextRun({ text: '📋 WCAG SC: ', font: 'Calibri', bold: true, size: 20 }),
                  new TextRun({ text: `${issue.wcagCriterion} ${issue.wcagName} (Level ${issue.wcagLevel})`, font: 'Calibri', size: 20, color: COLORS.primary }),
                ],
              }),
              // Description
              new Paragraph({
                spacing: { before: 120 },
                children: [
                  new TextRun({ text: 'Description', font: 'Calibri', bold: true, size: 22, color: COLORS.dark }),
                ],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({ text: issue.description, font: 'Calibri', size: 20, color: COLORS.gray }),
                ],
              }),
              // Impact
              new Paragraph({
                spacing: { before: 120 },
                children: [
                  new TextRun({ text: 'Impact', font: 'Calibri', bold: true, size: 22, color: COLORS.dark }),
                ],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({ text: issue.impact, font: 'Calibri', size: 20, color: COLORS.gray }),
                ],
              }),
              // Remediation
              new Paragraph({
                spacing: { before: 120 },
                children: [
                  new TextRun({ text: 'Remediation Guidance', font: 'Calibri', bold: true, size: 22, color: COLORS.dark }),
                ],
              }),
              new Paragraph({
                spacing: { after: 120 },
                children: [
                  new TextRun({ text: issue.recommendation, font: 'Calibri', size: 20, color: '047857' }),
                ],
              }),
            ];

            // Code fix if available
            if (issue.codeFix) {
              parts.push(
                new Paragraph({
                  spacing: { before: 120 },
                  children: [
                    new TextRun({ text: 'Code Example', font: 'Calibri', bold: true, size: 22, color: COLORS.dark }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 200 },
                  shading: { type: ShadingType.SOLID, color: 'F8FAFC', fill: 'F8FAFC' },
                  border: {
                    top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                    left: { style: BorderStyle.THICK, size: 3, color: COLORS.primary },
                    right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
                  },
                  children: [
                    new TextRun({ text: issue.codeFix, font: 'Consolas', size: 18, color: COLORS.dark }),
                  ],
                })
              );
            }

            // Separator
            parts.push(
              new Paragraph({
                spacing: { before: 160, after: 160 },
                children: [
                  new TextRun({ text: '─────────────────────────────────────────────────────────', font: 'Calibri', size: 16, color: COLORS.border }),
                ],
              })
            );

            return parts;
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
