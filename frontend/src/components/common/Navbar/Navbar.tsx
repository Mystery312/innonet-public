import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import Button from '../Button';
import { ThemeToggle } from '../ThemeToggle';
import { NotificationBell } from '../../../features/messaging/components/NotificationBell';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.container}`}>
        <Link to="/" className={styles.logo}>
          <img
            src={isDark ? '/logo.svg' : '/logo-dark.svg'}
            alt="Innonet"
            className={styles.logoImage}
          />
        </Link>

        <div className={styles.links}>
          {isAuthenticated ? (
            <>
              <Link to="/discover" className={styles.link}>
                Discover
              </Link>
              <Link to="/communities" className={styles.link}>
                Communities
              </Link>
              <Link to="/challenges" className={styles.link}>
                Challenges
              </Link>
              <Link to="/companies" className={styles.link}>
                Companies
              </Link>
              <Link to="/events" className={styles.link}>
                Events
              </Link>
              <Link to="/network" className={styles.link}>
                Network
              </Link>
              <Link to="/roadmap" className={styles.link}>
                Roadmap
              </Link>
              <Link to="/messages" className={styles.link}>
                Messages
              </Link>
              <NotificationBell />
              <ThemeToggle />
              <div className={styles.userMenu}>
                <Link to="/profile" className={styles.profileLink}>
                  {user?.username}
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.link}>
                Log in
              </Link>
              <ThemeToggle />
              <Button size="sm" onClick={() => navigate('/signup')}>
                Create your account
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
