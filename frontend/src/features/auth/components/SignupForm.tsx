import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import styles from './AuthForm.module.css';

type ContactMethod = 'email' | 'phone';

export const SignupForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
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
      const data = {
        username,
        password,
        ...(contactMethod === 'email' ? { email } : { phone }),
      };
      await register(data);
      navigate('/events');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Join the Innonet community</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.fields}>
        <Input
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Choose a username"
          required
        />

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${contactMethod === 'email' ? styles.active : ''}`}
            onClick={() => setContactMethod('email')}
          >
            Email
          </button>
          <button
            type="button"
            className={`${styles.tab} ${contactMethod === 'phone' ? styles.active : ''}`}
            onClick={() => setContactMethod('phone')}
          >
            Phone
          </button>
        </div>

        {contactMethod === 'email' ? (
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        ) : (
          <Input
            label="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            helperText="Include country code"
            required
          />
        )}

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          helperText="At least 8 characters"
          required
        />

        <Input
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
        />
      </div>

      <Button type="submit" fullWidth isLoading={isLoading}>
        Create your account
      </Button>

      <p className={styles.footer}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </form>
  );
};

export default SignupForm;
