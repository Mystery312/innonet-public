import React from 'react';
import LoginForm from '../../features/auth/components/LoginForm';
import AuthShell from './AuthShell';

export const LoginPage: React.FC = () => {
  return (
    <AuthShell title="Welcome back to your network." lead="Sign in to keep building with your collaborators.">
      <LoginForm />
    </AuthShell>
  );
};

export default LoginPage;
