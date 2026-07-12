import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { ThemeToggle } from '../ThemeToggle';
import { NotificationBell } from '../../../features/messaging/components/NotificationBell';

const linkCls =
  'text-sm font-medium no-underline transition-colors duration-150';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav
      className="sticky top-0 z-[100] border-b border-[var(--color-border)] py-3"
      style={{
        background: isDark
          ? 'rgba(17,17,20,0.8)'
          : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div className="container flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center no-underline">
          <img
            src={isDark ? '/logo.svg' : '/logo-dark.svg'}
            alt="Innonet"
            className="h-9 w-auto"
          />
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-5">
          {isAuthenticated ? (
            <>
              <Link
                to="/discover"
                className={linkCls}
                style={{ color: isActive('/discover') ? 'var(--color-fg)' : 'var(--color-fg-secondary)' }}
              >
                Discover
              </Link>
              <Link
                to="/events"
                className={linkCls}
                style={{ color: isActive('/events') ? 'var(--color-fg)' : 'var(--color-fg-secondary)' }}
              >
                Events
              </Link>
              <Link
                to="/communities"
                className={linkCls}
                style={{ color: isActive('/communities') ? 'var(--color-fg)' : 'var(--color-fg-secondary)' }}
              >
                Communities
              </Link>
              <Link
                to="/challenges"
                className={linkCls}
                style={{ color: isActive('/challenges') ? 'var(--color-fg)' : 'var(--color-fg-secondary)' }}
              >
                Challenges
              </Link>
              <Link
                to="/companies"
                className={linkCls}
                style={{ color: isActive('/companies') ? 'var(--color-fg)' : 'var(--color-fg-secondary)' }}
              >
                Companies
              </Link>
              <Link
                to="/network"
                className={linkCls}
                style={{ color: isActive('/network') ? 'var(--color-fg)' : 'var(--color-fg-secondary)' }}
              >
                Network
              </Link>
              <Link
                to="/messages"
                className={linkCls}
                style={{ color: isActive('/messages') ? 'var(--color-fg)' : 'var(--color-fg-secondary)' }}
              >
                Messages
              </Link>

              <NotificationBell />
              <ThemeToggle />

              <div className="flex items-center gap-3 ml-1">
                <Link
                  to="/profile"
                  className="font-semibold text-sm no-underline px-3 py-1.5 rounded-[var(--radius-md)] max-w-[10rem] truncate"
                  title={user?.username}
                  style={{
                    color: 'var(--color-primary)',
                    background: 'var(--color-primary-soft)',
                    transition: 'background var(--duration-fast)',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-primary) 20%, transparent)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'var(--color-primary-soft)'; }}
                >
                  {user?.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium px-3 py-1.5 rounded-[var(--radius-md)] border-0 cursor-pointer"
                  style={{
                    background: 'transparent',
                    color: 'var(--color-fg-secondary)',
                    transition: 'color var(--duration-fast)',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-fg)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-secondary)'; }}
                >
                  Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/discover"
                className={linkCls}
                style={{ color: 'var(--color-fg-secondary)' }}
                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-fg)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-secondary)'; }}
              >
                Discover
              </Link>
              <Link
                to="/events"
                className={linkCls}
                style={{ color: 'var(--color-fg-secondary)' }}
                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-fg)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-secondary)'; }}
              >
                Events
              </Link>
              <Link
                to="/communities"
                className={linkCls}
                style={{ color: 'var(--color-fg-secondary)' }}
                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--color-fg)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--color-fg-secondary)'; }}
              >
                Communities
              </Link>

              <ThemeToggle />

              {/* Ghost "Log in" button */}
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-medium px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] cursor-pointer"
                style={{
                  background: 'transparent',
                  color: 'var(--color-fg)',
                  transition: 'border-color var(--duration-fast), background var(--duration-fast)',
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-fg-muted)'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              >
                Log in
              </button>

              {/* Primary "Get early access" button */}
              <button
                onClick={() => navigate('/signup')}
                className="text-sm font-medium px-4 py-2 rounded-[var(--radius-md)] border-0 cursor-pointer"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-fg-on-primary)',
                  transition: 'opacity var(--duration-fast)',
                }}
                onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Get early access
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
