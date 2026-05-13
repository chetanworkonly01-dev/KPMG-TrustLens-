// ============================================================
// KPMG TrustLens — Vision Analyzer (GPT-4o Multimodal)
// Handles image and video-frame-based audits
// ============================================================

import OpenAI from 'openai';
import type { TestLogEntry } from '../types/audit';

type ProgressFn = (entry: TestLogEntry) => void;
type Pillar = 'accessibility' | 'darkpatterns' | 'performance' | 'privacy';

export interface VisionFinding {
  id: string;
  pillar: Pillar;
  ruleId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  recommendation: string;
  evidence: { summary: string; details: string[] };
  regulation?: string[];
}

export interface VisionAuditResult {
  inputType: 'image' | 'video';
  framesAnalyzed: number;
  findings: VisionFinding[];
  confidenceNote: string;
  overallScore: number;
  pillarSummary: Record<string, { findings: number; score: number }>;
}

// ── Pillar-specific GPT-4o prompts ─────────────────────────
const PILLAR_PROMPTS: Record<Pillar, string> = {
  accessibility: `You are a WCAG 2.2 accessibility expert analyzing a UI screenshot.
Identify accessibility issues visible in the image. Check for:
- Low colour contrast between text and background (WCAG 1.4.3)
- Missing or incorrect focus indicators (WCAG 2.4.7)
- Text too small to read (<16px equivalent, WCAG 1.4.4)
- Images without obvious alt text context (WCAG 1.1.1)
- Form fields without visible labels (WCAG 1.3.1)
- Interactive elements too small for touch (<44x44px, WCAG 2.5.8)
- Heading hierarchy issues (WCAG 1.3.1)
- No skip navigation link visible (WCAG 2.4.1)
For each issue found, respond with JSON array: [{"title":"...","description":"...","severity":"critical|high|medium|low","wcag":"criterion","recommendation":"..."}]
If no issues found, return [].`,

  darkpatterns: `You are a dark pattern detection expert trained in Brignull taxonomy and EU DSA Art. 25.
Analyze this UI screenshot for deceptive design patterns:
- Consent banner: Is reject as prominent as accept? (Asymmetric framing)
- Urgency/scarcity: Countdown timers, "Only X left", fake limited-time offers
- Confirmshaming: Guilt-inducing decline copy
- Misleading visual hierarchy: Key negative options hidden/de-emphasized
- Social proof claims: Unverifiable "N people viewing now" counters
- Pre-selected options that benefit the company
- Confusing double-negatives in opt-out language
- Disguised advertising without clear "Ad" label
For each pattern found: [{"title":"...","description":"...","brignullPattern":"...","severity":"critical|high|medium|low","regulation":"FTC|DSA|GDPR","recommendation":"..."}]
If none found, return [].`,

  performance: `You are a web performance expert analyzing a UI screenshot for perceived performance issues.
Look for:
- Loading spinners or skeleton screens visible (page not loaded)
- Layout shift indicators (elements misaligned, overlapping)
- Heavy image use without apparent optimization
- Multiple large above-fold images
- Text rendered before fonts loaded (FOUT visible)
- Render-blocking visual indicators
- Slow-loading state indicators
- Mobile viewport issues (content cut off, horizontal scroll)
For each issue: [{"title":"...","description":"...","metric":"LCP|CLS|INP|FCP","severity":"critical|high|medium|low","recommendation":"..."}]
If none found, return [].`,

  privacy: `You are a privacy and GDPR compliance expert analyzing a UI screenshot.
Look for:
- Cookie/consent banner presence and quality
- "Accept all" without visible "Reject all" at same level
- Consent banner that blocks page access (consent wall)
- Privacy policy link visibility
- Tracking pixel indicators (small 1x1 invisible images)
- Forms collecting sensitive data without visible purpose
- Social login buttons without data-sharing disclosure
- Third-party widgets (chat, social share) loading without consent context
For each issue: [{"title":"...","description":"...","gdprArticle":"Art. X","severity":"critical|high|medium|low","regulation":"GDPR|CCPA|ePrivacy","recommendation":"..."}]
If none found, return [].`,
};

const log = (testId: string, message: string, methodology?: string, onProgress?: ProgressFn) => {
  onProgress?.({
    timestamp: new Date().toISOString(), testId, testName: 'Vision AI', wcag: '',
    status: 'running', message, pillar: 'accessibility', methodology, phase: 'Vision Analysis',
  });
};

// ── Image Audit ─────────────────────────────────────────────
export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  enabledPillars: Pillar[],
  onProgress?: ProgressFn,
): Promise<VisionAuditResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const findings: VisionFinding[] = [];
  let findingId = 0;

  log('VIS-START', '━━━ Vision AI: Image Analysis — GPT-4o Multimodal', 'GPT-4o Vision Analysis', onProgress);
  log('VIS-CONF', `  → Confidence: ~70% (visual analysis only — no DOM access)`, 'Vision Confidence Framework', onProgress);
  log('VIS-PIL', `  → Pillars: ${enabledPillars.join(', ')}`, 'Multi-Pillar Visual Scan', onProgress);

  for (const pillar of enabledPillars) {
    log(`VIS-${pillar.toUpperCase()}`, `  → Scanning for ${pillar} issues via GPT-4o vision...`, PILLAR_PROMPTS[pillar].split('\n')[0], onProgress);
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PILLAR_PROMPTS[pillar] },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } },
          ],
        }],
      });

      const raw = response.choices[0]?.message?.content || '[]';
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]) as any[];
      for (const item of parsed) {
        findings.push({
          id: `vis-${++findingId}`,
          pillar,
          ruleId: `VIS-${pillar.toUpperCase()}-${findingId.toString().padStart(2, '0')}`,
          title: item.title || 'Visual Issue Detected',
          description: item.description || '',
          severity: item.severity || 'medium',
          confidence: 'medium',
          recommendation: item.recommendation || '',
          evidence: { summary: 'Detected via GPT-4o vision analysis', details: [item.description || ''] },
          regulation: item.regulation ? [item.regulation] : item.gdprArticle ? ['GDPR'] : undefined,
        });
      }
      log(`VIS-${pillar.toUpperCase()}`, `  ✓ ${pillar}: ${parsed.length} finding(s) detected`, `GPT-4o — ${pillar}`, onProgress);
    } catch (err) {
      log(`VIS-${pillar.toUpperCase()}`, `  ⚠ ${pillar} analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`, undefined, onProgress);
    }
  }

  return buildVisionResult('image', 1, findings, enabledPillars);
}

