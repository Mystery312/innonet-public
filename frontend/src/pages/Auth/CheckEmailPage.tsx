import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import styles from './AuthPage.module.css';
import formStyles from '../../features/auth/components/AuthForm.module.css';

export const CheckEmailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email } = (location.state || {}) as { email?: string };

  if (!email) {
    // If no email in state, redirect to signup
    navigate('/signup');
    return null;
  }

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
              We've sent a verification link to <strong>{email}</strong>
            </p>
          </div>

          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#0369a1' }}>
              📧 What to do next:
            </p>
            <ol style={{ margin: '0', paddingLeft: '20px', color: '#0c4a6e', fontSize: '14px' }}>
              <li style={{ marginBottom: '8px' }}>Open the email we just sent you</li>
              <li style={{ marginBottom: '8px' }}>Click the "Verify Email Address" button</li>
              <li style={{ marginBottom: '8px' }}>You'll be redirected to login</li>
              <li>Login with your username and password</li>
            </ol>
          </div>

          <div style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            <p style={{ margin: '0', color: '#92400e' }}>
              <strong>⏰ Important:</strong> The verification link expires in 24 hours. You won't be able to login until you verify your email.
            </p>
          </div>

          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Didn't receive the email?</strong>
            </p>
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes and check again</li>
            </ul>
          </div>

          <Button fullWidth onClick={() => navigate('/login')}>
            Continue to login
          </Button>

          <p className={formStyles.footer}>
            Wrong email? <Link to="/signup">Sign up again</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckEmailPage;
