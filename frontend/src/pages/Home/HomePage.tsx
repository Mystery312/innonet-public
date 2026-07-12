import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../lib/api';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';

/* ================================================================
   HOMEPAGE — Marketing landing page
   All sections in one file (no separate section components).
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

// ─── Live Graph: Interactive SVG ─────────────────────────────────
const LiveGraph: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const [hovered, setHovered] = useState<string | null>(null);
  const { isDark } = useTheme();

  const nodes = [
    { id: 'mei', x: 50, y: 50, r: 22, label: 'Mei Chen', sub: 'Builder · Shanghai · 92% match', kind: 'builder', primary: true },
    { id: 'alex', x: 28, y: 32, r: 16, label: 'Alex Rivera', sub: 'Founder · arc', kind: 'builder' },
    { id: 'rai', x: 72, y: 30, r: 14, label: 'Rai Patel', sub: 'Engineer · SAS', kind: 'builder' },
    { id: 'noor', x: 78, y: 70, r: 13, label: 'Noor Ahmed', sub: 'Designer · Pudong', kind: 'builder' },
    { id: 'jun', x: 22, y: 72, r: 12, label: 'Jun Li', sub: 'Builder · Hangzhou', kind: 'builder' },
    { id: 'kit', x: 14, y: 50, r: 10, label: 'Kit Tanaka', sub: 'Hardware · Tokyo', kind: 'builder' },
    { id: 'hack-sh', x: 40, y: 12, r: 14, label: 'Hack Shanghai 2026', sub: 'Event · Mar 14–16', kind: 'event' },
    { id: 'beyond', x: 86, y: 50, r: 11, label: 'Beyond the Bottle', sub: 'Project · 12 builders', kind: 'project' },
    { id: 'tutor', x: 50, y: 86, r: 12, label: 'AI Tutor v0.2', sub: 'Project · Mei + 3', kind: 'project' },
    { id: 'graph-c', x: 60, y: 18, r: 10, label: 'Graph builders', sub: 'Community · 248', kind: 'community' },
  ];
  const edges: [string, string][] = [
    ['mei','alex'], ['mei','rai'], ['mei','noor'], ['mei','jun'], ['mei','kit'],
    ['mei','hack-sh'], ['mei','tutor'], ['mei','graph-c'],
    ['alex','hack-sh'], ['alex','beyond'], ['rai','beyond'], ['rai','graph-c'],
    ['noor','beyond'], ['jun','tutor'], ['kit','beyond'], ['noor','hack-sh'],
    ['jun','hack-sh'],
  ];

  const colorFor = (kind: string) => ({
    builder: '#3232FF', event: '#7C3AED', project: '#06B6D4', community: '#F59E0B',
  } as Record<string, string>)[kind] || '#3232FF';

  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const visible = (n: typeof nodes[0]) => filter === 'all' || n.kind === filter || n.id === 'mei';
  const edgeVisible = (a: string, b: string) => visible(byId[a]) && visible(byId[b]);

  const filters = [
    { k: 'all', label: 'All' },
    { k: 'builder', label: 'Builders' },
    { k: 'event', label: 'Events' },
    { k: 'project', label: 'Projects' },
    { k: 'community', label: 'Communities' },
  ];

  return (
    <div
      className="relative rounded-[var(--radius-2xl)] overflow-hidden border border-[var(--color-border)]"
      style={{
        aspectRatio: '16/9',
        maxHeight: 560,
        background: isDark
          ? 'linear-gradient(180deg, var(--ink-900), var(--ink-1000))'
          : 'var(--color-surface)',
      }}
    >
      {/* overlay badge */}
      <div className="absolute top-5 left-5 z-[2]">
        <span
          className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] px-3.5 py-1.5 rounded-full"
          style={{ color: 'var(--color-primary)', background: 'var(--color-primary-soft)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" style={{ animation: 'pulse 2.4s var(--ease-out) infinite' }} />
          Live · 487 nodes
        </span>
      </div>

      {/* filter chips */}
      <div className="absolute top-5 right-5 z-[2] flex gap-2">
        {filters.map(t => (
          <button
            key={t.k}
            onClick={() => setFilter(t.k)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer"
            style={{
              background: filter === t.k ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-bg) 60%, transparent)',
              color: filter === t.k ? '#fff' : 'var(--color-fg-secondary)',
              borderColor: filter === t.k ? 'var(--color-primary)' : 'var(--color-border)',
              backdropFilter: 'blur(8px)',
              transition: `all var(--duration-fast) var(--ease-out)`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SVG graph */}
      <svg viewBox="0 0 100 100" className="w-full h-full block" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="lgHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3232FF" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#3232FF" stopOpacity={0} />
          </radialGradient>
        </defs>
        {edges.map(([a, b], i) => {
          if (!edgeVisible(a, b)) return null;
          const na = byId[a], nb = byId[b];
          const isPrimary = a === 'mei' || b === 'mei';
          const isHov = hovered && (hovered === a || hovered === b);
          return (
            <line
              key={i}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke="#3232FF"
              strokeOpacity={isHov ? 0.8 : isPrimary ? 0.45 : 0.18}
              strokeWidth={isHov ? 0.4 : isPrimary ? 0.25 : 0.15}
              className={i % 4 === 0 ? 'edge-trace' : ''}
            />
          );
        })}
        {nodes.map(n => {
          if (!visible(n)) return null;
          const isHov = hovered === n.id;
          return (
            <g
              key={n.id}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              {n.primary && <circle cx={n.x} cy={n.y} r={n.r / 3 + 4} fill="url(#lgHalo)" />}
              <circle
                cx={n.x} cy={n.y}
                r={n.r / 8 + (isHov ? 0.5 : 0)}
                fill={colorFor(n.kind)}
                stroke={n.primary ? '#fff' : 'none'}
                strokeWidth={n.primary ? 0.5 : 0}
                className={n.primary ? '' : 'node-pulse'}
                style={{ transition: 'r 0.2s' }}
              />
              {n.primary && <circle cx={n.x} cy={n.y} r={n.r / 22} fill="#fff" />}
            </g>
          );
        })}
      </svg>

      {/* tooltip */}
      {hovered && byId[hovered] && (
        <div
          className="absolute pointer-events-none whitespace-nowrap z-[3] px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[13px] font-medium"
          style={{
            left: `${byId[hovered].x}%`,
            top: `${byId[hovered].y}%`,
            transform: 'translate(-50%, -120%)',
            background: 'var(--color-surface-raised)',
            color: 'var(--color-fg)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div>{byId[hovered].label}</div>
          <div className="text-[11px] font-normal" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-fg-muted)' }}>
            {byId[hovered].sub}
          </div>
        </div>
      )}

      {/* legend */}
      <div
        className="absolute bottom-5 left-5 z-[2] flex gap-4.5 px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs font-medium"
        style={{
          background: 'color-mix(in srgb, var(--color-bg) 60%, transparent)',
          backdropFilter: 'blur(8px)',
          color: 'var(--color-fg-secondary)',
        }}
      >
        {[
          { c: '#3232FF', l: 'Builder' },
          { c: '#7C3AED', l: 'Event' },
          { c: '#06B6D4', l: 'Project' },
          { c: '#F59E0B', l: 'Community' },
        ].map(({ c, l }) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── Project Thumbnail SVGs ──────────────────────────────────────
const ProjectThumb: React.FC<{ variant: string }> = ({ variant }) => {
  if (variant === 'a') return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
      <defs>
        <linearGradient id="pa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3232FF" /><stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#pa)" />
      <g opacity="0.5" stroke="#fff" strokeWidth="0.5" fill="none">
        {Array.from({ length: 12 }).map((_, i) => <circle key={i} cx="160" cy="100" r={i * 16} />)}
      </g>
      <circle cx="160" cy="100" r="14" fill="#fff" />
    </svg>
  );
  if (variant === 'b') return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
      <rect width="320" height="200" fill="#0A0A0F" />
      <g stroke="#3232FF" strokeWidth="1" fill="none">
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i} d={`M0 ${40 + i * 20} Q 160 ${20 + i * 15} 320 ${60 + i * 18}`} opacity={0.2 + i * 0.08} />
        ))}
      </g>
    </svg>
  );
  if (variant === 'c') return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
      <rect width="320" height="200" fill="#1A1A1F" />
      <g fill="#3232FF">
        <rect x="40" y="40" width="60" height="60" />
        <rect x="120" y="80" width="40" height="40" opacity="0.6" />
        <rect x="180" y="40" width="80" height="120" opacity="0.4" />
        <rect x="60" y="130" width="40" height="40" opacity="0.3" />
      </g>
    </svg>
  );
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
      <defs>
        <radialGradient id="pd"><stop offset="0%" stopColor="#06B6D4" /><stop offset="100%" stopColor="#3232FF" /></radialGradient>
      </defs>
      <rect width="320" height="200" fill="url(#pd)" />
      <g fill="#fff" opacity="0.6">
        {Array.from({ length: 30 }).map((_, i) => {
          const x = (i * 37) % 320, y = (i * 53) % 200;
          return <circle key={i} cx={x} cy={y} r={(i % 3) + 1} />;
        })}
      </g>
    </svg>
  );
};

