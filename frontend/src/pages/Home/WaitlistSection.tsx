import React, { useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { api } from '../../lib/api';
import styles from './WaitlistSection.module.css';

export const WaitlistSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/waitlist', { email, source: 'homepage' });
      setIsSuccess(true);
      setEmail('');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Failed to join waitlist');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={`container ${styles.container}`}>
        <div className={styles.content}>
          <h2 className={styles.title}>Get early access</h2>
          <p className={styles.description}>
            Be the first to experience Innonet's AI-powered networking features.
            Join the waitlist and we'll notify you when early access is available.
          </p>

          {isSuccess ? (
            <div className={styles.success}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>You're on the list! Check your email for confirmation.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputWrapper}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  error={error}
                  required
                />
              </div>
              <Button type="submit" isLoading={isLoading}>
                Join the waitlist
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default WaitlistSection;