// ── Video Frame Extraction + Analysis (client-canvas approach) ──
export async function analyzeVideoFrames(
  frames: Array<{ base64: string; mimeType: string; timestampMs: number }>,
  enabledPillars: Pillar[],
  onProgress?: ProgressFn,
): Promise<VisionAuditResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const findings: VisionFinding[] = [];
  let findingId = 0;

  log('VIS-VID', '━━━ Vision AI: Video Frame Analysis — GPT-4o Multimodal', 'GPT-4o Video Frame Analysis', onProgress);
  log('VIS-VID-CONF', `  → Confidence: ~60% (behavioral inference from ${frames.length} frames)`, 'Vision Confidence Framework', onProgress);
  log('VIS-VID-FRM', `  → Analyzing ${frames.length} key frame(s) at: ${frames.map(f => `${(f.timestampMs/1000).toFixed(1)}s`).join(', ')}`, 'Frame Sampling Strategy', onProgress);

  // Analyze a sample of frames (max 4 to control cost)
  const sampleFrames = frames.length > 4 ? [frames[0], frames[Math.floor(frames.length / 3)], frames[Math.floor(2 * frames.length / 3)], frames[frames.length - 1]] : frames;

  for (let i = 0; i < sampleFrames.length; i++) {
    const frame = sampleFrames[i];
    log(`VIS-VID-F${i}`, `  → Analysing frame at ${(frame.timestampMs/1000).toFixed(1)}s...`, 'GPT-4o Frame Scan', onProgress);

    for (const pillar of enabledPillars) {
      try {
        const prompt = `${PILLAR_PROMPTS[pillar]}\nThis is frame ${i+1} of ${sampleFrames.length} from a screen recording at ${(frame.timestampMs/1000).toFixed(1)}s. Also look for: layout shifts, loading states, interaction delays visible between frames.`;
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${frame.mimeType};base64,${frame.base64}`, detail: 'low' } },
            ],
          }],
        });

        const raw = response.choices[0]?.message?.content || '[]';
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[0]) as any[];
        for (const item of parsed) {
          // Deduplicate by title
          if (!findings.some(f => f.title === item.title && f.pillar === pillar)) {
            findings.push({
              id: `vis-${++findingId}`,
              pillar,
              ruleId: `VIS-VID-${pillar.toUpperCase()}-${findingId.toString().padStart(2, '0')}`,
              title: item.title || 'Visual Issue Detected',
              description: `[Frame ${i+1} @ ${(frame.timestampMs/1000).toFixed(1)}s] ${item.description || ''}`,
              severity: item.severity || 'medium',
              confidence: 'low',
              recommendation: item.recommendation || '',
              evidence: { summary: `Detected at ${(frame.timestampMs/1000).toFixed(1)}s via GPT-4o`, details: [item.description || ''] },
              regulation: item.regulation ? [item.regulation] : undefined,
            });
          }
        }
      } catch { /* continue with next frame */ }
    }
  }

  log('VIS-VID-DONE', `  ✓ Video analysis complete — ${findings.length} finding(s) across ${sampleFrames.length} frames`, 'GPT-4o Video Analysis', onProgress);
  return buildVisionResult('video', frames.length, findings, enabledPillars);
}

// ── Build Result ────────────────────────────────────────────
function buildVisionResult(
  inputType: 'image' | 'video',
  framesAnalyzed: number,
  findings: VisionFinding[],
  pillars: Pillar[],
): VisionAuditResult {
  const sevW = { critical: 20, high: 10, medium: 4, low: 1 };
  const pillarSummary: Record<string, { findings: number; score: number }> = {};
  for (const p of pillars) {
    const pf = findings.filter(f => f.pillar === p);
    const ded = pf.reduce((s, f) => s + (sevW[f.severity] || 1), 0);
    pillarSummary[p] = { findings: pf.length, score: Math.max(0, Math.min(100, 100 - ded)) };
  }
  const overallScore = pillars.length > 0
    ? Math.round(Object.values(pillarSummary).reduce((s, p) => s + p.score, 0) / pillars.length)
    : 100;
  const confNote = inputType === 'image'
    ? 'Image audit: ~70% confidence. DOM-based checks not available. Results are AI visual inference only.'
    : 'Video audit: ~60% confidence. Frame sampling may miss transient issues. Complement with live URL audit.';

  return { inputType, framesAnalyzed, findings, confidenceNote: confNote, overallScore, pillarSummary };
}
