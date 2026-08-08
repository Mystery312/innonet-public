import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';

/* ================================================================
   HOMEPAGE — Marketing landing page
   Tailwind + design system CSS vars. No CSS Modules.
   ================================================================ */

// ─── Hero Visual: Constellation SVG ─────────────────────────────
const HeroVisualConstellation: React.FC = () => {
  const nodes = [
    { x: 270, y: 270, r: 18, c: '#3232FF', primary: true },
    { x: 130, y: 180, r: 10, c: '#7A7AFF' },
    { x: 410, y: 160, r: 12, c: '#7C3AED' },
    { x: 420, y: 360, r: 9, c: '#06B6D4' },
    { x: 150, y: 400, r: 11, c: '#3232FF' },
    { x: 80, y: 290, r: 7, c: '#7A7AFF' },
    { x: 460, y: 260, r: 7, c: '#3232FF' },
    { x: 270, y: 100, r: 8, c: '#7C3AED' },
    { x: 280, y: 460, r: 7, c: '#3232FF' },
    { x: 200, y: 80, r: 5, c: '#7A7AFF' },
    { x: 480, y: 440, r: 5, c: '#06B6D4' },
    { x: 60, y: 130, r: 4, c: '#7A7AFF' },
    { x: 60, y: 460, r: 4, c: '#7C3AED' },
  ];
  const edges: [number, number][] = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],
    [1,5],[1,7],[2,6],[2,7],[3,6],[3,10],[4,5],[4,8],
    [7,9],[1,11],[4,12],
  ];
  return (
    <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full">
      <defs>
        <radialGradient id="cstHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3232FF" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#3232FF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={270} cy={270} r={60} fill="url(#cstHalo)" />
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke="#3232FF"
          strokeOpacity={a === 0 ? 0.45 : 0.18}
          strokeWidth={a === 0 ? 1.5 : 1}
          className={i % 3 === 0 ? 'edge-trace' : ''}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i} className={i < 4 ? `float-${'abc'[i % 3]}` : ''}>
          {n.primary && <circle cx={n.x} cy={n.y} r={n.r + 14} fill="#3232FF" opacity={0.15} />}
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} className="node-pulse" />
          {n.primary && <circle cx={n.x} cy={n.y} r={n.r * 0.4} fill="#fff" />}
        </g>
      ))}
    </svg>
  );
};

// ─── Eyebrow Pill ────────────────────────────────────────────────
const Eyebrow: React.FC<{ children: React.ReactNode; pulse?: boolean }> = ({ children, pulse }) => (
  <span
    className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] px-3.5 py-1.5 rounded-full self-start"
    style={{
      color: 'var(--color-primary)',
      background: 'var(--color-primary-soft)',
      maxWidth: '100%',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }}
  >
    {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" style={{ animation: 'pulse 2.4s var(--ease-out) infinite' }} />}
    {children}
  </span>
);

// ================================================================
//  PAGE COMPONENT
// ================================================================
export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const handleCTA = () => navigate(isAuthenticated ? '/events' : '/signup');

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Navbar />

      {/* ─── HERO ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ padding: 'var(--d-section-y) 0' }}>
        {/* gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 30% 20%, var(--color-primary-soft), transparent 70%),
                          radial-gradient(ellipse 50% 40% at 80% 80%, rgba(124,58,237,0.10), transparent 70%)`,
          }}
        />
        <div className="container relative z-[1] grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-16 items-center">
          {/* copy */}
          <div className="max-w-[560px]">
            <Eyebrow pulse>now in private beta · seoul, sf, shanghai</Eyebrow>
            <h1
              className="mt-6 mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(40px, 5vw, 72px)',
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
                color: 'var(--color-fg)',
              }}
            >
              From ideas<br />
              to impact,{' '}
              <span
                style={{
                  background: 'linear-gradient(120deg, var(--blue-500), var(--blue-300))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                faster.
              </span>
            </h1>
            <p
              className="mb-9 max-w-[520px]"
              style={{
                font: '400 19px/1.55 var(--font-sans)',
                color: 'var(--color-fg-secondary)',
              }}
            >
              InnoNet is a network for young builders. Find collaborators, hackathons, and projects in one graph — built for people who actually ship.
            </p>
            <div className="flex gap-3.5 items-center flex-wrap">
              <button
                onClick={handleCTA}
                className="px-6 py-3.5 rounded-[var(--radius-lg)] text-base font-semibold cursor-pointer border-0"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-fg-on-primary)',
                  transition: 'background var(--duration-fast) var(--ease-out), box-shadow var(--duration-base) var(--ease-out)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary-hover)';
                  e.currentTarget.style.boxShadow = 'var(--glow-primary-md)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--color-primary)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {isAuthenticated ? 'Browse events' : 'Get early access'}
              </button>
            </div>
            {/* trust strip */}
            <div className="flex items-center gap-3.5 mt-8 text-[13px]" style={{ color: 'var(--color-fg-muted)' }}>
              <div className="flex">
                {[
                  { l: 'M', g: 'linear-gradient(135deg,#7A7AFF,#3232FF)' },
                  { l: 'A', g: 'linear-gradient(135deg,#7C3AED,#3232FF)' },
                  { l: 'R', g: 'linear-gradient(135deg,#06B6D4,#3232FF)' },
                  { l: 'N', g: 'linear-gradient(135deg,#3232FF,#7C3AED)' },
                ].map(({ l, g }, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center justify-center rounded-full text-white shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      background: g,
                      border: '2px solid var(--color-bg)',
                      marginLeft: i === 0 ? 0 : -8,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {l}
                  </span>
                ))}
              </div>
              487 builders shipping right now
            </div>
          </div>

          {/* visual stage */}
          <div className="relative aspect-square max-w-[480px] lg:max-w-[540px] mx-auto lg:ml-auto w-full">
            <div
              className="absolute inset-0 rounded-[var(--radius-2xl)] overflow-hidden border border-[var(--color-border)]"
              style={{
                background: isDark
                  ? `radial-gradient(ellipse at 50% 50%, rgba(50,50,255,0.08), transparent 70%),
                     radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.10), transparent 60%),
                     var(--ink-1000)`
                  : `radial-gradient(ellipse at 50% 50%, rgba(50,50,255,0.06), transparent 70%),
                     radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.05), transparent 60%),
                     var(--gray-50)`,
              }}
            >
              <HeroVisualConstellation />
              <div
                className="absolute bottom-4 left-4 z-[2] flex items-center gap-1.5"
                style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--color-fg-muted)', letterSpacing: '0.04em' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)', animation: 'blink 1.5s steps(1) infinite' }} />
                13 nodes · 19 edges
              </div>
              <div
                className="absolute bottom-4 right-4 z-[2]"
                style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--color-fg-muted)' }}
              >
                constellation
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
