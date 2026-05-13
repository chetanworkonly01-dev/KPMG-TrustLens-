// ============================================================
// KPMG TrustLens — Dark Pattern Detection Rules (30+ rules)
// ============================================================

import type { DarkPatternRule } from '../types/darkpattern';

export const DARK_PATTERN_RULES: DarkPatternRule[] = [
  // ═══════════════════════════════════════════════════
  // INTERFACE INTERFERENCE (DP-IF) — UI visually biases decisions
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-IF-01', category: 'interface-interference', principle: 'symmetry-of-choice',
    title: 'Cookie Accept Button Disproportionately Larger',
    description: 'The "Accept" button on a cookie/consent banner is significantly larger than the "Reject" or "Manage" option, visually biasing users toward acceptance.',
    severity: 'high', regulation: ['EU-DSA', 'EU-GDPR'], detect: 'visual',
  },
  {
    id: 'DP-IF-02', category: 'interface-interference', principle: 'symmetry-of-choice',
    title: 'Accept Button Uses High-Contrast Color While Reject Is Muted',
    description: 'Accept/agree uses a vibrant color while reject/decline uses a muted, transparent, or hard-to-see color, creating visual asymmetry.',
    severity: 'high', regulation: ['EU-DSA', 'EU-GDPR'], detect: 'visual',
  },
  {
    id: 'DP-IF-03', category: 'interface-interference', principle: 'symmetry-of-choice',
    title: 'Reject Option Hidden Below Fold or in Settings',
    description: 'The reject/decline option is not visible without scrolling or requires navigating to a sub-menu, while accept is immediately visible.',
    severity: 'critical', regulation: ['EU-DSA', 'EU-GDPR'], detect: 'visual',
  },
  {
    id: 'DP-IF-04', category: 'interface-interference', principle: 'informed-consent',
    title: 'Dismiss Button Is Unusually Small or Hard to Target',
    description: 'A close/dismiss button (e.g., on a modal or banner) is extremely small (<24px), making it difficult to interact with, especially on touch devices.',
    severity: 'medium', regulation: ['EU-DSA'], detect: 'visual',
  },

  // ═══════════════════════════════════════════════════
  // OBSTRUCTION (DP-OB) — Makes unwanted actions hard
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-OB-01', category: 'obstruction', principle: 'symmetry-of-choice',
    title: 'No Visible Unsubscribe or Cancel Option',
    description: 'The page/app has subscribe/sign-up options but no visible path to unsubscribe or cancel.',
    severity: 'critical', regulation: ['US-FTC', 'EU-DSA'], detect: 'dom',
  },
  {
    id: 'DP-OB-02', category: 'obstruction', principle: 'symmetry-of-choice',
    title: 'Account Deletion Not Accessible',
    description: 'No visible "delete account" or "close account" link/button found in account settings or profile areas.',
    severity: 'high', regulation: ['EU-GDPR', 'US-CCPA'], detect: 'dom',
  },
  {
    id: 'DP-OB-03', category: 'obstruction', principle: 'user-autonomy',
    title: 'Multi-Step Confirmation to Decline',
    description: 'Declining an offer requires multiple confirmation steps (e.g., "Are you sure?" dialogs) while accepting is one-click.',
    severity: 'high', regulation: ['EU-DSA', 'US-FTC'], detect: 'journey',
  },

  // ═══════════════════════════════════════════════════
  // SNEAKING (DP-SN) — Hidden actions/costs
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-SN-01', category: 'sneaking', principle: 'informed-consent',
    title: 'Preselected Opt-In Checkboxes',
    description: 'Checkboxes for newsletters, marketing emails, or data sharing are pre-checked by default, requiring users to actively opt-out.',
    severity: 'critical', regulation: ['EU-GDPR', 'EU-DSA'], detect: 'dom',
  },
  {
    id: 'DP-SN-02', category: 'sneaking', principle: 'transparency',
    title: 'Hidden Preselected Add-Ons',
    description: 'Additional products, services, or insurance options are preselected in forms or checkout flows without explicit user action.',
    severity: 'critical', regulation: ['US-FTC', 'EU-DSA', 'IN-CCPA'], detect: 'dom',
  },
  {
    id: 'DP-SN-03', category: 'sneaking', principle: 'transparency',
    title: 'Price Not Visible Until Late in Flow',
    description: 'The full cost/price is not displayed upfront but only revealed in later checkout steps (drip pricing).',
    severity: 'high', regulation: ['US-FTC', 'EU-DSA'], detect: 'dom',
  },
  {
    id: 'DP-SN-04', category: 'sneaking', principle: 'informed-consent',
    title: 'Hidden Input Fields with Default Values',
    description: 'Hidden form fields (type="hidden") carry default values that the user cannot see or modify, potentially submitting data without consent.',
    severity: 'medium', regulation: ['EU-GDPR'], detect: 'dom',
  },

  // ═══════════════════════════════════════════════════
  // FORCED ACTION (DP-FA) — Requires unrelated actions
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-FA-01', category: 'forced-action', principle: 'user-autonomy',
    title: 'Forced Account Creation to View Content',
    description: 'Content is blocked by a login/registration wall that forces users to create an account before accessing publicly available information.',
    severity: 'high', regulation: ['EU-DSA'], detect: 'dom',
  },
  {
    id: 'DP-FA-02', category: 'forced-action', principle: 'informed-consent',
    title: 'Forced Newsletter Signup During Checkout',
    description: 'The checkout or registration flow requires subscribing to newsletters or marketing with no opt-out option.',
    severity: 'high', regulation: ['EU-GDPR', 'US-FTC'], detect: 'dom',
  },
  {
    id: 'DP-FA-03', category: 'forced-action', principle: 'user-autonomy',
    title: 'App Install Prompt Blocking Content',
    description: 'A full-screen or blocking prompt forces users to install a mobile app to access content available on the web.',
    severity: 'medium', regulation: ['EU-DSA'], detect: 'dom',
  },

  // ═══════════════════════════════════════════════════
  // NAGGING (DP-NG) — Repeated interruptions
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-NG-01', category: 'nagging', principle: 'user-autonomy',
    title: 'Multiple Overlapping Modals or Popups',
    description: 'The page shows multiple overlapping modal dialogs, popups, or banners simultaneously, creating excessive interruption.',
    severity: 'medium', regulation: ['EU-DSA'], detect: 'dom',
  },
  {
    id: 'DP-NG-02', category: 'nagging', principle: 'user-autonomy',
    title: 'Notification Permission Prompt on First Visit',
    description: 'The site requests browser notification permissions immediately on first visit before any user engagement.',
    severity: 'medium', regulation: ['EU-DSA'], detect: 'dom',
  },

  // ═══════════════════════════════════════════════════
  // SCARCITY & URGENCY (DP-SU) — Fake time/stock pressure
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-SU-01', category: 'scarcity-urgency', principle: 'user-autonomy',
    title: 'Countdown Timer Creating False Urgency',
    description: 'A countdown timer is displayed suggesting limited time for an offer, which may create artificial urgency.',
    severity: 'high', regulation: ['US-FTC', 'EU-DSA', 'IN-CCPA'], detect: 'dom',
  },
  {
    id: 'DP-SU-02', category: 'scarcity-urgency', principle: 'transparency',
    title: 'Fake Scarcity Messaging ("Only X Left!")',
    description: 'Messages suggesting limited availability (e.g., "Only 2 left!", "Selling fast!") that may not reflect actual stock levels.',
    severity: 'high', regulation: ['US-FTC', 'IN-CCPA'], detect: 'dom',
  },
  {
    id: 'DP-SU-03', category: 'scarcity-urgency', principle: 'user-autonomy',
    title: 'Urgency Language in CTA Text',
    description: 'Call-to-action buttons or banners use urgency language like "Act now!", "Limited time!", "Hurry!" to pressure decisions.',
    severity: 'medium', regulation: ['EU-DSA'], detect: 'dom',
  },

  // ═══════════════════════════════════════════════════
  // SOCIAL PRESSURE (DP-SP) — Emotional manipulation
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-SP-01', category: 'social-pressure', principle: 'user-autonomy',
    title: 'Real-Time Viewer Count Displayed',
    description: 'Messages like "X people are viewing this right now" or "X people bought this today" create social pressure to act quickly.',
    severity: 'medium', regulation: ['EU-DSA', 'IN-CCPA'], detect: 'dom',
  },
  {
    id: 'DP-SP-02', category: 'social-pressure', principle: 'user-autonomy',
    title: 'Activity Notifications Creating FOMO',
    description: 'Popup notifications showing other users\' actions (e.g., "John just purchased...") designed to create fear of missing out.',
    severity: 'medium', regulation: ['EU-DSA'], detect: 'dom',
  },

  // ═══════════════════════════════════════════════════
  // PRIVACY ZUCKERING (DP-PZ) — Oversharing encouragement
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-PZ-01', category: 'privacy-zuckering', principle: 'informed-consent',
    title: 'Form Collects Excessive Personal Data',
    description: 'A form collects significantly more personal data fields than necessary for its stated purpose (e.g., phone number for a newsletter).',
    severity: 'high', regulation: ['EU-GDPR', 'US-CCPA'], detect: 'dom',
  },
  {
    id: 'DP-PZ-02', category: 'privacy-zuckering', principle: 'transparency',
    title: 'Share Buttons More Prominent Than Content',
    description: 'Social sharing buttons are disproportionately prominent compared to the actual content, encouraging data sharing over consumption.',
    severity: 'low', regulation: ['EU-DSA'], detect: 'visual',
  },

  // ═══════════════════════════════════════════════════
  // CONFIRMSHAMING (DP-CS) — Guilt-based rejection
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-CS-01', category: 'confirmshaming', principle: 'user-autonomy',
    title: 'Guilt Language on Decline/Reject Option',
    description: 'The reject/decline option uses emotionally manipulative text like "No thanks, I don\'t want to save money" or "I prefer to pay full price".',
    severity: 'critical', regulation: ['EU-DSA', 'US-FTC'], detect: 'ai',
  },
  {
    id: 'DP-CS-02', category: 'confirmshaming', principle: 'user-autonomy',
    title: 'Negative Framing on Opt-Out Choice',
    description: 'Opt-out text uses negative framing (e.g., "No, I hate discounts") designed to shame users into opting in.',
    severity: 'high', regulation: ['EU-DSA'], detect: 'ai',
  },

  // ═══════════════════════════════════════════════════
  // MISDIRECTION (DP-MD) — Visual steering
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-MD-01', category: 'misdirection', principle: 'symmetry-of-choice',
    title: 'Premium Option Visually Highlighted Over Basic',
    description: 'In a pricing/plan comparison, the most expensive option is disproportionately highlighted with badges, colors, or size while the basic/free option is de-emphasized.',
    severity: 'medium', regulation: ['EU-DSA'], detect: 'visual',
  },
  {
    id: 'DP-MD-02', category: 'misdirection', principle: 'informed-consent',
    title: 'Misleading Button Labels',
    description: 'Buttons use ambiguous or misleading labels where the action performed does not match reasonable user expectations.',
    severity: 'high', regulation: ['EU-DSA', 'US-FTC'], detect: 'ai',
  },
  {
    id: 'DP-MD-03', category: 'misdirection', principle: 'transparency',
    title: 'Close Button Triggers Unexpected Action',
    description: 'Clicking a close/dismiss button on a modal or banner triggers an unexpected action like a redirect or subscription.',
    severity: 'critical', regulation: ['US-FTC', 'EU-DSA'], detect: 'journey',
  },

  // ═══════════════════════════════════════════════════
  // EXPANDED RULES — Interface Interference
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-IF-05', category: 'interface-interference', principle: 'transparency',
    title: 'Fake Disabled UI State',
    description: 'An interactive element appears visually disabled (grayed out, low opacity) but is actually clickable, misleading users about available options.',
    severity: 'high', regulation: ['EU-DSA', 'US-FTC', 'IN-CCPA'], detect: 'visual',
  },
  {
    id: 'DP-IF-06', category: 'interface-interference', principle: 'user-autonomy',
    title: 'Visual Urgency Indicator (Pulsing/Flashing CTA)',
    description: 'A call-to-action button or banner uses pulsing animation, flashing colors, or other visual urgency cues to pressure immediate action.',
    severity: 'medium', regulation: ['EU-DSA', 'IN-CCPA'], detect: 'visual',
  },
  {
    id: 'DP-IF-07', category: 'interface-interference', principle: 'informed-consent',
    title: 'Dark CSS Overlay Trap',
    description: 'An invisible or semi-transparent overlay covers content, intercepting clicks intended for underlying elements.',
    severity: 'critical', regulation: ['EU-DSA', 'US-FTC', 'IN-DPDPA'], detect: 'dom',
  },

  // ═══════════════════════════════════════════════════
  // EXPANDED RULES — Obstruction (Interaction Flow)
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-OB-04', category: 'obstruction', principle: 'symmetry-of-choice',
    title: 'Cancel Flow Has More Friction Than Subscribe (EFS > 2.0)',
    description: 'The cancellation or opt-out flow requires significantly more steps/clicks than the subscription or opt-in flow, creating asymmetric friction.',
    severity: 'critical', regulation: ['EU-DSA', 'US-FTC', 'IN-CCPA', 'IN-DPDPA'], detect: 'flow',
  },
  {
    id: 'DP-OB-05', category: 'obstruction', principle: 'symmetry-of-choice',
    title: 'Unsubscribe Link Buried in Deep Navigation',
    description: 'The unsubscribe or account deletion option requires navigating through 3+ levels of menus or settings, making it difficult to find.',
    severity: 'high', regulation: ['EU-GDPR', 'US-FTC', 'IN-DPDPA'], detect: 'dom',
  },

  // ═══════════════════════════════════════════════════
  // EXPANDED RULES — Sneaking (Deep Code Inspection)
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-SN-05', category: 'sneaking', principle: 'informed-consent',
    title: 'Tracking Scripts Fire Before Consent',
    description: 'Analytics or advertising scripts execute before the user interacts with the consent banner, collecting data without explicit permission.',
    severity: 'critical', regulation: ['EU-GDPR', 'IN-DPDPA', 'US-CCPA'], detect: 'dom',
  },
  {
    id: 'DP-SN-06', category: 'sneaking', principle: 'transparency',
    title: 'Auto-Added Items in Cart/Checkout',
    description: 'Products, services, insurance, or add-ons are automatically added to the shopping cart without explicit user action.',
    severity: 'critical', regulation: ['US-FTC', 'IN-CCPA', 'EU-DSA'], detect: 'dom',
  },
  {
    id: 'DP-SU-04', category: 'scarcity-urgency', principle: 'transparency',
    title: 'Fake Countdown Timer (JavaScript-Resetting)',
    description: 'A countdown timer that resets on page refresh, indicating the urgency is artificial and not tied to a real deadline.',
    severity: 'high', regulation: ['US-FTC', 'IN-CCPA', 'EU-DSA'], detect: 'dom',
  },

  // ═══════════════════════════════════════════════════
  // EXPANDED RULES — Forced Action
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-FA-04', category: 'forced-action', principle: 'transparency',
    title: 'Hidden Auto-Renewal / Forced Continuity',
    description: 'A subscription or trial automatically renews without clear disclosure of recurring charges or an easy cancellation path.',
    severity: 'critical', regulation: ['US-FTC', 'IN-CCPA', 'IN-RBI', 'EU-DSA'], detect: 'dom',
  },

  // ═══════════════════════════════════════════════════
  // EXPANDED RULES — Misdirection / Trick Questions
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-MD-04', category: 'misdirection', principle: 'informed-consent',
    title: 'Trick Question (Confusing Checkbox Wording)',
    description: 'A checkbox or toggle uses double-negative or confusing wording that makes it unclear whether checking means opting in or out.',
    severity: 'high', regulation: ['EU-DSA', 'US-FTC', 'IN-CCPA'], detect: 'ai',
  },
  {
    id: 'DP-CS-03', category: 'confirmshaming', principle: 'user-autonomy',
    title: 'Fear-Based Language on Decline Option',
    description: 'The decline option uses fear-inducing language like "Your account is at risk" or "You will lose access" to pressure users.',
    severity: 'high', regulation: ['EU-DSA', 'US-FTC', 'IN-CCPA'], detect: 'ai',
  },

  // ═══════════════════════════════════════════════════
  // ACCESSIBILITY × DARK PATTERN CROSS-MAPPING (DP-AX)
  // ═══════════════════════════════════════════════════
  {
    id: 'DP-AX-01', category: 'interface-interference', principle: 'accessibility-clarity',
    title: 'Low-Contrast Opt-Out / Reject Button',
    description: 'The reject or opt-out button has insufficient contrast ratio (< 4.5:1), making it effectively invisible to users with low vision.',
    severity: 'high', regulation: ['EU-DSA', 'EU-GDPR', 'IN-DPDPA'], detect: 'visual',
  },
  {
    id: 'DP-AX-02', category: 'interface-interference', principle: 'accessibility-clarity',
    title: 'Focus Trapped in Consent Modal',
    description: 'Keyboard focus is trapped inside a consent/cookie modal with no way to dismiss using keyboard alone, forcing acceptance.',
    severity: 'critical', regulation: ['EU-DSA', 'EU-GDPR', 'IN-DPDPA'], detect: 'dom',
  },
  {
    id: 'DP-AX-03', category: 'misdirection', principle: 'accessibility-clarity',
    title: 'Screen Reader Text Mismatch',
    description: 'The text announced to screen readers differs from the visible text, potentially misleading assistive technology users about the action they are performing.',
    severity: 'high', regulation: ['EU-DSA', 'IN-DPDPA'], detect: 'dom',
  },
  {
    id: 'DP-AX-04', category: 'interface-interference', principle: 'accessibility-clarity',
    title: 'Reject Button Below Minimum Touch Target Size',
    description: 'The reject/decline button is smaller than WCAG 2.5.8 minimum touch target (24×24px), making it difficult for users with motor impairments.',
    severity: 'medium', regulation: ['EU-DSA', 'IN-DPDPA'], detect: 'visual',
  },
];

