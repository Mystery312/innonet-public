import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { BackButton } from '../../components/common/BackButton';
import { companiesApi } from '../../features/companies/api/companiesApi';
import type { CompanyDetail, CompanySize, Challenge } from '../../types/company';
import styles from './CompanyDetailPage.module.css';

const SIZE_LABELS: Record<CompanySize, string> = {
  startup: '1-10 employees',
  small: '11-50 employees',
  medium: '51-200 employees',
  large: '201-1000 employees',
  enterprise: '1000+ employees',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
};

export const CompanyDetailPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCompany = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const [companyData, challengesData] = await Promise.all([
        companiesApi.getCompany(companyId),
        companiesApi.getChallenges({ company_id: companyId, limit: 50 }),
      ]);
      setCompany(companyData);
      setAllChallenges(challengesData.challenges);
    } catch (err) {
      console.error('Failed to load company:', err);
      setError('Failed to load company details');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (error || !company) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Company Not Found</h2>
          <p>{error || "The company you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate('/companies')}>Browse Companies</Button>
        </div>
      </div>
    );
  }

  const openChallenges = allChallenges.filter((c) => c.status === 'open');
  const otherChallenges = allChallenges.filter((c) => c.status !== 'open');

  return (
    <div className={styles.container}>
      {/* Back Navigation */}
      <div className={styles.backNav}>
        <BackButton label="Back to Companies" fallbackPath="/companies" />
      </div>

      {/* Header */}
      <div className={styles.header}>
        {company.banner_url && (
          <div
            className={styles.banner}
            style={{ backgroundImage: `url(${company.banner_url})` }}
          />
        )}
        <div className={styles.headerContent}>
          <div className={styles.logoContainer}>
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className={styles.logo} />
            ) : (
              <div className={styles.logoPlaceholder}>
                {company.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className={styles.headerInfo}>
            <div className={styles.nameRow}>
              <h1>{company.name}</h1>
              {company.is_verified && (
                <span className={styles.verifiedBadge} title="Verified Company">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28a.75.75 0 00-1.06-1.06L6.75 8.19 5.28 6.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z" />
                  </svg>
                </span>
              )}
            </div>
            <div className={styles.metaRow}>
              {company.industry && <Badge variant="primary">{company.industry}</Badge>}
              {company.size && <span className={styles.size}>{SIZE_LABELS[company.size]}</span>}
              {company.location && <span className={styles.location}>{company.location}</span>}
              {company.founded_year && (
                <span className={styles.founded}>Founded {company.founded_year}</span>
              )}
            </div>
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.website}
              >
                {company.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Main Content */}
        <div className={styles.main}>
          {/* About Section */}
          {company.description && (
            <section className={styles.section}>
              <h2>About</h2>
              <p className={styles.description}>{company.description}</p>
            </section>
          )}

          {/* Open Challenges Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Open Challenges</h2>
              <span className={styles.count}>{openChallenges.length}</span>
            </div>
            {openChallenges.length > 0 ? (
              <div className={styles.challengesList}>
                {openChallenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    to={`/challenges/${challenge.id}`}
                    className={styles.challengeCard}
                  >
                    <div className={styles.challengeHeader}>
                      <h3>{challenge.title}</h3>
                      <Badge
                        variant={DIFFICULTY_COLORS[challenge.difficulty] as any || 'default'}
                        size="small"
                      >
                        {challenge.difficulty}
                      </Badge>
                    </div>
                    <p className={styles.challengeDescription}>{challenge.description}</p>
                    <div className={styles.challengeMeta}>
                      <span>{challenge.duration_weeks} weeks</span>
                      {challenge.reward_amount && (
                        <span className={styles.reward}>
                          ${challenge.reward_amount.toLocaleString()}
                        </span>
                      )}
                      {challenge.application_deadline && (
                        <span>Deadline: {formatDate(challenge.application_deadline)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={styles.emptyMessage}>No open challenges at the moment.</p>
            )}
          </section>

          {/* Past Challenges Section */}
          {otherChallenges.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>Past Challenges</h2>
                <span className={styles.count}>{otherChallenges.length}</span>
              </div>
              <div className={styles.challengesList}>
                {otherChallenges.slice(0, 5).map((challenge) => (
                  <Link
                    key={challenge.id}
                    to={`/challenges/${challenge.id}`}
                    className={`${styles.challengeCard} ${styles.pastChallenge}`}
                  >
                    <div className={styles.challengeHeader}>
                      <h3>{challenge.title}</h3>
                      <Badge variant="default" size="small">
                        {challenge.status}
                      </Badge>
                    </div>
                    <p className={styles.challengeDescription}>{challenge.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Stats */}
          <div className={styles.statsCard}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{company.challenge_count}</span>
              <span className={styles.statLabel}>Total Challenges</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{openChallenges.length}</span>
              <span className={styles.statLabel}>Open Now</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{company.team_members.length}</span>
              <span className={styles.statLabel}>Team Members</span>
            </div>
          </div>

          {/* Team Members */}
          {company.team_members.length > 0 && (
            <div className={styles.teamCard}>
              <h3>Team</h3>
              <div className={styles.teamList}>
                {company.team_members.slice(0, 5).map((member) => (
                  <div key={member.id} className={styles.teamMember}>
                    <Avatar
                      name={member.user?.full_name || member.user?.username || 'Member'}
                      src={member.user?.profile_image_url}
                      size="small"
                    />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>
                        {member.user?.full_name || member.user?.username}
                      </span>
                      <span className={styles.memberRole}>
                        {member.title || member.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {company.team_members.length > 5 && (
                <p className={styles.moreMembers}>
                  +{company.team_members.length - 5} more members
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
