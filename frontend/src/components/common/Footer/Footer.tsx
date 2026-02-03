import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.container}`}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logoLink}>
            <img src="/logo.svg" alt="Innonet" className={styles.logoImage} />
          </Link>
          <p className={styles.tagline}>From ideas to impact, faster.</p>
        </div>
        <div className={styles.copyright}>
          &copy; {new Date().getFullYear()} Innonet. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
