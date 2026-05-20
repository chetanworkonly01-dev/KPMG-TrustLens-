// ============================================================
// KPMG TrustLens — Dark Pattern & Ethical UX Types
// ============================================================

// ── Dark Pattern Taxonomy Categories ──
export type DarkPatternCategory =
  | 'interface-interference'  // UI visually biases decisions
  | 'obstruction'             // Makes unwanted actions hard
  | 'sneaking'                // Hidden actions/costs
  | 'forced-action'           // Requires unrelated actions
  | 'nagging'                 // Repeated interruptions
  | 'scarcity-urgency'        // Fake time or stock pressure
  | 'social-pressure'         // Emotional manipulation via social proof
  | 'privacy-zuckering'       // Oversharing encouragement
  | 'confirmshaming'          // Guilt-based rejection
  | 'misdirection';           // Visual hierarchy steers user

export const DARK_PATTERN_CATEGORY_LABELS: Record<DarkPatternCategory, string> = {
  'interface-interference': 'Interface Interference',
  'obstruction': 'Obstruction',
  'sneaking': 'Sneaking',
  'forced-action': 'Forced Action',
  'nagging': 'Nagging',
  'scarcity-urgency': 'Scarcity & Urgency',
  'social-pressure': 'Social Pressure',
  'privacy-zuckering': 'Privacy Zuckering',
  'confirmshaming': 'Confirmshaming',
  'misdirection': 'Misdirection',
};

export const DARK_PATTERN_CATEGORY_ICONS: Record<DarkPatternCategory, string> = {
  'interface-interference': '🎭',
  'obstruction': '🚧',
  'sneaking': '🐍',
  'forced-action': '⛓️',
  'nagging': '📢',
  'scarcity-urgency': '⏰',
  'social-pressure': '👥',
  'privacy-zuckering': '🔓',
  'confirmshaming': '😔',
  'misdirection': '🎯',
};

// ── Foundational Ethical Principles ──
export type EthicalPrinciple =
  | 'informed-consent'        // Users understand agreements
  | 'symmetry-of-choice'      // Rejecting = accepting ease
  | 'transparency'            // No hidden costs/tracking
  | 'user-autonomy'           // No emotional manipulation
  | 'accessibility-clarity';  // Understandable by all users

export const ETHICAL_PRINCIPLE_LABELS: Record<EthicalPrinciple, string> = {
  'informed-consent': 'Informed Consent',
  'symmetry-of-choice': 'Symmetry of Choice',
  'transparency': 'Transparency',
  'user-autonomy': 'User Autonomy',
  'accessibility-clarity': 'Accessibility & Clarity',
};

export const ETHICAL_PRINCIPLE_DESCRIPTIONS: Record<EthicalPrinciple, string> = {
  'informed-consent': 'Users should understand what they agree to, see consequences clearly, and have equal reject/accept choices.',
  'symmetry-of-choice': 'Rejecting should be as easy as accepting. Subscribe and unsubscribe should have equal friction.',
  'transparency': 'The system should not conceal costs, subscriptions, tracking, sharing, or permissions.',
  'user-autonomy': 'The interface should not emotionally manipulate users through shame, guilt, fear, or fake urgency.',
  'accessibility-clarity': 'Users with low literacy, disabilities, or elderly demographics should still understand the flow.',
};

// Principle severity weights for scoring
export const PRINCIPLE_WEIGHTS: Record<EthicalPrinciple, number> = {
  'informed-consent': 1.5,
  'symmetry-of-choice': 1.3,
  'transparency': 1.2,
  'user-autonomy': 1.0,
  'accessibility-clarity': 1.0,
};

// ── Regulation Mapping ──
export type DarkPatternRegulation =
  | 'EU-DSA'          // EU Digital Services Act
  | 'EU-GDPR'         // General Data Protection Regulation
  | 'US-FTC'          // Federal Trade Commission Act
  | 'US-CCPA'         // California Consumer Privacy Act
  | 'IN-CCPA'         // India Consumer Protection Act
  | 'IN-DPDPA'        // India Digital Personal Data Protection Act 2023
  | 'IN-RBI'          // Reserve Bank of India Guidelines
  | 'IN-SEBI'         // Securities and Exchange Board of India
  | 'UK-CPR';         // UK Consumer Protection Regulations

// ── Finding Verifiability (Signal vs Verdict model) ──
export type FindingVerdict = 'verdict' | 'signal';
export type DetectionBasis = 'visual' | 'structural' | 'textual';

// ── Individual Dark Pattern Finding ──
export interface DarkPatternFinding {
  id: string;
  ruleId: string;                          // e.g. DP-IF-01
  category: DarkPatternCategory;
  principle: EthicalPrinciple;
  title: string;
  description: string;
  element: string;                          // CSS selector
  elementHtml?: string;                     // Outer HTML snippet
  pageUrl: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  regulation: DarkPatternRegulation[];      // Which regulations this violates
  confidence: 'high' | 'medium' | 'low';
  recommendation: string;
  userImpact: string;                       // How this harms real users
  evidence: DarkPatternEvidence;
  source: 'rule' | 'ai' | 'journey';       // Detection method
  // Signal vs Verdict model (Plan B3)
  detectionBasis?: DetectionBasis;          // How the finding was detected: visual/structural/textual
  verifiabilityNote?: string;               // Explains if DOM-provable (verdict) or content-only (signal)
  findingVerdict?: FindingVerdict;          // 'verdict' = DOM-proven, 'signal' = unverifiable claim
}

export interface DarkPatternEvidence {
  summary: string;
  details: string[];
  measurements?: Record<string, string | number>;  // e.g. { acceptWidth: 240, rejectWidth: 80 }
  screenshot?: string;                              // Base64 or path
}

// ── Dark Pattern Rule Definition ──
export interface DarkPatternRule {
  id: string;                               // e.g. DP-IF-01
  category: DarkPatternCategory;
  principle: EthicalPrinciple;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  regulation: DarkPatternRegulation[];
  detect: 'dom' | 'visual' | 'journey' | 'ai' | 'flow';  // Detection method type
}

// ── Aggregated Dark Pattern Result ──
export interface DarkPatternResult {
  findings: DarkPatternFinding[];
  ethicsScore: number;                                    // 0-100
  principleScores: Record<EthicalPrinciple, number>;      // 0-100 per principle
  categoryBreakdown: Record<DarkPatternCategory, number>; // Finding count per category
  consentIntegrity: number;                               // 0-100 consent health
  choiceSymmetry: number;                                 // 0-100 accept vs reject balance
  manipulationIndex: number;                              // 0-100 manipulation pressure (lower = better)
  totalFindings: number;
  findingsBySeverity: Record<string, number>;
  pagesScanned: number;
  regulatoryRisks: DarkPatternRegulation[];               // Regulations with violations
}
