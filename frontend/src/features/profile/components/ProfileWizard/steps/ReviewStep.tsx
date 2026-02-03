import React, { useState, useEffect } from 'react';
import { Button } from '../../../../../components/common/Button';
import { Badge } from '../../../../../components/common/Badge';
import { Avatar } from '../../../../../components/common/Avatar';
import { profileApi, aiApi } from '../../../api/profileApi';
import type { FullProfile, ProfileCompletion } from '../../../../../types/profile';
import styles from '../ProfileWizard.module.css';

interface ReviewStepProps {
  onPrevious: () => void;
  onComplete: () => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ onPrevious, onComplete }) => {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileData, completionData] = await Promise.all([
          profileApi.getMyProfile(),
          profileApi.getProfileCompletion(),
        ]);
        setProfile(profileData);
        setCompletion(completionData);
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Trigger embedding update for search functionality
      await aiApi.updateEmbedding();
      onComplete();
    } catch (error) {
      console.error('Failed to complete profile setup:', error);
      // Still proceed even if embedding update fails
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !profile) {
    return <div>Loading...</div>;
  }

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className={styles.form}>
      {/* Profile Completion */}
      {completion && (
        <div style={{
          padding: '1rem',
          backgroundColor: completion.percentage >= 80 ? 'var(--color-success-subtle, #dafbe1)' : 'var(--color-attention-subtle, #fff8c5)',
          borderRadius: '8px',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Profile Completion</span>
            <span style={{ fontWeight: 600 }}>{completion.percentage}%</span>
          </div>
          <div style={{
            height: '8px',
            backgroundColor: 'rgba(0,0,0,0.1)',
            borderRadius: '4px',
            marginTop: '0.5rem',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${completion.percentage}%`,
              backgroundColor: completion.percentage >= 80 ? 'var(--color-success-emphasis, #1a7f37)' : 'var(--color-attention-emphasis, #9a6700)',
              borderRadius: '4px',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Basic Info */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <Avatar
          name={profile.profile?.full_name || profile.user.username}
          src={profile.profile?.profile_image_url}
          size="xlarge"
        />
        <div>
          <h2 style={{ margin: 0 }}>{profile.profile?.full_name || profile.user.username}</h2>
          <p style={{ margin: '0.25rem 0', color: 'var(--color-text-secondary)' }}>
            @{profile.user.username}
          </p>
          {profile.profile?.location && (
            <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
              {profile.profile.location}
            </p>
          )}
        </div>
      </div>

      {profile.profile?.bio && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>About</h3>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{profile.profile.bio}</p>
        </div>
      )}

      {/* Skills */}
      {profile.skills.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
            Skills ({profile.skills.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profile.skills.map((us) => (
              <Badge key={us.id} variant={us.is_primary ? 'primary' : 'default'}>
                {us.skill.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {profile.work_experience.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
            Experience ({profile.work_experience.length})
          </h3>
          {profile.work_experience.slice(0, 2).map((exp) => (
            <div key={exp.id} style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 500 }}>{exp.job_title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {exp.company_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : formatDate(exp.end_date)}
              </div>
            </div>
          ))}
          {profile.work_experience.length > 2 && (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
              +{profile.work_experience.length - 2} more
            </p>
          )}
        </div>
      )}

      {/* Education */}
      {profile.education.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
            Education ({profile.education.length})
          </h3>
          {profile.education.slice(0, 2).map((edu) => (
            <div key={edu.id} style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 500 }}>{edu.institution_name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {edu.degree_type && edu.field_of_study
                  ? `${edu.degree_type} in ${edu.field_of_study}`
                  : edu.field_of_study || edu.degree_type}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {profile.projects.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
            Projects ({profile.projects.length})
          </h3>
          {profile.projects.slice(0, 2).map((project) => (
            <div key={project.id} style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 500 }}>{project.title}</div>
              {project.technologies && project.technologies.length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                  {project.technologies.slice(0, 3).map((tech) => (
                    <Badge key={tech} size="small" variant="default">{tech}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {profile.certifications.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: 600 }}>
            Certifications ({profile.certifications.length})
          </h3>
          {profile.certifications.slice(0, 2).map((cert) => (
            <div key={cert.id} style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 500 }}>{cert.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                {cert.issuing_organization}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.actions}>
        <div className={styles.actionsLeft}>
          <Button type="button" variant="secondary" onClick={onPrevious}>
            Previous
          </Button>
        </div>
        <div className={styles.actionsRight}>
          <Button type="button" onClick={handleComplete} disabled={isSubmitting}>
            {isSubmitting ? 'Completing...' : 'Complete Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;
