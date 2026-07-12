import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import AuthShell from './AuthShell';

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
        setError(axiosError.response?.data?.detail || 'Failed to verify email. The link may have expired.');
      } finally {
        setIsLoading(false);
      }
    };
    verifyEmail();
  }, [token]);

  if (isLoading) {
    return (
      <AuthShell title="Verifying your email." lead="Just a moment while we confirm your address.">
        <div className="flex flex-col gap-7 items-center text-center">
          <div className="flex flex-col gap-2.5">
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-fg)' }}>
              Verifying your email...
            </h1>
            <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
              Please wait while we verify your email address.
            </p>
          </div>
          <div
            className="w-8 h-8 rounded-full border-[3px] border-[var(--color-border)] mx-auto"
            style={{ borderTopColor: 'var(--color-primary)', animation: 'spin 0.8s linear infinite' }}
          />
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell title="You're verified." lead="Your email is confirmed. Welcome to InnoNet.">
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-2.5 items-center text-center">
            <div
              className="w-14 h-14 rounded-full inline-flex items-center justify-center mb-2"
              style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-fg)' }}>
              Email verified!
            </h1>
            <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
              Your email has been successfully verified. You can now login to your account.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-[var(--radius-md)] text-sm font-medium border-0 cursor-pointer"
            style={{ background: 'var(--color-primary)', color: 'var(--color-fg-on-primary)' }}
          >
            Continue to login
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Something went wrong." lead="The verification link may have expired.">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2.5">
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-fg)' }}>
            Verification failed
          </h1>
          <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
            {error}
          </p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 rounded-[var(--radius-md)] text-sm font-medium border-0 cursor-pointer"
          style={{ background: 'var(--color-primary)', color: 'var(--color-fg-on-primary)' }}
        >
          Go to login
        </button>
        <p className="text-sm text-center" style={{ color: 'var(--color-fg-secondary)' }}>
          Need help?{' '}
          <Link to="/login" className="font-medium" style={{ color: 'var(--color-primary)' }}>Contact support</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default VerifyEmailPage;
