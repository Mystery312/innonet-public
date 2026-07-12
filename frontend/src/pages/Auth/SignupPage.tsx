import React from 'react';
import SignupForm from '../../features/auth/components/SignupForm';
import AuthShell from './AuthShell';

export const SignupPage: React.FC = () => {
  return (
    <AuthShell title="Create your account." lead="Join a network built for young builders who actually ship.">
      <SignupForm />
    </AuthShell>
  );
};

export default SignupPage;
