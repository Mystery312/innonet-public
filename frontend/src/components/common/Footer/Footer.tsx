import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';

export const Footer: React.FC = () => {
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? '/logo.svg' : '/logo-dark.svg';

  return (
    <footer className="border-t border-[var(--color-border)] pt-16 pb-8 bg-[var(--color-bg)]">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Main footer grid - 4 columns on desktop, 2 on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-8 md:gap-12 mb-12">
          {/* Brand section (2fr) */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block mb-4 transition-opacity duration-[var(--duration-fast)] hover:opacity-80">
              <img src={logoSrc} alt="InnoNet" className="h-8" />
            </Link>
            <p className="text-sm text-[var(--color-fg-secondary)] leading-relaxed max-w-xs">
              From ideas to impact, faster. A network built for young builders who actually ship.
            </p>
          </div>

          {/* Column 1: Product */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-[var(--color-fg)] mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/discover"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Discover
                </Link>
              </li>
              <li>
                <Link
                  to="/communities"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Communities
                </Link>
              </li>
              <li>
                <Link
                  to="/events"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  to="/network"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Network graph
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Company */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-[var(--color-fg)] mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/about"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  href="/blog"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="/press"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Press
                </a>
              </li>
              <li>
                <a
                  href="/careers"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-[var(--color-fg)] mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/events/create"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Host an event
                </Link>
              </li>
              <li>
                <a
                  href="/guide"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Builder guide
                </a>
              </li>
              <li>
                <a
                  href="/brand"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Brand kit
                </a>
              </li>
              <li>
                <a
                  href="/status"
                  className="text-sm text-[var(--color-fg-secondary)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  Status
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[var(--color-border-subtle)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-[var(--font-mono)] text-xs text-[var(--color-fg-muted)]">
              2026 InnoNet · Shanghai · Built by builders
            </p>
            <div className="flex items-center gap-6">
              <Link
                to="/privacy"
                className="font-[var(--font-mono)] text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="font-[var(--font-mono)] text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
              >
                Terms
              </Link>
              <Link
                to="/code-of-conduct"
                className="font-[var(--font-mono)] text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
              >
                Code of conduct
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
