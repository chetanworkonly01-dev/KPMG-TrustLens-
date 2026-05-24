import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";
import ThemeNavbar from "@/components/ThemeNavbar";

export const metadata: Metadata = {
  title: "KPMG TrustLens — AI-Powered Digital Compliance & Experience Intelligence",
  description: "KPMG TrustLens: Unified digital trust platform. AI-powered accessibility, dark pattern detection, performance, and privacy compliance auditing for enterprise products.",
  keywords: "KPMG, TrustLens, accessibility, dark patterns, WCAG 2.2, GDPR, privacy, performance, digital compliance, ethical UX",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeNavbar />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
