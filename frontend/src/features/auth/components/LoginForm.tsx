import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import styles from './AuthForm.module.css';

export const LoginForm: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login({ identifier, password });
      navigate('/events');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.fields}>
        <Input
          label="Email, phone, or username"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Enter your email, phone, or username"
          required
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
          <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--color-primary)' }}>
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" fullWidth isLoading={isLoading}>
        Sign in
      </Button>

      <p className={styles.footer}>
        Don't have an account? <Link to="/signup">Create one</Link>
      </p>
    </form>
  );
};

export default LoginForm;
