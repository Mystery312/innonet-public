import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import styles from './HeroSection.module.css';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate('/events');
    } else {
      navigate('/signup');
    }
  };

  return (
    <section className={styles.hero}>
      <div className={`container ${styles.container}`}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            From ideas to impact, faster
          </h1>
          <p className={styles.subtitle}>
            With Innonet, discover nearby projects, hackathons, and builders (like you)—so
            collaboration happens faster and smarter for your ideas to happen today.
          </p>
          <div className={styles.cta}>
            <Button size="lg" onClick={handleCTA}>
              {isAuthenticated ? 'Browse Events' : 'Create your account'}
            </Button>
          </div>
        </div>
        <div className={styles.visual}>
          <div className={styles.visualCard}>
            <div className={styles.visualIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className={styles.visualLabel}>Connect with builders</span>
          </div>
          <div className={styles.visualCard}>
            <div className={styles.visualIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <span className={styles.visualLabel}>Discover events</span>
          </div>
          <div className={styles.visualCard}>
            <div className={styles.visualIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <span className={styles.visualLabel}>Launch projects</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
