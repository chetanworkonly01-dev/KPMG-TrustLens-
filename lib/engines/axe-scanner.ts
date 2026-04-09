import { BrowserContext } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { AccessibilityIssue, PageData } from '../types/audit';
import { getSeverityFromAxeImpact, getImpactDescription } from '../wcag/severity';
import { WCAG_CRITERIA } from '../wcag/criteria';
import { v4 as uuidv4 } from 'uuid';

interface AxeViolation {
  id: string;
  impact?: string;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: AxeNode[];
}

interface AxeNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

const AXE_WCAG_TAG_MAP: Record<string, { criterion: string; name: string; level: 'A' | 'AA' | 'AAA' }> = {
  'wcag111': { criterion: '1.1.1', name: 'Non-text Content', level: 'A' },
  'wcag121': { criterion: '1.2.1', name: 'Audio-only and Video-only', level: 'A' },
  'wcag122': { criterion: '1.2.2', name: 'Captions (Prerecorded)', level: 'A' },
  'wcag125': { criterion: '1.2.5', name: 'Audio Description', level: 'AA' },
  'wcag131': { criterion: '1.3.1', name: 'Info and Relationships', level: 'A' },
  'wcag132': { criterion: '1.3.2', name: 'Meaningful Sequence', level: 'A' },
  'wcag133': { criterion: '1.3.3', name: 'Sensory Characteristics', level: 'A' },
  'wcag141': { criterion: '1.4.1', name: 'Use of Color', level: 'A' },
  'wcag143': { criterion: '1.4.3', name: 'Contrast (Minimum)', level: 'AA' },
  'wcag145': { criterion: '1.4.5', name: 'Images of Text', level: 'AA' },
  'wcag1410': { criterion: '1.4.10', name: 'Reflow', level: 'AA' },
  'wcag1411': { criterion: '1.4.11', name: 'Non-text Contrast', level: 'AA' },
  'wcag211': { criterion: '2.1.1', name: 'Keyboard', level: 'A' },
  'wcag212': { criterion: '2.1.2', name: 'No Keyboard Trap', level: 'A' },
  'wcag221': { criterion: '2.2.1', name: 'Timing Adjustable', level: 'A' },
  'wcag222': { criterion: '2.2.2', name: 'Pause, Stop, Hide', level: 'A' },
  'wcag241': { criterion: '2.4.1', name: 'Bypass Blocks', level: 'A' },
  'wcag242': { criterion: '2.4.2', name: 'Page Titled', level: 'A' },
  'wcag243': { criterion: '2.4.3', name: 'Focus Order', level: 'A' },
  'wcag244': { criterion: '2.4.4', name: 'Link Purpose (In Context)', level: 'A' },
  'wcag245': { criterion: '2.4.5', name: 'Multiple Ways', level: 'AA' },
  'wcag247': { criterion: '2.4.7', name: 'Focus Visible', level: 'AA' },
  'wcag2411': { criterion: '2.4.11', name: 'Focus Not Obscured', level: 'AA' },
  'wcag253': { criterion: '2.5.3', name: 'Label in Name', level: 'A' },
  'wcag254': { criterion: '2.5.4', name: 'Motion Actuation', level: 'A' },
  'wcag257': { criterion: '2.5.7', name: 'Dragging Movements', level: 'AA' },
  'wcag258': { criterion: '2.5.8', name: 'Target Size (Minimum)', level: 'AA' },
  'wcag311': { criterion: '3.1.1', name: 'Language of Page', level: 'A' },
  'wcag312': { criterion: '3.1.2', name: 'Language of Parts', level: 'AA' },
  'wcag321': { criterion: '3.2.1', name: 'On Focus', level: 'A' },
  'wcag322': { criterion: '3.2.2', name: 'On Input', level: 'A' },
  'wcag324': { criterion: '3.2.4', name: 'Consistent Identification', level: 'AA' },
  'wcag326': { criterion: '3.2.6', name: 'Consistent Help', level: 'A' },
  'wcag331': { criterion: '3.3.1', name: 'Error Identification', level: 'A' },
  'wcag332': { criterion: '3.3.2', name: 'Labels or Instructions', level: 'A' },
  'wcag333': { criterion: '3.3.3', name: 'Error Suggestion', level: 'AA' },
  'wcag334': { criterion: '3.3.4', name: 'Error Prevention', level: 'AA' },
  'wcag337': { criterion: '3.3.7', name: 'Redundant Entry', level: 'A' },
  'wcag338': { criterion: '3.3.8', name: 'Accessible Authentication', level: 'AA' },
  'wcag412': { criterion: '4.1.2', name: 'Name, Role, Value', level: 'A' },
  'wcag413': { criterion: '4.1.3', name: 'Status Messages', level: 'AA' },
};

function mapAxeTagsToWcag(tags: string[]): { criterion: string; name: string; level: 'A' | 'AA' | 'AAA' } | null {
  for (const tag of tags) {
    const mapped = AXE_WCAG_TAG_MAP[tag];
    if (mapped) return mapped;
  }
  // Try matching wcag2a, wcag2aa patterns
  if (tags.some(t => t === 'wcag2aaa' || t === 'wcag21aaa' || t === 'wcag22aaa')) {
    return { criterion: 'general', name: 'WCAG AAA Best Practice', level: 'AAA' };
  }
  if (tags.some(t => t === 'wcag2aa' || t === 'wcag21aa' || t === 'wcag22aa')) {
    return { criterion: 'general', name: 'WCAG AA Requirement', level: 'AA' };
  }
  if (tags.some(t => t === 'wcag2a' || t === 'wcag21a' || t === 'wcag22a')) {
    return { criterion: 'general', name: 'WCAG A Requirement', level: 'A' };
  }
  return null;
}

