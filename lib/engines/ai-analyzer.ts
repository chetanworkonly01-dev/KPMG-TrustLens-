import OpenAI from 'openai';
import { AccessibilityIssue } from '../types/audit';
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
}

export async function analyzeWithAI(input: AIAnalysisInput, onProgress?: (msg: string) => void): Promise<AccessibilityIssue[]> {
  if (!process.env.OPENAI_API_KEY) {
    onProgress?.('AI analysis skipped: No OpenAI API key configured.');
    return [];
  }

  onProgress?.(`AI analyzing ${input.pageTitle}...`);

  // Truncate HTML to avoid token limits
  const truncatedHtml = input.htmlSnippet.substring(0, 8000);
  const existingSummary = input.existingIssues.slice(0, 10).map(i => `- ${i.title} (${i.wcagCriterion})`).join('\n');

  const prompt = `You are a WCAG 2.2 accessibility expert. Analyze this HTML and find accessibility issues that automated tools might miss.

Page: ${input.pageTitle} (${input.pageUrl})

HTML (truncated):
\`\`\`html
${truncatedHtml}
\`\`\`

Already detected issues:
${existingSummary || 'None yet'}

Find ADDITIONAL contextual issues like:
- Misleading or unhelpful alt text
- Poor button/link labels that technically exist but are confusing
- Missing landmarks for major page sections
- Form groups without fieldset/legend
- Complex widgets missing ARIA patterns
- Content that seems to rely on visual layout alone

Return a JSON array of issues. Each issue:
{
  "title": "Issue title",
  "description": "Detailed description",
  "element": "CSS selector or description",
  "wcagCriterion": "X.X.X",
  "wcagName": "Criterion Name",
  "severity": "critical|high|medium|low",
  "recommendation": "How to fix",
  "codeFix": "Optional code example"
}

Return at most 5 issues. Only return issues NOT in the existing list. Return [] if no additional issues found.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
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
      description: ai.description,
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
      source: 'ai-analysis' as const
    }));

    onProgress?.(`AI found ${issues.length} additional issues.`);
    return issues;
  } catch (error) {
    console.error('AI analysis error:', error);
    onProgress?.('AI analysis failed, continuing with rule-based results.');
    return [];
  }
}

function getLevel(criterion?: string): 'A' | 'AA' | 'AAA' {
  if (!criterion) return 'A';
  const aaaCriteria = ['1.2.6','1.2.7','1.2.8','1.2.9','1.4.6','1.4.8','1.4.9','2.1.3','2.2.3','2.2.4','2.2.5','2.3.2','2.4.8','2.4.9','2.4.10','2.4.12','2.4.13','3.1.3','3.1.4','3.1.5','3.1.6','3.2.5','3.3.5','3.3.6','3.3.9'];
  const aaCriteria = ['1.2.4','1.2.5','1.4.3','1.4.4','1.4.5','1.4.10','1.4.11','1.4.12','1.4.13','2.4.5','2.4.6','2.4.7','2.4.11','2.5.7','2.5.8','3.1.2','3.2.3','3.2.4','3.3.3','3.3.4','3.3.8','4.1.3'];
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
