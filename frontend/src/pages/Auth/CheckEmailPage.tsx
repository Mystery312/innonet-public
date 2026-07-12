import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell';

export const CheckEmailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email } = (location.state || {}) as { email?: string };

  if (!email) {
    navigate('/signup');
    return null;
  }

  return (
    <AuthShell title="Almost there." lead="Check your inbox to complete verification.">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2.5">
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0, color: 'var(--color-fg)' }}>
            Check your email
          </h1>
          <p className="text-[15px] leading-[1.55]" style={{ color: 'var(--color-fg-secondary)', margin: 0 }}>
            We've sent a verification link to <strong style={{ color: 'var(--color-fg)' }}>{email}</strong>
          </p>
        </div>

        {/* info banner */}
        <div
          className="px-3.5 py-3 rounded-[var(--radius-md)] text-[13px] font-medium leading-[1.5] flex flex-col gap-2"
          style={{
            background: 'var(--color-info-bg)',
            color: 'var(--color-info)',
            border: '1px solid color-mix(in srgb, var(--color-info) 30%, transparent)',
          }}
        >
          <span className="font-semibold">What to do next:</span>
          <ol className="m-0 pl-4.5 font-normal" style={{ listStyleType: 'decimal' }}>
            <li className="mb-1">Open the email we just sent you</li>
            <li className="mb-1">Click the "Verify Email Address" button</li>
            <li className="mb-1">You'll be redirected to login</li>
            <li>Login with your username and password</li>
          </ol>
        </div>

        {/* warning banner */}
        <div
          className="px-3.5 py-3 rounded-[var(--radius-md)] text-[13px] leading-[1.5]"
          style={{
            background: 'var(--color-warning-bg)',
            color: 'var(--color-warning)',
            border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
          }}
        >
          <strong>Important:</strong> The verification link expires in 24 hours. You won't be able to login until you verify your email.
        </div>

        {/* troubleshooting */}
        <div className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          <p className="mb-2 font-medium" style={{ color: 'var(--color-fg-secondary)' }}>Didn't receive the email?</p>
          <ul className="m-0 pl-5 flex flex-col gap-1">
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email address</li>
            <li>Wait a few minutes and check again</li>
          </ul>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 rounded-[var(--radius-md)] text-sm font-medium border-0 cursor-pointer"
          style={{
            background: 'var(--color-primary)',
            color: 'var(--color-fg-on-primary)',
            transition: 'background var(--duration-fast)',
          }}
        >
          Continue to login
        </button>

        <p className="text-sm text-center" style={{ color: 'var(--color-fg-secondary)' }}>
          Wrong email?{' '}
          <Link to="/signup" className="font-medium" style={{ color: 'var(--color-primary)' }}>Sign up again</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default CheckEmailPage;
