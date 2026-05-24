'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ThemeNavbar() {
  const [isDark, setIsDark] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('trustlens-theme');
    const prefersDark = saved ? saved === 'dark' : true;
    setIsDark(prefersDark);
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    const themeVal = next ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeVal);
    localStorage.setItem('trustlens-theme', themeVal);
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar-inner">
        <a href="/" className="navbar-brand" aria-label="KPMG TrustLens — Home">
          <div className="kpmg-logo-wrap">
            <Image
              src="/kpmg-logo-dark.svg"
              alt="KPMG"
              width={100}
              height={30}
              style={{ width: 90, height: 'auto' }}
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
            <span className="pillar-dot" title="Accessibility" aria-hidden="true">♿</span>
            <span className="pillar-dot" title="Dark Patterns" aria-hidden="true">🕵️</span>
            <span className="pillar-dot" title="Performance" aria-hidden="true">⚡</span>
            <span className="pillar-dot" title="Privacy" aria-hidden="true">🔒</span>
          </div>

          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            id="theme-toggle-btn"
          >
            <span className="theme-toggle-icon">{isDark ? '☀️' : '🌙'}</span>
            <div className={`theme-toggle-track ${!isDark ? 'light-active' : ''}`}>
              <div className={`theme-toggle-thumb ${!isDark ? 'light-active' : ''}`} />
            </div>
          </button>

          <div className="kpmg-ai-badge" aria-label="AI-powered tool">
            <span className="kpmg-ai-dot" aria-hidden="true" />
            AI Active
          </div>
        </div>
      </div>
    </nav>
  );
}
