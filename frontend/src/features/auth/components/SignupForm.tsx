import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import { formatError } from '../../../utils/error';

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

export const SignupForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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

    setIsLoading(true);

    try {
      await api.post('/auth/register', { username, email, password });
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const EyeOpen = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
  const EyeClosed = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

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
          Create your account
        </h1>
        <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
          Join a network built for young builders who ship
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
        </div>
      )}

      {/* Fields */}
      <div className="flex flex-col gap-4">
        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium" style={{ color: 'var(--color-fg)' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            required
            className={inputCls}
            style={inputStyle}
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium" style={{ color: 'var(--color-fg)' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className={inputCls}
            style={inputStyle}
            onFocus={focusInput}
            onBlur={blurInput}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium" style={{ color: 'var(--color-fg)' }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
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
              {showPassword ? <EyeClosed /> : <EyeOpen />}
            </button>
          </div>
          <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>At least 8 characters</span>
        </div>

        {/* Confirm password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium" style={{ color: 'var(--color-fg)' }}>
            Confirm password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
            className={inputCls}
            style={inputStyle}
            onFocus={focusInput}
            onBlur={blurInput}
          />
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
        {isLoading ? 'Creating account...' : 'Create your account'}
      </button>

      {/* Footer link */}
      <p className="text-sm text-center" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
        Already have an account?{' '}
        <Link to="/login" className="font-medium no-underline" style={{ color: 'var(--color-primary)' }}>
          Sign in
        </Link>
      </p>
    </form>
  );
};

export default SignupForm;
