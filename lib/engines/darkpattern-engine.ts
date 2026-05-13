// ============================================================
// KPMG TrustLens — Dark Pattern Detection Engine
// ============================================================

import type { BrowserContext, Page } from 'playwright';
import type {
  DarkPatternFinding, DarkPatternResult, DarkPatternCategory,
  EthicalPrinciple, DarkPatternEvidence,
} from '../types/darkpattern';
import { PRINCIPLE_WEIGHTS } from '../types/darkpattern';
import {
  DARK_PATTERN_RULES, URGENCY_PATTERNS, SOCIAL_PRESSURE_PATTERNS,
  CONFIRMSHAMING_PATTERNS,
} from './darkpattern-rules';

interface PageData { url: string; title: string; }

// ── Main Entry Point ──
export async function runDarkPatternAudit(
  context: BrowserContext,
  pages: PageData[],
  options: { aiClassification?: boolean } = {}
): Promise<DarkPatternResult> {
  const findings: DarkPatternFinding[] = [];
  let findingId = 0;

  for (const pageData of pages) {
    let page: Page | null = null;
    try {
      page = await context.newPage();
      await page.goto(pageData.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000); // let dynamic content render

      // Phase 1: DOM-level scans
      const domFindings = await runDOMScans(page, pageData.url);
      for (const f of domFindings) { f.id = `dp-${++findingId}`; findings.push(f); }

      // Phase 2: Visual asymmetry detection
      const visualFindings = await runVisualScans(page, pageData.url);
      for (const f of visualFindings) { f.id = `dp-${++findingId}`; findings.push(f); }

      // Phase 3: Text/NLP pattern detection
      const textFindings = await runTextPatternScans(page, pageData.url);
      for (const f of textFindings) { f.id = `dp-${++findingId}`; findings.push(f); }

    } catch (err) {
      console.error(`[TrustLens:DarkPattern] Error scanning ${pageData.url}:`, err);
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  return buildResult(findings, pages.length);
}

// ═══════════════════════════════════════════════════════════
// PHASE 1: DOM-Level Scanning
// ═══════════════════════════════════════════════════════════
async function runDOMScans(page: Page, pageUrl: string): Promise<DarkPatternFinding[]> {
  const findings: DarkPatternFinding[] = [];

  // DP-SN-01: Preselected checkboxes
  const preselected = await page.$$eval(
    'input[type="checkbox"][checked], input[type="checkbox"]:checked',
    els => els.map(el => ({
      html: el.outerHTML.substring(0, 200),
      name: el.getAttribute('name') || '',
      label: el.closest('label')?.textContent?.trim()?.substring(0, 100) || '',
      id: el.id || '',
    }))
  ).catch(() => []);

  for (const cb of preselected) {
    const isOptIn = /newsletter|marketing|subscribe|promo|offer|update|notify|consent|agree|opt/i.test(
      cb.name + cb.label + cb.id
    );
    if (isOptIn) {
      findings.push(makeFinding('DP-SN-01', pageUrl, cb.html, {
        summary: `Preselected opt-in checkbox found: "${cb.label || cb.name}"`,
        details: [`Checkbox "${cb.label || cb.name}" is checked by default`, `Element: ${cb.html}`],
        measurements: { label: cb.label, name: cb.name },
      }));
    }
  }

  // DP-SN-02: Preselected add-ons (radio/select defaults)
  const preselectedRadios = await page.$$eval(
    'input[type="radio"][checked], input[type="radio"]:checked',
    els => els.map(el => ({
      html: el.outerHTML.substring(0, 200),
      name: el.getAttribute('name') || '',
      label: el.closest('label')?.textContent?.trim()?.substring(0, 100) || '',
      value: el.getAttribute('value') || '',
    }))
  ).catch(() => []);

  for (const r of preselectedRadios) {
    if (/add-?on|extra|premium|upgrade|insurance|protect/i.test(r.label + r.value + r.name)) {
      findings.push(makeFinding('DP-SN-02', pageUrl, r.html, {
        summary: `Preselected add-on option: "${r.label}"`,
        details: [`Radio button "${r.label}" preselects an add-on`, `Element: ${r.html}`],
      }));
    }
  }

  // DP-FA-01: Login/registration wall blocking content
  const loginWall = await page.$$eval(
    '[class*="login-wall"], [class*="signup-wall"], [class*="registration-wall"], [class*="paywall"], [class*="gate"], [id*="login-modal"], [class*="auth-modal"]',
    els => els.filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }).map(el => el.outerHTML.substring(0, 200))
  ).catch(() => []);

  if (loginWall.length > 0) {
    findings.push(makeFinding('DP-FA-01', pageUrl, loginWall[0], {
      summary: 'Login/registration wall detected blocking content access',
      details: [`${loginWall.length} blocking overlay(s) found`, `Element: ${loginWall[0]}`],
    }));
  }

  // DP-FA-03: App install prompt blocking content
  const appInstall = await page.$$eval(
    '[class*="app-install"], [class*="app-banner"], [class*="smart-banner"], [id*="app-install"]',
    els => els.filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && parseFloat(style.height) > 80;
    }).map(el => el.outerHTML.substring(0, 200))
  ).catch(() => []);

  if (appInstall.length > 0) {
    findings.push(makeFinding('DP-FA-03', pageUrl, appInstall[0], {
      summary: 'Blocking app install prompt detected',
      details: [`Full-screen or large app install prompt found`, `Element: ${appInstall[0]}`],
    }));
  }

  // DP-NG-01: Multiple overlapping modals
  const visibleModals = await page.$$eval(
    '[role="dialog"], [class*="modal"], [class*="popup"], [class*="overlay"]',
    els => els.filter(el => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    }).length
  ).catch(() => 0);

  if (visibleModals >= 2) {
    findings.push(makeFinding('DP-NG-01', pageUrl, '', {
      summary: `${visibleModals} overlapping modal dialogs detected simultaneously`,
      details: [`${visibleModals} visible modals/popups/overlays found at the same time`],
      measurements: { visibleModals },
    }));
  }

  // DP-NG-02: Notification permission prompt detection
  const notifPrompt = await page.$$eval(
    '[class*="notification"], [class*="push-prompt"], [class*="enable-notif"]',
    els => els.filter(el => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && /notification|push|enable|allow/i.test(el.textContent || '');
    }).map(el => el.outerHTML.substring(0, 200))
  ).catch(() => []);

  if (notifPrompt.length > 0) {
    findings.push(makeFinding('DP-NG-02', pageUrl, notifPrompt[0], {
      summary: 'Notification permission prompt displayed on page load',
      details: ['Site prompts for notification permissions without prior user engagement'],
    }));
  }

  // DP-SU-01: Countdown timers
  const countdowns = await page.$$eval(
    '[class*="countdown"], [class*="timer"], [class*="clock"], [data-countdown], [class*="time-left"]',
    els => els.filter(el => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && el.textContent && /\d+\s*[:\-]\s*\d+/.test(el.textContent);
    }).map(el => ({
      html: el.outerHTML.substring(0, 200),
      text: el.textContent?.trim()?.substring(0, 80) || '',
    }))
  ).catch(() => []);

  if (countdowns.length > 0) {
    findings.push(makeFinding('DP-SU-01', pageUrl, countdowns[0].html, {
      summary: `Countdown timer detected: "${countdowns[0].text}"`,
      details: countdowns.map(c => `Timer: "${c.text}"`),
      measurements: { count: countdowns.length },
    }));
  }

  // DP-OB-01/02: Missing unsubscribe/cancel/delete links
  const pageText = await page.evaluate(() => document.body?.textContent?.toLowerCase() || '').catch(() => '');
  const hasSubscribe = /subscribe|sign.?up|create.?account|register|join/i.test(pageText);
  const hasUnsubscribe = /unsubscribe|cancel|opt.?out|remove.?account|delete.?account|close.?account/i.test(pageText);

  if (hasSubscribe && !hasUnsubscribe) {
    findings.push(makeFinding('DP-OB-01', pageUrl, '', {
      summary: 'Subscribe/sign-up options found but no visible unsubscribe/cancel path',
      details: ['Page offers subscription but no visible way to reverse it'],
    }));
  }

  // DP-SN-04: Hidden inputs with suspicious values
  const hiddenInputs = await page.$$eval(
    'input[type="hidden"]',
    els => els.filter(el => {
      const name = el.getAttribute('name') || '';
      const val = el.getAttribute('value') || '';
      return /opt|subscribe|marketing|consent|agree|newsletter|promo/i.test(name) && val;
    }).map(el => ({ name: el.getAttribute('name'), value: el.getAttribute('value'), html: el.outerHTML }))
  ).catch(() => []);

  for (const h of hiddenInputs) {
    findings.push(makeFinding('DP-SN-04', pageUrl, h.html || '', {
      summary: `Hidden input "${h.name}" carries default value "${h.value}"`,
      details: [`Hidden field submits data without user awareness: ${h.name}=${h.value}`],
    }));
  }

  // DP-PZ-01: Excessive data collection
  const formFields = await page.$$eval('form', forms => forms.map(f => {
    const inputs = f.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
    return {
      action: f.getAttribute('action') || '',
      fieldCount: inputs.length,
      html: f.outerHTML.substring(0, 300),
      hasEmail: !!f.querySelector('[type="email"], [name*="email"]'),
      hasPhone: !!f.querySelector('[type="tel"], [name*="phone"], [name*="mobile"]'),
      hasAddress: !!f.querySelector('[name*="address"], [name*="street"], [name*="city"]'),
    };
  })).catch(() => []);

  for (const form of formFields) {
    if (form.hasEmail && form.hasPhone && form.fieldCount >= 6 && !form.hasAddress) {
      findings.push(makeFinding('DP-PZ-01', pageUrl, form.html, {
        summary: `Form collects ${form.fieldCount} fields including phone — potentially excessive for purpose`,
        details: [`Form with ${form.fieldCount} visible fields collects phone number and email`, 'May exceed data minimization requirements'],
        measurements: { fieldCount: form.fieldCount },
      }));
    }
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════
// PHASE 2: Visual Asymmetry Detection
// ═══════════════════════════════════════════════════════════
async function runVisualScans(page: Page, pageUrl: string): Promise<DarkPatternFinding[]> {
  const findings: DarkPatternFinding[] = [];

  // Detect cookie/consent banners and analyze button asymmetry
  const consentAnalysis = await page.evaluate(() => {
    const bannerSelectors = [
      '[class*="cookie"], [class*="consent"], [class*="gdpr"], [class*="privacy-banner"]',
      '[id*="cookie"], [id*="consent"], [id*="gdpr"]',
      '[class*="cc-banner"], [class*="cc-window"]',
      '[role="dialog"][class*="cookie"], [role="dialog"][class*="consent"]',
    ].join(', ');

    const banners = document.querySelectorAll(bannerSelectors);
    const results: Array<{
      bannerHtml: string;
      buttons: Array<{ text: string; width: number; height: number; bgColor: string; color: string; opacity: number; fontSize: number; isAccept: boolean }>;
    }> = [];

    banners.forEach(banner => {
      const style = window.getComputedStyle(banner);
      if (style.display === 'none' || style.visibility === 'hidden') return;

      const buttons = banner.querySelectorAll('button, a[role="button"], [class*="btn"]');
      const btnData: Array<{ text: string; width: number; height: number; bgColor: string; color: string; opacity: number; fontSize: number; isAccept: boolean }> = [];

      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        const bs = window.getComputedStyle(btn);
        const text = btn.textContent?.trim() || '';
        const isAccept = /accept|agree|allow|ok|got\s*it|i\s*agree|yes|enable/i.test(text);
        btnData.push({
          text, width: rect.width, height: rect.height,
          bgColor: bs.backgroundColor, color: bs.color,
          opacity: parseFloat(bs.opacity), fontSize: parseFloat(bs.fontSize),
          isAccept,
        });
      });

      if (btnData.length >= 2) {
        results.push({ bannerHtml: banner.outerHTML.substring(0, 300), buttons: btnData });
      }
    });

    return results;
  }).catch(() => []);

  for (const banner of consentAnalysis) {
    const acceptBtns = banner.buttons.filter(b => b.isAccept);
    const rejectBtns = banner.buttons.filter(b => !b.isAccept);

    if (acceptBtns.length > 0 && rejectBtns.length > 0) {
      const accept = acceptBtns[0];
      const reject = rejectBtns[0];
      const acceptArea = accept.width * accept.height;
      const rejectArea = reject.width * reject.height;

      // DP-IF-01: Size asymmetry
      if (acceptArea > 0 && rejectArea > 0 && acceptArea / rejectArea > 2) {
        findings.push(makeFinding('DP-IF-01', pageUrl, banner.bannerHtml, {
          summary: `Accept button is ${(acceptArea / rejectArea).toFixed(1)}× larger than reject`,
          details: [
            `Accept: ${accept.width.toFixed(0)}×${accept.height.toFixed(0)}px ("${accept.text}")`,
            `Reject: ${reject.width.toFixed(0)}×${reject.height.toFixed(0)}px ("${reject.text}")`,
            `Area ratio: ${(acceptArea / rejectArea).toFixed(1)}:1`,
          ],
          measurements: {
            acceptWidth: Math.round(accept.width), acceptHeight: Math.round(accept.height),
            rejectWidth: Math.round(reject.width), rejectHeight: Math.round(reject.height),
            ratio: parseFloat((acceptArea / rejectArea).toFixed(1)),
          },
        }));
      }

      // DP-IF-02: Color asymmetry (check if reject is transparent/muted)
      const rejectIsMuted = reject.opacity < 0.7 ||
        /transparent|rgba\(.*,\s*0[\.\d]*\)/i.test(reject.bgColor) ||
        reject.bgColor === 'rgba(0, 0, 0, 0)';
      const acceptIsVibrant = !/transparent|rgba\(.*,\s*0[\.\d]*\)/i.test(accept.bgColor) &&
        accept.bgColor !== 'rgba(0, 0, 0, 0)';

      if (acceptIsVibrant && rejectIsMuted) {
        findings.push(makeFinding('DP-IF-02', pageUrl, banner.bannerHtml, {
          summary: 'Accept uses vibrant color while reject is transparent/muted',
          details: [
            `Accept bg: ${accept.bgColor} ("${accept.text}")`,
            `Reject bg: ${reject.bgColor} ("${reject.text}")`,
          ],
          measurements: { acceptBg: accept.bgColor, rejectBg: reject.bgColor },
        }));
      }

      // DP-IF-04: Tiny dismiss/reject button
      if (reject.width < 24 || reject.height < 24) {
        findings.push(makeFinding('DP-IF-04', pageUrl, banner.bannerHtml, {
          summary: `Reject/dismiss button is only ${reject.width.toFixed(0)}×${reject.height.toFixed(0)}px — hard to target`,
          details: [`Minimum recommended touch target: 44×44px`, `Found: ${reject.width.toFixed(0)}×${reject.height.toFixed(0)}px`],
          measurements: { width: Math.round(reject.width), height: Math.round(reject.height) },
        }));
      }
    }
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════
// PHASE 3: Text/NLP Pattern Detection
// ═══════════════════════════════════════════════════════════
async function runTextPatternScans(page: Page, pageUrl: string): Promise<DarkPatternFinding[]> {
  const findings: DarkPatternFinding[] = [];

  // Extract all visible text from interactive and content elements
  const textElements = await page.$$eval(
    'button, a, [role="button"], [class*="cta"], [class*="banner"], [class*="promo"], p, span, h1, h2, h3, h4, h5, h6, label, [class*="alert"], [class*="notice"]',
    els => els
      .filter(el => { const s = window.getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden'; })
      .map(el => ({
        text: el.textContent?.trim()?.substring(0, 200) || '',
        tag: el.tagName.toLowerCase(),
        html: el.outerHTML.substring(0, 200),
        isButton: el.tagName === 'BUTTON' || el.getAttribute('role') === 'button',
        isLink: el.tagName === 'A',
      }))
      .filter(el => el.text.length > 3)
  ).catch(() => []);

  // DP-SU-02/03: Urgency/scarcity language
  for (const el of textElements) {
    for (const pattern of URGENCY_PATTERNS) {
      if (pattern.test(el.text)) {
        const ruleId = /\d+\s*(left|remaining|available)/i.test(el.text) ? 'DP-SU-02' : 'DP-SU-03';
        findings.push(makeFinding(ruleId, pageUrl, el.html, {
          summary: `Urgency/scarcity language detected: "${el.text.substring(0, 80)}"`,
          details: [`Text: "${el.text}"`, `Element: <${el.tag}>`, `Pattern matched: ${pattern.source}`],
        }));
        break; // one match per element
      }
    }
  }

  // DP-SP-01/02: Social pressure
  for (const el of textElements) {
    for (const pattern of SOCIAL_PRESSURE_PATTERNS) {
      if (pattern.test(el.text)) {
        findings.push(makeFinding('DP-SP-01', pageUrl, el.html, {
          summary: `Social pressure messaging: "${el.text.substring(0, 80)}"`,
          details: [`Text: "${el.text}"`, `Pattern: ${pattern.source}`],
        }));
        break;
      }
    }
  }

  // DP-CS-01/02: Confirmshaming in button/link text
  for (const el of textElements) {
    if ((el.isButton || el.isLink) && el.text.length > 5) {
      for (const pattern of CONFIRMSHAMING_PATTERNS) {
        if (pattern.test(el.text)) {
          findings.push(makeFinding('DP-CS-01', pageUrl, el.html, {
            summary: `Confirmshaming language on ${el.isButton ? 'button' : 'link'}: "${el.text}"`,
            details: [`Text: "${el.text}"`, `This language shames users who choose to decline`],
          }));
          break;
        }
      }
    }
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function makeFinding(
  ruleId: string, pageUrl: string, elementHtml: string, evidence: DarkPatternEvidence
): DarkPatternFinding {
  const rule = DARK_PATTERN_RULES.find(r => r.id === ruleId);
  if (!rule) throw new Error(`Unknown dark pattern rule: ${ruleId}`);
  return {
    id: '',  // assigned by caller
    ruleId,
    category: rule.category,
    principle: rule.principle,
    title: rule.title,
    description: rule.description,
    element: '',
    elementHtml: elementHtml || undefined,
    pageUrl,
    severity: rule.severity,
    regulation: rule.regulation,
    confidence: rule.detect === 'ai' ? 'medium' : 'high',
    recommendation: getRecommendation(rule.category),
    userImpact: getUserImpact(rule.principle),
    evidence,
    source: rule.detect === 'ai' ? 'ai' : rule.detect === 'journey' ? 'journey' : 'rule',
  };
}

function getRecommendation(category: DarkPatternCategory): string {
  const recs: Record<DarkPatternCategory, string> = {
    'interface-interference': 'Ensure all choice options (accept/reject) have equal visual prominence — same size, color contrast, and positioning.',
    'obstruction': 'Ensure opt-out/cancel flows have equal or fewer steps than opt-in/subscribe flows.',
    'sneaking': 'Remove all preselected opt-ins. All consent must be affirmative — require explicit user action.',
    'forced-action': 'Remove forced account creation walls. Allow content access without mandatory registration.',
    'nagging': 'Limit interruptions to one modal/banner at a time. Respect user dismissals permanently.',
    'scarcity-urgency': 'Remove or verify urgency messaging. Only display real-time availability data that is accurate and verifiable.',
    'social-pressure': 'Remove or verify social proof metrics. Do not display fabricated or unverifiable activity data.',
    'privacy-zuckering': 'Apply data minimization principle — only collect data necessary for the stated purpose.',
    'confirmshaming': 'Use neutral language for all options. "No thanks" is acceptable; guilt-inducing phrasing is not.',
    'misdirection': 'Ensure all options in pricing/plan comparisons have equal visual weight and clear labeling.',
  };
  return recs[category];
}

function getUserImpact(principle: EthicalPrinciple): string {
  const impacts: Record<EthicalPrinciple, string> = {
    'informed-consent': 'Users may unknowingly agree to terms, data sharing, or subscriptions they do not want.',
    'symmetry-of-choice': 'Users face unequal friction when trying to decline vs accept, biasing their decisions.',
    'transparency': 'Users cannot make informed decisions because costs, terms, or data practices are hidden.',
    'user-autonomy': 'Users are emotionally pressured into decisions through shame, fear, or artificial urgency.',
    'accessibility-clarity': 'Users with disabilities, low literacy, or elderly demographics cannot understand the flow.',
  };
  return impacts[principle];
}

function buildResult(findings: DarkPatternFinding[], pagesScanned: number): DarkPatternResult {
  const categoryBreakdown = {} as Record<DarkPatternCategory, number>;
  const findingsBySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const principleScores = {} as Record<EthicalPrinciple, number>;
  const regulatorySet = new Set<string>();

  // Count by category
  for (const f of findings) {
    categoryBreakdown[f.category] = (categoryBreakdown[f.category] || 0) + 1;
    findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] || 0) + 1;
    f.regulation.forEach(r => regulatorySet.add(r));
  }

  // Calculate per-principle scores
  const allPrinciples: EthicalPrinciple[] = [
    'informed-consent', 'symmetry-of-choice', 'transparency', 'user-autonomy', 'accessibility-clarity'
  ];
  const sevWeights = { critical: 15, high: 8, medium: 3, low: 1 };

  for (const p of allPrinciples) {
    const pFindings = findings.filter(f => f.principle === p);
    let deduction = 0;
    for (const f of pFindings) {
      deduction += sevWeights[f.severity] * (f.confidence === 'high' ? 1 : f.confidence === 'medium' ? 0.7 : 0.4);
    }
    principleScores[p] = Math.max(0, Math.round(100 - deduction));
  }

  // Calculate overall ethics score
  let weightedSum = 0, totalWeight = 0;
  for (const p of allPrinciples) {
    const w = PRINCIPLE_WEIGHTS[p];
    weightedSum += principleScores[p] * w;
    totalWeight += w;
  }
  const ethicsScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;

  // Consent integrity: focused on informed-consent + symmetry
  const consentIntegrity = Math.round(
    (principleScores['informed-consent'] * 0.6 + principleScores['symmetry-of-choice'] * 0.4)
  );

  // Choice symmetry score
  const symmetryFindings = findings.filter(f => f.principle === 'symmetry-of-choice');
  const choiceSymmetry = symmetryFindings.length === 0 ? 100 :
    Math.max(0, 100 - symmetryFindings.length * 20);

  // Manipulation index (inverse — lower is better)
  const manipFindings = findings.filter(f =>
    f.category === 'scarcity-urgency' || f.category === 'social-pressure' ||
    f.category === 'confirmshaming' || f.category === 'nagging'
  );
  const manipulationIndex = manipFindings.length === 0 ? 0 :
    Math.min(100, manipFindings.length * 15);

  return {
    findings,
    ethicsScore,
    principleScores,
    categoryBreakdown,
    consentIntegrity,
    choiceSymmetry,
    manipulationIndex,
    totalFindings: findings.length,
    findingsBySeverity,
    pagesScanned,
    regulatoryRisks: [...regulatorySet] as any[],
  };
}
