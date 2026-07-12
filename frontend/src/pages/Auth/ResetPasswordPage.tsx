import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import AuthShell from './AuthShell';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!token) { setError('Invalid reset link. Please request a new password reset.'); return; }
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    color: 'var(--color-fg)',
    fontFamily: 'var(--font-sans)',
    transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
  };

  const focusInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-primary)';
    e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-soft)';
  };
  const blurInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  if (success) {
    return (
      <AuthShell title="Password updated." lead="You're all set to sign in with your new password.">
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
              Password reset!
            </h1>
            <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
              Your password has been successfully reset.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-[var(--radius-md)] text-sm font-medium border-0 cursor-pointer"
            style={{ background: 'var(--color-primary)', color: 'var(--color-fg-on-primary)' }}
          >
            Sign in
          </button>
        </div>
      </AuthShell>
    );
  }

  if (!token) {
    return (
      <AuthShell title="Link expired." lead="Request a new password reset link.">
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-2.5">
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-fg)' }}>
              Invalid link
            </h1>
            <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
              This password reset link is invalid or has expired.
            </p>
          </div>
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full py-3 rounded-[var(--radius-md)] text-sm font-medium border-0 cursor-pointer"
            style={{ background: 'var(--color-primary)', color: 'var(--color-fg-on-primary)' }}
          >
            Request new link
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password." lead="Make it strong — at least 8 characters.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-7">
        <div className="flex flex-col gap-2.5">
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-fg)' }}>
            Reset your password
          </h1>
          <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
            Enter your new password below
          </p>
        </div>

        {error && (
          <div
            className="px-3.5 py-3 rounded-[var(--radius-md)] text-[13px] font-medium leading-[1.5]"
            style={{
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
            }}
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium" style={{ color: 'var(--color-fg)' }}>New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="w-full px-3.5 py-3 pr-10 rounded-[var(--radius-md)] border border-[var(--color-border)] outline-none text-[15px]"
                style={inputStyle}
                onFocus={focusInput}
                onBlur={blurInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer p-1.5 rounded-[var(--radius-sm)] inline-flex items-center"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>At least 8 characters</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium" style={{ color: 'var(--color-fg)' }}>Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="w-full px-3.5 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] outline-none text-[15px]"
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-[var(--radius-md)] text-sm font-medium border-0 cursor-pointer"
          style={{ background: 'var(--color-primary)', color: 'var(--color-fg-on-primary)', opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? 'Resetting...' : 'Reset password'}
        </button>

        <p className="text-sm text-center" style={{ color: 'var(--color-fg-secondary)' }}>
          Remember your password?{' '}
          <Link to="/login" className="font-medium" style={{ color: 'var(--color-primary)' }}>Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default ResetPasswordPage;