function getCategoryFromCriterion(criterion: string): AccessibilityIssue['category'] {
  if (criterion.startsWith('1.')) return 'perceivable';
  if (criterion.startsWith('2.')) return 'operable';
  if (criterion.startsWith('3.')) return 'understandable';
  if (criterion.startsWith('4.')) return 'robust';
  return 'perceivable';
}

function getTestIdForAxeRule(ruleId: string, criterion: string): string {
  const prefix = criterion.startsWith('1.') ? 'P' :
                 criterion.startsWith('2.') ? 'O' :
                 criterion.startsWith('3.') ? 'U' : 'R';
  return `${prefix}-AXE-${ruleId}`;
}

export async function scanWithAxe(
  context: BrowserContext,
  pageData: PageData,
  onProgress?: (message: string) => void
): Promise<AccessibilityIssue[]> {
  const issues: AccessibilityIssue[] = [];
  const page = await context.newPage();

  try {
    await page.goto(pageData.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    onProgress?.(`Scanning ${pageData.title} with axe-core...`);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();

    for (const violation of results.violations as AxeViolation[]) {
      const wcagMapping = mapAxeTagsToWcag(violation.tags);
      if (!wcagMapping) continue;

      const severity = getSeverityFromAxeImpact(violation.impact);

      for (const node of violation.nodes) {
        issues.push({
          id: uuidv4(),
          testId: getTestIdForAxeRule(violation.id, wcagMapping.criterion),
          title: violation.help,
          description: violation.description + (node.failureSummary ? ` — ${node.failureSummary}` : ''),
          element: node.target.join(' > '),
          elementHtml: node.html.substring(0, 500),
          pageUrl: pageData.url,
          wcagCriterion: wcagMapping.criterion,
          wcagName: wcagMapping.name,
          wcagLevel: wcagMapping.level,
          severity,
          impact: getImpactDescription(wcagMapping.criterion, severity),
          recommendation: generateAxeRecommendation(violation.id, violation.help),
          codeFix: generateAxeCodeFix(violation.id, node.html),
          category: getCategoryFromCriterion(wcagMapping.criterion),
          source: 'axe-core'
        });
      }
    }
  } catch (error) {
    console.error(`axe-core scan failed for ${pageData.url}:`, error);
  } finally {
    await page.close();
  }

  return issues;
}

function generateAxeRecommendation(ruleId: string, help: string): string {
  const recommendations: Record<string, string> = {
    'image-alt': 'Add descriptive alt text to the image element. Use alt="" for decorative images.',
    'color-contrast': 'Increase the contrast ratio between the foreground text and background color to meet the minimum 4.5:1 ratio for normal text or 3:1 for large text.',
    'label': 'Add a <label> element associated with the form input using the "for" attribute, or use aria-label/aria-labelledby.',
    'link-name': 'Add descriptive text content to the link, or use aria-label to describe its purpose.',
    'button-name': 'Add text content to the button, or use aria-label to describe its purpose.',
    'html-has-lang': 'Add a lang attribute to the <html> element specifying the page language (e.g., lang="en").',
    'document-title': 'Add a descriptive <title> element inside the <head> section.',
    'heading-order': 'Ensure headings follow a logical order (h1 → h2 → h3) without skipping levels.',
    'bypass': 'Add a "Skip to main content" link as the first focusable element on the page.',
    'aria-roles': 'Use valid ARIA role values. Remove or replace invalid roles with appropriate ones.',
    'aria-valid-attr': 'Remove invalid ARIA attributes or replace them with valid ones.',
    'aria-valid-attr-value': 'Provide valid values for ARIA attributes.',
    'tabindex': 'Avoid using tabindex values greater than 0. Use tabindex="0" or tabindex="-1" instead.',
    'region': 'Ensure all page content is contained within landmark regions (main, nav, header, footer, etc.).',
  };
  return recommendations[ruleId] || `Fix the issue: ${help}. Refer to WCAG guidelines for specific remediation steps.`;
}

function generateAxeCodeFix(ruleId: string, html: string): string {
  const fixes: Record<string, string> = {
    'image-alt': `<!-- Before -->\n${html}\n\n<!-- After -->\n${html.replace(/<img/, '<img alt="Descriptive text about the image"')}`,
    'html-has-lang': `<!-- Add lang attribute -->\n<html lang="en">`,
    'document-title': `<!-- Add inside <head> -->\n<title>Descriptive Page Title</title>`,
    'bypass': `<!-- Add as first element in <body> -->\n<a href="#main-content" class="skip-link">Skip to main content</a>`,
    'label': `<!-- Wrap input with label -->\n<label for="inputId">Label Text</label>\n<input id="inputId" type="text" />`,
    'button-name': `<!-- Add text or aria-label -->\n<button aria-label="Descriptive action">Action</button>`,
    'link-name': `<!-- Add descriptive text -->\n<a href="url">Descriptive Link Text</a>`,
  };
  return fixes[ruleId] || `// Review and fix the element:\n${html}`;
}
