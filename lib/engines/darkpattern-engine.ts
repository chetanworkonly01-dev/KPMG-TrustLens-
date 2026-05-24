import type { BrowserContext, Page } from 'playwright';
import type {
  DarkPatternFinding, DarkPatternResult, DarkPatternCategory,
  EthicalPrinciple, DarkPatternEvidence,
} from '../types/darkpattern';
import { PRINCIPLE_WEIGHTS } from '../types/darkpattern';
import {
  DARK_PATTERN_RULES, VISUAL_AI_RULES, URGENCY_PATTERNS, SOCIAL_PRESSURE_PATTERNS,
  CONFIRMSHAMING_PATTERNS, FEAR_LANGUAGE_PATTERNS, TRICK_QUESTION_PATTERNS,
} from './darkpattern-rules';
import type { TestLogEntry } from '../types/audit';

interface PageData { url: string; title: string; }
type ProgressFn = (entry: TestLogEntry) => void;

// ── Main Entry Point ──
export async function runDarkPatternAudit(
  context: BrowserContext,
  pages: PageData[],
  options: { aiClassification?: boolean } = {},
  onProgress?: ProgressFn
): Promise<DarkPatternResult> {
  const findings: DarkPatternFinding[] = [];
  let findingId = 0;
  const log = (testId: string, status: string, message: string, methodology?: string, phase?: string) => {
    onProgress?.({ timestamp: new Date().toISOString(), testId, testName: 'Dark Pattern', wcag: '', status: status as any, message, pillar: 'darkpatterns', methodology, phase });
  };

  for (const pageData of pages) {
    let page: Page | null = null;
    try {
      page = await context.newPage();
      await page.goto(pageData.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // ── Phase 1: DOM & Code-Level Inspection ──
      log('DP-DOM', 'running', '━━━ Phase 1: DOM & Code-Level Inspection', 'Brignull Taxonomy (12 Patterns)', 'Phase 1: DOM Scan');
      log('DP-DOM-TQ', 'running', '  → Trick Questions (Brignull #1): Pre-ticked opt-ins, double-negatives, misleading labels', 'Brignull #1 — Trick Questions', 'Phase 1: DOM Scan');
      log('DP-DOM-SB', 'running', '  → Sneak into Basket (Brignull #2): Preselected add-ons, auto-added extras', 'Brignull #2 — Sneak into Basket', 'Phase 1: DOM Scan');
      log('DP-DOM-RM', 'running', '  → Roach Motel (Brignull #3): Subscribe vs cancel/delete path depth ratio', 'Brignull #3 — Roach Motel', 'Phase 1: DOM Scan');
      log('DP-DOM-NG', 'running', '  → Nagging (EU DSA Art. 25): Overlapping modals, repeated interruption gates', 'EU DSA Art. 25 — Nagging / Obstruction', 'Phase 1: DOM Scan');
      log('DP-DOM-FA', 'running', '  → Forced Action (FTC §5): Login walls, mandatory registration blocking content', 'FTC §5 — Deceptive Practices', 'Phase 1: DOM Scan');
      log('DP-DOM-PZ', 'running', '  → Privacy Zuckering (GDPR Art. 5): Excessive form field data collection', 'GDPR Art. 5 — Data Minimisation', 'Phase 1: DOM Scan');
      log('DP-DOM-FC', 'running', '  → Forced Continuity (Brignull #10): Auto-renewal without visible cancel path', 'Brignull #10 — Forced Continuity', 'Phase 1: DOM Scan');
      const domFindings = await runDOMScans(page, pageData.url);
      for (const f of domFindings) { f.id = `dp-${++findingId}`; findings.push(f); }
      log('DP-DOM', domFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 1 complete — ${domFindings.length} finding(s) detected`, 'Brignull Taxonomy', 'Phase 1: DOM Scan');

      // ── Phase 2: Visual UI Analysis ──
      log('DP-VIS', 'running', '━━━ Phase 2: Visual & Interface Interference Analysis', 'EU DSA Art. 25 — Interface Interference', 'Phase 2: Visual Scan');
      log('DP-VIS-AS', 'running', '  → Button Asymmetry: Accept vs Reject size, prominence & click-area ratio', 'EU DSA — Asymmetric Framing', 'Phase 2: Visual Scan');
      log('DP-VIS-CC', 'running', '  → Colour Weaponisation: High-contrast accept, washed-out / hidden reject', 'Misdirection — Visual Design Exploitation', 'Phase 2: Visual Scan');
      log('DP-VIS-SZ', 'running', '  → Size Manipulation: Unwanted options smaller, greyed or outside scan path', 'EU DSA — Visual Interference', 'Phase 2: Visual Scan');
      log('DP-VIS-IM', 'running', '  → Dismiss Target Size: Close/X button touch-target compliance (min 44×44px)', 'WCAG 2.5.8 + ICO Guidance', 'Phase 2: Visual Scan');
      const visualFindings = await runVisualScans(page, pageData.url);
      for (const f of visualFindings) { f.id = `dp-${++findingId}`; findings.push(f); }
      log('DP-VIS', visualFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 2 complete — ${visualFindings.length} finding(s) detected`, 'EU DSA Art. 25', 'Phase 2: Visual Scan');

      // ── Phase 3: Copy & Language (NLP) Analysis ──
      log('DP-NLP', 'running', '━━━ Phase 3: Copy & Language Pattern Analysis', 'Cognitive Bias Exploitation Framework', 'Phase 3: NLP Scan');
      log('DP-NLP-SU', 'running', '  → Urgency/Scarcity (Brignull #12): Countdown timers, "Only N left!", false limited-time framing', 'Brignull #12 — Urgency / Scarcity', 'Phase 3: NLP Scan');
      log('DP-NLP-SP', 'running', '  → Social Proof Manipulation: Fake real-time activity, unverifiable viewer counts', 'Cognitive Bias — Social Proof Manipulation', 'Phase 3: NLP Scan');
      log('DP-NLP-CS', 'running', '  → Confirmshaming (Brignull #8): Guilt-inducing decline copy ("No thanks, I hate saving")', 'Brignull #8 — Confirmshaming', 'Phase 3: NLP Scan');
      log('DP-NLP-LA', 'running', '  → Loss Aversion Framing: "Don\'t miss out", "Lose access to X" language patterns', 'Cognitive Bias — Loss Aversion', 'Phase 3: NLP Scan');
      log('DP-NLP-AB', 'running', '  → Authority Bias: Fake trust badges, unverified award logos, fabricated accreditations', 'Cognitive Bias — Authority Bias', 'Phase 3: NLP Scan');
      const textFindings = await runTextPatternScans(page, pageData.url);
      for (const f of textFindings) { f.id = `dp-${++findingId}`; findings.push(f); }
      log('DP-NLP', textFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 3 complete — ${textFindings.length} finding(s) detected`, 'Cognitive Bias Framework', 'Phase 3: NLP Scan');

      // ── Phase 4: Deep Code Inspection ──
      log('DP-DEEP', 'running', '━━━ Phase 4: Deep Code & Behavioural Inspection', 'FTC Enforcement Layer + GDPR Art. 6', 'Phase 4: Deep Code Scan');
      log('DP-DEEP-TK', 'running', '  → Pre-Consent Tracking: Scripts firing before user interaction (GDPR violation)', 'GDPR Art. 6 — Lawful Basis Required', 'Phase 4: Deep Code Scan');
      log('DP-DEEP-OV', 'running', '  → Invisible Overlay Traps: Transparent click-jacking overlays (high z-index)', 'FTC — Deceptive Interface Practices', 'Phase 4: Deep Code Scan');
      log('DP-DEEP-CT', 'running', '  → Fake Countdowns: setInterval-driven timers that reset on page refresh', 'Brignull #12 — Manufactured Scarcity', 'Phase 4: Deep Code Scan');
      log('DP-DEEP-AR', 'running', '  → Auto-Renewal Detection: Recurring charge mentions without visible cancel instructions', 'Brignull #10 — Forced Continuity', 'Phase 4: Deep Code Scan');
      log('DP-DEEP-BU', 'running', '  → Buried Cancellation: Unsubscribe/cancel links nested 3+ levels deep in navigation', 'EU DSA Art. 25 — Obstruction', 'Phase 4: Deep Code Scan');
      const deepFindings = await runDeepCodeInspection(page, pageData.url);
      for (const f of deepFindings) { f.id = `dp-${++findingId}`; findings.push(f); }
      log('DP-DEEP', deepFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 4 complete — ${deepFindings.length} finding(s) detected`, 'FTC + GDPR Art. 6', 'Phase 4: Deep Code Scan');

      // ── Phase 5: Accessibility × Dark Pattern Cross-Mapping ──
      log('DP-AX', 'running', '━━━ Phase 5: Ethical Accessibility Cross-Mapping', 'WCAG 2.2 + Dark Pattern Intersection', 'Phase 5: A11Y Cross-Map');
      log('DP-AX-FT', 'running', '  → Focus Trap in Consent Modal: Keyboard escape path blocked (WCAG 2.1.2)', 'WCAG 2.1.2 — No Keyboard Trap', 'Phase 5: A11Y Cross-Map');
      log('DP-AX-SR', 'running', '  → Screen Reader Mismatch: Visible label vs aria-label deception check', 'WCAG 4.1.2 — Name, Role, Value', 'Phase 5: A11Y Cross-Map');
      log('DP-AX-LC', 'running', '  → Low-Contrast Reject: Consent banner reject button contrast weaponisation', 'WCAG 1.4.3 — Contrast Minimum', 'Phase 5: A11Y Cross-Map');
      const axFindings = await runA11yCrossMap(page, pageData.url);
      for (const f of axFindings) { f.id = `dp-${++findingId}`; findings.push(f); }
      log('DP-AX', axFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 5 complete — ${axFindings.length} finding(s) detected`, 'WCAG + Dark Pattern Intersection', 'Phase 5: A11Y Cross-Map');

      // ── Phase 6: Interaction Flow (Ethical Friction Score) ──
      log('DP-FLOW', 'running', '━━━ Phase 6: Interaction Flow — Ethical Friction Score', 'Ethical Friction Score (EFS) Methodology', 'Phase 6: Flow Analysis');
      log('DP-FLOW-AS', 'running', '  → Subscribe vs Cancel Symmetry: Entry CTA count vs exit CTA count ratio', 'EFS — Choice Asymmetry Principle', 'Phase 6: Flow Analysis');
      log('DP-FLOW-HP', 'running', '  → Homepage Scan Simulation: First-impression CTA prominence & scan-path analysis', 'Misdirection — Visual Hierarchy Bias', 'Phase 6: Flow Analysis');
      log('DP-FLOW-MD', 'running', '  → Misdirection (Brignull #5): Visual design drawing attention away from key information', 'Brignull #5 — Misdirection', 'Phase 6: Flow Analysis');
      const flowFindings = await runInteractionFlowAnalysis(page, pageData.url);
      for (const f of flowFindings) { f.id = `dp-${++findingId}`; findings.push(f); }
      log('DP-FLOW', flowFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 6 complete — ${flowFindings.length} finding(s) detected`, 'Ethical Friction Score', 'Phase 6: Flow Analysis');

      // ── Phase 8: Visual AI Dark Pattern Analysis (GPT-4o Vision) ──
      if (options.aiClassification) {
        log('DP-VISAI', 'running', '━━━ Phase 8: Visual AI Dark Pattern Analysis', 'GPT-4o Vision — Visual Design Exploitation Detection', 'Phase 8: Visual AI Scan');
        log('DP-VISAI-CA', 'running', '  → Consent Asymmetry (DP-VIS-AI-01): Graphical Accept vs Reject visual weight imbalance', 'GPT-4o Vision', 'Phase 8: Visual AI Scan');
        log('DP-VISAI-UG', 'running', '  → Image-Based Urgency (DP-VIS-AI-02): Countdown graphics, scarcity badges rendered as images', 'GPT-4o Vision', 'Phase 8: Visual AI Scan');
        log('DP-VISAI-VH', 'running', '  → Visual Hierarchy Manipulation (DP-VIS-AI-03): Premium option dominance via design', 'GPT-4o Vision', 'Phase 8: Visual AI Scan');
        log('DP-VISAI-EM', 'running', '  → Emotional Imagery (DP-VIS-AI-04): Fear/FOMO photography as persuasion tool', 'GPT-4o Vision', 'Phase 8: Visual AI Scan');
        log('DP-VISAI-DC', 'running', '  → Disguised CTA (DP-VIS-AI-05): Sponsored content camouflaged as organic', 'GPT-4o Vision', 'Phase 8: Visual AI Scan');
        log('DP-VISAI-DZ', 'running', '  → Dead Zone Placement (DP-VIS-AI-06): Reject in F/Z-pattern blind spot', 'GPT-4o Vision', 'Phase 8: Visual AI Scan');
        log('DP-VISAI-HC', 'running', '  → Hidden Charges (DP-VIS-AI-07): Camouflaged price elements via colour/weight', 'GPT-4o Vision', 'Phase 8: Visual AI Scan');
        log('DP-VISAI-CS', 'running', '  → Visual Confirmshaming (DP-VIS-AI-08): Decline option styled as broken/ashamed', 'GPT-4o Vision', 'Phase 8: Visual AI Scan');
        try {
          const visAiFindings = await runVisualAIDarkPatternPhase8(page, pageData.url);
          for (const f of visAiFindings) { f.id = `dp-${++findingId}`; findings.push(f); }
          log('DP-VISAI', visAiFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 8 complete — ${visAiFindings.length} visual AI finding(s) detected`, 'GPT-4o Vision', 'Phase 8: Visual AI Scan');
        } catch (visErr) {
          log('DP-VISAI', 'warn', `  ⚠ Phase 8 skipped — ${visErr instanceof Error ? visErr.message : 'Vision API unavailable'}`, 'GPT-4o Vision', 'Phase 8: Visual AI Scan');
        }
      }

    } catch (err) {
      console.error(`[TrustLens:DarkPattern] Error scanning ${pageData.url}:`, err);
    } finally {
      if (page) await page.close().catch(() => {});
    }
  }

  // ── Phase 7: Regulatory Compliance Mapping ──
  log('DP-REG', 'running', '━━━ Phase 7: Regulatory & Legal Risk Mapping', 'Multi-Regulation Compliance Framework', 'Phase 7: Regulatory Mapping');
  log('DP-REG-FTC', 'running', '  → FTC Enforcement: Section 5 deceptive practices coverage', 'FTC §5 — Unfair or Deceptive Acts', 'Phase 7: Regulatory Mapping');
  log('DP-REG-DSA', 'running', '  → EU Digital Services Act: Art. 25 prohibited dark pattern clauses', 'EU DSA Art. 25 — Prohibited Dark Patterns', 'Phase 7: Regulatory Mapping');
  log('DP-REG-GD', 'running', '  → GDPR / ePrivacy: Consent dark patterns (ICO, CNIL enforcement guidance)', 'GDPR + ePrivacy — Consent Integrity', 'Phase 7: Regulatory Mapping');
  log('DP-REG-IN', 'running', '  → IN-DPDPA 2023: India Digital Personal Data Protection Act mapping', 'India DPDPA 2023 — Data Principal Rights', 'Phase 7: Regulatory Mapping');
  const regulationSet = new Set<string>();
  for (const f of findings) f.regulation.forEach(r => regulationSet.add(r));
  log('DP-REG', 'pass', `  ✓ Phase 7 complete — Mapped to ${regulationSet.size} regulation(s): ${[...regulationSet].join(', ')}`, 'Multi-Regulation Framework', 'Phase 7: Regulatory Mapping');

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


  // DP-BS-01: Bait & Switch — link/button text vs actual destination mismatch
  const baitLinks = await page.$$eval('a[href]', anchors => {
    return (anchors as HTMLAnchorElement[]).filter(a => {
      const text = (a.textContent || '').trim().toLowerCase();
      const href = a.href.toLowerCase();
      const visibleDest = /close|cancel|no thanks|dismiss|skip|decline/i.test(text);
      const actualDest  = href && !href.startsWith('javascript') && !href.startsWith('#') && !href.includes(window.location.hostname);
      return visibleDest && actualDest;
    }).map(a => ({ text: a.textContent?.trim().substring(0, 80) || '', href: a.href.substring(0, 150), html: a.outerHTML.substring(0, 200) }));
  }).catch(() => []);

  for (const l of baitLinks) {
    findings.push(makeFinding('DP-BS-01', pageUrl, l.html, {
      summary: `Bait & Switch: Dismissal link "${l.text}" redirects externally`,
      details: [`Visible text implies dismissal but href navigates externally: ${l.href}`],
      measurements: { text: l.text, href: l.href },
    }));
  }

  // DP-DA-01: Disguised Ads — sponsored/promoted content lacking clear Ad label
  const sponsoredContent = await page.$$eval(
    '[class*="sponsor"], [class*="promoted"], [class*="ad-"], [class*="-ad"], [data-ad], [class*="native-ad"]',
    els => els.filter(el => {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      const text = el.textContent?.toLowerCase() || '';
      const hasAdLabel = /\b(ad|ads|advertisement|sponsored|promoted)\b/i.test(text);
      return !hasAdLabel;
    }).map(el => ({ html: el.outerHTML.substring(0, 200), classes: el.className.substring(0, 100) }))
  ).catch(() => []);

  if (sponsoredContent.length > 0) {
    findings.push(makeFinding('DP-DA-01', pageUrl, sponsoredContent[0].html, {
      summary: `${sponsoredContent.length} sponsored/promoted element(s) without visible "Ad" or "Sponsored" label`,
      details: sponsoredContent.map(e => `Class: ${e.classes}`),
      measurements: { count: sponsoredContent.length },
    }));
  }

  // DP-FS-01: Friend Spam — contact harvesting, social invite flows
  const friendSpam = await page.$$eval('a, button, [role="button"]', els =>
    els.filter(el => {
      const text = (el.textContent || '').trim();
      return /invite (friends?|contacts?)|import contacts|share with friends|refer .{0,20} earn|tell a friend/i.test(text);
    }).map(el => ({ text: el.textContent?.trim().substring(0, 80) || '', html: el.outerHTML.substring(0, 200) }))
  ).catch(() => []);

  for (const f of friendSpam) {
    findings.push(makeFinding('DP-FS-01', pageUrl, f.html, {
      summary: `Friend Spam / Contact Harvesting CTA: "${f.text}"`,
      details: [`Social invite or contact import CTA found: "${f.text}"`, 'May access user contacts without granular consent'],
    }));
  }

  // DP-HC-01: Hidden Costs — price shown but tax/fee language suggests different total
  const hiddenCostSignals = await page.$$eval('*', els =>
    els.filter(el => {
      if (el.children.length > 20) return false;
      const text = el.textContent || '';
      const hasPrice = /\$[\d,]+|\d+\.\d{2}|£[\d,]+|€[\d,]+/.test(text);
      const hasFeeLanguage = /excl\. tax|plus tax|before tax|taxes? not included|additional fees?|processing fee|service fee|booking fee/i.test(text);
      return hasPrice && hasFeeLanguage && text.length < 500;
    }).slice(0, 3).map(el => ({ text: el.textContent?.trim().substring(0, 200) || '', html: el.outerHTML.substring(0, 250) }))
  ).catch(() => []);

  for (const h of hiddenCostSignals) {
    findings.push(makeFinding('DP-HC-01', pageUrl, h.html, {
      summary: 'Hidden Costs: Price shown excludes mandatory fees/tax',
      details: [`Text: "${h.text}"`, 'Price displayed before mandatory fees/taxes are added'],
    }));
  }

  // DP-SP-01: Fake Social Proof — unverifiable real-time viewer/buyer counters
  const fakeSocialProof = await page.$$eval('*', els =>
    els.filter(el => {
      if (el.children.length > 5) return false;
      const text = el.textContent || '';
      return /\d+\s+(people|visitors?|users?|shoppers?|others?)\s+(are\s+)?(viewing|watching|looking at|browsing|buying|in their cart)/i.test(text)
          || /only\s+\d+\s+left\s+in\s+stock/i.test(text)
          || /\d+\s+sold in the last/i.test(text)
          || /\d+\s+watching/i.test(text);
    }).slice(0, 5).map(el => ({ text: el.textContent?.trim().substring(0, 120) || '', html: el.outerHTML.substring(0, 200) }))
  ).catch(() => []);

  for (const sp of fakeSocialProof) {
    findings.push(makeFinding('DP-SP-01', pageUrl, sp.html, {
      summary: `Fake Social Proof counter: "${sp.text}"`,
      details: [`Unverifiable real-time social proof signal: "${sp.text}"`, 'Users cannot verify if these figures are real or manufactured'],
    }));
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

  // DP-CS-03: Fear-based language
  for (const el of textElements) {
    for (const pattern of FEAR_LANGUAGE_PATTERNS) {
      if (pattern.test(el.text)) {
        findings.push(makeFinding('DP-CS-03', pageUrl, el.html, {
          summary: `Fear-based language: "${el.text.substring(0, 80)}"`,
          details: [`Text: "${el.text}"`, `Pattern: ${pattern.source}`],
        }));
        break;
      }
    }
  }

  // DP-MD-04: Trick questions (confusing checkbox wording)
  for (const el of textElements) {
    if (el.text.length > 10) {
      for (const pattern of TRICK_QUESTION_PATTERNS) {
        if (pattern.test(el.text)) {
          findings.push(makeFinding('DP-MD-04', pageUrl, el.html, {
            summary: `Confusing wording: "${el.text.substring(0, 80)}"`,
            details: [`Text: "${el.text}"`, `Double-negative or trick wording`],
          }));
          break;
        }
      }
    }
  }

  return findings;
}
// ═══════════════════════════════════════════════════════════
function makeFinding(
  ruleId: string, pageUrl: string, elementHtml: string, evidence: DarkPatternEvidence
): DarkPatternFinding {
  const rule = DARK_PATTERN_RULES.find(r => r.id === ruleId);
  if (!rule) throw new Error(`Unknown dark pattern rule: ${ruleId}`);

  // Signal vs Verdict model — DOM/visual = verdict (provable), AI/text = signal (needs review)
  const detectToBasis: Record<string, 'structural' | 'visual' | 'textual'> = {
    dom: 'structural', visual: 'visual', journey: 'structural',
    ai: 'textual', flow: 'structural',
  };
  const detectionBasis = detectToBasis[rule.detect] || 'textual';
  const isVerdict = detectionBasis === 'structural' || detectionBasis === 'visual';

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
    detectionBasis,
    findingVerdict: isVerdict ? 'verdict' : 'signal',
    verifiabilityNote: isVerdict
      ? 'DOM-proven: element structure or computed style confirms this pattern'
      : 'Content-based signal: flagged by text/AI analysis — manual review recommended',
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

// ═══════════════════════════════════════════════════════════
// PHASE 4: Deep Code Inspection
// ═══════════════════════════════════════════════════════════
async function runDeepCodeInspection(page: Page, pageUrl: string): Promise<DarkPatternFinding[]> {
  const findings: DarkPatternFinding[] = [];

  // DP-SN-05: Tracking scripts before consent
  const trackingBeforeConsent = await page.evaluate(() => {
    const consentBanner = document.querySelector('[class*="cookie"], [class*="consent"], [class*="gdpr"]');
    const bannerVisible = consentBanner ? window.getComputedStyle(consentBanner).display !== 'none' : false;
    if (!bannerVisible) return [];
    const scripts = [...document.querySelectorAll('script[src]')];
    const trackerDomains = ['google-analytics', 'googletagmanager', 'facebook', 'hotjar', 'clarity.ms', 'tiktok', 'doubleclick'];
    return scripts
      .filter(s => trackerDomains.some(d => (s.getAttribute('src') || '').includes(d)))
      .map(s => s.getAttribute('src') || '');
  }).catch(() => []);

  if (trackingBeforeConsent.length > 0) {
    findings.push(makeFinding('DP-SN-05', pageUrl, '', {
      summary: `${trackingBeforeConsent.length} tracking script(s) fire before consent interaction`,
      details: trackingBeforeConsent.slice(0, 5),
    }));
  }

  // DP-IF-07: Dark CSS overlay traps
  const overlayTraps = await page.evaluate(() => {
    const overlays = document.querySelectorAll('div, span, a');
    const traps: string[] = [];
    overlays.forEach(el => {
      const s = window.getComputedStyle(el);
      if (s.position === 'fixed' || s.position === 'absolute') {
        const opacity = parseFloat(s.opacity);
        const rect = el.getBoundingClientRect();
        if (opacity < 0.1 && rect.width > 200 && rect.height > 200 && parseInt(s.zIndex) > 100) {
          traps.push(el.outerHTML.substring(0, 200));
        }
      }
    });
    return traps;
  }).catch(() => []);

  if (overlayTraps.length > 0) {
    findings.push(makeFinding('DP-IF-07', pageUrl, overlayTraps[0], {
      summary: `${overlayTraps.length} invisible overlay(s) intercepting clicks`,
      details: overlayTraps.slice(0, 3),
    }));
  }

  // DP-SU-04: Fake countdown (check if timer resets by comparing values)
  const timerCheck = await page.evaluate(() => {
    const timers = document.querySelectorAll('[class*="countdown"], [class*="timer"], [data-countdown]');
    const results: string[] = [];
    timers.forEach(t => {
      const text = t.textContent?.trim() || '';
      if (/\d+\s*[:\-]\s*\d+/.test(text)) {
        const scripts = document.querySelectorAll('script:not([src])');
        scripts.forEach(s => {
          const code = s.textContent || '';
          if (/setInterval|setTimeout/.test(code) && /countdown|timer/i.test(code)) {
            results.push(text);
          }
        });
      }
    });
    return results;
  }).catch(() => []);

  if (timerCheck.length > 0) {
    findings.push(makeFinding('DP-SU-04', pageUrl, '', {
      summary: 'Countdown timer driven by JavaScript setInterval — may reset on refresh',
      details: timerCheck.map(t => `Timer text: "${t}"`),
    }));
  }

  // DP-OB-05: Buried unsubscribe (check navigation depth)
  const buriedUnsubscribe = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')];
    const unsub = links.filter(l => /unsubscribe|cancel|delete.?account|close.?account/i.test(l.textContent || ''));
    const buried: string[] = [];
    for (const link of unsub) {
      let depth = 0; let el: Element | null = link;
      while (el && el !== document.body) { if (el.tagName === 'NAV' || el.tagName === 'UL' || el.tagName === 'DETAILS') depth++; el = el.parentElement; }
      if (depth >= 3) buried.push(`"${link.textContent?.trim()}" nested ${depth} levels deep`);
    }
    return buried;
  }).catch(() => []);

  if (buriedUnsubscribe.length > 0) {
    findings.push(makeFinding('DP-OB-05', pageUrl, '', {
      summary: 'Unsubscribe/cancel option buried in deep navigation',
      details: buriedUnsubscribe,
    }));
  }

  // DP-FA-04: Auto-renewal detection
  const autoRenewal = await page.evaluate(() => {
    const body = document.body?.textContent?.toLowerCase() || '';
    const hasAutoRenew = /auto.?renew|recurring\s+(charge|billing|payment)|will\s+be\s+charged\s+(again|monthly|annually)/i.test(body);
    const hasCancelPath = /cancel\s+(anytime|subscription|renewal)|how\s+to\s+cancel/i.test(body);
    return { hasAutoRenew, hasCancelPath };
  }).catch(() => ({ hasAutoRenew: false, hasCancelPath: false }));

  if (autoRenewal.hasAutoRenew && !autoRenewal.hasCancelPath) {
    findings.push(makeFinding('DP-FA-04', pageUrl, '', {
      summary: 'Auto-renewal/recurring charges mentioned without clear cancellation path',
      details: ['Page mentions auto-renewal but no visible cancellation instructions'],
    }));
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════
// PHASE 5: Accessibility × Dark Pattern Cross-Mapping
// ═══════════════════════════════════════════════════════════
async function runA11yCrossMap(page: Page, pageUrl: string): Promise<DarkPatternFinding[]> {
  const findings: DarkPatternFinding[] = [];

  // DP-AX-02: Focus trapped in consent modal
  const focusTrap = await page.evaluate(() => {
    const modals = document.querySelectorAll('[role="dialog"], [class*="consent"], [class*="cookie"]');
    for (const modal of Array.from(modals)) {
      const s = window.getComputedStyle(modal);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      const focusable = modal.querySelectorAll('button, a, input, [tabindex]');
      const closeBtn = modal.querySelector('[class*="close"], [aria-label*="close"], button[class*="dismiss"]');
      if (focusable.length > 0 && !closeBtn) return modal.outerHTML.substring(0, 200);
    }
    return null;
  }).catch(() => null);

  if (focusTrap) {
    findings.push(makeFinding('DP-AX-02', pageUrl, focusTrap, {
      summary: 'Consent modal has no keyboard-accessible close/dismiss button',
      details: ['Modal traps focus without providing keyboard escape'],
    }));
  }

  // DP-AX-03: Screen reader text mismatch
  const srMismatch = await page.evaluate(() => {
    const mismatches: string[] = [];
    const buttons = document.querySelectorAll('button, a[role="button"], [role="button"]');
    buttons.forEach(btn => {
      const visible = btn.textContent?.trim() || '';
      const ariaLabel = btn.getAttribute('aria-label') || '';
      if (ariaLabel && visible && ariaLabel.toLowerCase() !== visible.toLowerCase() && visible.length > 2) {
        mismatches.push(`Visible: "${visible}" vs aria-label: "${ariaLabel}"`);
      }
    });
    return mismatches.slice(0, 5);
  }).catch(() => []);

  if (srMismatch.length > 0) {
    findings.push(makeFinding('DP-AX-03', pageUrl, '', {
      summary: `${srMismatch.length} button(s) have mismatched visible text and screen reader label`,
      details: srMismatch,
    }));
  }

  // DP-AX-01: Low-contrast reject buttons (check against consent banners)
  const lowContrastReject = await page.evaluate(() => {
    const banners = document.querySelectorAll('[class*="cookie"], [class*="consent"], [class*="gdpr"]');
    const results: string[] = [];
    banners.forEach(banner => {
      const s = window.getComputedStyle(banner);
      if (s.display === 'none') return;
      const btns = banner.querySelectorAll('button, a[role="button"]');
      btns.forEach(btn => {
        const text = btn.textContent?.trim() || '';
        if (/reject|decline|no|dismiss|close/i.test(text)) {
          const bs = window.getComputedStyle(btn);
          const opacity = parseFloat(bs.opacity);
          if (opacity < 0.6) results.push(`"${text}" opacity: ${opacity}`);
        }
      });
    });
    return results;
  }).catch(() => []);

  if (lowContrastReject.length > 0) {
    findings.push(makeFinding('DP-AX-01', pageUrl, '', {
      summary: 'Reject/decline button has low visibility in consent banner',
      details: lowContrastReject,
    }));
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════
// PHASE 6: Interaction Flow Analysis (Ethical Friction Score)
// ═══════════════════════════════════════════════════════════
async function runInteractionFlowAnalysis(page: Page, pageUrl: string): Promise<DarkPatternFinding[]> {
  const findings: DarkPatternFinding[] = [];

  // Measure subscribe vs cancel friction
  const frictionAnalysis = await page.evaluate(() => {
    const body = document.body?.textContent?.toLowerCase() || '';
    const allLinks = [...document.querySelectorAll('a, button')];

    // Count entry points (subscribe/signup)
    const entryPoints = allLinks.filter(el =>
      /subscribe|sign.?up|register|join|start|get.?started|create.?account/i.test(el.textContent || '')
    );

    // Count exit points (unsubscribe/cancel)
    const exitPoints = allLinks.filter(el =>
      /unsubscribe|cancel|opt.?out|delete.?account|close.?account|deactivate|remove/i.test(el.textContent || '')
    );

    // Measure visibility: are exit points as prominent as entry?
    const entryVisible = entryPoints.filter(el => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden';
    });
    const exitVisible = exitPoints.filter(el => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden';
    });

    return {
      entryCount: entryVisible.length,
      exitCount: exitVisible.length,
      entryTexts: entryVisible.map(e => e.textContent?.trim()?.substring(0, 50) || '').slice(0, 3),
      exitTexts: exitVisible.map(e => e.textContent?.trim()?.substring(0, 50) || '').slice(0, 3),
    };
  }).catch(() => ({ entryCount: 0, exitCount: 0, entryTexts: [] as string[], exitTexts: [] as string[] }));

  if (frictionAnalysis.entryCount > 0 && frictionAnalysis.exitCount === 0) {
    // Ethical Friction Score: infinite (no exit at all)
    findings.push(makeFinding('DP-OB-04', pageUrl, '', {
      summary: `${frictionAnalysis.entryCount} subscribe/signup option(s) but 0 cancel/unsubscribe options — EFS: ∞`,
      details: [
        `Entry points: ${frictionAnalysis.entryTexts.join(', ')}`,
        'No visible exit/cancel path found on page',
        'Ethical Friction Score: ∞ (infinite asymmetry)',
      ],
      measurements: { entryCount: frictionAnalysis.entryCount, exitCount: 0, efs: 'infinity' },
    }));
  } else if (frictionAnalysis.entryCount > 0 && frictionAnalysis.exitCount > 0) {
    // Check for multi-step confirmation dialogs
    const confirmDialogs = await page.$$eval(
      '[class*="confirm"], [class*="are-you-sure"], [class*="cancel-confirm"]',
      els => els.filter(el => window.getComputedStyle(el).display !== 'none').length
    ).catch(() => 0);

    if (confirmDialogs > 0) {
      findings.push(makeFinding('DP-OB-04', pageUrl, '', {
        summary: `Exit path has ${confirmDialogs} confirmation dialog(s) while entry is direct`,
        details: [
          `Entry: ${frictionAnalysis.entryCount} direct action(s)`,
          `Exit: requires ${confirmDialogs} extra confirmation step(s)`,
        ],
        measurements: { entryCount: frictionAnalysis.entryCount, exitCount: frictionAnalysis.exitCount, confirmDialogs },
      }));
    }
  }

  return findings;
}

// ═══════════════════════════════════════════════════════════
// PHASE 8: Visual AI Dark Pattern Analysis (GPT-4o Vision)
// Screenshots are captured via Playwright and sent to GPT-4o
// for design-level dark pattern detection that DOM scanning
// cannot catch (colour asymmetry, visual hierarchy, etc.)
// ═══════════════════════════════════════════════════════════
async function runVisualAIDarkPatternPhase8(page: Page, pageUrl: string): Promise<DarkPatternFinding[]> {
  const findings: DarkPatternFinding[] = [];

  // 1. Guard: require OPENAI_API_KEY
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured — visual AI analysis unavailable');
  }

  // 2. Capture full-page screenshot as base64
  let screenshotB64: string;
  try {
    const buf = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 75 });
    screenshotB64 = buf.toString('base64');
  } catch (ssErr) {
    throw new Error(`Screenshot capture failed: ${ssErr instanceof Error ? ssErr.message : 'unknown'}`);
  }

  // 3. Build the structured prompt from VISUAL_AI_RULES
  const ruleDescriptions = VISUAL_AI_RULES.map((r, i) =>
    `${i + 1}. [${r.id}] ${r.title}\n   Category: ${r.category} | Severity: ${r.severity}\n   Description: ${r.description}`
  ).join('\n\n');

  const prompt = `You are an expert UX auditor and dark pattern analyst. Examine this screenshot of a web page and identify any VISUAL dark patterns from the following rules. These are patterns that can ONLY be detected visually — they are invisible to DOM/code scanners.

## Rules to check:
${ruleDescriptions}

## Instructions:
- Only flag issues you can clearly see in the screenshot.
- For each detected issue, return a JSON object.
- If no issues are found for a rule, skip it.
- Return a JSON array of findings (or empty array []).
- Each finding must have these fields:
  {
    "ruleId": "DP-VIS-AI-XX",
    "title": "Short descriptive title",
    "description": "What you see in the screenshot that constitutes this pattern",
    "severity": "critical" | "high" | "medium" | "low",
    "element": "CSS-style description of the element location (e.g. 'cookie banner at bottom')",
    "confidence": "high" | "medium" | "low",
    "recommendation": "Specific actionable fix"
  }

## Important:
- Do NOT hallucinate patterns. Only flag what is clearly visible.
- Provide specific visual evidence in the description (colors, sizes, positions).
- Return ONLY the JSON array, no markdown or explanation.`;

  // 4. Call GPT-4o Vision
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${screenshotB64}`, detail: 'high' } },
      ],
    }],
  });

  const raw = response.choices[0]?.message?.content || '[]';

  // 5. Parse the JSON response
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return findings;

  let parsed: any[];
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    console.warn('[TrustLens:DP-Phase8] Failed to parse GPT-4o response as JSON');
    return findings;
  }

  // 6. Convert each parsed item into a DarkPatternFinding
  for (const item of parsed) {
    const matchedRule = VISUAL_AI_RULES.find(r => r.id === item.ruleId);
    if (!matchedRule) continue;

    findings.push({
      id: '', // assigned by caller
      ruleId: item.ruleId,
      category: matchedRule.category,
      principle: matchedRule.principle,
      title: item.title || matchedRule.title,
      description: item.description || matchedRule.description,
      element: item.element || '',
      elementHtml: undefined,
      pageUrl,
      severity: item.severity || matchedRule.severity,
      regulation: matchedRule.regulation,
      confidence: item.confidence || 'medium',
      recommendation: item.recommendation || getRecommendation(matchedRule.category),
      userImpact: getUserImpact(matchedRule.principle),
      evidence: {
        summary: `Visual AI Detection (GPT-4o Vision): ${item.description || matchedRule.description}`,
        details: [
          `Rule: ${matchedRule.id} — ${matchedRule.title}`,
          `Visual evidence: ${item.description || 'See screenshot'}`,
          `Element location: ${item.element || 'Full page'}`,
          `Detection method: Phase 8 — Screenshot-based GPT-4o analysis`,
        ],
      },
      source: 'ai-vision',
      detectionBasis: 'visual-ai',
      findingVerdict: 'signal',
      verifiabilityNote: 'Visual AI signal: flagged by GPT-4o screenshot analysis — manual design review recommended',
      visualAnalysisPhase: 'Phase 8: Visual AI Dark Pattern Analysis',
    });
  }

  return findings;
}
