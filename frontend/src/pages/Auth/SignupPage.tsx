import React from 'react';
import { Link } from 'react-router-dom';
import SignupForm from '../../features/auth/components/SignupForm';
import styles from './AuthPage.module.css';

export const SignupPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          Innonet
        </Link>
        <SignupForm />
      </div>
    </div>
  );
};

export default SignupPage;
