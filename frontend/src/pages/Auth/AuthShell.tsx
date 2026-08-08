import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import HeroVisual from './HeroVisual';

interface AuthShellProps {
  children: React.ReactNode;
  title?: string;
  lead?: string;
}

/**
 * Split-screen auth layout.
 * Left: animated constellation visual + brand copy + testimonial quote.
 * Right: scrollable form panel (children).
 * Responsive: hides left panel below 1024px.
 */
const AuthShell: React.FC<AuthShellProps> = ({
  children,
  title = 'Where builders find their people.',
  lead = 'InnoNet connects young builders with collaborators, hackathons, and real projects — so you can ship faster.',
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className="min-h-screen grid grid-cols-1 lg:grid-cols-2"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* ─── LEFT: Visual Stage ────────────────────────── */}
      <div
        className="relative overflow-hidden hidden lg:flex flex-col justify-between p-10"
        style={{
          borderRight: '1px solid var(--color-border)',
          background: isDark
            ? `radial-gradient(ellipse at 30% 30%, var(--color-primary-soft), transparent 60%),
               radial-gradient(ellipse at 70% 70%, rgba(124,58,237,0.18), transparent 60%),
               var(--ink-1000)`
            : `radial-gradient(ellipse at 30% 30%, var(--color-primary-soft), transparent 60%),
               radial-gradient(ellipse at 70% 70%, rgba(124,58,237,0.12), transparent 60%),
               var(--color-bg)`,
        }}
      >
        {/* constellation SVG background */}
        <HeroVisual />

        {/* top content */}
        <div className="relative z-[1] flex flex-col gap-6 max-w-[480px]">
          <Link to="/" className="inline-block">
            <img
              src={isDark ? '/logo.svg' : '/logo-dark.svg'}
              alt="InnoNet"
              className="h-8"
            />
          </Link>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 56,
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              margin: 0,
              color: 'var(--color-fg)',
            }}
          >
            {title.split(' ').map((word, i) =>
              word.toLowerCase() === 'people.' || word.toLowerCase() === 'impact' ? (
                <span key={i} style={{ color: 'var(--color-primary)' }}>{word} </span>
              ) : (
                <React.Fragment key={i}>{word} </React.Fragment>
              )
            )}
          </h1>
          <p
            style={{
              font: '400 17px/1.55 var(--font-sans)',
              color: 'var(--color-fg-secondary)',
              margin: 0,
              maxWidth: 420,
            }}
          >
            {lead}
          </p>
        </div>
      </div>

      {/* ─── RIGHT: Form Panel ─────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center px-6 py-10">
        {/* back to home */}
        <Link
          to="/"
          className="absolute top-8 left-8 inline-flex items-center gap-1.5 text-[13px] font-medium no-underline"
          style={{ color: 'var(--color-fg-secondary)', transition: 'color var(--duration-fast)' }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-fg)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-secondary)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Home
        </Link>

        {/* theme toggle */}
        <div className="absolute top-6 right-8">
          <ThemeToggle />
        </div>

        {/* form content slot */}
        <div className="w-full max-w-[420px] flex flex-col gap-7">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
