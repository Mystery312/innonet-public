import React from 'react';
import styles from './StatsSection.module.css';

const stats = [
  { value: '500+', label: 'Builders' },
  { value: '50+', label: 'Events' },
  { value: '30+', label: 'Communities' },
];

export const StatsSection: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.container}`}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <span className={styles.value}>{stat.value}</span>
            <span className={styles.label}>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsSection;
