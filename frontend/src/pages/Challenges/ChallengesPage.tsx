import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { BackButton } from '../../components/common/BackButton';
import { companiesApi } from '../../features/companies/api/companiesApi';
import type { Challenge, ChallengeDifficulty } from '../../types/company';
import styles from './ChallengesPage.module.css';

const DIFFICULTIES: { value: ChallengeDifficulty | ''; label: string }[] = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const ChallengesPage: React.FC = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadChallenges = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await companiesApi.getChallenges({
        page,
        limit: 12,
        difficulty: selectedDifficulty || undefined,
        search: searchQuery || undefined,
      });
      setChallenges(response.challenges);
      setTotalPages(response.pages);
    } catch (error) {
      console.error('Failed to load challenges:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedDifficulty, searchQuery]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadChallenges();
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

  const formatDeadline = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Closed';
    if (days === 0) return 'Closes today';
    if (days === 1) return 'Closes tomorrow';
    if (days < 7) return `${days} days left`;
    return date.toLocaleDateString();
  };

  const formatReward = (amount?: number) => {
    if (!amount) return null;
    return `$${(amount / 100).toLocaleString()}`;
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.backNav}>
            <BackButton fallbackPath="/events" />
          </div>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Innovation Challenges</h1>
              <p className={styles.subtitle}>
                Solve real problems from companies and build your portfolio
              </p>
            </div>
            <Button onClick={() => navigate('/companies')}>
              View Companies
            </Button>
          </div>

          <div className={styles.filters}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search challenges..."
                className={styles.searchInput}
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <div className={styles.filterRow}>
              <select
                value={selectedDifficulty}
                onChange={(e) => {
                  setSelectedDifficulty(e.target.value);
                  setPage(1);
                }}
                className={styles.difficultySelect}
              >
                {DIFFICULTIES.map((diff) => (
                  <option key={diff.value} value={diff.value}>
                    {diff.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loading}>Loading challenges...</div>
          ) : challenges.length === 0 ? (
            <div className={styles.empty}>
              <h3>No challenges found</h3>
              <p>Check back later for new opportunities.</p>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {challenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    to={`/challenges/${challenge.id}`}
                    className={styles.card}
                  >
                    <div className={styles.cardHeader}>
                      <Badge variant={getDifficultyColor(challenge.difficulty)}>
                        {challenge.difficulty}
                      </Badge>
                      {challenge.reward_amount && (
                        <span className={styles.reward}>
                          {formatReward(challenge.reward_amount)}
                        </span>
                      )}
                    </div>
                    <h3 className={styles.cardTitle}>{challenge.title}</h3>
                    <p className={styles.cardDescription}>
                      {challenge.description.slice(0, 150)}
                      {challenge.description.length > 150 ? '...' : ''}
                    </p>
                    {challenge.company && (
                      <div className={styles.company}>
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
                      </div>
                    )}
                    <div className={styles.cardFooter}>
                      <span className={styles.duration}>
                        {challenge.duration_weeks} weeks
                      </span>
                      <span className={styles.deadline}>
                        {formatDeadline(challenge.application_deadline)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className={styles.pageInfo}>
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChallengesPage;
