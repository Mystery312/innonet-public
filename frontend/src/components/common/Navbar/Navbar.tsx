import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Button from '../Button';
import styles from './Navbar.module.css';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.container}`}>
        <Link to="/" className={styles.logo}>
          Innonet
        </Link>

        <div className={styles.links}>
          {isAuthenticated ? (
            <>
              <Link to="/events" className={styles.link}>
                Events
              </Link>
              <div className={styles.userMenu}>
                <span className={styles.username}>{user?.username}</span>
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
