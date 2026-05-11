import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "KPMG Accessibility Audit — AI-Powered WCAG 2.2 Compliance",
  description: "KPMG's enterprise-grade AI accessibility audit platform. Comprehensive WCAG 2.2 A/AA/AAA analysis for websites, authenticated portals, and PDF documents.",
  keywords: "KPMG, accessibility, WCAG 2.2, audit, a11y, ADA compliance, Section 508, EN 301 549",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/*
          Navbar has a dark navy background (#00338D → #005EB8 gradient)
          → Always use the WHITE logo: /kpmg-logo-dark.svg
          
          When you receive the official KPMG SVG files from brand team, drop them in public/:
            • /kpmg-logo-dark.svg  — official white logo  (for dark/navy backgrounds)
            • /kpmg-logo-light.svg — official color logo  (for white/light backgrounds)
        */}
        <nav className="navbar" aria-label="Main navigation">
          <div className="navbar-inner">
            {/* KPMG Brand — dark navbar → white (dark variant) logo */}
            <a href="/" className="navbar-brand" aria-label="KPMG Accessibility Audit — Home">
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
                  <span className="kpmg-product-title">Accessibility Audit</span>
                </div>
              </div>
            </a>

            {/* Nav links */}
            <div className="navbar-links">
              <a href="/" className="navbar-link">Dashboard</a>
              <a href="/audit" className="navbar-link">New Audit</a>
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
