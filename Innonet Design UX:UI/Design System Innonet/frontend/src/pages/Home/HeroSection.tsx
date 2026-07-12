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
          <span className={styles.badge}>AI-Powered Networking</span>
          <h1 className={styles.title}>
            From ideas to impact, faster
          </h1>
          <p className={styles.subtitle}>
            Discover nearby builders, hackathons, and projects — so collaboration happens faster and smarter.
          </p>
          <div className={styles.cta}>
            <Button size="lg" onClick={handleCTA} className={styles.ctaButton}>
              {isAuthenticated ? 'Browse Events' : 'Get started free'}
            </Button>
            <a href="#features" className={styles.ctaLink}>
              Learn more
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </div>
        <div className={styles.visual}>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <div className={styles.previewAvatar} />
              <div className={styles.previewMeta}>
                <div className={styles.previewName} />
                <div className={styles.previewRole} />
              </div>
              <div className={styles.previewBadge}>92% match</div>
            </div>
            <div className={styles.previewTags}>
              <span className={styles.previewTag}>React</span>
              <span className={styles.previewTag}>AI/ML</span>
              <span className={styles.previewTag}>Design</span>
            </div>
            <div className={styles.previewGraph}>
              <svg viewBox="0 0 200 80" className={styles.graphSvg}>
                <circle cx="40" cy="40" r="6" fill="var(--color-primary)" opacity="0.6" />
                <circle cx="100" cy="25" r="8" fill="var(--color-primary)" opacity="0.8" />
                <circle cx="160" cy="45" r="5" fill="var(--color-primary)" opacity="0.5" />
                <circle cx="70" cy="60" r="4" fill="var(--color-primary)" opacity="0.4" />
                <circle cx="140" cy="65" r="6" fill="var(--color-primary)" opacity="0.6" />
                <line x1="40" y1="40" x2="100" y2="25" stroke="var(--color-primary)" strokeWidth="1" opacity="0.3" />
                <line x1="100" y1="25" x2="160" y2="45" stroke="var(--color-primary)" strokeWidth="1" opacity="0.3" />
                <line x1="40" y1="40" x2="70" y2="60" stroke="var(--color-primary)" strokeWidth="1" opacity="0.3" />
                <line x1="70" y1="60" x2="140" y2="65" stroke="var(--color-primary)" strokeWidth="1" opacity="0.3" />
                <line x1="140" y1="65" x2="160" y2="45" stroke="var(--color-primary)" strokeWidth="1" opacity="0.3" />
              </svg>
            </div>
            <div className={styles.previewFooter}>
              <div className={styles.previewStat}>
                <span className={styles.previewStatValue}>12</span>
                <span className={styles.previewStatLabel}>mutual</span>
              </div>
              <div className={styles.previewStat}>
                <span className={styles.previewStatValue}>3</span>
                <span className={styles.previewStatLabel}>events</span>
              </div>
              <div className={styles.previewStat}>
                <span className={styles.previewStatValue}>5</span>
                <span className={styles.previewStatLabel}>projects</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
