import React from 'react';
import styles from './Tabs.module.css';

interface Tab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
}) => {
  return (
    <div className={`${styles.tabs} ${styles[variant]}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-disabled={tab.disabled}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''} ${
            tab.disabled ? styles.disabled : ''
          }`}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          disabled={tab.disabled}
        >
          <span className={styles.label}>{tab.label}</span>
          {tab.count !== undefined && (
            <span className={styles.count}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
};

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({ id, activeTab, children }) => {
  if (id !== activeTab) return null;
  return (
    <div role="tabpanel" aria-labelledby={id} className={styles.panel}>
      {children}
    </div>
  );
};

export default Tabs;
