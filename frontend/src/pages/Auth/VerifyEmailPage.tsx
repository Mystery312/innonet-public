import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import Button from '../../components/common/Button';
import styles from './AuthPage.module.css';
import formStyles from '../../features/auth/components/AuthForm.module.css';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Invalid verification link');
        setIsLoading(false);
        return;
      }

      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setSuccess(true);
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(
          axiosError.response?.data?.detail ||
          'Failed to verify email. The link may have expired.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            Innonet
          </Link>
          <div className={formStyles.form}>
            <div className={formStyles.header}>
              <h1 className={formStyles.title}>Verifying your email...</h1>
              <p className={formStyles.subtitle}>
                Please wait while we verify your email address.
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div className="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            Innonet
          </Link>
          <div className={formStyles.form}>
            <div className={formStyles.header}>
              <h1 className={formStyles.title}>Email verified! ✓</h1>
              <p className={formStyles.subtitle}>
                Your email has been successfully verified. You can now login to your account.
              </p>
            </div>
            <Button fullWidth onClick={() => navigate('/login')}>
              Continue to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          Innonet
        </Link>
        <div className={formStyles.form}>
          <div className={formStyles.header}>
            <h1 className={formStyles.title}>Verification failed</h1>
            <p className={formStyles.subtitle}>
              {error}
            </p>
          </div>
          <div className={formStyles.fields}>
            <Button fullWidth onClick={() => navigate('/login')}>
              Go to login
            </Button>
          </div>
          <p className={formStyles.footer}>
            Need help? <Link to="/login">Contact support</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
