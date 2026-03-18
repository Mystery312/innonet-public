import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AuthPage.module.css';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get('success');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        const errorMessages: Record<string, string> = {
          invalid_state: 'Authentication failed due to invalid state. Please try again.',
          invalid_provider: 'Unsupported login provider.',
          no_code: 'Authentication was cancelled or failed.',
          auth_failed: 'Authentication failed. Please try again.',
          access_denied: 'Access was denied. Please try again.',
        };
        setError(errorMessages[errorParam] || 'An unexpected error occurred during login.');
        return;
      }

      if (success === 'true') {
        // Cookies are already set by the backend redirect.
        // Refresh user data from /auth/me endpoint.
        try {
          await refreshUser();
          navigate('/events', { replace: true });
        } catch {
          setError('Failed to load your account. Please try logging in again.');
        }
      } else {
        setError('An unexpected error occurred during login.');
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            Innonet
          </Link>
          <div style={{
            maxWidth: '400px',
            padding: '2rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>Login Failed</h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              {error}
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                padding: '0.625rem 1.5rem',
                background: 'var(--color-primary)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state while processing callback
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          Innonet
        </Link>
        <p style={{ color: 'var(--color-text-secondary)' }}>Signing you in...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
