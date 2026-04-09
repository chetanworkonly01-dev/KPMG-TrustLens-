import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuditResult, AccessibilityIssue, AuditScore } from '../types/audit';

// Color palette
const COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  primaryDark: [30, 64, 175] as [number, number, number],
  dark: [30, 41, 59] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  critical: [220, 38, 38] as [number, number, number],
  criticalBg: [254, 226, 226] as [number, number, number],
  high: [234, 88, 12] as [number, number, number],
  highBg: [255, 237, 213] as [number, number, number],
  medium: [202, 138, 4] as [number, number, number],
  mediumBg: [254, 249, 195] as [number, number, number],
  low: [22, 163, 74] as [number, number, number],
  lowBg: [220, 252, 231] as [number, number, number],
};

function severityColor(sev: string): [number, number, number] {
  switch (sev) {
    case 'critical': return COLORS.critical;
    case 'high': return COLORS.high;
    case 'medium': return COLORS.medium;
    case 'low': return COLORS.low;
    default: return COLORS.gray;
  }
}

function severityBgColor(sev: string): [number, number, number] {
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

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'Accessibility Audit Report',
      doc.internal.pageSize.getWidth() - 20,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
    // Top line
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(20, 12, doc.internal.pageSize.getWidth() - 20, 12);
  }
}

