# System Design & Architecture

## System Overview
The AccessiSense system is built as a highly modular, test-driven application relying on Next.js for orchestration and Playwright for active browser simulation. It transforms accessibility auditing from a simple passive DOM scan into an active, intelligent evaluation process mimicking human interaction.

## High-Level Flow
`User Input (UI)` ➔ `Next.js API Layer` ➔ `Crawl Engine (Playwright)` ➔ `Test Engine (Browser Exec)` ➔ `AI Analysis Layer` ➔ `Scoring & Deduplication` ➔ `Report Generator`

## Components Breakdown

### 🖥️ Frontend
*   **Dashboard:** Built with React/Next.js, providing an intuitive interface for configuring audits (URL, Crawl Depth, AI toggle, Auth).
*   **Report UI:** Displays a live execution log, progressive score gauge, grouped issue views, user journey test results, and robust remediation plans.

### ⚙️ Backend
*   **API Layer (`app/api/audit/*`):** Handles asynchronous execution of the heavy auditing pipeline, providing polling capabilities for the frontend.
*   **Orchestration Logic (`audit-orchestrator.ts`):** Manages the 7-phase pipeline, coordinating browser context lifecycles, test batches, and data deduplication.

### 🕷️ Crawl Engine
*   **Framework:** Playwright.
*   **Capabilities:** Handles dynamic single-page applications (SPAs), explicit waits, login configurations, and dynamic link discovery up to a configured depth.

### 🧪 Test Engine
*   **Structure:** Executes 55+ structured WCAG tests.
*   **Mechanism:** Uses active browser simulation (e.g., `page.keyboard.press('Tab')`) to test real-world focus management, keyboard traps, and dynamic error state generation.
*   **Evidence:** Captures screenshots, element snippets, and pass/fail execution logs in real-time.

### 🧠 AI Layer
*   **Engine:** Integration with top-tier LLMs (Claude / GPT).
*   **Responsibilities:** 
    * UX analysis (e.g., evaluating if link text is meaningful out of context).
    * Issue validation (assigning High/Medium/Low confidence scores).
    * Detecting cognitive load issues not visible to standard code parsers.

### 📊 Reporting Engine
*   **Functionality:** Takes aggregated `TestResults` and formats them into an `AuditReport`.
*   **Export Formats:** Generates downloadable Word Document (.docx), PDF (.pdf), and PowerPoint (.pptx) executive summaries.

---

## 🔁 Data Flow

1.  **Initialization:** UI sends a JSON config payload to the backend API.
2.  **Discovery:** The crawler receives the URL, initializes a Playwright context, and generates `PageData` objects for every valid discovered URL.
3.  **Active Execution:** The Orchestrator passes each `PageData` to the Test Engine. The Test Engine opens the page and runs defined `TestCase` modules sequentially.
4.  **Issue Aggregation:** Rules-based findings (`axe-core`) and browser simulation findings are combined.
5.  **AI Interrogation:** Selected high-value pages and their aggregated issues are sent to the AI Layer for heuristic validation.
6.  **Refinement:** Results traverse the Deduplication and Scoring engines to generate a final weighted `AuditScore`.
7.  **Finalization:** Processed data is mapped to WCAG 2.2 rules and saved for UI consumption or static document export.

---

## 📈 Scalability Considerations

*   **Parallel Crawling:** Implements concurrency caps (e.g., batching Playwright tabs) during the automated scanning phase to prevent memory bottlenecks.
*   **Queue System Integration:** The architecture is designed to attach seamlessly to robust queueing services (e.g., Redis/BullMQ) for heavy asynchronous production loads.
*   **Modular Services:** Test rules, AI analysis prompts, and reporting targets are loosely coupled allowing independent updates.
