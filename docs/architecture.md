# Enterprise Architecture & System Design

## 🌐 System Vision: Human-in-the-Loop AI
The AccessiSense architecture is designed to elevate the human auditor, not replace them. By offloading tedious manual traversal (crawling, tabbing, color parsing) to deterministic automation, and offloading contextual review to Cognitive AI, the system allows human experts to focus on complex, high-level remediation strategies.

## High-Level Flow 
`User Config (UI)` ➔ `Playwright Crawl Engine` ➔ `Test-Driven Execution Engine` ➔ `Cognitive AI Layer` ➔ `Deduplication Matrix` ➔ `Omni-Channel Export`

## 🏗️ Architectural Breakdown

### 🎨 1. The Premium Presentation Layer (Frontend)
*   **Design System:** Built on a proprietary Glassmorphic design language. It uses CSS variables for strict color harmony, heavy backdrop-blur techniques, and fluid micro-animations to communicate state changes intuitively.
*   **Live Feedback Loop:** Instead of a simple "loading spinner," the UI opens a WebSockets/Polling channel to display real-time terminal logs of specific simulated browser actions, establishing profound trust with the user.

### ⚙️ 2. The Orchestration Brain (Backend)
*   **Pipeline Manager (`audit-orchestrator.ts`):** A resilient 7-phase pipeline that gracefully handles network timeouts, unresolvable DOM nodes, and dynamic single-page application (SPA) state changes.

### 🕷️ 3. The Human-Simulation Engine (Playwright)
*   Instead of passive HTML parsing, this engine boots actual Chromium instances.
*   **Journey Mapping:** It executes user journeys, handles authentication portals, and dynamically waits for lazy-loaded assets just like a screen-reader user would.

### 🧪 4. The Test-Driven Execution Matrix
*   Executes 10+ strict, evidence-based tests (e.g., executing `page.keyboard.press('Tab')` up to 50 times to catch elusive keyboard traps).
*   **Evidence Collection:** Captures exact DOM snippets and execution timings.

### 🧠 5. The Cognitive AI Layer
*   **Contextual Evaluator:** The LLM is fed targeted DOM snapshots and asked to evaluate semantic intent. (e.g., "Does this ARIA label make sense given the surrounding paragraph?").
*   **Confidence Engine:** Assigns dynamic confidence intervals (High, Medium, Low) to reduce the false-positive noise that plagues traditional scanners.

### 📊 6. Cross-Functional Export Pipeline
Because different teams consume data differently, the architecture natively translates the audit JSON into specialized formats:
*   **Executives:** Generates automated `.pptx` decks focusing on high-level scores and compliance risk.
*   **Product/Design:** Generates `.docx` reports focusing on UI impact and step-by-step remediation plans.
*   **Engineering:** Generates `.json` schemas detailing CSS selectors, WCAG mapping, and exact line-of-code fixes.