// ─── Data ────────────────────────────────────────────────────────
const stats = [
  { num: '487', label: 'Active builders' },
  { num: '38', label: 'Live projects' },
  { num: '12', label: 'Cities connected' },
  { num: '2.4k', label: 'Connections made' },
];

const projects: Array<{
  title: string; desc: string; tags: Array<{ t: string; primary?: boolean }>;
  author: string; initial: string; stars: number; fwd?: number;
  thumb: string; feature?: boolean; grad?: string;
}> = [
  { title: 'AI Tutor v0.2 — graph-based recall', desc: 'Every concept now links to its prerequisites and the projects that exercise it. Built by 4 students across 2 cities, shipped in 6 weeks.', tags: [{ t: 'Featured', primary: true }, { t: 'AI/ML' }, { t: 'Education' }], author: 'Mei Chen + 3', initial: 'M', stars: 142, fwd: 28, thumb: 'a', feature: true },
  { title: 'Beyond the Bottle', desc: 'Sensor-fitted reusables that auto-track refills.', tags: [{ t: 'Hardware' }, { t: 'IoT' }], author: 'Alex Rivera', initial: 'A', stars: 86, thumb: 'b', grad: 'linear-gradient(135deg,#7C3AED,#3232FF)' },
  { title: 'Citymap Civic Data', desc: 'Open dashboard for neighborhood-scale data.', tags: [{ t: 'Data' }, { t: 'Graphs' }], author: 'Rai Patel', initial: 'R', stars: 64, thumb: 'c', grad: 'linear-gradient(135deg,#06B6D4,#3232FF)' },
  { title: 'Inkframe — sketch sync', desc: 'Browser whiteboard with offline-first sync.', tags: [{ t: 'Design' }, { t: 'Tools' }], author: 'Noor Ahmed', initial: 'N', stars: 51, thumb: 'd', grad: 'linear-gradient(135deg,#7A7AFF,#7C3AED)' },
  { title: 'Foldspace', desc: 'Crowd-validated protein folds for students.', tags: [{ t: 'Bio' }, { t: 'Open' }], author: 'Kit Tanaka', initial: 'K', stars: 39, thumb: 'b', grad: 'linear-gradient(135deg,#06B6D4,#7A7AFF)' },
];