export async function generatePdf(audit: AuditResult): Promise<Buffer> {
  const report = audit.report!;
  const score = audit.score;
  const issues = audit.issues;
  const config = audit.config;
  const auditDate = new Date(audit.startedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const projectName = config.url || 'PDF Document';
  const pageWidth = 210; // A4
  const pageHeight = 297;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // ==============================
  // COVER PAGE
  // ==============================
  // Top accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(...COLORS.primary);
  doc.text('ACCESSIBILITY', pageWidth / 2, 80, { align: 'center' });

  doc.setFontSize(36);
  doc.setTextColor(...COLORS.dark);
  doc.text('AUDIT REPORT', pageWidth / 2, 95, { align: 'center' });

  // Decorative line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.line(60, 105, pageWidth - 60, 105);

  // Project info
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.gray);
  doc.text(projectName, pageWidth / 2, 120, { align: 'center' });

  // Cover metadata
  const coverData = [
    ['Audit Date', auditDate],
    ['Pages Audited', String(audit.pages.length)],
    ['Accessibility Score', `${score.overall}/100`],
    ['Compliance Level', complianceLabel(score.complianceLevel)],
    ['Total Issues Found', String(score.totalIssues)],
    ['Audit Type', config.type.toUpperCase()],
  ];

  autoTable(doc, {
    startY: 140,
    head: [],
    body: coverData,
    theme: 'grid',
    margin: { left: 50, right: 50 },
    styles: {
      fontSize: 11,
      cellPadding: 6,
      font: 'helvetica',
      textColor: COLORS.dark,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLORS.primary, cellWidth: 45 },
      1: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
  });

  // Bottom accent bar on cover
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');

  // ==============================
  // EXECUTIVE SUMMARY PAGE
  // ==============================
  doc.addPage();
  let y = 25;

  // Section heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.primary);
  doc.text('1. Executive Summary', 20, y);
  y += 4;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(20, y, 100, y);
  y += 12;

  // Summary text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  const summaryText = report.executiveSummary || `This accessibility audit evaluated ${projectName} against WCAG 2.2 Level A and AA standards. The audit identified ${score.totalIssues} accessibility issues across ${audit.pages.length} page(s).`;
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 40);
  doc.text(splitSummary, 20, y);
  y += splitSummary.length * 5 + 15;

  // Severity breakdown heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.dark);
  doc.text('Issue Breakdown by Severity', 20, y);
  y += 8;

  // Severity table
  autoTable(doc, {
    startY: y,
    head: [['Severity', 'Count', 'Percentage', 'Priority']],
    body: (['critical', 'high', 'medium', 'low'] as const).map(sev => [
      sev.charAt(0).toUpperCase() + sev.slice(1),
      String(score.issueBySeverity[sev]),
      score.totalIssues > 0
        ? `${Math.round((score.issueBySeverity[sev] / score.totalIssues) * 100)}%`
        : '0%',
      sev === 'critical' ? 'Immediate' : sev === 'high' ? 'High' : sev === 'medium' ? 'Moderate' : 'Low',
    ]),
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 10,
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 0) {
        const sev = data.cell.text[0]?.toLowerCase();
        if (sev) data.cell.styles.textColor = severityColor(sev);
      }
      if (data.section === 'body' && data.column.index === 3) {
        const sev = (['critical', 'high', 'medium', 'low'] as const)[data.row.index];
        if (sev) {
          data.cell.styles.textColor = severityColor(sev);
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 20, right: 20 },
  });

  // Score overview - visual boxes
  const tableEndY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  y = tableEndY;

  // Score cards
  const cardWidth = 38;
  const cardGap = 5;
  const startX = 20;
  const severities = ['critical', 'high', 'medium', 'low'] as const;

  severities.forEach((sev, i) => {
    const x = startX + i * (cardWidth + cardGap);
    // Card background
    doc.setFillColor(...severityBgColor(sev));
    doc.roundedRect(x, y, cardWidth, 30, 3, 3, 'F');
    // Count
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...severityColor(sev));
    doc.text(String(score.issueBySeverity[sev]), x + cardWidth / 2, y + 15, { align: 'center' });
    // Label
    doc.setFontSize(8);
    doc.text(sev.toUpperCase(), x + cardWidth / 2, y + 24, { align: 'center' });
  });

  // ==============================
  // SUMMARY TABLE OF FINDINGS
  // ==============================
  doc.addPage();
  y = 25;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.primary);
  doc.text('2. Summary of Findings', 20, y);
  y += 4;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(20, y, 100, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Issue ID', 'Issue Title', 'WCAG SC', 'Severity']],
    body: issues.map((issue, idx) => [
      `A11Y-${String(idx + 1).padStart(3, '0')}`,
      issue.title,
      `${issue.wcagCriterion} ${issue.wcagName}`,
      issue.severity.toUpperCase(),
    ]),
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
      overflow: 'linebreak',
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' },
      1: { cellWidth: 60 },
      2: { cellWidth: 55 },
      3: { cellWidth: 25, halign: 'center' },
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 3) {
        const sev = data.cell.text[0]?.toLowerCase();
        data.cell.styles.textColor = severityColor(sev);
        data.cell.styles.fillColor = severityBgColor(sev);
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 20, right: 20 },
  });

  // ==============================
  // DETAILED ISSUES SECTION
  // ==============================
  doc.addPage();
  y = 25;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.primary);
  doc.text('3. Detailed Issue Analysis', 20, y);
  y += 4;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(20, y, 120, y);
  y += 12;

  issues.forEach((issue, idx) => {
    const issueId = `A11Y-${String(idx + 1).padStart(3, '0')}`;

    // Check if we need a new page
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 25;
    }

    // Issue header background
    doc.setFillColor(...severityBgColor(issue.severity));
    doc.roundedRect(20, y - 4, pageWidth - 40, 14, 2, 2, 'F');

    // Issue title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${issueId}: ${issue.title}`, 24, y + 5);
    y += 16;

    // Severity + WCAG line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...severityColor(issue.severity));
    doc.text(`Severity: ${issue.severity.toUpperCase()}`, 24, y);

    doc.setTextColor(...COLORS.gray);
    doc.text('|', 70, y);

    doc.setTextColor(...COLORS.primary);
    doc.text(`WCAG SC: ${issue.wcagCriterion} ${issue.wcagName} (Level ${issue.wcagLevel})`, 76, y);
    y += 8;

    // Description
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text('Description:', 24, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    const descLines = doc.splitTextToSize(issue.description, pageWidth - 48);
    doc.text(descLines, 24, y);
    y += descLines.length * 4 + 4;

    // Impact
    if (y > pageHeight - 50) { doc.addPage(); y = 25; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text('Impact:', 24, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray);
    const impactLines = doc.splitTextToSize(issue.impact, pageWidth - 48);
    doc.text(impactLines, 24, y);
    y += impactLines.length * 4 + 4;

    // Remediation
    if (y > pageHeight - 50) { doc.addPage(); y = 25; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.text('Remediation Guidance:', 24, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(4, 120, 87);
    const recLines = doc.splitTextToSize(issue.recommendation, pageWidth - 48);
    doc.text(recLines, 24, y);
    y += recLines.length * 4 + 4;

    // Code fix
    if (issue.codeFix) {
      if (y > pageHeight - 50) { doc.addPage(); y = 25; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.dark);
      doc.text('Code Example:', 24, y);
      y += 5;

      // Code background
      const codeLines = doc.splitTextToSize(issue.codeFix, pageWidth - 52);
      const codeHeight = codeLines.length * 4 + 6;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...COLORS.primary);
      doc.setLineWidth(0.5);
      doc.roundedRect(24, y - 2, pageWidth - 48, codeHeight, 2, 2, 'FD');

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.dark);
      doc.text(codeLines, 28, y + 3);
      y += codeHeight + 4;
    }

    // Separator
    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;
  });

  // Add footers
  addFooter(doc);

  // Return buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
