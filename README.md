# AccessiSense: AI-Powered Accessibility Audit System

## 🚨 Problem Statement
Current accessibility testing tools rely heavily on static rule-based scanning (like axe-core), which often misses up to 70% of real-world accessibility barriers. They fail to simulate actual user journeys, cannot assess the *quality* of accessibility implementations (e.g., meaningful alt text vs. generic alt text), and lack the cognitive understanding necessary to evaluate complex UI components and user flows.

## 💡 Solution Overview
AccessiSense is a production-grade, AI-driven accessibility audit platform designed to evaluate websites, authenticated portals, and PDF documents. It moves beyond standard automated scanning by employing a **Test-Driven Execution Model** that actively interacts with the DOM using browser automation to simulate human-like auditing. Coupled with an AI Intelligence Layer, it performs contextual and cognitive accessibility evaluations, mapping all findings strictly to WCAG 2.2 standards.

## ✨ Key Features
* **Deep Website Crawling:** Configurable multi-page crawling with support for pagination, lazy-loading, and intelligent link discovery.
* **Authenticated Portal Support:** Built-in capabilities to navigate through login flows and audit internal application states.
* **Test-Driven Execution Engine:** Executes structured accessibility scenarios (Keyboard Navigation, Focus Visibility, Error Handling) actively via the browser.
* **AI-Powered Contextual Analysis:** Leverages LLMs to evaluate visual hierarchy, cognitive load, and the semantic quality of accessible names.
* **WCAG 2.2 Compliance Mapping:** Every issue is strictly mapped to actionable WCAG Criteria (A, AA, AAA).
* **Comprehensive Report Export:** Generates prioritized remediation plans, exporting to JSON, Word (DOCX), PDF, and PowerPoint formats.

## ⚙️ How It Works (High-Level)
1. **Input:** User provides a target URL, crawl depth, and authentication credentials (if applicable).
2. **Crawl:** The engine systematically discovers and queues pages for testing.
3. **Test:** The execution engine runs 10+ simulated browser tests (tabbing, focusing, clicking) on each page.
4. **AI Analysis:** The LLM cross-references the DOM snapshot and automated findings to detect complex UX issues.
5. **Report:** Results are scored, deduplicated, and presented in a live dashboard with actionable remediation plans.

## 🛠 Technologies Used
* **Frontend/Backend:** Next.js (React), TypeScript
* **Browser Automation:** Playwright
* **Accessibility Scanning:** axe-core
* **AI Integration:** LLMs (OpenAI / Claude)
* **Export Generation:** docx, pdf-lib, pptxgenjs

## 🌍 Impact
By combining automated scanning with AI-driven contextual evaluation and simulated human interactions, AccessiSense bridges the gap between mechanical compliance and true user-centric accessibility, enabling organizations to build highly inclusive digital experiences.
