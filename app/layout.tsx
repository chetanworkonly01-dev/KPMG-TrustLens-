import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AccessiAudit — AI-Powered Accessibility Auditing",
  description: "Comprehensive WCAG 2.2 accessibility audit solution for websites, web portals, and PDF documents. Powered by AI analysis.",
  keywords: "accessibility, WCAG 2.2, audit, a11y, ADA compliance, Section 508",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <div className="navbar-inner">
            <a href="/" className="navbar-brand">
              <div className="navbar-brand-icon">♿</div>
              <span className="navbar-brand-text">AccessiAudit</span>
            </a>
            <div className="navbar-links">
              <a href="/" className="navbar-link">Dashboard</a>
              <a href="/audit" className="navbar-link">New Audit</a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
