import React, { useState, useEffect } from 'react';
import { Input } from '../../../../../components/common/Input';
import { Button } from '../../../../../components/common/Button';
import { profileApi } from '../../../api/profileApi';
import type { BasicProfileUpdate, ResumeParseResult } from '../../../../../types/profile';
import styles from '../ProfileWizard.module.css';

interface BasicInfoStepProps {
  onNext: () => void;
  parsedData?: ResumeParseResult | null;
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ onNext, parsedData }) => {
  const [formData, setFormData] = useState<BasicProfileUpdate>({
    full_name: '',
    bio: '',
    location: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const profile = await profileApi.getMyProfile();
        if (profile.profile) {
          setFormData({
            full_name: profile.profile.full_name || '',
            bio: profile.profile.bio || '',
            location: profile.profile.location || '',
            linkedin_url: profile.profile.linkedin_url || '',
            github_url: profile.profile.github_url || '',
            portfolio_url: profile.profile.portfolio_url || '',
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setError('Unable to load profile data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Pre-fill from parsed resume data
  useEffect(() => {
    if (parsedData) {
      setFormData((prev) => ({
        full_name: parsedData.full_name || prev.full_name || '',
        bio: parsedData.bio || prev.bio || '',
        location: parsedData.location || prev.location || '',
        linkedin_url: parsedData.linkedin_url || prev.linkedin_url || '',
        github_url: parsedData.github_url || prev.github_url || '',
        portfolio_url: parsedData.portfolio_url || prev.portfolio_url || '',
      }));
    }
  }, [parsedData]);

  const handleChange = (field: keyof BasicProfileUpdate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await profileApi.updateBasicProfile(formData);
      onNext();
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && (
        <div className={styles.errorBanner}>
          <p>{error}</p>
        </div>
      )}
      <div className={styles.formGroup}>
        <label className={styles.label}>Full Name *</label>
        <Input
          value={formData.full_name || ''}
          onChange={(e) => handleChange('full_name', e.target.value)}
          placeholder="John Doe"
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Bio</label>
        <textarea
          value={formData.bio || ''}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="Tell us about yourself, your interests, and what you're working on..."
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--color-border, #d0d7de)',
            fontSize: '0.875rem',
            resize: 'vertical',
          }}
        />
        <span className={styles.hint}>A brief description of who you are</span>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Location</label>
        <Input
          value={formData.location || ''}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="San Francisco, CA"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>LinkedIn URL</label>
        <Input
          type="url"
          value={formData.linkedin_url || ''}
          onChange={(e) => handleChange('linkedin_url', e.target.value)}
          placeholder="https://linkedin.com/in/username"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>GitHub URL</label>
        <Input
          type="url"
          value={formData.github_url || ''}
          onChange={(e) => handleChange('github_url', e.target.value)}
          placeholder="https://github.com/username"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Portfolio URL</label>
        <Input
          type="url"
          value={formData.portfolio_url || ''}
          onChange={(e) => handleChange('portfolio_url', e.target.value)}
          placeholder="https://yourportfolio.com"
        />
      </div>

      <div className={styles.actions}>
        <div className={styles.actionsLeft} />
        <div className={styles.actionsRight}>
          <Button type="submit" disabled={isSaving || !formData.full_name}>
            {isSaving ? 'Saving...' : 'Continue'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default BasicInfoStep;
