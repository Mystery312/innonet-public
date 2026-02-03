import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { BackButton } from '../../components/common/BackButton';
import { communitiesApi } from '../../features/communities/api/communitiesApi';
import type { Community, CommunityCategory } from '../../types/community';
import styles from './CommunitiesPage.module.css';

const CATEGORIES: { value: CommunityCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'design', label: 'Design' },
  { value: 'data_science', label: 'Data Science' },
  { value: 'ai_ml', label: 'AI & ML' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'career', label: 'Career' },
  { value: 'project', label: 'Projects' },
  { value: 'general', label: 'General' },
];

export const CommunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showMyCommunities, setShowMyCommunities] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadCommunities = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await communitiesApi.getCommunities({
        page,
        limit: 12,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        my_communities: showMyCommunities || undefined,
      });
      setCommunities(response.communities);
      setTotalPages(response.pages);
    } catch (error) {
      console.error('Failed to load communities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedCategory, searchQuery, showMyCommunities]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCommunities();
  };

  const getCategoryColor = (category: string): 'primary' | 'success' | 'warning' | 'default' => {
    switch (category) {
      case 'technology':
      case 'ai_ml':
        return 'primary';
      case 'business':
      case 'entrepreneurship':
        return 'success';
      case 'design':
        return 'warning';
      default:
        return 'default';
    }
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
              <h1 className={styles.title}>Communities</h1>
              <p className={styles.subtitle}>
                Join interest-based communities to discuss, learn, and collaborate
              </p>
            </div>
            <Button onClick={() => navigate('/communities/create')}>
              Create Community
            </Button>
          </div>

          <div className={styles.filters}>
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search communities..."
                className={styles.searchInput}
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <div className={styles.filterRow}>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className={styles.categorySelect}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showMyCommunities}
                  onChange={(e) => {
                    setShowMyCommunities(e.target.checked);
                    setPage(1);
                  }}
                />
                My Communities
              </label>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loading}>Loading communities...</div>
          ) : communities.length === 0 ? (
            <div className={styles.empty}>
              <h3>No communities found</h3>
              <p>Try adjusting your filters or create a new community.</p>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {communities.map((community) => (
                  <Link
                    key={community.id}
                    to={`/communities/${community.id}`}
                    className={styles.card}
                  >
                    <div className={styles.cardImage}>
                      {community.image_url ? (
                        <img src={community.image_url} alt={community.name} />
                      ) : (
                        <div className={styles.cardImagePlaceholder}>
                          {community.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className={styles.cardContent}>
                      <Badge
                        variant={getCategoryColor(community.category)}
                        size="small"
                      >
                        {community.category.replace('_', ' ')}
                      </Badge>
                      <h3 className={styles.cardTitle}>{community.name}</h3>
                      {community.description && (
                        <p className={styles.cardDescription}>
                          {community.description.slice(0, 100)}
                          {community.description.length > 100 ? '...' : ''}
                        </p>
                      )}
                      <div className={styles.cardStats}>
                        <span>{community.member_count} members</span>
                        <span>{community.post_count} posts</span>
                      </div>
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

export default CommunitiesPage;
