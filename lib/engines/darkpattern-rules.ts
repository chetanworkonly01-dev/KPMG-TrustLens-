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

// ── Excessive data collection fields (more than needed for common forms) ──
export const EXCESSIVE_FIELDS_FOR_PURPOSE: Record<string, number> = {
  newsletter: 2,       // email + name at most
  contact: 4,          // name, email, subject, message
  login: 2,            // email/username + password
  signup: 4,           // name, email, password, confirm
  checkout: 8,         // name, email, address, city, state, zip, card, cvv
  search: 1,           // search query only
};