// ── Urgency/scarcity language patterns ──
export const URGENCY_PATTERNS = [
  /only\s+\d+\s+(left|remaining|available)/i,
  /limited\s+(time|stock|availability|offer|spots)/i,
  /(hurry|act\s+now|don'?t\s+miss|last\s+chance)/i,
  /\d+\s+(people|users|visitors)\s+(are\s+)?(viewing|watching|looking)/i,
  /(selling|going)\s+fast/i,
  /offer\s+(ends|expires)\s+(soon|today|in)/i,
  /flash\s+sale/i,
  /before\s+it'?s?\s+(gone|too\s+late)/i,
  /\d+%?\s+off\s+(ends|today|now)/i,
  /exclusive\s+(deal|offer|access)/i,
];

// ── Social pressure patterns ──
export const SOCIAL_PRESSURE_PATTERNS = [
  /\d+\s+(people|users|others)\s+(are\s+)?(viewing|watching|looking\s+at)/i,
  /\d+\s+(people|customers)\s+(just\s+)?(bought|purchased|ordered)/i,
  /(join|trusted\s+by)\s+\d[\d,]*\+?\s+(users|customers|people|businesses)/i,
  /someone\s+(just|recently)\s+(bought|signed\s+up|subscribed)/i,
  /popular\s+(choice|item|option)/i,
  /most\s+(popular|chosen|selected)/i,
  /trending\s+(now|today)/i,
];

// ── Confirmshaming keyword patterns ──
export const CONFIRMSHAMING_PATTERNS = [
  /no\s*(,|\s)?\s*thanks?\s*[,.]?\s*i\s*(don'?t|do\s+not)/i,
  /i\s*(prefer|choose)\s*to\s*(pay|miss|lose|stay|remain)/i,
  /i\s*(hate|don'?t\s+(like|want|need|care))/i,
  /no\s*(,|\s)?\s*i'?m?\s*(fine|good|ok)\s*(with|without|paying)/i,
  /i'?ll?\s*(pass|skip)\s*(on)?\s*(saving|the\s+discount)/i,
  /not?\s*(interested|now|for\s+me)/i,
];

// ── Fear/threat language patterns (NEW) ──
export const FEAR_LANGUAGE_PATTERNS = [
  /your\s*(account|data|files?)\s*(is|are|will\s+be)\s*(at\s+risk|compromised|deleted|lost)/i,
  /you\s*(will|may|could)\s*(lose|miss|forfeit)\s*(access|data|progress|benefits)/i,
  /(warning|alert|urgent|critical)\s*[:\-!]\s*(your|action\s+required)/i,
  /last\s+warning/i,
  /(security|privacy)\s*(alert|warning|issue|concern)/i,
  /before\s*(it'?s?\s+too\s+late|you\s+lose|your\s+account)/i,
  /unprotected|vulnerable|exposed/i,
];

// ── Trick question / double-negative patterns (NEW) ──
export const TRICK_QUESTION_PATTERNS = [
  /do\s+not\s+un(check|subscribe|select)/i,
  /un(check|tick)\s+to\s+(not|avoid|prevent)/i,
  /leave\s+(un)?checked\s+to\s+(not|avoid)/i,
  /opt\s+out\s+of\s+not\s+receiving/i,
  /don'?t\s+not\s+/i,
  /disable\s+to\s+enable/i,
];

// ── Excessive data collection fields (more than needed for common forms) ──
export const EXCESSIVE_FIELDS_FOR_PURPOSE: Record<string, number> = {
  newsletter: 2,       // email + name at most
  contact: 4,          // name, email, subject, message
  login: 2,            // email/username + password
  signup: 4,           // name, email, password, confirm
  checkout: 8,         // name, email, address, city, state, zip, card, cvv
  search: 1,           // search query only
};

