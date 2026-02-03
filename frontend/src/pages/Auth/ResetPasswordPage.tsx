import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import styles from './AuthPage.module.css';
import formStyles from '../../features/auth/components/AuthForm.module.css';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Failed to reset password');
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
              <h1 className={formStyles.title}>Password reset!</h1>
              <p className={formStyles.subtitle}>
                Your password has been successfully reset.
              </p>
            </div>
            <Button fullWidth onClick={() => navigate('/login')}>
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            Innonet
          </Link>
          <div className={formStyles.form}>
            <div className={formStyles.header}>
              <h1 className={formStyles.title}>Invalid link</h1>
              <p className={formStyles.subtitle}>
                This password reset link is invalid or has expired.
              </p>
            </div>
            <Button fullWidth onClick={() => navigate('/forgot-password')}>
              Request new link
            </Button>
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
            <h1 className={formStyles.title}>Reset your password</h1>
            <p className={formStyles.subtitle}>
              Enter your new password below
            </p>
          </div>

          {error && <div className={formStyles.error}>{error}</div>}

          <div className={formStyles.fields}>
            <Input
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              helperText="At least 8 characters"
              required
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>

          <Button type="submit" fullWidth isLoading={isLoading}>
            Reset password
          </Button>

          <p className={formStyles.footer}>
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
