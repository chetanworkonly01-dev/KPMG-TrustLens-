import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "KPMG TrustLens — AI-Powered Digital Compliance & Experience Intelligence",
  description: "KPMG TrustLens: Unified digital trust platform. AI-powered accessibility, dark pattern detection, performance, and privacy compliance auditing for enterprise products.",
  keywords: "KPMG, TrustLens, accessibility, dark patterns, WCAG 2.2, GDPR, privacy, performance, digital compliance, ethical UX",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar" aria-label="Main navigation">
          <div className="navbar-inner">
            <a href="/" className="navbar-brand" aria-label="KPMG TrustLens — Home">
              <div className="kpmg-logo-wrap">
                <Image
                  src="/kpmg-logo-dark.svg"
                  alt="KPMG"
                  width={100}
                  height={30}
                  style={{ width: 100, height: 'auto' }}
                  className="kpmg-logo-svg"
                  priority
                />
                <div className="kpmg-divider" aria-hidden="true" />
                <div className="kpmg-product-name">
                  <span className="kpmg-product-label">AI-Powered</span>
                  <span className="kpmg-product-title">TrustLens</span>
                </div>
              </div>
            </a>

            <div className="navbar-links">
              <a href="/" className="navbar-link">Dashboard</a>
              <a href="/audit" className="navbar-link">New Audit</a>
              <div className="trustlens-pillars-badge" aria-label="Active audit pillars">
                <span className="pillar-dot pillar-a11y" title="Accessibility" aria-hidden="true">♿</span>
                <span className="pillar-dot pillar-dp" title="Dark Patterns" aria-hidden="true">🕵️</span>
                <span className="pillar-dot pillar-perf" title="Performance" aria-hidden="true">⚡</span>
                <span className="pillar-dot pillar-priv" title="Privacy" aria-hidden="true">🔒</span>
              </div>
              <div className="kpmg-ai-badge" aria-label="AI-powered tool">
                <span className="kpmg-ai-dot" aria-hidden="true" />
                AI Active
              </div>
            </div>
          </div>
        </nav>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
