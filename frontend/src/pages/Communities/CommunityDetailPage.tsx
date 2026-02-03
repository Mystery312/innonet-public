import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Avatar } from '../../components/common/Avatar';
import { BackButton } from '../../components/common/BackButton';
import { communitiesApi } from '../../features/communities/api/communitiesApi';
import type { CommunityDetail, Post, Member, PostCreate } from '../../types/community';
import styles from './CommunityDetailPage.module.css';

export const CommunityDetailPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'top' | 'hot'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [newPost, setNewPost] = useState<PostCreate>({ title: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCommunity = useCallback(async () => {
    if (!communityId) return;
    try {
      const data = await communitiesApi.getCommunity(communityId);
      setCommunity(data);
    } catch {
      setError('Failed to load community');
    }
  }, [communityId]);

  const loadPosts = useCallback(async () => {
    if (!communityId) return;
    try {
      const response = await communitiesApi.getPosts(communityId, {
        page,
        limit: 20,
        sort_by: sortBy,
      });
      setPosts(response.posts);
      setTotalPages(response.pages);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  }, [communityId, page, sortBy]);

  const loadMembers = useCallback(async () => {
    if (!communityId) return;
    try {
      const response = await communitiesApi.getMembers(communityId, 10);
      setMembers(response.members);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }, [communityId]);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await loadCommunity();
      await Promise.all([loadPosts(), loadMembers()]);
      setIsLoading(false);
    };
    loadAll();
  }, [loadCommunity, loadPosts, loadMembers]);

  const handleJoin = async () => {
    if (!communityId || !community) return;
    setIsJoining(true);
    try {
      if (community.is_member) {
        await communitiesApi.leaveCommunity(communityId);
        setCommunity({ ...community, is_member: false, member_count: community.member_count - 1 });
      } else {
        await communitiesApi.joinCommunity(communityId);
        setCommunity({ ...community, is_member: true, user_role: 'member', member_count: community.member_count + 1 });
      }
    } catch (error) {
      console.error('Failed to join/leave community:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreatePost = async () => {
    if (!communityId || !newPost.title || !newPost.content) return;
    setIsSubmitting(true);
    try {
      const created = await communitiesApi.createPost(communityId, newPost);
      setPosts((prev) => [created, ...prev]);
      setNewPost({ title: '', content: '' });
      setIsCreatePostOpen(false);
      if (community) {
        setCommunity({ ...community, post_count: community.post_count + 1 });
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (postId: string, value: number) => {
    if (!communityId) return;
    try {
      const updated = await communitiesApi.votePost(communityId, postId, value);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? updated : p))
      );
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main className={styles.main}>
          <div className={styles.loading}>Loading community...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main className={styles.main}>
          <div className={styles.error}>
            <h2>Community not found</h2>
            <p>{error || 'This community may have been removed or you may not have access.'}</p>
            <Button onClick={() => navigate('/communities')}>Browse Communities</Button>
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
        {/* Back Navigation */}
        <div className={styles.backNav}>
          <BackButton label="Back to Communities" fallbackPath="/communities" />
        </div>

        {/* Banner */}
        <div className={styles.banner}>
          {community.banner_url ? (
            <img src={community.banner_url} alt="" className={styles.bannerImage} />
          ) : (
            <div className={styles.bannerPlaceholder} />
          )}
        </div>

        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerImage}>
              {community.image_url ? (
                <img src={community.image_url} alt={community.name} />
              ) : (
                <div className={styles.headerImagePlaceholder}>
                  {community.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.title}>{community.name}</h1>
              <div className={styles.meta}>
                <Badge variant="default">{community.category.replace('_', ' ')}</Badge>
                <span>{community.member_count} members</span>
                <span>{community.post_count} posts</span>
                {community.is_private && <Badge variant="warning">Private</Badge>}
              </div>
              {community.description && (
                <p className={styles.description}>{community.description}</p>
              )}
            </div>
            <div className={styles.headerActions}>
              <Button
                variant={community.is_member ? 'secondary' : 'primary'}
                onClick={handleJoin}
                disabled={isJoining || community.user_role === 'owner'}
              >
                {isJoining
                  ? '...'
                  : community.user_role === 'owner'
                  ? 'Owner'
                  : community.is_member
                  ? 'Leave'
                  : 'Join'}
              </Button>
            </div>
          </div>

          <div className={styles.layout}>
            {/* Main content */}
            <div className={styles.content}>
              {/* Create Post */}
              {community.is_member && (
                <div className={styles.createPost}>
                  <button
                    className={styles.createPostButton}
                    onClick={() => setIsCreatePostOpen(true)}
                  >
                    Create a post...
                  </button>
                </div>
              )}

              {/* Sort options */}
              <div className={styles.sortOptions}>
                {(['newest', 'top', 'hot'] as const).map((option) => (
                  <button
                    key={option}
                    className={`${styles.sortButton} ${sortBy === option ? styles.active : ''}`}
                    onClick={() => {
                      setSortBy(option);
                      setPage(1);
                    }}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>

              {/* Posts */}
              <div className={styles.posts}>
                {posts.length === 0 ? (
                  <div className={styles.noPosts}>
                    <p>No posts yet. Be the first to start a discussion!</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className={styles.postCard}>
                      <div className={styles.postVotes}>
                        <button
                          className={`${styles.voteButton} ${post.user_vote === 1 ? styles.upvoted : ''}`}
                          onClick={() => handleVote(post.id, post.user_vote === 1 ? 0 : 1)}
                        >
                          ▲
                        </button>
                        <span className={styles.voteCount}>{post.upvote_count}</span>
                        <button
                          className={`${styles.voteButton} ${post.user_vote === -1 ? styles.downvoted : ''}`}
                          onClick={() => handleVote(post.id, post.user_vote === -1 ? 0 : -1)}
                        >
                          ▼
                        </button>
                      </div>
                      <div className={styles.postContent}>
                        <div className={styles.postMeta}>
                          <span>Posted by {post.author?.full_name || 'Anonymous'}</span>
                          <span>{formatDate(post.created_at)}</span>
                          {post.is_pinned && <Badge variant="primary" size="small">Pinned</Badge>}
                        </div>
                        <Link
                          to={`/communities/${communityId}/posts/${post.id}`}
                          className={styles.postTitle}
                        >
                          {post.title}
                        </Link>
                        <p className={styles.postPreview}>
                          {post.content.slice(0, 200)}
                          {post.content.length > 200 ? '...' : ''}
                        </p>
                        <div className={styles.postStats}>
                          <span>{post.comment_count} comments</span>
                          <span>{post.view_count} views</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span>Page {page} of {totalPages}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
              {/* About */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>About Community</h3>
                <p className={styles.cardText}>
                  {community.description || 'No description available.'}
                </p>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatValue}>{community.member_count}</span>
                  <span className={styles.cardStatLabel}>Members</span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatValue}>{community.post_count}</span>
                  <span className={styles.cardStatLabel}>Posts</span>
                </div>
                <div className={styles.cardStat}>
                  <span className={styles.cardStatLabel}>
                    Created {new Date(community.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Members */}
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Members</h3>
                <div className={styles.membersList}>
                  {members.map((member) => (
                    <div key={member.id} className={styles.memberItem}>
                      <Avatar
                        name={member.user?.full_name || 'User'}
                        src={member.user?.avatar_url}
                        size="small"
                      />
                      <div>
                        <span className={styles.memberName}>
                          {member.user?.full_name || 'User'}
                        </span>
                        {member.role !== 'member' && (
                          <Badge variant="default" size="small">
                            {member.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />

      {/* Create Post Modal */}
      <Modal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        title="Create Post"
        size="large"
      >
        <div className={styles.createPostForm}>
          <div className={styles.formGroup}>
            <label>Title</label>
            <Input
              value={newPost.title}
              onChange={(e) => setNewPost((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Enter a title for your post..."
            />
          </div>
          <div className={styles.formGroup}>
            <label>Content</label>
            <textarea
              value={newPost.content}
              onChange={(e) => setNewPost((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Write your post content..."
              rows={8}
              className={styles.textarea}
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsCreatePostOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePost}
              disabled={isSubmitting || !newPost.title || !newPost.content}
            >
              {isSubmitting ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CommunityDetailPage;
