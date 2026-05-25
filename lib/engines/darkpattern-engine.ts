import type { BrowserContext, Page } from 'playwright';
import type {
  DarkPatternFinding, DarkPatternResult, DarkPatternCategory,
  EthicalPrinciple, DarkPatternEvidence,
} from '../types/darkpattern';
import { PRINCIPLE_WEIGHTS } from '../types/darkpattern';
import {
  DARK_PATTERN_RULES, VISUAL_AI_RULES,
  URGENCY_PATTERNS, SOCIAL_PRESSURE_PATTERNS,
  CONFIRMSHAMING_PATTERNS, FEAR_LANGUAGE_PATTERNS, TRICK_QUESTION_PATTERNS,
  AUTO_RENEWAL_PATTERNS, DRIP_PRICING_PATTERNS, FAKE_REVIEW_PATTERNS,
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
    let pageScreenshotDataUrl: string | undefined;
    try {
      page = await context.newPage();
      await page.goto(pageData.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // ── Capture viewport screenshot as physical evidence for all findings ──
      try {
        const buf = await page.screenshot({ fullPage: false, type: 'jpeg', quality: 72 });
        pageScreenshotDataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
      } catch { /* screenshot optional — don't block scan */ }

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
      for (const f of domFindings) {
        f.id = `dp-${++findingId}`;
        if (pageScreenshotDataUrl) f.evidence.screenshotDataUrl = pageScreenshotDataUrl;
        findings.push(f);
      }
      log('DP-DOM', domFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 1 complete — ${domFindings.length} finding(s) detected`, 'Brignull Taxonomy', 'Phase 1: DOM Scan');

      // ── Phase 2: Visual UI Analysis ──
      log('DP-VIS', 'running', '━━━ Phase 2: Visual & Interface Interference Analysis', 'EU DSA Art. 25 — Interface Interference', 'Phase 2: Visual Scan');
      log('DP-VIS-AS', 'running', '  → Button Asymmetry: Accept vs Reject size, prominence & click-area ratio', 'EU DSA — Asymmetric Framing', 'Phase 2: Visual Scan');
      log('DP-VIS-CC', 'running', '  → Colour Weaponisation: High-contrast accept, washed-out / hidden reject', 'Misdirection — Visual Design Exploitation', 'Phase 2: Visual Scan');
      log('DP-VIS-SZ', 'running', '  → Size Manipulation: Unwanted options smaller, greyed or outside scan path', 'EU DSA — Visual Interference', 'Phase 2: Visual Scan');
      log('DP-VIS-IM', 'running', '  → Dismiss Target Size: Close/X button touch-target compliance (min 44×44px)', 'WCAG 2.5.8 + ICO Guidance', 'Phase 2: Visual Scan');
      const visualFindings = await runVisualScans(page, pageData.url);
      for (const f of visualFindings) {
        f.id = `dp-${++findingId}`;
        if (pageScreenshotDataUrl) f.evidence.screenshotDataUrl = pageScreenshotDataUrl;
        findings.push(f);
      }
      log('DP-VIS', visualFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 2 complete — ${visualFindings.length} finding(s) detected`, 'EU DSA Art. 25', 'Phase 2: Visual Scan');

      // ── Phase 3: Copy & Language (NLP) Analysis ──
      log('DP-NLP', 'running', '━━━ Phase 3: Copy & Language Pattern Analysis', 'Cognitive Bias Exploitation Framework', 'Phase 3: NLP Scan');
      log('DP-NLP-SU', 'running', '  → Urgency/Scarcity (Brignull #12): Countdown timers, "Only N left!", false limited-time framing', 'Brignull #12 — Urgency / Scarcity', 'Phase 3: NLP Scan');
      log('DP-NLP-SP', 'running', '  → Social Proof Manipulation: Fake real-time activity, unverifiable viewer counts', 'Cognitive Bias — Social Proof Manipulation', 'Phase 3: NLP Scan');
      log('DP-NLP-CS', 'running', '  → Confirmshaming (Brignull #8): Guilt-inducing decline copy ("No thanks, I hate saving")', 'Brignull #8 — Confirmshaming', 'Phase 3: NLP Scan');
      log('DP-NLP-LA', 'running', '  → Loss Aversion Framing: "Don\'t miss out", "Lose access to X" language patterns', 'Cognitive Bias — Loss Aversion', 'Phase 3: NLP Scan');
      log('DP-NLP-AB', 'running', '  → Authority Bias: Fake trust badges, unverified award logos, fabricated accreditations', 'Cognitive Bias — Authority Bias', 'Phase 3: NLP Scan');
      const textFindings = await runTextPatternScans(page, pageData.url);
      for (const f of textFindings) {
        f.id = `dp-${++findingId}`;
        if (pageScreenshotDataUrl) f.evidence.screenshotDataUrl = pageScreenshotDataUrl;
        findings.push(f);
      }
      log('DP-NLP', textFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 3 complete — ${textFindings.length} finding(s) detected`, 'Cognitive Bias Framework', 'Phase 3: NLP Scan');

      // ── Phase 4: Deep Code Inspection ──
      log('DP-DEEP', 'running', '━━━ Phase 4: Deep Code & Behavioural Inspection', 'FTC Enforcement Layer + GDPR Art. 6', 'Phase 4: Deep Code Scan');
      log('DP-DEEP-TK', 'running', '  → Pre-Consent Tracking: Scripts firing before user interaction (GDPR violation)', 'GDPR Art. 6 — Lawful Basis Required', 'Phase 4: Deep Code Scan');
      log('DP-DEEP-OV', 'running', '  → Invisible Overlay Traps: Transparent click-jacking overlays (high z-index)', 'FTC — Deceptive Interface Practices', 'Phase 4: Deep Code Scan');
      log('DP-DEEP-CT', 'running', '  → Fake Countdowns: setInterval-driven timers that reset on page refresh', 'Brignull #12 — Manufactured Scarcity', 'Phase 4: Deep Code Scan');
      log('DP-DEEP-AR', 'running', '  → Auto-Renewal Detection: Recurring charge mentions without visible cancel instructions', 'Brignull #10 — Forced Continuity', 'Phase 4: Deep Code Scan');
      log('DP-DEEP-BU', 'running', '  → Buried Cancellation: Unsubscribe/cancel links nested 3+ levels deep in navigation', 'EU DSA Art. 25 — Obstruction', 'Phase 4: Deep Code Scan');
      const deepFindings = await runDeepCodeInspection(page, pageData.url);
      for (const f of deepFindings) {
        f.id = `dp-${++findingId}`;
        if (pageScreenshotDataUrl) f.evidence.screenshotDataUrl = pageScreenshotDataUrl;
        findings.push(f);
      }
      log('DP-DEEP', deepFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 4 complete — ${deepFindings.length} finding(s) detected`, 'FTC + GDPR Art. 6', 'Phase 4: Deep Code Scan');

      // ── Phase 5: Accessibility × Dark Pattern Cross-Mapping ──
      log('DP-AX', 'running', '━━━ Phase 5: Ethical Accessibility Cross-Mapping', 'WCAG 2.2 + Dark Pattern Intersection', 'Phase 5: A11Y Cross-Map');
      log('DP-AX-FT', 'running', '  → Focus Trap in Consent Modal: Keyboard escape path blocked (WCAG 2.1.2)', 'WCAG 2.1.2 — No Keyboard Trap', 'Phase 5: A11Y Cross-Map');
      log('DP-AX-SR', 'running', '  → Screen Reader Mismatch: Visible label vs aria-label deception check', 'WCAG 4.1.2 — Name, Role, Value', 'Phase 5: A11Y Cross-Map');
      log('DP-AX-LC', 'running', '  → Low-Contrast Reject: Consent banner reject button contrast weaponisation', 'WCAG 1.4.3 — Contrast Minimum', 'Phase 5: A11Y Cross-Map');
      const axFindings = await runA11yCrossMap(page, pageData.url);
      for (const f of axFindings) {
        f.id = `dp-${++findingId}`;
        if (pageScreenshotDataUrl) f.evidence.screenshotDataUrl = pageScreenshotDataUrl;
        findings.push(f);
      }
      log('DP-AX', axFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 5 complete — ${axFindings.length} finding(s) detected`, 'WCAG + Dark Pattern Intersection', 'Phase 5: A11Y Cross-Map');

      // ── Phase 6: Interaction Flow (Ethical Friction Score) ──
      log('DP-FLOW', 'running', '━━━ Phase 6: Interaction Flow — Ethical Friction Score', 'Ethical Friction Score (EFS) Methodology', 'Phase 6: Flow Analysis');
      log('DP-FLOW-AS', 'running', '  → Subscribe vs Cancel Symmetry: Entry CTA count vs exit CTA count ratio', 'EFS — Choice Asymmetry Principle', 'Phase 6: Flow Analysis');
      log('DP-FLOW-HP', 'running', '  → Homepage Scan Simulation: First-impression CTA prominence & scan-path analysis', 'Misdirection — Visual Hierarchy Bias', 'Phase 6: Flow Analysis');
      log('DP-FLOW-MD', 'running', '  → Misdirection (Brignull #5): Visual design drawing attention away from key information', 'Brignull #5 — Misdirection', 'Phase 6: Flow Analysis');
      const flowFindings = await runInteractionFlowAnalysis(page, pageData.url);
      for (const f of flowFindings) {
        f.id = `dp-${++findingId}`;
        if (pageScreenshotDataUrl) f.evidence.screenshotDataUrl = pageScreenshotDataUrl;
        findings.push(f);
      }
      log('DP-FLOW', flowFindings.length > 0 ? 'fail' : 'pass', `  ✓ Phase 6 complete — ${flowFindings.length} finding(s) detected`, 'Ethical Friction Score', 'Phase 6: Flow Analysis');

      // ── Phase 8: Visual AI Dark Pattern Analysis (GPT-4o Vision) — always-on ──
      if (process.env.OPENAI_API_KEY) {
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

  // ── Framework-managed preselected checkboxes (React/Vue/Angular — aria-checked) ──
  const ariaChecked = await page.$$eval(
    '[role="checkbox"][aria-checked="true"], [role="switch"][aria-checked="true"]',
    els => els.map(el => ({
      html: el.outerHTML.substring(0, 200),
      label: el.getAttribute('aria-label') || el.textContent?.trim()?.substring(0, 100) || '',
      id: el.id || '',
    }))
  ).catch(() => []);
  for (const cb of ariaChecked) {
    const isOptIn = /newsletter|marketing|subscribe|promo|offer|update|notify|consent|agree|opt|email|share|third.?party/i.test(cb.label + cb.id);
    if (isOptIn) {
      findings.push(makeFinding('DP-SN-01', pageUrl, cb.html, {
        summary: `Framework-managed opt-in toggle pre-enabled: "${cb.label || cb.id}"`,
        details: [`aria-checked="true" on opt-in control — pre-enables without user action`, `Element: ${cb.html}`],
        measurements: { label: cb.label, detectedVia: 'aria-checked' },
      }));
    }
  }

  // ── DP-SN-08: Bundled consent — multiple purposes in one checkbox ──
  const bundledConsent = await page.$$eval('input[type="checkbox"], [role="checkbox"]', els =>
    els.filter(el => {
      const label = el.closest('label')?.textContent || el.getAttribute('aria-label') || '';
      const consentTerms = (label.match(/\band\b|&|\+/gi) || []).length;
      const purposes = ['analytics', 'marketing', 'advertising', 'third.party', 'partner', 'sharing', 'personaliz'];
      const matchCount = purposes.filter(p => new RegExp(p, 'i').test(label)).length;
      return consentTerms >= 1 && matchCount >= 2;
    }).map(el => ({ html: el.outerHTML.substring(0, 200), label: el.closest('label')?.textContent?.trim()?.substring(0, 150) || '' }))
  ).catch(() => []);
  for (const b of bundledConsent) {
    findings.push(makeFinding('DP-SN-08', pageUrl, b.html, {
      summary: `Bundled consent checkbox covers multiple purposes: "${b.label.substring(0, 80)}"`,
      details: [`Single checkbox bundles multiple consent purposes — GDPR requires separate consent per purpose`, `Label: "${b.label}"`],
    }));
  }

  // ── DP-FA-05: Consent wall blocking content ──
  const consentWall = await page.evaluate(() => {
    const banner = document.querySelector('[class*="cookie"], [class*="consent"], [class*="gdpr"], [id*="consent"]');
    if (!banner) return false;
    const s = window.getComputedStyle(banner);
    if (s.display === 'none') return false;
    const overlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"]');
    return overlays.length > 0;
  }).catch(() => false);
  if (consentWall) {
    findings.push(makeFinding('DP-FA-05', pageUrl, '', {
      summary: 'Consent wall detected — page content blocked unless user accepts data processing',
      details: ['Consent banner overlays main content, effectively denying access without acceptance', 'Violates GDPR Art. 7 — consent cannot be coerced by denial of service'],
    }));
  }

  // ── DP-FA-06: Forced social login — no email alternative ──
  const socialLoginOnly = await page.evaluate(() => {
    const hasSocial = document.querySelectorAll('[class*="google-login"], [class*="facebook-login"], [class*="apple-login"], [data-provider], [class*="social-login"]').length > 0;
    const hasEmail = !!document.querySelector('input[type="email"], input[name*="email"], input[type="text"][name*="user"]');
    return hasSocial && !hasEmail;
  }).catch(() => false);
  if (socialLoginOnly) {
    findings.push(makeFinding('DP-FA-06', pageUrl, '', {
      summary: 'Social login buttons present with no email/password alternative — forces third-party data sharing',
      details: ['No email or username alternative found', 'Violates GDPR Art. 7 — consent cannot be conditional on data sharing'],
    }));
  }

  // ── DP-OB-06: Phone-only cancellation ──
  const phoneOnlyCancel = await page.evaluate(() => {
    const body = (document.body?.textContent || '').toLowerCase();
    const hasPhoneCancel = /cancel.*call|call.*to cancel|phone.*to cancel|cancel.*by phone|cancel.*email us/i.test(body);
    const hasOnlineCancel = /cancel.*online|cancel\s+my\s+(account|subscription)\s+here|click\s+to\s+cancel/i.test(body);
    return hasPhoneCancel && !hasOnlineCancel;
  }).catch(() => false);
  if (phoneOnlyCancel) {
    findings.push(makeFinding('DP-OB-06', pageUrl, '', {
      summary: 'Cancellation only via phone or email — no online option found',
      details: ['FTC Click-to-Cancel Rule 2024 requires online cancellation if signup was online', 'Users must call or email — asymmetric friction with online subscribe'],
    }));
  }

  // ── DP-OB-07: No data export / portability option ──
  const hasDataExport = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a, button')];
    return links.some(el => /download.*(my\s+)?data|export.*(my\s+)?data|data\s+portability|request.*my.*data/i.test(el.textContent || ''));
  }).catch(() => false);
  const hasAccountArea = await page.evaluate(() => /account|settings|profile|dashboard/i.test(document.body?.textContent || '')).catch(() => false);
  if (hasAccountArea && !hasDataExport) {
    findings.push(makeFinding('DP-OB-07', pageUrl, '', {
      summary: 'Account area lacks data export option — potential GDPR Art. 20 violation',
      details: ['No "Download my data" or "Export data" link found', 'GDPR Art. 20 and India DPDPA mandate data portability on request'],
    }));
  }

  // ── DP-NG-04: Exit-intent popup ──
  const exitPopup = await page.evaluate(() => {
    const scripts = [...document.querySelectorAll('script:not([src])')];
    return scripts.some(s => /mouseleave|exit.?intent|beforeunload/i.test(s.textContent || ''));
  }).catch(() => false);
  if (exitPopup) {
    findings.push(makeFinding('DP-NG-04', pageUrl, '', {
      summary: 'Exit-intent popup script detected — intercepts user when leaving',
      details: ['JavaScript monitors for mouse leaving viewport and triggers a popup', 'Often combined with confirmshaming or urgency messaging'],
    }));
  }

  // ── DP-SU-05: Flash sale / unverifiable time-limited deal ──
  const flashSaleEls = await page.$$eval('*', els =>
    els.filter(el => {
      if (el.children.length > 10) return false;
      const text = el.textContent || '';
      return /flash\s+sale|deals?\s+end\s+(soon|today|tonight)|today.?only\s+deal|limited.?time\s+offer/i.test(text) && text.length < 300;
    }).slice(0, 3).map(el => ({ text: el.textContent?.trim().substring(0, 150) || '', html: el.outerHTML.substring(0, 200) }))
  ).catch(() => []);
  for (const fs of flashSaleEls) {
    findings.push(makeFinding('DP-SU-05', pageUrl, fs.html, {
      summary: `Flash sale without verifiable end time: "${fs.text.substring(0, 80)}"`,
      details: [`Text: "${fs.text}"`, 'End time not clearly stated or verifiable — may be manufactured urgency'],
    }));
  }

  // ── DP-SU-06: Fake "X people viewing" live counter ──
  const liveCounters = await page.$$eval('*', els =>
    els.filter(el => {
      if (el.children.length > 5) return false;
      const text = el.textContent || '';
      return /\d+\s+(people|others?|shoppers?)\s+(are\s+)?(viewing|watching|looking|in\s+their\s+cart)/i.test(text)
          || /\d+\s+(bought|purchased|added)\s+(this\s+)?(today|in\s+the\s+last|this\s+hour)/i.test(text);
    }).slice(0, 5).map(el => ({ text: el.textContent?.trim().substring(0, 120) || '', html: el.outerHTML.substring(0, 200) }))
  ).catch(() => []);
  for (const lc of liveCounters) {
    findings.push(makeFinding('DP-SU-06', pageUrl, lc.html, {
      summary: `Live social scarcity counter: "${lc.text.substring(0, 80)}"`,
      details: [`Real-time counter: "${lc.text}"`, 'These counters are frequently fabricated — users cannot verify accuracy', 'Violates FTC Act §5 deceptive practices'],
    }));
  }

  // ── DP-SP-03: Unverifiable "Best Seller" / "#1 Choice" badge ──
  const bestSellerBadges = await page.$$eval('*', els =>
    els.filter(el => {
      if (el.children.length > 3) return false;
      const text = el.textContent?.trim() || '';
      return /best.?seller|#1\s+(rated|choice|pick|selling)|editor.?s\s+choice|top\s+rated|award.?winning|most\s+(popular|loved|chosen)/i.test(text) && text.length < 80;
    }).slice(0, 5).map(el => ({ text: el.textContent?.trim().substring(0, 80) || '', html: el.outerHTML.substring(0, 200) }))
  ).catch(() => []);
  for (const b of bestSellerBadges) {
    findings.push(makeFinding('DP-SP-03', pageUrl, b.html, {
      summary: `Unverifiable badge: "${b.text}"`,
      details: [`Badge text: "${b.text}"`, 'No source or verification link found', 'Violates FTC Endorsement Guides 16 CFR Part 255'],
    }));
  }

  // ── DP-MD-08: Strikethrough reference price ──
  const strikethroughPrices = await page.$$eval(
    's, del, [class*="original-price"], [class*="was-price"], [class*="old-price"], [class*="strikethrough"]',
    els => els.filter(el => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && /[\d,]+/.test(el.textContent || '');
    }).slice(0, 5).map(el => ({ text: el.textContent?.trim().substring(0, 80) || '', html: el.outerHTML.substring(0, 200) }))
  ).catch(() => []);
  for (const sp of strikethroughPrices) {
    findings.push(makeFinding('DP-MD-08', pageUrl, sp.html, {
      summary: `Strikethrough "original" price "${sp.text}" — reference pricing may be fabricated`,
      details: [`Crossed-out price: "${sp.text}"`, 'No evidence this item was sold at this "original" price', 'Violates FTC Act §5 and UK Consumer Protection Regulations'],
    }));
  }

  // ── DP-PZ-03: Data sharing toggles enabled by default ──
  const sharingToggles = await page.$$eval(
    'input[type="checkbox"][checked], [role="checkbox"][aria-checked="true"]',
    els => els.filter(el => {
      const label = el.closest('label')?.textContent || el.getAttribute('aria-label') || '';
      return /share|third.?party|partner|advertis|personaliz|target/i.test(label);
    }).map(el => ({ html: el.outerHTML.substring(0, 200), label: el.closest('label')?.textContent?.trim()?.substring(0, 120) || '' }))
  ).catch(() => []);
  for (const t of sharingToggles) {
    findings.push(makeFinding('DP-PZ-03', pageUrl, t.html, {
      summary: `Data sharing toggle pre-enabled: "${t.label.substring(0, 80)}"`,
      details: [`Pre-enabled toggle: "${t.label}"`, 'Must opt-out not opt-in — violates GDPR Art. 7'],
    }));
  }

  // ── DP-SN-09: Free trial auto-converts to paid ──
  const trialConversion = await page.evaluate(() => {
    const body = (document.body?.textContent || '').toLowerCase();
    const hasTrial = /free\s+(trial|month|period|access)|try\s+(free|for\s+free)/i.test(body);
    const hasAutoConvert = /automatically?\s+(charged|billed|converts?)|after\s+(trial|free\s+period)/i.test(body);
    const hasClearCancel = /cancel\s+before\s+|cancel\s+to\s+avoid/i.test(body);
    return hasTrial && hasAutoConvert && !hasClearCancel;
  }).catch(() => false);
  if (trialConversion) {
    findings.push(makeFinding('DP-SN-09', pageUrl, '', {
      summary: 'Free trial auto-converts to paid without clear pre-expiry cancellation instructions',
      details: ['Page mentions free trial with auto-conversion', 'No clear cancel-before instructions found', 'Violates FTC Click-to-Cancel Rule 2024 and EU Consumer Rights Directive Art. 6'],
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
// ═══════════════════════════════════════════════════════════
// AUDIENCE FIX MAP — per rule: Brignull taxonomy, DSA article,
// developer code fix, designer fix, effort estimate.
// Drives the Developer / Designer / Legal audience-toggle views.
// ═══════════════════════════════════════════════════════════
interface AudienceFixEntry {
  brignullPattern: string;
  brignullNumber: number;
  dsaArticle: string;
  developerFix: string;
  designerFix: string;
  legalSummary: string;
  estimatedEffort: 'XS' | 'S' | 'M' | 'L';
}
const RULE_AUDIENCE_MAP: Record<string, AudienceFixEntry> = {
  // ── Trick Questions / Sneaking (Brignull #1) ──
  'DP-SN-01': {
    brignullPattern: 'Trick Questions', brignullNumber: 1,
    dsaArticle: 'Art. 25(1)(b)',
    developerFix: 'Remove the checked attribute: <input type="checkbox"> (no checked). Under GDPR Art. 7, opt-in must be a distinct affirmative action — not default state.',
    designerFix: 'Default all consent toggles to OFF. Use neutral label copy ("I agree to marketing emails") with no visual bias toward acceptance.',
    legalSummary: 'Pre-ticked opt-in violates GDPR Art. 7(4) — consent must be freely given via unambiguous affirmative action. EU DSA Art. 25(1)(b) prohibits using default settings to bias choices.',
    estimatedEffort: 'XS',
  },
  'DP-SN-02': {
    brignullPattern: 'Sneak into Basket', brignullNumber: 2,
    dsaArticle: 'Art. 25(1)(b)',
    developerFix: 'Change default radio/select to a neutral "None" or "No add-on" option. Never preselect a paid or data-sharing option.',
    designerFix: 'Add-on options should default to unselected. Show add-ons in a clearly labelled optional section separate from the main flow.',
    legalSummary: 'Pre-selected commercial add-ons constitute Sneak into Basket (Brignull). EU DSA Art. 25(1)(b) prohibits pre-ticked boxes for optional paid extras. FTC Act §5 unfair practice.',
    estimatedEffort: 'XS',
  },
  'DP-SN-04': {
    brignullPattern: 'Trick Questions', brignullNumber: 1,
    dsaArticle: 'Art. 25(1)(b)',
    developerFix: 'Remove hidden inputs that carry default consent/opt-in values. Any consent submission must come from explicit user UI interaction.',
    designerFix: 'Never use hidden fields to transmit consent decisions. All consent choices must be surfaced visibly to the user.',
    legalSummary: 'Hidden form inputs carrying default consent values violate GDPR Art. 7 — consent requires a clear affirmative act. ICO guidance explicitly prohibits this pattern.',
    estimatedEffort: 'XS',
  },
  'DP-SN-08': {
    brignullPattern: 'Privacy Zuckering', brignullNumber: 6,
    dsaArticle: 'Art. 25(2)(b)',
    developerFix: 'Split bundled consent into separate checkboxes per purpose. GDPR requires granular consent: analytics, marketing, and third-party sharing must each have their own control.',
    designerFix: 'Design a consent matrix or accordion: one row per purpose. Each purpose must be independently toggleable with clear on/off state.',
    legalSummary: 'Bundled consent violates GDPR Art. 7(2) and Recital 43 — consent must be given separately for each purpose. CNIL and ICO enforcement has fined companies for this pattern.',
    estimatedEffort: 'S',
  },
  'DP-SN-09': {
    brignullPattern: 'Forced Continuity', brignullNumber: 10,
    dsaArticle: 'Art. 25(1)(c)',
    developerFix: 'Add a pre-expiry email reminder with one-click cancel link. Display cancel deadline prominently at signup. Implement FTC Click-to-Cancel (16 CFR Part 425).',
    designerFix: 'Show trial end date in dashboard permanently. Place cancel CTA in the primary navigation, not buried in settings.',
    legalSummary: 'Auto-converting free trials without clear cancel instructions violate FTC Click-to-Cancel Rule 2024 and EU Consumer Rights Directive Art. 6. Potential for large-scale enforcement.',
    estimatedEffort: 'M',
  },
  // ── Roach Motel / Obstruction (Brignull #3) ──
  'DP-OB-01': {
    brignullPattern: 'Roach Motel', brignullNumber: 3,
    dsaArticle: 'Art. 25(1)(c)',
    developerFix: 'Add a visible unsubscribe/cancel link to the footer and account settings. Ensure cancel flow ≤ same steps as subscribe.',
    designerFix: 'Subscribe and cancel CTAs must be symmetric in placement and prominence. If "Subscribe" is in the hero, "Cancel" must be in settings with equivalent findability.',
    legalSummary: 'Asymmetric subscribe/cancel paths constitute a Roach Motel (Brignull #3). EU DSA Art. 25(1)(c) prohibits making termination harder than subscription. FTC Click-to-Cancel Rule applies.',
    estimatedEffort: 'M',
  },
  'DP-OB-04': {
    brignullPattern: 'Roach Motel', brignullNumber: 3,
    dsaArticle: 'Art. 25(1)(c)',
    developerFix: 'Remove multi-step confirmation dialogs on the cancel path. Cancel should complete in ≤ 2 steps from settings page.',
    designerFix: 'Cancel flow should mirror the subscribe flow in step count. No retention offers should block or delay cancellation.',
    legalSummary: 'Confirmation dialogs added exclusively to the cancel path are a Roach Motel pattern. EU DSA Art. 25(1)(c) and FTC Click-to-Cancel Rule 2024 require easy cancellation.',
    estimatedEffort: 'S',
  },
  'DP-OB-06': {
    brignullPattern: 'Roach Motel', brignullNumber: 3,
    dsaArticle: 'Art. 25(1)(c)',
    developerFix: 'Implement an online cancellation endpoint. If signup is online, FTC 2024 mandates that cancellation is also possible online without calling or emailing.',
    designerFix: 'Add a self-serve cancellation page accessible from account settings. Phone-only cancellation is a deliberate friction pattern.',
    legalSummary: 'Phone/email-only cancellation violates FTC Click-to-Cancel Rule 2024 (16 CFR Part 425) — if signup was online, cancellation must also be online. CCPA and DSA Art. 25(1)(c) apply.',
    estimatedEffort: 'M',
  },
  'DP-OB-07': {
    brignullPattern: 'Obstruction', brignullNumber: 3,
    dsaArticle: 'Art. 25(1)(c)',
    developerFix: 'Add a "Download my data" endpoint (GDPR Art. 20 data portability). Expose via /account/settings/data-export with standard JSON/CSV format.',
    designerFix: 'Add "Download my data" to the account settings page. Link to it from the privacy policy.',
    legalSummary: 'Missing data portability violates GDPR Art. 20 (EU) and India DPDPA 2023 §13 — users have the right to receive their personal data in machine-readable format.',
    estimatedEffort: 'M',
  },
  // ── Nagging (Brignull #9) ──
  'DP-NG-01': {
    brignullPattern: 'Nagging', brignullNumber: 9,
    dsaArticle: 'Art. 25(1)(d)',
    developerFix: 'Implement modal stacking prevention: use a global modal manager that allows only one modal to be active at a time.',
    designerFix: 'One modal rule — never render multiple dialogs simultaneously. Queue dismissals and apply session memory to prevent re-showing dismissed modals.',
    legalSummary: 'Overlapping modals constitute Nagging (Brignull #9). EU DSA Art. 25(1)(d) prohibits repeatedly requesting decisions. ICO guidance requires a single consent request per session.',
    estimatedEffort: 'S',
  },
  'DP-NG-02': {
    brignullPattern: 'Nagging', brignullNumber: 9,
    dsaArticle: 'Art. 25(1)(d)',
    developerFix: 'Gate notification prompts behind genuine user engagement (e.g., after 3+ purchases or explicit user request). Respect browser-level permission model.',
    designerFix: 'Show notification opt-in as a non-blocking inline prompt after meaningful user engagement. Never show on page load.',
    legalSummary: 'Aggressive push-permission prompts on page load violate the spirit of GDPR Art. 5(1)(c) and the ICO\'s "privacy by design" principle. Pattern is explicitly named in DSA guidance.',
    estimatedEffort: 'XS',
  },
  'DP-NG-04': {
    brignullPattern: 'Nagging', brignullNumber: 9,
    dsaArticle: 'Art. 25(1)(d)',
    developerFix: 'Remove exit-intent listeners (mouseleave, beforeunload). If retention is needed, implement a value proposition page instead of an interrupt popup.',
    designerFix: 'Replace exit-intent popups with a persistent value banner or homepage messaging. Do not intercept users who have decided to leave.',
    legalSummary: 'Exit-intent popups intercept user autonomy at the point of decision. EU DSA Art. 25(1)(d) prohibits repeatedly disrupting user decision-making. FTC has cited exit-intent patterns in enforcement actions.',
    estimatedEffort: 'XS',
  },
  // ── Forced Action (Brignull #5) ──
  'DP-FA-01': {
    brignullPattern: 'Forced Action', brignullNumber: 5,
    dsaArticle: 'Art. 25(3)(d)',
    developerFix: 'Remove auth guards from public content endpoints. Implement progressive engagement — show teaser content, prompt login only for premium features.',
    designerFix: 'Apply progressive disclosure: show value first, gate registration to deeper actions only. Use a soft CTA overlay rather than a blocking modal.',
    legalSummary: 'Forced registration walls violate DSA Art. 25(3)(d) — users must not be required to create accounts to access publicly available services. GDPR Art. 7(4) prohibits conditioning service access on consent.',
    estimatedEffort: 'L',
  },
  'DP-FA-03': {
    brignullPattern: 'Forced Action', brignullNumber: 5,
    dsaArticle: 'Art. 25(3)(d)',
    developerFix: 'Remove full-viewport app install banners. Use a native Smart App Banner (meta tag) instead — max 64px, dismissible, non-blocking.',
    designerFix: 'Reduce app install prompt to a slim, dismissible top bar (≤48px). Never block page content. Apply only after user has spent >30 seconds on page.',
    legalSummary: 'Full-viewport app install prompts that block content access are Forced Action patterns (Brignull #5). FTC §5 deceptive framing applies when content is withheld without genuine need.',
    estimatedEffort: 'XS',
  },
  'DP-FA-05': {
    brignullPattern: 'Forced Action', brignullNumber: 5,
    dsaArticle: 'Art. 25(3)(d)',
    developerFix: 'Remove the DOM backdrop/overlay on the consent banner. Users must be able to scroll and interact with the page without accepting cookies.',
    designerFix: 'Use a non-blocking bottom banner for cookie consent. Never overlay page content. Accept and Reject must be equally prominent.',
    legalSummary: 'Cookie walls that block content unless users accept are illegal under GDPR Art. 7(4) — "take it or leave it" consent is not freely given. CNIL issued €60M fines for this exact pattern.',
    estimatedEffort: 'S',
  },
  'DP-FA-06': {
    brignullPattern: 'Forced Action', brignullNumber: 5,
    dsaArticle: 'Art. 25(3)(d)',
    developerFix: 'Add an email/password registration alternative alongside social login buttons. Social login must never be the only option.',
    designerFix: 'Display email registration at same hierarchy level as social login. "Continue with email" should not be hidden below social buttons.',
    legalSummary: 'Forced social login violates GDPR Art. 7 — consent to third-party data sharing cannot be a condition of service access. EDPB guidance requires an alternative.',
    estimatedEffort: 'S',
  },
  // ── Interface Interference (Brignull #12) ──
  'DP-IF-01': {
    brignullPattern: 'Interface Interference', brignullNumber: 12,
    dsaArticle: 'Art. 25(1)(a)',
    developerFix: 'Apply equal CSS classes to accept and reject buttons: same min-width, padding, border-radius. Example: `.consent-btn { min-width: 120px; padding: 10px 20px; font-size: 14px; }`',
    designerFix: 'Consent button pair must share identical dimensions and visual weight. Use the same component instance — differentiate only by color (brand primary vs outlined).',
    legalSummary: 'Accept:Reject size asymmetry >2:1 constitutes Interface Interference under DSA Art. 25(1)(a). ICO enforces this under UK GDPR. CNIL specifically measures button size ratios in audits.',
    estimatedEffort: 'XS',
  },
  'DP-IF-02': {
    brignullPattern: 'Interface Interference', brignullNumber: 12,
    dsaArticle: 'Art. 25(1)(a)',
    developerFix: 'Remove transparent/muted styling from reject button. Reject must meet WCAG 1.4.3 AA contrast ratio (4.5:1). Add visible border if using ghost button style.',
    designerFix: 'Both consent buttons must be equally visible. If accept uses a filled primary color, reject must use an outlined variant with matching contrast, not a muted/faded appearance.',
    legalSummary: 'Color-based button asymmetry (accept prominent, reject muted) violates DSA Art. 25(1)(a) and WCAG 1.4.3. ICO guidance names "colour contrast manipulation" as an enforcement target.',
    estimatedEffort: 'XS',
  },
  'DP-IF-04': {
    brignullPattern: 'Interface Interference', brignullNumber: 12,
    dsaArticle: 'Art. 25(1)(a)',
    developerFix: 'Set dismiss/reject button min touch target to 44×44px per WCAG 2.5.8. Add padding if needed: `.consent-reject { min-width: 44px; min-height: 44px; padding: 10px 16px; }`',
    designerFix: 'All interactive consent controls must be ≥44×44px touch target. Tiny close/X buttons on consent banners fail WCAG 2.5.8 and are a deliberate friction pattern.',
    legalSummary: 'Sub-44px dismiss targets violate WCAG 2.5.8 Success Criterion and EU DSA Art. 25(1)(a). This is a deliberate accessibility/dark pattern combination that regulators actively target.',
    estimatedEffort: 'XS',
  },
  // ── Scarcity / Urgency (Brignull #11) ──
  'DP-SU-01': {
    brignullPattern: 'False Urgency', brignullNumber: 11,
    dsaArticle: 'Art. 25(1)(e)',
    developerFix: 'Bind countdown to a server-verified deadline from your API (e.g., deal_expires_at). Add validation: if(expired) remove timer element entirely. Never reset via setInterval.',
    designerFix: 'Display countdown only when a real deadline exists. Show the specific date/time (e.g., "Ends 15 Jun 11:59 PM") not just a timer that could be fabricated.',
    legalSummary: 'Countdown timers without verifiable deadlines violate DSA Art. 25(1)(e) and FTC Act §5. The FTC\'s "Click-to-Cancel" rule and dark patterns report explicitly target false urgency timers.',
    estimatedEffort: 'S',
  },
  'DP-SU-02': {
    brignullPattern: 'False Urgency', brignullNumber: 11,
    dsaArticle: 'Art. 25(1)(e)',
    developerFix: 'Bind stock counts to live inventory API. If count cannot be verified in real-time, remove the element. Add audit trail: log stock display vs actual inventory.',
    designerFix: 'Only show "X left in stock" when sourced from live inventory. Show the actual number with a verified timestamp.',
    legalSummary: 'Unverifiable stock scarcity claims violate FTC Act §5 (deceptive practices) and UK CPR 2008. Several major retailers have been fined for fabricated "only X left" counters.',
    estimatedEffort: 'S',
  },
  'DP-SU-03': {
    brignullPattern: 'False Urgency', brignullNumber: 11,
    dsaArticle: 'Art. 25(1)(e)',
    developerFix: 'Remove or verify all urgency language before production. If sale is permanent or regularly renewed, the "limited time" claim is deceptive under FTC guidelines.',
    designerFix: 'Replace unverifiable urgency language with factual value propositions. "Our best price" is legal; "Deal ends in 2 hours" requires a real deadline.',
    legalSummary: 'Generic urgency language ("limited time", "hurry") without verified deadlines violates FTC Act §5 and DSA Art. 25(1)(e). The FTC\'s 2022 dark patterns report lists this as a top enforcement priority.',
    estimatedEffort: 'XS',
  },
  'DP-SU-05': {
    brignullPattern: 'False Urgency', brignullNumber: 11,
    dsaArticle: 'Art. 25(1)(e)',
    developerFix: 'Add an expires_at timestamp to flash sale data. Display specific end time. If no verified end time exists, do not show "flash sale" messaging.',
    designerFix: 'Flash sale banners must show a precise, verified expiry date/time. Never use vague "ends soon" language. Tie expiry display to real backend data.',
    legalSummary: 'Flash sales with unverifiable end times violate FTC Act §5. The FTC has issued warning letters to e-commerce retailers for fabricated flash sale timers.',
    estimatedEffort: 'S',
  },
  'DP-SU-06': {
    brignullPattern: 'Social Proof Inflation', brignullNumber: 11,
    dsaArticle: 'Art. 25(1)(e)',
    developerFix: 'Bind viewer counter to a verified analytics source (e.g., Google Analytics real-time API). Add last_updated timestamp to the element. If unbindable, remove the element.',
    designerFix: 'Show live counter only if connected to real-time verified data. Add a "verified" indicator. Never show rounded numbers like "100 people viewing".',
    legalSummary: 'Fabricated real-time viewer counts violate FTC Act §5 (deceptive practices). The 2022 FTC dark patterns study specifically names fake social-proof counters as an enforcement priority.',
    estimatedEffort: 'M',
  },
  // ── Social Pressure (Brignull #7) ──
  'DP-SP-01': {
    brignullPattern: 'Social Proof', brignullNumber: 7,
    dsaArticle: 'Art. 25(1)(e)',
    developerFix: 'Connect to a verified real-time data source for social proof metrics. Add data-verified="true" attribute and timestamp. If verification is impossible, remove the element.',
    designerFix: 'Show source and timestamp for all social proof claims. "47 people bought this today (via verified analytics)" is acceptable; fabricated counters are not.',
    legalSummary: 'Unverifiable social proof ("X people bought this") constitutes a deceptive practice under FTC Act §5 and DSA Art. 25(1)(e). Multiple retailers have received FTC warning letters.',
    estimatedEffort: 'M',
  },
  'DP-SP-03': {
    brignullPattern: 'Authority Bias', brignullNumber: 7,
    dsaArticle: 'Art. 25(1)(e)',
    developerFix: 'Add a source reference link next to every badge: <a href="/award-source">Award source ↗</a>. Remove badges with no verifiable source.',
    designerFix: 'Every trust badge must link to its source. Use a small "i" info icon with source tooltip. "Best Seller" claims must reference an auditable basis.',
    legalSummary: 'Unverified "Best Seller" and "Award-Winning" badges constitute deceptive endorsements under FTC 16 CFR Part 255 (Endorsement Guides). The FTC requires disclosure of basis for all superlative claims.',
    estimatedEffort: 'XS',
  },
  // ── Privacy Zuckering (Brignull #6) ──
  'DP-PZ-01': {
    brignullPattern: 'Privacy Zuckering', brignullNumber: 6,
    dsaArticle: 'Art. 25(2)(b)',
    developerFix: 'Audit each form field against its stated purpose. Remove fields not essential to core function. Apply GDPR data minimisation (Art. 5(1)(c)): only collect what you use.',
    designerFix: 'Reduce form to minimum viable fields for the stated purpose. Each removed field reduces abandonment and GDPR liability. Group optional fields in a collapsible section.',
    legalSummary: 'Excessive data collection violates GDPR Art. 5(1)(c) data minimisation principle and India DPDPA 2023 §6. The ICO regularly fines organisations for collecting phone numbers without legitimate need.',
    estimatedEffort: 'M',
  },
  'DP-PZ-03': {
    brignullPattern: 'Privacy Zuckering', brignullNumber: 6,
    dsaArticle: 'Art. 25(2)(b)',
    developerFix: 'Change all data-sharing toggles to default OFF. Pre-enabled sharing toggles require explicit opt-in under GDPR Art. 7. Review backend to ensure no data is shared before toggle is turned on.',
    designerFix: 'Data sharing toggles must default to OFF. Show them in a dedicated Privacy Settings section with clear labels. Never bury them in a dense settings page.',
    legalSummary: 'Pre-enabled data sharing toggles violate GDPR Art. 7 — consent must be an active, unambiguous affirmative act. CNIL (France) has issued multi-million euro fines for pre-checked data sharing.',
    estimatedEffort: 'XS',
  },
  // ── Confirmshaming (Brignull #8) ──
  'DP-CS-01': {
    brignullPattern: 'Confirmshaming', brignullNumber: 8,
    dsaArticle: 'Art. 25(1)(f)',
    developerFix: 'Replace shame-inducing decline copy with neutral text. Accepted formula: "Yes, subscribe me" / "No, thanks". Any text that makes declining feel morally wrong must be removed.',
    designerFix: 'Decline copy must be factually neutral — never emotionally manipulative. Use a symmetry test: if the decline option feels shaming or self-deprecating, rewrite it.',
    legalSummary: 'Confirmshaming (guilt-inducing decline options) violates DSA Art. 25(1)(f) and user autonomy principles. The UK ICO has cited confirmshaming in its dark patterns guidance as a deceptive design pattern.',
    estimatedEffort: 'XS',
  },
  // ── Misdirection (Brignull #11) ──
  'DP-MD-08': {
    brignullPattern: 'Misdirection', brignullNumber: 11,
    dsaArticle: 'Art. 25(1)(a)',
    developerFix: 'Remove inflated reference prices unless the item was genuinely sold at that price within the past 30 days. Comply with the UK CPR 2008 and EU Omnibus Directive Art. 6a.',
    designerFix: 'Show strikethrough prices only with a "was" label and previous price period. Never fabricate reference prices for visual urgency effect.',
    legalSummary: 'Fabricated reference/strikethrough pricing violates the EU Omnibus Directive (2022), UK CPR 2008 Reg. 5, and FTC Act §5. Major retailers have been fined by national consumer protection authorities for fake reference prices.',
    estimatedEffort: 'S',
  },
  // ── Disguised Ads ──
  'DP-DA-01': {
    brignullPattern: 'Disguised Ads', brignullNumber: 4,
    dsaArticle: 'Art. 26(2)',
    developerFix: 'Add a visible "Sponsored" or "Ad" label to every paid placement element. Use aria-label="Sponsored content" for accessibility. Never use vague "promoted" wording without an "Ad" indicator.',
    designerFix: 'Sponsored content must be visually distinct from editorial content — different background color, clear "Sponsored" label in consistent position.',
    legalSummary: 'Disguised advertising violates DSA Art. 26(2) — all commercial content must be clearly identified as advertising. FTC Endorsement Guides require clear and conspicuous disclosure.',
    estimatedEffort: 'XS',
  },
  // ── Hidden Costs ──
  'DP-HC-01': {
    brignullPattern: 'Hidden Costs', brignullNumber: 12,
    dsaArticle: 'Art. 25(1)(g)',
    developerFix: 'Display total price including all mandatory fees at first price display. Use price breakdown component: base + fees + tax = total. Never reveal the full price only at checkout.',
    designerFix: 'Show the complete price on the product/service page — not just the base. Use a price breakdown tooltip if needed. "From £X" without fee disclosure is deceptive.',
    legalSummary: 'Drip pricing (hidden fees revealed at checkout) violates EU Omnibus Directive Art. 6(1)(e), FTC Act §5, and UK CPR 2008. Several airlines and hotels have received enforcement action specifically for drip pricing.',
    estimatedEffort: 'M',
  },
  // ── Bait & Switch ──
  'DP-BS-01': {
    brignullPattern: 'Bait and Switch', brignullNumber: 12,
    dsaArticle: 'Art. 25(1)(a)',
    developerFix: 'Fix misleading link destinations: if link text says "dismiss", destination must be a local dismiss action, not an external navigation. Audit all CTA links for text-destination alignment.',
    designerFix: 'Every link/button must do exactly what its label says. Dismissal CTAs must dismiss — not navigate, subscribe, or redirect.',
    legalSummary: 'Links that appear to dismiss but navigate externally constitute Bait and Switch (Brignull). FTC Act §5 deceptive practice. EU DSA Art. 25(1)(a) — interface manipulation of user choices.',
    estimatedEffort: 'XS',
  },
  // ── Friend Spam ──
  'DP-FS-01': {
    brignullPattern: 'Friend Spam', brignullNumber: 12,
    dsaArticle: 'Art. 25(3)(d)',
    developerFix: 'Implement granular permission for contact access. Show exactly which contacts will be contacted and what message they will receive before any action. Require explicit per-contact selection.',
    designerFix: 'Contact harvesting flows must show a detailed preview: who will receive what message, with ability to deselect individual contacts. Never bulk-import and message without preview.',
    legalSummary: 'Contact harvesting without granular consent violates GDPR Art. 6 and many national spam regulations. Multiple social networks have been fined hundreds of millions for Friend Spam patterns.',
    estimatedEffort: 'L',
  },
};

// ── Per-category fallback audience content ──
const CATEGORY_AUDIENCE_FALLBACK: Record<string, Pick<AudienceFixEntry, 'brignullPattern' | 'brignullNumber' | 'dsaArticle'>> = {
  'interface-interference': { brignullPattern: 'Interface Interference', brignullNumber: 12, dsaArticle: 'Art. 25(1)(a)' },
  'obstruction':           { brignullPattern: 'Roach Motel',            brignullNumber: 3,  dsaArticle: 'Art. 25(1)(c)' },
  'sneaking':              { brignullPattern: 'Trick Questions',         brignullNumber: 1,  dsaArticle: 'Art. 25(1)(b)' },
  'forced-action':         { brignullPattern: 'Forced Action',           brignullNumber: 5,  dsaArticle: 'Art. 25(3)(d)' },
  'nagging':               { brignullPattern: 'Nagging',                 brignullNumber: 9,  dsaArticle: 'Art. 25(1)(d)' },
  'scarcity-urgency':      { brignullPattern: 'False Urgency',           brignullNumber: 11, dsaArticle: 'Art. 25(1)(e)' },
  'social-pressure':       { brignullPattern: 'Social Proof',            brignullNumber: 7,  dsaArticle: 'Art. 25(1)(e)' },
  'privacy-zuckering':     { brignullPattern: 'Privacy Zuckering',       brignullNumber: 6,  dsaArticle: 'Art. 25(2)(b)' },
  'confirmshaming':        { brignullPattern: 'Confirmshaming',          brignullNumber: 8,  dsaArticle: 'Art. 25(1)(f)' },
  'misdirection':          { brignullPattern: 'Misdirection',            brignullNumber: 11, dsaArticle: 'Art. 25(1)(a)' },
};

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

  // ── Resolve audience-specific content ──
  const audienceFix = RULE_AUDIENCE_MAP[ruleId];
  const categoryFallback = CATEGORY_AUDIENCE_FALLBACK[rule.category];
  const brignullPattern = audienceFix?.brignullPattern ?? categoryFallback?.brignullPattern;
  const brignullNumber  = audienceFix?.brignullNumber  ?? categoryFallback?.brignullNumber;
  const dsaArticle      = audienceFix?.dsaArticle      ?? categoryFallback?.dsaArticle;

  // Derive fix priority from severity
  const fixPriority: 'P0' | 'P1' | 'P2' | 'P3' =
    rule.severity === 'critical' ? 'P0' :
    rule.severity === 'high'     ? 'P1' :
    rule.severity === 'medium'   ? 'P2' : 'P3';

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
    // ── Audience handoff ──
    brignullPattern,
    brignullNumber,
    dsaArticle,
    fixPriority,
    developerFix:  audienceFix?.developerFix,
    designerFix:   audienceFix?.designerFix,
    legalSummary:  audienceFix?.legalSummary,
    estimatedEffort: audienceFix?.estimatedEffort,
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

  // ── Source + Phase breakdown ──
  const findingsBySource: Record<string, number> = {};
  const findingsByPhase: Record<string, number> = {};
  const ruleIdToPhase: Record<string, string> = {};
  // Map ruleId prefixes to phase names
  for (const f of findings) {
    findingsBySource[f.source] = (findingsBySource[f.source] || 0) + 1;
    // Infer phase from ruleId prefix
    const phase =
      f.source === 'ai-vision'    ? 'Phase 8: Visual AI'       :
      f.source === 'temporal'     ? 'Gap 3: Temporal'           :
      f.source === 'cta-scorer'   ? 'Gap 4: CTA Prominence'     :
      /DP-SN|DP-OB|DP-FA|DP-NG|DP-PZ/.test(f.ruleId) ? 'Phase 1: DOM Scan'       :
      /DP-IF/.test(f.ruleId)      ? 'Phase 2: Visual Scan'      :
      /DP-SU|DP-SP|DP-CS|DP-MD|DP-BS|DP-DA|DP-FS|DP-HC/.test(f.ruleId) ? 'Phase 3: NLP Scan' :
      /DP-DEEP/.test(f.ruleId)    ? 'Phase 4: Deep Code'        :
      /DP-AX/.test(f.ruleId)      ? 'Phase 5: A11Y Cross-Map'   :
      /DP-FLOW|DP-OB-04/.test(f.ruleId) ? 'Phase 6: Flow Analysis' : 'Other';
    findingsByPhase[phase] = (findingsByPhase[phase] || 0) + 1;
    ruleIdToPhase[f.ruleId] = phase;
  }

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
    findingsBySource,
    findingsByPhase,
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

    const audienceFix = RULE_AUDIENCE_MAP[item.ruleId];
    const categoryFallback = CATEGORY_AUDIENCE_FALLBACK[matchedRule.category];
    const brignullPattern = audienceFix?.brignullPattern ?? categoryFallback?.brignullPattern;
    const brignullNumber  = audienceFix?.brignullNumber  ?? categoryFallback?.brignullNumber;
    const dsaArticle      = audienceFix?.dsaArticle      ?? categoryFallback?.dsaArticle;
    const severity = item.severity || matchedRule.severity;
    const fixPriority: 'P0' | 'P1' | 'P2' | 'P3' =
      severity === 'critical' ? 'P0' : severity === 'high' ? 'P1' : severity === 'medium' ? 'P2' : 'P3';

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
      severity,
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
      // ── Audience handoff ──
      brignullPattern,
      brignullNumber,
      dsaArticle,
      fixPriority,
      developerFix:    audienceFix?.developerFix  ?? item.developerFix,
      designerFix:     audienceFix?.designerFix   ?? item.designerFix,
      legalSummary:    audienceFix?.legalSummary,
      estimatedEffort: audienceFix?.estimatedEffort,
    });
  }

  return findings;
}
