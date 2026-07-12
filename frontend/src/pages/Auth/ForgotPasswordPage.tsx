import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import AuthShell from './AuthShell';

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
      <AuthShell title="Check your inbox." lead="If an account exists, you'll receive a password reset link.">
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-2.5">
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-fg)' }}>
              Check your email
            </h1>
            <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
              If an account exists with <strong>{email}</strong>, you will receive a password reset link.
            </p>
          </div>
          <p className="text-sm text-center" style={{ color: 'var(--color-fg-secondary)' }}>
            <Link to="/login" className="font-medium" style={{ color: 'var(--color-primary)' }}>Back to login</Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password." lead="We'll send you a link to get back into your account.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-7">
        <div className="flex flex-col gap-2.5">
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-fg)' }}>
            Forgot password?
          </h1>
          <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
            Enter your email and we'll send you a reset link
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

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium" style={{ color: 'var(--color-fg)' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full px-3.5 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] outline-none text-[15px]"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-fg)',
              fontFamily: 'var(--font-sans)',
              transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 4px var(--color-primary-soft)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

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
          {isLoading ? 'Sending...' : 'Send reset link'}
        </button>

        <p className="text-sm text-center" style={{ color: 'var(--color-fg-secondary)' }}>
          Remember your password?{' '}
          <Link to="/login" className="font-medium" style={{ color: 'var(--color-primary)' }}>Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
