import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { formatError } from '../../../utils/error';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const inputCls =
  'w-full px-3.5 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] outline-none text-[15px]';

const focusInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--color-primary)';
  e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-soft)';
};
const blurInput = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--color-border)';
  e.currentTarget.style.boxShadow = 'none';
};
const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  color: 'var(--color-fg)',
  fontFamily: 'var(--font-sans)',
  transition:
    'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
};

export const LoginForm: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowResend(false);
    setIsLoading(true);

    try {
      await login({ identifier, password });
      navigate('/events');
    } catch (err: unknown) {
      console.error('Login error:', err);
      const axiosError = err as { response?: { status?: number; data?: { detail?: string } } };
      const statusCode = axiosError.response?.status;
      const errorDetail = axiosError.response?.data?.detail ?? '';

      if (statusCode === 403 || errorDetail.toLowerCase().includes('not verified')) {
        setError('Please verify your email before logging in. Check your inbox for the verification link.');
        setShowResend(true);
      } else {
        setError(formatError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendStatus !== 'idle') return;
    setResendStatus('sending');
    try {
      const emailValue = identifier.includes('@') ? identifier : '';
      if (!emailValue) {
        setError('Enter your email address in the field above, then click "Resend".');
        setResendStatus('idle');
        return;
      }
      await fetch(`${API_BASE}/auth/resend-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue }),
      });
      setResendStatus('sent');
    } catch {
      setResendStatus('idle');
    }
  };

  const handleOAuthLogin = (provider: string) => {
    window.location.href = `${API_BASE}/auth/oauth/${provider}/authorize`;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex flex-col gap-2.5">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 36,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: 0,
            color: 'var(--color-fg)',
          }}
        >
          Welcome back
        </h1>
        <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
          Sign in to your account
        </p>
      </div>

      {/* Error banner */}
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
          {showResend && (
            <div className="mt-2">
              {resendStatus === 'sent' ? (
                <span className="font-medium" style={{ color: 'var(--color-success)' }}>
                  Verification email sent — check your inbox.
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendStatus === 'sending'}
                  className="bg-transparent border-0 cursor-pointer font-semibold p-0 underline text-[inherit]"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {resendStatus === 'sending' ? 'Sending…' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* OAuth buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => handleOAuthLogin('google')}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium cursor-pointer"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-fg)',
            transition: 'border-color var(--duration-fast), background var(--duration-fast)',
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-fg-muted)'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => handleOAuthLogin('microsoft')}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium cursor-pointer"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-fg)',
            transition: 'border-color var(--duration-fast), background var(--duration-fast)',
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-fg-muted)'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M11.4 2H2v9.4h9.4V2z" fill="#F25022" />
            <path d="M22 2h-9.4v9.4H22V2z" fill="#7FBA00" />
            <path d="M11.4 12.6H2V22h9.4v-9.4z" fill="#00A4EF" />
            <path d="M22 12.6h-9.4V22H22v-9.4z" fill="#FFB900" />
          </svg>
          Continue with Microsoft
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--color-fg-muted)' }}>or</span>
        <span className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium" style={{ color: 'var(--color-fg)' }}>
            Email, phone, or username
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter your email, phone, or username"
            required
            className={inputCls}
            style={inputStyle}
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium" style={{ color: 'var(--color-fg)' }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className={`${inputCls} pr-10`}
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
          <div className="text-right -mt-0.5">
            <Link to="/forgot-password" className="text-[13px] font-medium no-underline" style={{ color: 'var(--color-primary)' }}>
              Forgot password?
            </Link>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 rounded-[var(--radius-md)] text-sm font-medium border-0 cursor-pointer"
        style={{
          background: 'var(--color-primary)',
          color: 'var(--color-fg-on-primary)',
          opacity: isLoading ? 0.7 : 1,
          transition: 'background var(--duration-fast), opacity var(--duration-fast)',
        }}
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>

      {/* Footer link */}
      <p className="text-sm text-center" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-medium no-underline" style={{ color: 'var(--color-primary)' }}>
          Create one
        </Link>
      </p>
    </form>
  );
};

export default LoginForm;
