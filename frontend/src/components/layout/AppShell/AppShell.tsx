import React from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { ThemeToggle } from '../../common/ThemeToggle';
import { NotificationBell } from '../../../features/messaging/components/NotificationBell';
import styles from './AppShell.module.css';

// ───────── Sidebar icons ─────────
const Icon = {
  discover: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  events: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  ),
  community: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="3" /><path d="M3 19v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
      <circle cx="17" cy="7" r="2.5" /><path d="M15 19v-1a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v1" />
    </svg>
  ),
  challenges: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M17 4h3v2a3 3 0 0 1-3 3M7 4H4v2a3 3 0 0 0 3 3" />
    </svg>
  ),
  companies: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 21V9h6v12M3 9h18M9 5h0M15 5h0M9 13h0M15 13h0" />
    </svg>
  ),
  network: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" />
      <path d="M12 7.5v4M9.5 17.5L11 13M14.5 17.5L13 13" />
    </svg>
  ),
  roadmap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" /><circle cx="6" cy="18" r="1.6" />
      <path d="M8.2 6h7.6M7.5 8 11 16M16.5 8 13 16M8 18h2.5" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-12.7 6.4L3 20l1.5-4.5A8 8 0 1 1 21 12z" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  ),
};

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const workspaceLinks: NavItem[] = [
  { to: '/discover',    label: 'Discover',    icon: Icon.discover },
  { to: '/events',      label: 'Events',      icon: Icon.events },
  { to: '/communities', label: 'Communities', icon: Icon.community },
  { to: '/challenges',  label: 'Challenges',  icon: Icon.challenges },
  { to: '/companies',   label: 'Companies',   icon: Icon.companies },
  { to: '/network',     label: 'Network',     icon: Icon.network },
  { to: '/roadmap',     label: 'Roadmap',     icon: Icon.roadmap },
  { to: '/messages',    label: 'Messages',    icon: Icon.messages },
];

const accountLinks: NavItem[] = [
  { to: '/notifications', label: 'Notifications', icon: Icon.bell },
  { to: '/profile',       label: 'Profile',       icon: Icon.profile },
];

// Subset of workspaceLinks surfaced as the mobile bottom-nav. Five fits the
// thumb-reach zone comfortably on a phone — everything else stays accessible
// from the Profile screen and search.
const bottomNavKeys = ['/discover', '/events', '/messages', '/roadmap', '/profile'];
const bottomNavLinks: NavItem[] = bottomNavKeys
  .map((k) => [...workspaceLinks, ...accountLinks].find((l) => l.to === k))
  .filter((l): l is NavItem => Boolean(l));

// ───────── Page title from current route ─────────
// Optional helper — pages can also render their own h1 in the body if preferred.
const ROUTE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/discover':      { title: 'Discover',      subtitle: 'Swipe through people, events, and challenges' },
  '/events':        { title: 'Events',        subtitle: 'Hackathons, meetups, and workshops' },
  '/communities':   { title: 'Communities',   subtitle: 'Spaces around shared interests' },
  '/challenges':    { title: 'Challenges',    subtitle: 'Live problems to solve together' },
  '/companies':     { title: 'Companies',     subtitle: 'Teams hiring and building on Innonet' },
  '/network':       { title: 'Network',       subtitle: 'People and connections in your orbit' },
  '/roadmap':       { title: 'Roadmap',       subtitle: 'Your knowledge graph and growth paths' },
  '/messages':      { title: 'Messages' },
  '/notifications': { title: 'Notifications' },
  '/profile':       { title: 'Profile' },
  '/connections':   { title: 'Connections',   subtitle: 'People you\u2019re connected with' },
};

const PageHeading: React.FC = () => {
  const { pathname } = useLocation();
  // Match the longest prefix so /events/123 still shows "Events".
  const key = Object.keys(ROUTE_TITLES)
    .filter((k) => pathname === k || pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0];
  const meta = key ? ROUTE_TITLES[key] : null;
  if (!meta) return <div className={styles.topTitle} />;
  return (
    <div className={styles.topTitle}>
      <h1>{meta.title}</h1>
      {meta.subtitle && <p>{meta.subtitle}</p>}
    </div>
  );
};

// ───────── Topbar search ─────────
const TopSearch: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [q, setQ] = React.useState(() => {
    if (location.pathname === '/search') {
      return new URLSearchParams(location.search).get('q') || '';
    }
    return '';
  });

  // ⌘K / Ctrl-K focuses the search input from anywhere.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <form className={styles.topSearch} role="search" onSubmit={onSubmit}>
      <svg className={styles.topSearchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        className={styles.topSearchInput}
        placeholder="Search people, events, communities…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search"
      />
      <kbd className={styles.topSearchKbd} aria-hidden>⌘K</kbd>
    </form>
  );
};

// ───────── AppShell ─────────
export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const displayName =
    (user as { full_name?: string; username?: string } | null)?.full_name ||
    user?.username ||
    'You';
  const initial = displayName.charAt(0).toUpperCase();

  const renderLink = (l: NavItem) => (
    <NavLink
      key={l.to}
      to={l.to}
      className={({ isActive }) =>
        `${styles.sideLink} ${isActive ? styles.isActive : ''}`
      }
      title={l.label}
    >
      {l.icon}
      <span>{l.label}</span>
    </NavLink>
  );

  return (
    <div className={styles.app}>
      <aside className={styles.side}>
        <Link to="/" className={styles.sideLogo} aria-label="Innonet — home">
          {/* Same logic as Navbar: light logo on dark bg, dark logo on light bg. */}
          <img src={isDark ? '/logo.svg' : '/logo-dark.svg'} alt="Innonet" />
        </Link>

        <div className={styles.sideLabel}>Workspace</div>
        {workspaceLinks.map(renderLink)}

        <div className={styles.sideLabel}>Account</div>
        {accountLinks.map(renderLink)}

        <Link to="/profile" className={styles.sideFoot}>
          <div className={styles.av}>{initial}</div>
          <div className={styles.who}>
            <span className={styles.nm}>{displayName}</span>
            {user?.username && (
              <span className={styles.sub}>@{user.username}</span>
            )}
          </div>
        </Link>
      </aside>

      <div className={styles.main}>
        <header className={styles.top}>
          <div className={styles.topInner}>
            <PageHeading />
            <TopSearch />
            <div className={styles.topActions}>
              <NotificationBell />
              <ThemeToggle />
              <button className={styles.btnGhost} onClick={handleLogout}>
                Log out
              </button>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          <Outlet />
        </div>
      </div>

      {/* Mobile bottom nav — only visible at narrow widths. */}
      <nav className={styles.bottomNav} aria-label="Primary">
        {bottomNavLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `${styles.bottomNavLink} ${isActive ? styles.isActive : ''}`
            }
            title={l.label}
          >
            {l.icon}
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppShell;
