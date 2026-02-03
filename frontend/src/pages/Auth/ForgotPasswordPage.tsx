import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import styles from './AuthPage.module.css';
import formStyles from '../../features/auth/components/AuthForm.module.css';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            Innonet
          </Link>
          <div className={formStyles.form}>
            <div className={formStyles.header}>
              <h1 className={formStyles.title}>Check your email</h1>
              <p className={formStyles.subtitle}>
                If an account exists with {email}, you will receive a password reset link.
              </p>
            </div>
            <p className={formStyles.footer}>
              <Link to="/login">Back to login</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          Innonet
        </Link>
        <form onSubmit={handleSubmit} className={formStyles.form}>
          <div className={formStyles.header}>
            <h1 className={formStyles.title}>Forgot password?</h1>
            <p className={formStyles.subtitle}>
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {error && <div className={formStyles.error}>{error}</div>}

          <div className={formStyles.fields}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <Button type="submit" fullWidth isLoading={isLoading}>
            Send reset link
          </Button>

          <p className={formStyles.footer}>
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