const events = [
  { month: 'Mar', day: '14', title: 'Hack Shanghai 2026', when: '48 hours · Mar 14–16', where: 'WeWork Weihai · Shanghai', mode: 'In-person', count: 240, faces: ['M', 'A', 'R', 'N'] },
  { month: 'Mar', day: '22', title: 'Builder Office Hours', when: 'Sun · 4pm CST', where: 'Online · Discord', mode: 'Online', count: 84, faces: ['J', 'K', 'M'] },
  { month: 'Apr', day: '05', title: 'Hardware Demo Night', when: 'Sat · 6pm CST', where: 'XNode Lab · Pudong', mode: 'In-person', count: 62, faces: ['A', 'K'] },
  { month: 'Apr', day: '19', title: 'AI safety reading group', when: 'Sat · 10am CST', where: 'Online · Zoom', mode: 'Online', count: 48, faces: ['R', 'M', 'N'] },
];

const testimonials = [
  { quote: 'Found my co-founder here. We met at a Hack Shanghai event two weekends after I made my profile.', name: 'Mei Chen', role: 'Builder · Shanghai', initial: 'M' },
  { quote: 'I was the only person at my school working on hardware. Now I have 12 collaborators across three cities.', name: 'Alex Rivera', role: 'Founder · arc', initial: 'A', grad: 'linear-gradient(135deg,#7C3AED,#3232FF)' },
  { quote: 'The graph view actually shows me what to learn next based on what people I admire are building.', name: 'Rai Patel', role: 'Engineer · 17', initial: 'R', grad: 'linear-gradient(135deg,#06B6D4,#3232FF)' },
];

