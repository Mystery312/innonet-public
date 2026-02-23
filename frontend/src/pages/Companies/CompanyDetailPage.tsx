import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { BackButton } from '../../components/common/BackButton';
import { useAuth } from '../../context/AuthContext';
import { companiesApi } from '../../features/companies/api/companiesApi';
import { formatError } from '../../utils/error';
import type {
  CompanyDetail,
  CompanySize,
  Challenge,
  ChallengeCreate,
  CompanyMember,
} from '../../types/company';
import type { Event, EventCreate, EventUpdate } from '../../types/events';
import { eventsApi } from '../../features/events/api/eventsApi';
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

// Modal Component
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.modalContent}>{children}</div>
      </div>
    </div>
  );
};

export const CompanyDetailPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [companyEvents, setCompanyEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal states
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Form states
  const [challengeForm, setChallengeForm] = useState<ChallengeCreate>({
    title: '',
    description: '',
    difficulty: 'intermediate',
    duration_weeks: 4,
  });
  const [eventForm, setEventForm] = useState<EventCreate>({
    name: '',
    start_datetime: '',
  });
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadCompany = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const [companyData, challengesData, eventsData] = await Promise.all([
        companiesApi.getCompany(companyId),
        companiesApi.getChallenges({ company_id: companyId, limit: 50 }),
        eventsApi.getCompanyEvents(companyId, { limit: 50 }),
      ]);
      setCompany(companyData);
      setAllChallenges(challengesData.challenges);
      setCompanyEvents(eventsData.events);

      // Check if current user is admin
      if (user) {
        const isUserAdmin = companyData.team_members.some(
          (member) => member.user_id === user.id && member.role === 'admin'
        );
        setIsAdmin(isUserAdmin);
      }
    } catch (err) {
      console.error('Failed to load company:', err);
      setError('Failed to load company details');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, user]);

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

  // Admin Actions
  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setIsSubmitting(true);
    setActionError('');
    try {
      await companiesApi.createChallenge(companyId, challengeForm);
      setShowChallengeModal(false);
      setChallengeForm({
        title: '',
        description: '',
        difficulty: 'intermediate',
        duration_weeks: 4,
      });
      await loadCompany();
    } catch (err) {
      console.error('Create challenge error:', err);
      setActionError(formatError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setIsSubmitting(true);
    setActionError('');
    try {
      // Clean up form data - remove empty strings for optional fields
      const cleanedData: EventCreate = {
        name: eventForm.name,
        start_datetime: eventForm.start_datetime,
      };
      if (eventForm.description) cleanedData.description = eventForm.description;
      if (eventForm.event_type) cleanedData.event_type = eventForm.event_type;
      if (eventForm.location_name) cleanedData.location_name = eventForm.location_name;
      if (eventForm.location_city) cleanedData.location_city = eventForm.location_city;
      if (eventForm.virtual_meeting_url) cleanedData.virtual_meeting_url = eventForm.virtual_meeting_url;

      await companiesApi.createEvent(companyId, cleanedData);
      setShowEventModal(false);
      setEventForm({ name: '', start_datetime: '' });
      await loadCompany(); // Reload to show new event
    } catch (err) {
      console.error('Create event error:', err);
      setActionError(formatError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEditEventModal(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setIsSubmitting(true);
    setActionError('');
    try {
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);

      const updateData: EventUpdate = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
        event_type: formData.get('event_type') as string || undefined,
        location_name: formData.get('location_name') as string || undefined,
        location_city: formData.get('location_city') as string || undefined,
        virtual_meeting_url: formData.get('virtual_meeting_url') as string || undefined,
      };

      const startDatetime = formData.get('start_datetime') as string;
      if (startDatetime) {
        updateData.start_datetime = startDatetime;
      }

      await companiesApi.updateEvent(editingEvent.id, updateData);
      setShowEditEventModal(false);
      setEditingEvent(null);
      await loadCompany();
    } catch (err) {
      console.error('Update event error:', err);
      setActionError(formatError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newMemberId) return;

    setIsSubmitting(true);
    setActionError('');
    try {
      await companiesApi.addMember(companyId, {
        user_id: newMemberId,
        role: newMemberRole,
      });
      setShowAddMemberModal(false);
      setNewMemberId('');
      setNewMemberRole('member');
      await loadCompany();
    } catch (err) {
      console.error('Add member error:', err);
      setActionError(formatError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMemberRole = async (member: CompanyMember, newRole: 'admin' | 'member') => {
    if (!companyId) return;

    try {
      await companiesApi.updateMember(companyId, member.id, { role: newRole });
      await loadCompany();
    } catch (err) {
      console.error('Update member role error:', err);
      alert(formatError(err));
    }
  };

  const handleRemoveMember = async (member: CompanyMember) => {
    if (!companyId) return;

    if (!confirm(`Are you sure you want to remove ${member.user?.full_name || 'this member'}?`)) {
      return;
    }

    try {
      await companiesApi.removeMember(companyId, member.id);
      await loadCompany();
    } catch (err) {
      console.error('Remove member error:', err);
      alert(formatError(err));
    }
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
              {isAdmin && <Badge variant="primary">Admin</Badge>}
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

      {/* Admin Controls */}
      {isAdmin && (
        <div className={styles.adminControls}>
          <h3>Admin Actions</h3>
          <div className={styles.adminButtons}>
            <Button onClick={() => setShowChallengeModal(true)}>Create Challenge</Button>
            <Button variant="secondary" onClick={() => setShowEventModal(true)}>
              Create Event
            </Button>
            <Button variant="secondary" onClick={() => setShowAddMemberModal(true)}>
              Add Team Member
            </Button>
          </div>
        </div>
      )}

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
                        variant={(DIFFICULTY_COLORS[challenge.difficulty] as any) || 'default'}
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

          {/* Company Events Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Events</h2>
              <span className={styles.count}>{companyEvents.length}</span>
            </div>
            {companyEvents.length > 0 ? (
              <div className={styles.challengesList}>
                {companyEvents.map((event) => (
                  <div key={event.id} className={styles.challengeCard}>
                    <div className={styles.challengeHeader}>
                      <Link to={`/events/${event.id}`}>
                        <h3>{event.name}</h3>
                      </Link>
                      <div className={styles.eventActions}>
                        {event.event_type && (
                          <Badge variant="primary" size="small">
                            {event.event_type}
                          </Badge>
                        )}
                        {event.virtual_meeting_url && (
                          <Badge variant="success" size="small">
                            Virtual
                          </Badge>
                        )}
                        {isAdmin && (
                          <button
                            className={styles.editBtn}
                            onClick={() => handleEditEvent(event)}
                            title="Edit Event"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className={styles.challengeDescription}>
                      {event.description || 'No description'}
                    </p>
                    <div className={styles.challengeMeta}>
                      <span>{formatDate(event.start_datetime)}</span>
                      {event.location_city && <span>{event.location_city}</span>}
                      {event.virtual_meeting_url && <span>Join link available</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyMessage}>No events at the moment.</p>
            )}
          </section>
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
                {company.team_members.map((member) => (
                  <div key={member.id} className={styles.teamMember}>
                    <Avatar
                      name={member.user?.full_name || 'Member'}
                      src={member.user?.avatar_url}
                      size="small"
                    />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>
                        {member.user?.full_name || 'Team Member'}
                      </span>
                      <span className={styles.memberRole}>
                        {member.title || member.role}
                        {member.role === 'admin' && ' (Admin)'}
                      </span>
                    </div>
                    {isAdmin && member.user_id !== user?.id && (
                      <div className={styles.memberActions}>
                        {member.role === 'member' ? (
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleUpdateMemberRole(member, 'admin')}
                            title="Promote to Admin"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleUpdateMemberRole(member, 'member')}
                            title="Demote to Member"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                          </button>
                        )}
                        <button
                          className={`${styles.actionBtn} ${styles.dangerBtn}`}
                          onClick={() => handleRemoveMember(member)}
                          title="Remove Member"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Create Challenge Modal */}
      <Modal
        isOpen={showChallengeModal}
        onClose={() => {
          setShowChallengeModal(false);
          setActionError('');
        }}
        title="Create Challenge"
      >
        <form onSubmit={handleCreateChallenge} className={styles.form}>
          {actionError && <div className={styles.formError}>{actionError}</div>}
          <div className={styles.formGroup}>
            <label htmlFor="challenge-title">Title *</label>
            <input
              id="challenge-title"
              type="text"
              value={challengeForm.title}
              onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
              required
              minLength={5}
              placeholder="Enter challenge title"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="challenge-description">Description *</label>
            <textarea
              id="challenge-description"
              value={challengeForm.description}
              onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
              required
              minLength={20}
              rows={4}
              placeholder="Describe the challenge"
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="challenge-difficulty">Difficulty</label>
              <select
                id="challenge-difficulty"
                value={challengeForm.difficulty}
                onChange={(e) =>
                  setChallengeForm({
                    ...challengeForm,
                    difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced',
                  })
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="challenge-duration">Duration (weeks)</label>
              <input
                id="challenge-duration"
                type="number"
                value={challengeForm.duration_weeks}
                onChange={(e) =>
                  setChallengeForm({ ...challengeForm, duration_weeks: parseInt(e.target.value) })
                }
                min={1}
                max={52}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="challenge-reward">Reward Amount ($)</label>
            <input
              id="challenge-reward"
              type="number"
              value={challengeForm.reward_amount || ''}
              onChange={(e) =>
                setChallengeForm({
                  ...challengeForm,
                  reward_amount: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="Optional"
            />
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setShowChallengeModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Challenge'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Event Modal */}
      <Modal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setActionError('');
        }}
        title="Create Event"
      >
        <form onSubmit={handleCreateEvent} className={styles.form}>
          {actionError && <div className={styles.formError}>{actionError}</div>}
          <div className={styles.formGroup}>
            <label htmlFor="event-name">Event Name *</label>
            <input
              id="event-name"
              type="text"
              value={eventForm.name}
              onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
              required
              placeholder="Enter event name"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="event-description">Description</label>
            <textarea
              id="event-description"
              value={eventForm.description || ''}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              rows={3}
              placeholder="Describe the event"
            />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="event-type">Event Type</label>
              <select
                id="event-type"
                value={eventForm.event_type || ''}
                onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
              >
                <option value="">Select type</option>
                <option value="hackathon">Hackathon</option>
                <option value="meetup">Meetup</option>
                <option value="workshop">Workshop</option>
                <option value="conference">Conference</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="event-datetime">Start Date/Time *</label>
              <input
                id="event-datetime"
                type="datetime-local"
                value={eventForm.start_datetime}
                onChange={(e) => setEventForm({ ...eventForm, start_datetime: e.target.value })}
                required
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="event-location">Location</label>
            <input
              id="event-location"
              type="text"
              value={eventForm.location_name || ''}
              onChange={(e) => setEventForm({ ...eventForm, location_name: e.target.value })}
              placeholder="Event location"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="event-city">City</label>
            <input
              id="event-city"
              type="text"
              value={eventForm.location_city || ''}
              onChange={(e) => setEventForm({ ...eventForm, location_city: e.target.value })}
              placeholder="City"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="event-virtual-url">Virtual Meeting URL</label>
            <input
              id="event-virtual-url"
              type="url"
              value={eventForm.virtual_meeting_url || ''}
              onChange={(e) => setEventForm({ ...eventForm, virtual_meeting_url: e.target.value })}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
            />
            <small className={styles.formHint}>
              Add a link for virtual attendees (Zoom, Google Meet, etc.)
            </small>
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setShowEventModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        isOpen={showEditEventModal}
        onClose={() => {
          setShowEditEventModal(false);
          setEditingEvent(null);
          setActionError('');
        }}
        title="Edit Event"
      >
        {editingEvent && (
          <form onSubmit={handleUpdateEvent} className={styles.form}>
            {actionError && <div className={styles.formError}>{actionError}</div>}
            <div className={styles.formGroup}>
              <label htmlFor="edit-event-name">Event Name *</label>
              <input
                id="edit-event-name"
                name="name"
                type="text"
                defaultValue={editingEvent.name}
                required
                placeholder="Enter event name"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="edit-event-description">Description</label>
              <textarea
                id="edit-event-description"
                name="description"
                defaultValue={editingEvent.description || ''}
                rows={3}
                placeholder="Describe the event"
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="edit-event-type">Event Type</label>
                <select
                  id="edit-event-type"
                  name="event_type"
                  defaultValue={editingEvent.event_type || ''}
                >
                  <option value="">Select type</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="meetup">Meetup</option>
                  <option value="workshop">Workshop</option>
                  <option value="conference">Conference</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-event-datetime">Start Date/Time *</label>
                <input
                  id="edit-event-datetime"
                  name="start_datetime"
                  type="datetime-local"
                  defaultValue={editingEvent.start_datetime?.slice(0, 16)}
                  required
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="edit-event-location">Location</label>
              <input
                id="edit-event-location"
                name="location_name"
                type="text"
                defaultValue={editingEvent.location_name || ''}
                placeholder="Event location"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="edit-event-city">City</label>
              <input
                id="edit-event-city"
                name="location_city"
                type="text"
                defaultValue={editingEvent.location_city || ''}
                placeholder="City"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="edit-event-virtual-url">Virtual Meeting URL</label>
              <input
                id="edit-event-virtual-url"
                name="virtual_meeting_url"
                type="url"
                defaultValue={editingEvent.virtual_meeting_url || ''}
                placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              />
              <small className={styles.formHint}>
                Add a link for virtual attendees (Zoom, Google Meet, etc.)
              </small>
            </div>
            <div className={styles.formActions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowEditEventModal(false);
                  setEditingEvent(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setActionError('');
        }}
        title="Add Team Member"
      >
        <form onSubmit={handleAddMember} className={styles.form}>
          {actionError && <div className={styles.formError}>{actionError}</div>}
          <p className={styles.formHint}>
            To add a team member, they must already have an account. Enter their user ID (found on
            their profile page).
          </p>
          <div className={styles.formGroup}>
            <label htmlFor="member-id">User ID *</label>
            <input
              id="member-id"
              type="text"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              required
              placeholder="Enter user's ID (UUID)"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="member-role">Role</label>
            <select
              id="member-role"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'member')}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={() => setShowAddMemberModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CompanyDetailPage;
