import React from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../../features/auth/components/LoginForm';
import styles from './AuthPage.module.css';

export const LoginPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          Innonet
        </Link>
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
