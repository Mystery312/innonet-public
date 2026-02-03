import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { BackButton } from '../../components/common/BackButton';
import { companiesApi } from '../../features/companies/api/companiesApi';
import type { ChallengeDetail, ApplicationCreate } from '../../types/company';
import styles from './ChallengeDetailPage.module.css';

export const ChallengeDetailPage: React.FC = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applicationData, setApplicationData] = useState<ApplicationCreate>({
    cover_letter: '',
    portfolio_url: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadChallenge = useCallback(async () => {
    if (!challengeId) return;
    setIsLoading(true);
    try {
      const data = await companiesApi.getChallenge(challengeId);
      setChallenge(data);
    } catch {
      setError('Failed to load challenge');
    } finally {
      setIsLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  const handleApply = async () => {
    if (!challengeId) return;
    setIsSubmitting(true);
    try {
      await companiesApi.applyToChallenge(challengeId, applicationData);
      setIsApplyModalOpen(false);
      loadChallenge(); // Reload to get updated application status
    } catch (error) {
      console.error('Failed to apply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string): 'success' | 'warning' | 'danger' | 'default' => {
    switch (difficulty) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string): 'primary' | 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'open':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'default';
      default:
        return 'warning';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatReward = (amount?: number) => {
    if (!amount) return null;
    return `$${(amount / 100).toLocaleString()}`;
  };

  const isDeadlinePassed = () => {
    if (!challenge?.application_deadline) return false;
    return new Date(challenge.application_deadline) < new Date();
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main className={styles.main}>
          <div className={styles.loading}>Loading challenge...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main className={styles.main}>
          <div className={styles.error}>
            <h2>Challenge not found</h2>
            <p>{error || 'This challenge may have been removed.'}</p>
            <Button onClick={() => navigate('/challenges')}>Browse Challenges</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <BackButton label="Back to Challenges" fallbackPath="/challenges" />
          </div>

          <div className={styles.layout}>
            <div className={styles.content}>
              <div className={styles.header}>
                <div className={styles.badges}>
                  <Badge variant={getDifficultyColor(challenge.difficulty)}>
                    {challenge.difficulty}
                  </Badge>
                  <Badge variant={getStatusColor(challenge.status)}>
                    {challenge.status.replace('_', ' ')}
                  </Badge>
                </div>
                <h1 className={styles.title}>{challenge.title}</h1>
                {challenge.company && (
                  <Link to={`/companies/${challenge.company.id}`} className={styles.company}>
                    {challenge.company.logo_url ? (
                      <img
                        src={challenge.company.logo_url}
                        alt={challenge.company.name}
                        className={styles.companyLogo}
                      />
                    ) : (
                      <div className={styles.companyLogoPlaceholder}>
                        {challenge.company.name.charAt(0)}
                      </div>
                    )}
                    <span>{challenge.company.name}</span>
                    {challenge.company.is_verified && (
                      <Badge variant="primary" size="small">Verified</Badge>
                    )}
                  </Link>
                )}
              </div>

              <section className={styles.section}>
                <h2>Description</h2>
                <p className={styles.description}>{challenge.description}</p>
              </section>

              {challenge.problem_statement && (
                <section className={styles.section}>
                  <h2>Problem Statement</h2>
                  <p className={styles.description}>{challenge.problem_statement}</p>
                </section>
              )}

              {challenge.expected_outcome && (
                <section className={styles.section}>
                  <h2>Expected Outcome</h2>
                  <p className={styles.description}>{challenge.expected_outcome}</p>
                </section>
              )}

              {challenge.skills_required && (
                <section className={styles.section}>
                  <h2>Skills Required</h2>
                  <div className={styles.skills}>
                    {challenge.skills_required.split(',').map((skill, i) => (
                      <Badge key={i} variant="default">
                        {skill.trim()}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {challenge.reward_description && (
                <section className={styles.section}>
                  <h2>Rewards</h2>
                  <p className={styles.description}>{challenge.reward_description}</p>
                </section>
              )}
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.card}>
                <div className={styles.applySection}>
                  {challenge.has_applied ? (
                    <div className={styles.appliedStatus}>
                      <Badge variant="primary">Applied</Badge>
                      <p>
                        Status: <strong>{challenge.user_application?.status}</strong>
                      </p>
                    </div>
                  ) : challenge.status === 'open' && !isDeadlinePassed() ? (
                    <Button fullWidth onClick={() => setIsApplyModalOpen(true)}>
                      Apply Now
                    </Button>
                  ) : (
                    <Button fullWidth disabled>
                      {isDeadlinePassed() ? 'Deadline Passed' : 'Applications Closed'}
                    </Button>
                  )}
                </div>

                <div className={styles.infoList}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Duration</span>
                    <span className={styles.infoValue}>{challenge.duration_weeks} weeks</span>
                  </div>

                  {challenge.max_participants && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Max Participants</span>
                      <span className={styles.infoValue}>{challenge.max_participants}</span>
                    </div>
                  )}

                  {challenge.reward_amount && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Prize</span>
                      <span className={styles.infoValue}>{formatReward(challenge.reward_amount)}</span>
                    </div>
                  )}

                  {challenge.application_deadline && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Application Deadline</span>
                      <span className={styles.infoValue}>
                        {formatDate(challenge.application_deadline)}
                      </span>
                    </div>
                  )}

                  {challenge.start_date && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Start Date</span>
                      <span className={styles.infoValue}>{formatDate(challenge.start_date)}</span>
                    </div>
                  )}

                  {challenge.end_date && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>End Date</span>
                      <span className={styles.infoValue}>{formatDate(challenge.end_date)}</span>
                    </div>
                  )}

                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Applications</span>
                    <span className={styles.infoValue}>{challenge.application_count}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />

      {/* Apply Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply to Challenge"
        size="large"
      >
        <div className={styles.applyForm}>
          <div className={styles.formGroup}>
            <label>Cover Letter</label>
            <textarea
              value={applicationData.cover_letter}
              onChange={(e) =>
                setApplicationData((prev) => ({ ...prev, cover_letter: e.target.value }))
              }
              placeholder="Tell us why you're interested in this challenge and what makes you a great fit..."
              rows={6}
              className={styles.textarea}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Portfolio URL (Optional)</label>
            <input
              type="url"
              value={applicationData.portfolio_url}
              onChange={(e) =>
                setApplicationData((prev) => ({ ...prev, portfolio_url: e.target.value }))
              }
              placeholder="https://yourportfolio.com"
              className={styles.input}
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChallengeDetailPage;
