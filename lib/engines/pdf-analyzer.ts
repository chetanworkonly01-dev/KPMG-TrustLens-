import { AccessibilityIssue } from '../types/audit';
import { v4 as uuidv4 } from 'uuid';

interface PdfAnalysisResult {
  issues: AccessibilityIssue[];
  metadata: { title?: string; author?: string; pageCount: number; isTagged: boolean; hasLanguage: boolean; };
}

export async function analyzePdf(fileBuffer: Buffer, fileName: string, onProgress?: (msg: string) => void): Promise<PdfAnalysisResult> {
  const issues: AccessibilityIssue[] = [];
  let pdfData: { text: string; numpages: number; info: Record<string, string>; metadata: Record<string, string> | null };

  try {
    const pdfParseModule = await import('pdf-parse') as unknown as Record<string, unknown>;
    const pdfParse = (typeof pdfParseModule.default === 'function' ? pdfParseModule.default : pdfParseModule) as (buf: Buffer) => Promise<{ text: string; numpages: number; info: Record<string, string>; metadata: Record<string, string> | null }>;
    onProgress?.(`Parsing PDF: ${fileName}...`);
    pdfData = await pdfParse(fileBuffer);
  } catch (error) {
    return {
      issues: [{ id: uuidv4(), testId: 'PDF-ERR', title: 'PDF parsing error', description: `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown'}`, element: 'document', pageUrl: fileName, wcagCriterion: '1.3.1', wcagName: 'Info and Relationships', wcagLevel: 'A', severity: 'critical', impact: 'Document cannot be analyzed', recommendation: 'Ensure the PDF is not corrupted or password-protected.', category: 'pdf', source: 'pdf-analyzer' }],
      metadata: { pageCount: 0, isTagged: false, hasLanguage: false }
    };
  }

  const info = pdfData.info || {};
  const text = pdfData.text || '';
  const pageCount = pdfData.numpages || 0;
  const metaStr = pdfData.metadata ? JSON.stringify(pdfData.metadata).toLowerCase() : '';

  onProgress?.(`PDF parsed: ${pageCount} pages, checking accessibility...`);

  // PDF-01: Tagged structure
  const isTagged = !!(info.Tagged === 'yes' || metaStr.includes('tagged'));
  if (!isTagged) {
    issues.push({ id: uuidv4(), testId: 'PDF-01', title: 'Missing tagged PDF structure', description: 'PDF is not tagged. Tags are essential for screen readers to understand structure.', element: 'document structure', pageUrl: fileName, wcagCriterion: '1.3.1', wcagName: 'Info and Relationships', wcagLevel: 'A', severity: 'critical', impact: 'Screen reader users cannot navigate document structure', recommendation: 'Re-create with proper tagging. In Word, enable "Document structure tags for accessibility" when saving as PDF.', category: 'pdf', source: 'pdf-analyzer' });
  }

  // PDF-02: Reading order
  if (text && !isTagged) {
    const lines = text.split('\n').filter(l => l.trim());
    let hasOrderIssues = false;
    for (let i = 1; i < Math.min(lines.length, 50); i++) {
      if (lines[i].trim().length < 5 && lines[i - 1].trim().length > 40 && i + 1 < lines.length && lines[i + 1].trim().length > 40) {
        hasOrderIssues = true; break;
      }
    }
    if (hasOrderIssues) {
      issues.push({ id: uuidv4(), testId: 'PDF-02', title: 'Incorrect reading order', description: 'Content may be read in wrong order by screen readers due to missing tags.', element: 'reading order', pageUrl: fileName, wcagCriterion: '1.3.2', wcagName: 'Meaningful Sequence', wcagLevel: 'A', severity: 'high', impact: 'Screen reader users receive content in wrong order', recommendation: 'Use Adobe Acrobat Reading Order tool to fix tag order.', category: 'pdf', source: 'pdf-analyzer' });
    }
  }

  // PDF-03: Images without alt text (heuristic)
  const avgChars = text.length / Math.max(pageCount, 1);
  if (avgChars < 100 && pageCount > 0) {
    issues.push({ id: uuidv4(), testId: 'PDF-03', title: 'Possible missing alt text on images', description: `Very little text (${Math.round(avgChars)} chars/page) suggests image-heavy content lacking alt text.`, element: 'images', pageUrl: fileName, wcagCriterion: '1.1.1', wcagName: 'Non-text Content', wcagLevel: 'A', severity: 'critical', impact: 'Screen reader users cannot access image content', recommendation: 'Add alt text to all images using Adobe Acrobat Set Alternate Text feature.', category: 'pdf', source: 'pdf-analyzer' });
  }

  // PDF-04: Font embedding
  const hasEncoding = text.includes('�') || /[\x00-\x08\x0E-\x1F]/.test(text.substring(0, 1000));
  if (hasEncoding) {
    issues.push({ id: uuidv4(), testId: 'PDF-04', title: 'Font embedding issues', description: 'Text extraction reveals encoding issues - fonts may not be properly embedded.', element: 'fonts', pageUrl: fileName, wcagCriterion: '1.3.1', wcagName: 'Info and Relationships', wcagLevel: 'A', severity: 'high', impact: 'Screen readers may mispronounce or skip text', recommendation: 'Embed all fonts. In Acrobat: File > Properties > Fonts, verify all fonts are embedded.', category: 'pdf', source: 'pdf-analyzer' });
  }

  // PDF-05: Table structure
  if (text.match(/(\t.*){3,}/g) && !isTagged) {
    issues.push({ id: uuidv4(), testId: 'PDF-05', title: 'Table structure issues', description: 'Tabular data detected but lacks proper table tags.', element: 'tables', pageUrl: fileName, wcagCriterion: '1.3.1', wcagName: 'Info and Relationships', wcagLevel: 'A', severity: 'high', impact: 'Screen reader users cannot navigate table content', recommendation: 'Tag tables with Table, TR, TH, TD elements using Acrobat Table Editor.', category: 'pdf', source: 'pdf-analyzer' });
  }

  // PDF-06: Document title
  if (!info.Title?.trim()) {
    issues.push({ id: uuidv4(), testId: 'PDF-06', title: 'Missing document title', description: 'PDF metadata has no title. Browsers show filename instead.', element: 'metadata', pageUrl: fileName, wcagCriterion: '2.4.2', wcagName: 'Page Titled', wcagLevel: 'A', severity: 'medium', impact: 'Users cannot identify document purpose', recommendation: 'Add title in File > Properties > Description. Set Initial View to show Document Title.', category: 'pdf', source: 'pdf-analyzer' });
  }

  // PDF-07: Language
  const hasLang = !!(info.Language || metaStr.includes('lang'));
  if (!hasLang) {
    issues.push({ id: uuidv4(), testId: 'PDF-07', title: 'Missing language specification', description: 'PDF does not specify a language for screen reader pronunciation.', element: 'language', pageUrl: fileName, wcagCriterion: '3.1.1', wcagName: 'Language of Page', wcagLevel: 'A', severity: 'high', impact: 'Screen readers use incorrect language pronunciation', recommendation: 'Set language in File > Properties > Advanced > Language.', category: 'pdf', source: 'pdf-analyzer' });
  }

  onProgress?.(`PDF analysis complete: ${issues.length} issues found.`);
  return { issues, metadata: { title: info.Title, author: info.Author, pageCount, isTagged, hasLanguage: hasLang } };
}
