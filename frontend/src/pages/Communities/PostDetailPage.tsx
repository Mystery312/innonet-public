import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { BackButton } from '../../components/common/BackButton';
import { communitiesApi } from '../../features/communities/api/communitiesApi';
import type { Post, Comment, CommunityDetail } from '../../types/community';
import styles from './PostDetailPage.module.css';

export const PostDetailPage: React.FC = () => {
  const { communityId, postId } = useParams<{ communityId: string; postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const loadData = useCallback(async () => {
    if (!communityId || !postId) return;
    setIsLoading(true);
    try {
      const [postData, communityData, commentsData] = await Promise.all([
        communitiesApi.getPost(communityId, postId),
        communitiesApi.getCommunity(communityId),
        communitiesApi.getComments(communityId, postId),
      ]);
      setPost(postData);
      setCommunity(communityData);
      setComments(commentsData.comments);
    } catch {
      setError('Failed to load post');
    } finally {
      setIsLoading(false);
    }
  }, [communityId, postId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVote = async (value: number) => {
    if (!communityId || !postId || !post) return;
    try {
      const updated = await communitiesApi.votePost(communityId, postId, value);
      setPost(updated);
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleComment = async () => {
    if (!communityId || !postId || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await communitiesApi.createComment(communityId, postId, {
        content: newComment,
      });
      setComments((prev) => [created, ...prev]);
      setNewComment('');
      if (post) setPost({ ...post, comment_count: post.comment_count + 1 });
    } catch (err) {
      console.error('Failed to create comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!communityId || !postId || !replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await communitiesApi.createComment(communityId, postId, {
        content: replyContent,
        parent_id: parentId,
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, replies: [...c.replies, created] } : c
        )
      );
      setReplyTo(null);
      setReplyContent('');
      if (post) setPost({ ...post, comment_count: post.comment_count + 1 });
    } catch (err) {
      console.error('Failed to reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main className={styles.main}>
          <div className={styles.loading}>Loading post...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main className={styles.main}>
          <div className={styles.error}>
            <h2>Post not found</h2>
            <p>{error || 'This post may have been removed.'}</p>
            <Button onClick={() => navigate(communityId ? `/communities/${communityId}` : '/communities')}>
              Back to Community
            </Button>
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
          <div className={styles.backNav}>
            <BackButton
              label={community ? `Back to ${community.name}` : 'Back to Community'}
              fallbackPath={`/communities/${communityId}`}
            />
          </div>

          {/* Community context */}
          {community && (
            <Link to={`/communities/${communityId}`} className={styles.communityBadge}>
              <div className={styles.communityIcon}>
                {community.name.charAt(0).toUpperCase()}
              </div>
              <span>{community.name}</span>
            </Link>
          )}

          <div className={styles.layout}>
            {/* Main post */}
            <div className={styles.postSection}>
              <div className={styles.postCard}>
                <div className={styles.postVotes}>
                  <button
                    className={`${styles.voteButton} ${post.user_vote === 1 ? styles.upvoted : ''}`}
                    onClick={() => handleVote(post.user_vote === 1 ? 0 : 1)}
                  >
                    ▲
                  </button>
                  <span className={styles.voteCount}>{post.upvote_count}</span>
                  <button
                    className={`${styles.voteButton} ${post.user_vote === -1 ? styles.downvoted : ''}`}
                    onClick={() => handleVote(post.user_vote === -1 ? 0 : -1)}
                  >
                    ▼
                  </button>
                </div>

                <div className={styles.postBody}>
                  <div className={styles.postMeta}>
                    <Avatar
                      name={post.author?.full_name || 'Anonymous'}
                      src={post.author?.avatar_url}
                      size="small"
                    />
                    <span className={styles.authorName}>{post.author?.full_name || 'Anonymous'}</span>
                    <span className={styles.dot}>·</span>
                    <span>{formatDate(post.created_at)}</span>
                    {post.is_pinned && <Badge variant="primary" size="small">Pinned</Badge>}
                    {post.is_locked && <Badge variant="warning" size="small">Locked</Badge>}
                  </div>

                  <h1 className={styles.postTitle}>{post.title}</h1>

                  <div className={styles.postContent}>
                    {post.content.split('\n').map((paragraph, i) => (
                      <p key={i}>{paragraph || '\u00A0'}</p>
                    ))}
                  </div>

                  <div className={styles.postStats}>
                    <span>{post.comment_count} comments</span>
                    <span>{post.view_count} views</span>
                  </div>
                </div>
              </div>

              {/* Comment form */}
              {!post.is_locked && (
                <div className={styles.commentForm}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                    className={styles.textarea}
                  />
                  <div className={styles.commentFormActions}>
                    <Button
                      onClick={handleComment}
                      disabled={isSubmitting || !newComment.trim()}
                      size="sm"
                    >
                      {isSubmitting ? 'Posting...' : 'Comment'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className={styles.comments}>
                <h3 className={styles.commentsTitle}>
                  {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                </h3>

                {comments.length === 0 ? (
                  <p className={styles.noComments}>No comments yet. Be the first to share your thoughts!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className={styles.commentCard}>
                      <div className={styles.commentHeader}>
                        <Avatar
                          name={comment.author?.full_name || 'Anonymous'}
                          src={comment.author?.avatar_url}
                          size="small"
                        />
                        <span className={styles.commentAuthor}>
                          {comment.author?.full_name || 'Anonymous'}
                        </span>
                        <span className={styles.dot}>·</span>
                        <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
                      </div>
                      <div className={styles.commentBody}>{comment.content}</div>
                      {!post.is_locked && (
                        <button
                          className={styles.replyButton}
                          onClick={() => {
                            setReplyTo(replyTo === comment.id ? null : comment.id);
                            setReplyContent('');
                          }}
                        >
                          Reply
                        </button>
                      )}

                      {/* Reply form */}
                      {replyTo === comment.id && (
                        <div className={styles.replyForm}>
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={`Reply to ${comment.author?.full_name || 'Anonymous'}...`}
                            rows={2}
                            className={styles.textarea}
                          />
                          <div className={styles.replyFormActions}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setReplyTo(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleReply(comment.id)}
                              disabled={isSubmitting || !replyContent.trim()}
                            >
                              Reply
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Nested replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className={styles.replies}>
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className={styles.replyCard}>
                              <div className={styles.commentHeader}>
                                <Avatar
                                  name={reply.author?.full_name || 'Anonymous'}
                                  src={reply.author?.avatar_url}
                                  size="small"
                                />
                                <span className={styles.commentAuthor}>
                                  {reply.author?.full_name || 'Anonymous'}
                                </span>
                                <span className={styles.dot}>·</span>
                                <span className={styles.commentDate}>{formatDate(reply.created_at)}</span>
                              </div>
                              <div className={styles.commentBody}>{reply.content}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar */}
            {community && (
              <aside className={styles.sidebar}>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>About {community.name}</h3>
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
                  <Link to={`/communities/${communityId}`} className={styles.viewCommunity}>
                    View Community
                  </Link>
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PostDetailPage;
