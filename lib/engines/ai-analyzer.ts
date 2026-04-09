import OpenAI from 'openai';
import { AccessibilityIssue, ConfidenceLevel } from '../types/audit';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

interface AIAnalysisInput {
  pageUrl: string;
  pageTitle: string;
  htmlSnippet: string;
  existingIssues: AccessibilityIssue[];
}

interface AIIssue {
  title: string;
  description: string;
  element: string;
  wcagCriterion: string;
  wcagName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  codeFix?: string;
  confidence: 'high' | 'medium' | 'low';
  uxCategory?: string;
}

export async function analyzeWithAI(input: AIAnalysisInput, onProgress?: (msg: string) => void): Promise<AccessibilityIssue[]> {
  if (!process.env.OPENAI_API_KEY) {
    onProgress?.('AI analysis skipped: No OpenAI API key configured.');
    return [];
  }

  onProgress?.(`AI analyzing ${input.pageTitle}...`);

  // Truncate HTML to avoid token limits
  const truncatedHtml = input.htmlSnippet.substring(0, 12000);
  const existingSummary = input.existingIssues.slice(0, 15).map(i => `- ${i.title} (${i.wcagCriterion})`).join('\n');

  const prompt = `You are an expert WCAG 2.2 accessibility auditor AND UX researcher. Analyze this HTML deeply and find accessibility issues that automated tools miss.

Page: ${input.pageTitle} (${input.pageUrl})

HTML (truncated):
\`\`\`html
${truncatedHtml}
\`\`\`

Already detected issues:
${existingSummary || 'None yet'}

## ANALYSIS REQUIREMENTS

### A. CONTEXTUAL ACCESSIBILITY ISSUES
Find issues that require human/AI judgment:
- Misleading or unhelpful alt text (e.g., "image.png", "photo", "IMG_001")
- Poor button/link labels that technically exist but are confusing
- Missing landmarks for major page sections
- Form groups without fieldset/legend
- Complex widgets missing ARIA patterns (tabs, accordions, carousels)
- Content that relies on visual layout alone
- Improper use of ARIA (aria-hidden on focusable, conflicting roles)

### B. UX-LEVEL ACCESSIBILITY ANALYSIS
Detect these UX problems:
- Buttons with unclear labels ("Click here", "Submit", "Go")
- Poor CTA visibility (CTAs that blend with surrounding text)
- Confusing navigation structure (deeply nested nav, inconsistent patterns)
- Cognitive overload issues (too many links, dense text without structure)
- Misleading link text that doesn't match destination
- Inconsistent UI patterns (different button styles for same action)
- Missing visual hierarchy (no clear heading structure)
- Interactive elements that look non-interactive or vice versa

### C. CONFIDENCE SCORING
For each issue, assess your confidence:
- "high": Clear violation that you're very certain about
- "medium": Likely issue but context might change interpretation
- "low": Potential issue that needs human verification

Return a JSON object with an "issues" array. Each issue:
{
  "title": "Issue title",
  "description": "Detailed description of the problem",
  "element": "CSS selector or description of affected element",
  "wcagCriterion": "X.X.X",
  "wcagName": "Criterion Name",
  "severity": "critical|high|medium|low",
  "recommendation": "Actionable fix instructions",
  "codeFix": "Optional HTML/CSS fix snippet",
  "confidence": "high|medium|low",
  "uxCategory": "Optional: label-clarity|navigation|cognitive-load|visual-hierarchy|interaction-design|consistency"
}

Return at most 8 issues. Only return issues NOT in the existing list. Return {"issues": []} if no additional issues found.

IMPORTANT: Think like a real accessibility expert doing a manual audit. Focus on REAL user problems, not just code issues.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    const aiIssues: AIIssue[] = parsed.issues || parsed || [];

    if (!Array.isArray(aiIssues)) return [];

    const issues: AccessibilityIssue[] = aiIssues.map(ai => ({
      id: uuidv4(),
      testId: `AI-${ai.wcagCriterion?.replace(/\./g, '') || 'GEN'}`,
      title: ai.title,
      description: ai.description + (ai.uxCategory ? ` [UX: ${ai.uxCategory}]` : ''),
      element: ai.element,
      pageUrl: input.pageUrl,
      wcagCriterion: ai.wcagCriterion || 'general',
      wcagName: ai.wcagName || 'AI-Detected Issue',
      wcagLevel: getLevel(ai.wcagCriterion),
      severity: ai.severity || 'medium',
      impact: `AI-detected: affects users relying on assistive technologies`,
      recommendation: ai.recommendation,
      codeFix: ai.codeFix,
      category: getCat(ai.wcagCriterion),
      source: 'ai-analysis' as const,
      confidence: mapConfidence(ai.confidence),
    }));

    onProgress?.(`AI found ${issues.length} additional issues (${issues.filter(i => i.confidence === 'high').length} high confidence).`);
    return issues;
  } catch (error) {
    console.error('AI analysis error:', error);
    onProgress?.('AI analysis failed, continuing with rule-based results.');
    return [];
  }
}

/**
 * Validate and assign confidence to rule-based issues
 */
export function assignConfidence(issue: AccessibilityIssue): ConfidenceLevel {
  // axe-core issues are generally high confidence
  if (issue.source === 'axe-core') return 'high';

  // Journey test issues are high confidence (tested interactively)
  if (issue.source === 'journey-test') return 'high';

  // Custom rules: depends on the rule type
  if (issue.source === 'custom-rule') {
    // Direct DOM checks are high confidence
    if (['P-01', 'P-03', 'U-01', 'O-04', 'O-07'].includes(issue.testId)) return 'high';
    // Pattern-matching checks are medium
    if (['P-05', 'P-10', 'O-10'].includes(issue.testId)) return 'medium';
    return 'medium';
  }

  // PDF analyzer issues are high confidence
  if (issue.source === 'pdf-analyzer') return 'high';

  // AI issues already have confidence set
  return issue.confidence || 'medium';
}

function mapConfidence(raw?: string): ConfidenceLevel {
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw;
  return 'medium';
}

function getLevel(criterion?: string): 'A' | 'AA' | 'AAA' {
  if (!criterion) return 'A';
  const aaaCriteria = ['1.2.6','1.2.7','1.2.8','1.2.9','1.4.6','1.4.8','1.4.9','2.1.3','2.2.3','2.2.4','2.2.5','2.3.2','2.4.8','2.4.9','2.4.10','2.4.12','2.4.13','3.1.3','3.1.4','3.1.5','3.1.6','3.2.5','3.3.5','3.3.6','3.3.9'];
  const aaCriteria = ['1.2.4','1.2.5','1.3.5','1.4.3','1.4.4','1.4.5','1.4.10','1.4.11','1.4.12','1.4.13','2.4.5','2.4.6','2.4.7','2.4.11','2.5.7','2.5.8','3.1.2','3.2.3','3.2.4','3.3.3','3.3.4','3.3.8','4.1.3'];
  if (aaaCriteria.includes(criterion)) return 'AAA';
  if (aaCriteria.includes(criterion)) return 'AA';
  return 'A';
}

function getCat(criterion?: string): AccessibilityIssue['category'] {
  if (!criterion) return 'perceivable';
  if (criterion.startsWith('1.')) return 'perceivable';
  if (criterion.startsWith('2.')) return 'operable';
  if (criterion.startsWith('3.')) return 'understandable';
  return 'robust';
}
