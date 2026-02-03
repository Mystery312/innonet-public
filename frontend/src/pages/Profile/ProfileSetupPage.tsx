import React from 'react';
import { ProfileWizard } from '../../features/profile/components/ProfileWizard';
import styles from './ProfilePage.module.css';

export const ProfileSetupPage: React.FC = () => {
  return (
    <div className={styles.setupContainer}>
      <ProfileWizard />
    </div>
  );
};

export default ProfileSetupPage;