const faqData = [
  { q: 'Who is InnoNet for?', a: 'Builders aged 14–22 working on real projects — students, self-taught hackers, dropouts, hobbyists. We optimize the network for people who ship.' },
  { q: 'How is this different from LinkedIn or Discord?', a: "We're a graph, not a feed. Every connection has structure: skill, project, event. Discovery is intent-driven, not algorithmic." },
  { q: 'Is it free?', a: 'Yes. Always free for individual builders. We may charge organizers running large events for premium tooling later.' },
  { q: 'Where is it available?', a: "Global, with the densest networks currently in Shanghai, Beijing, Singapore, Tokyo, and Bangalore. Build your local pod with a few friends and we'll highlight you." },
  { q: "I'm a parent / educator. Is it safe?", a: 'Profiles are real-name and verified. Public events have a clear organizer and venue. We have a zero-spam policy and active moderators.' },
  { q: 'Can I host an event?', a: 'Yes — anyone can host. You get RSVP tools, a project board, and a guest-list shared with the whole network.' },
];

const faceGrads = [
  'linear-gradient(135deg,#7A7AFF,#3232FF)',
  'linear-gradient(135deg,#7C3AED,#3232FF)',
  'linear-gradient(135deg,#06B6D4,#3232FF)',
  'linear-gradient(135deg,#3232FF,#7C3AED)',
];

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

// ─── Avatar ──────────────────────────────────────────────────────
const Av: React.FC<{ initial: string; grad?: string; size?: number }> = ({ initial, grad, size = 28 }) => (
  <span
    className="inline-flex items-center justify-center rounded-full text-white shrink-0"
    style={{
      width: size,
      height: size,
      background: grad || 'linear-gradient(135deg,#7A7AFF,#3232FF)',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: size * 0.39,
      lineHeight: 1,
    }}
  >
    {initial}
  </span>
);

// ================================================================
//  PAGE COMPONENT
// ================================================================
export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const [faqOpen, setFaqOpen] = useState(0);
  const [ctaEmail, setCtaEmail] = useState('');
  const [ctaLoading, setCtaLoading] = useState(false);
  const [ctaSuccess, setCtaSuccess] = useState(false);
  const [ctaError, setCtaError] = useState('');

  const handleCTA = () => navigate(isAuthenticated ? '/events' : '/signup');

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setCtaError('');
    setCtaLoading(true);
    try {
      await api.post('/waitlist', { email: ctaEmail, source: 'homepage' });
      setCtaSuccess(true);
      setCtaEmail('');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setCtaError(axiosError.response?.data?.detail || 'Failed to join waitlist');
    } finally {
      setCtaLoading(false);
    }
  };

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
              <button
                onClick={() => document.getElementById('graph-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-4.5 py-2.5 rounded-[var(--radius-md)] text-sm font-medium cursor-pointer border border-[var(--color-border)] bg-transparent"
                style={{
                  color: 'var(--color-fg)',
                  transition: 'border-color var(--duration-fast), color var(--duration-fast)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.color = 'var(--color-primary)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.color = 'var(--color-fg)';
                }}
              >
                Watch the demo
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

      {/* ─── STATS STRIP ───────────────────────────────────── */}
      <section className="border-t border-b border-[var(--color-border)]" style={{ background: 'var(--color-bg-secondary)', padding: '48px 0' }}>
        <div className="container grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 48,
                  lineHeight: 1,
                  color: 'var(--color-primary)',
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {s.num}
              </span>
              <span
                className="text-[13px] font-medium uppercase tracking-[0.06em]"
                style={{ color: 'var(--color-fg-secondary)' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── LIVE GRAPH ────────────────────────────────────── */}
      <section id="graph-section" style={{ padding: 'var(--d-section-y) 0' }}>
        <div className="container">
          <div className="flex flex-col gap-3 mb-14 max-w-[720px]">
            <Eyebrow>The network is the product</Eyebrow>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'clamp(32px, 3.5vw, 44px)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                margin: 0,
                color: 'var(--color-fg)',
              }}
            >
              Every builder, project, and event — connected
            </h2>
            <p className="text-[17px] leading-[1.55] max-w-[560px]" style={{ color: 'var(--color-fg-secondary)' }}>
              Hover any node to see what someone is working on. Filter to see only the kinds of connections that matter to you.
            </p>
          </div>
          <LiveGraph />
        </div>
      </section>

      {/* ─── FEATURED PROJECTS ─────────────────────────────── */}
      <section style={{ padding: 'var(--d-section-y) 0' }}>
        <div className="container">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
            <div className="flex flex-col gap-3">
              <Eyebrow>Showcase</Eyebrow>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 3.5vw, 44px)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  color: 'var(--color-fg)',
                }}
              >
                Projects shipped this month
              </h2>
            </div>
            <button
              className="px-4.5 py-2.5 bg-transparent border-0 text-sm font-medium cursor-pointer"
              style={{ color: 'var(--color-fg-secondary)', transition: 'color var(--duration-fast)' }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-fg)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-secondary)'; }}
            >
              Browse all projects →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-5">
            {projects.map((p, i) => (
              <article
                key={i}
                className={`flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] cursor-pointer overflow-hidden ${
                  p.feature ? 'md:row-span-2' : ''
                }`}
                style={{
                  padding: 'var(--space-6)',
                  background: p.feature
                    ? `radial-gradient(ellipse at 100% 0%, var(--color-primary-soft), transparent 60%), var(--color-surface)`
                    : 'var(--color-surface)',
                  borderColor: p.feature ? 'var(--color-primary-tint)' : undefined,
                  minHeight: 280,
                  transition: 'transform var(--duration-base) var(--ease-out), box-shadow var(--duration-base) var(--ease-out), border-color var(--duration-base) var(--ease-out)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'var(--color-primary-tint)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = p.feature ? 'var(--color-primary-tint)' : 'var(--color-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  className="w-full rounded-[var(--radius-lg)] overflow-hidden relative"
                  style={{
                    aspectRatio: p.feature ? '16/9' : '16/10',
                    background: 'var(--color-bg-tertiary)',
                  }}
                >
                  <ProjectThumb variant={p.thumb} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((tag, j) => (
                    <span
                      key={j}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
                      style={{
                        color: tag.primary ? 'var(--color-primary)' : 'var(--color-fg-secondary)',
                        background: tag.primary ? 'var(--color-primary-soft)' : 'var(--color-bg-tertiary)',
                        borderColor: tag.primary ? 'transparent' : 'var(--color-border-subtle)',
                      }}
                    >
                      {tag.t}
                    </span>
                  ))}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: p.feature ? 32 : 22,
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                    margin: 0,
                    color: 'var(--color-fg)',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {p.title}
                </h3>
                <p
                  className="text-sm leading-[1.5]"
                  style={{
                    color: 'var(--color-fg-secondary)',
                    margin: 0,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {p.desc}
                </p>
                <div
                  className="mt-auto flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]"
                  style={{ minWidth: 0 }}
                >
                  <div
                    className="flex items-center gap-2 text-[13px] font-medium"
                    style={{ color: 'var(--color-fg)', minWidth: 0, overflow: 'hidden' }}
                  >
                    <Av initial={p.initial} grad={p.grad} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.author}</span>
                  </div>
                  <div
                    className="flex gap-3 text-xs"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-fg-muted)' }}
                  >
                    <span>★ {p.stars}</span>
                    {p.fwd && <span>↗ {p.fwd}</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EVENTS ────────────────────────────────────────── */}
      <section style={{ padding: 'var(--d-section-y) 0' }}>
        <div className="container">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
            <div className="flex flex-col gap-3">
              <Eyebrow>Coming up</Eyebrow>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 3.5vw, 44px)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  color: 'var(--color-fg)',
                }}
              >
                Hackathons and events
              </h2>
            </div>
            <Link
              to="/events"
              className="text-sm font-medium no-underline"
              style={{ color: 'var(--color-fg-secondary)', transition: 'color var(--duration-fast)' }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-fg)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-secondary)'; }}
            >
              See full calendar →
            </Link>
          </div>
          <div
            className="flex flex-col rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)]"
            style={{ background: 'var(--color-surface)' }}
          >
            {events.map((ev, i) => (
              <div
                key={i}
                className="grid gap-6 items-center px-6 py-6 cursor-pointer"
                style={{
                  gridTemplateColumns: '88px 1fr auto auto',
                  borderBottom: i < events.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  transition: 'background var(--duration-fast) var(--ease-out)',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-bg-tertiary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex flex-col items-center pr-6 border-r border-[var(--color-border-subtle)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: 'var(--color-primary)' }}>
                    {ev.month}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, lineHeight: 1, color: 'var(--color-fg)' }}>
                    {ev.day}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5" style={{ minWidth: 0, overflow: 'hidden' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 18,
                      lineHeight: 1.2,
                      margin: 0,
                      color: 'var(--color-fg)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ev.title}
                  </h3>
                  <div
                    className="flex items-center gap-2 text-[13px]"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-fg-muted)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span className="shrink-0">{ev.when}</span>
                    <span className="shrink-0" aria-hidden>·</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.where}</span>
                    <span className="shrink-0" aria-hidden>·</span>
                    <span className="shrink-0" style={{ color: 'var(--color-primary)' }}>{ev.mode}</span>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <div className="flex">
                    {ev.faces.map((f, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center justify-center rounded-full text-white border-2 border-[var(--color-surface)]"
                        style={{
                          width: 24,
                          height: 24,
                          marginLeft: j === 0 ? 0 : -6,
                          background: faceGrads[j % faceGrads.length],
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: 9,
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--color-fg-secondary)' }}>
                    {ev.count} going
                  </span>
                </div>
                <span
                  className="hidden md:flex items-center gap-1.5 text-[13px] font-medium"
                  style={{ color: 'var(--color-primary)' }}
                >
                  RSVP →
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ──────────────────────────────────── */}
      <section style={{ padding: 'var(--d-section-y) 0' }}>
        <div className="container">
          <div className="flex flex-col gap-3 mb-14 max-w-[720px]">
            <Eyebrow>Builders, in their words</Eyebrow>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'clamp(32px, 3.5vw, 44px)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                margin: 0,
                color: 'var(--color-fg)',
              }}
            >
              The shortest path to your collaborators.
            </h2>
            <p className="text-[17px] leading-[1.55] max-w-[560px]" style={{ color: 'var(--color-fg-secondary)' }}>
              InnoNet is built for young builders who don't want to wait until college to find their people.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <article
                key={i}
                className="relative flex flex-col gap-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] p-7"
                style={{
                  background: 'var(--color-surface)',
                  transition: 'border-color var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary-tint)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span
                  className="absolute top-4 right-5 pointer-events-none opacity-60"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 60,
                    lineHeight: 0.8,
                    color: 'var(--color-primary-tint)',
                  }}
                >
                  "
                </span>
                <p
                  className="relative z-[1]"
                  style={{
                    font: '500 16px/1.55 var(--font-sans)',
                    color: 'var(--color-fg)',
                    margin: 0,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {t.quote}
                </p>
                <div className="mt-auto pt-4 border-t border-[var(--color-border-subtle)] flex items-center gap-3" style={{ minWidth: 0 }}>
                  <Av initial={t.initial} grad={t.grad} size={36} />
                  <div className="flex flex-col gap-0.5" style={{ minWidth: 0, overflow: 'hidden' }}>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: 'var(--color-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {t.name}
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-fg-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.role}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────────────── */}
      <section style={{ padding: 'var(--d-section-y) 0' }}>
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-16 items-start">
            <div>
              <Eyebrow>Questions</Eyebrow>
              <h2
                className="mt-3 mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 36,
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-fg)',
                }}
              >
                Common questions before you sign up.
              </h2>
              <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
                If you don't see your question, write to{' '}
                <a href="mailto:hello@innonet.club" style={{ color: 'var(--color-primary)' }}>hello@innonet.club</a>
                {' '}— we read every email.
              </p>
            </div>
            <div className="flex flex-col border-t border-[var(--color-border)]">
              {faqData.map((f, i) => (
                <div key={i} className="border-b border-[var(--color-border)]">
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}
                    className="flex justify-between items-start w-full bg-transparent border-0 py-5.5 text-left cursor-pointer gap-4"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 17,
                      lineHeight: 1.4,
                      letterSpacing: '-0.005em',
                      color: 'var(--color-fg)',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>{f.q}</span>
                    <svg
                      className="w-5 h-5 shrink-0 mt-0.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      style={{
                        color: faqOpen === i ? 'var(--color-primary)' : 'var(--color-fg-muted)',
                        transform: faqOpen === i ? 'rotate(45deg)' : 'rotate(0deg)',
                        transition: 'transform var(--duration-base) var(--ease-out), color var(--duration-base)',
                      }}
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <div
                    className="overflow-hidden"
                    style={{
                      maxHeight: faqOpen === i ? 200 : 0,
                      transition: 'max-height var(--duration-slow) var(--ease-out)',
                    }}
                  >
                    <div
                      className="pb-5.5"
                      style={{
                        font: '400 15px/1.6 var(--font-sans)',
                        color: 'var(--color-fg-secondary)',
                        maxWidth: 520,
                        wordBreak: 'break-word',
                      }}
                    >
                      {f.a}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ padding: 'var(--d-section-y) 0' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, var(--color-primary-soft), transparent 60%)' }}
        />
        <div className="container relative flex flex-col items-center text-center gap-6">
          <Eyebrow pulse>Joining waitlist · 487 ahead of you</Eyebrow>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(36px, 4vw, 56px)',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              margin: 0,
              maxWidth: 720,
              color: 'var(--color-fg)',
            }}
          >
            Build with people<br />who actually ship.
          </h2>
          <p className="text-lg leading-[1.55] max-w-[560px]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
            Get early access. We're letting in 50 new builders every Friday.
          </p>
          {ctaSuccess ? (
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-success)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              You're on the list! Check your email for confirmation.
            </div>
          ) : (
            <form
              onSubmit={handleWaitlist}
              className="flex gap-2 w-full max-w-[460px] mt-3 p-1.5 rounded-full border border-[var(--color-border)]"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--glow-primary-md)' }}
            >
              <input
                type="email"
                value={ctaEmail}
                onChange={(e) => setCtaEmail(e.target.value)}
                placeholder="you@school.edu"
                required
                className="flex-1 bg-transparent border-0 outline-none px-4.5 py-2.5 text-[15px]"
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-fg)' }}
              />
              <button
                type="submit"
                disabled={ctaLoading}
                className="px-5 py-2.5 rounded-full text-sm font-medium border-0 cursor-pointer"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-fg-on-primary)',
                  opacity: ctaLoading ? 0.7 : 1,
                  transition: 'background var(--duration-fast)',
                }}
              >
                {ctaLoading ? 'Joining...' : 'Get early access'}
              </button>
            </form>
          )}
          {ctaError && (
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{ctaError}</p>
          )}
          <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
            No spam. We'll only email when your invite is ready.
          </span>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
