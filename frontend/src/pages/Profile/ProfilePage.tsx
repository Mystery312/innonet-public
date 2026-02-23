import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Avatar } from '../../components/common/Avatar';
import { Tabs, TabPanel } from '../../components/common/Tabs';
import { BackButton } from '../../components/common/BackButton';
import { profileApi, aiApi } from '../../features/profile/api/profileApi';
import { graphApi } from '../../features/graph/api/graphApi';
import { networkApi } from '../../features/network/api/networkApi';
import { useAuth } from '../../context/AuthContext';
import { formatError } from '../../utils/error';
import type { FullProfile, ProfileAnalysis, PublicProfile } from '../../types/profile';
import type { SimilarProfile } from '../../features/graph/types/graph';
import styles from './ProfilePage.module.css';

// Type guard to check if profile is FullProfile
const isFullProfile = (profile: FullProfile | PublicProfile): profile is FullProfile => {
  return 'user' in profile && 'profile' in profile;
};

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<FullProfile | PublicProfile | null>(null);
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [similarUsers, setSimilarUsers] = useState<SimilarProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Determine if viewing own profile
  const isOwnProfile = !userId || userId === currentUser?.id;

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isOwnProfile) {
          // Load own profile with full data
          const [profileData, analysisData, similarData] = await Promise.all([
            profileApi.getMyProfile(),
            aiApi.analyzeProfile().catch(() => null),
            graphApi.getSimilarProfiles({ limit: 6, minSimilarity: 0.5 }).catch(() => ({ profiles: [], total: 0, query_user_id: '' })),
          ]);
          setProfile(profileData);
          setAnalysis(analysisData);
          setSimilarUsers(similarData.profiles);
        } else {
          // Load public profile
          const profileData = await profileApi.getPublicProfile(userId!);
          setProfile(profileData);

          // Check connection status if viewing another user
          try {
            const connections = await networkApi.getConnections();
            const connection = connections.connections.find(
              (conn) => conn.user.id === profileData.user_id
            );
            setConnectionStatus(connection ? 'accepted' : null);
          } catch (err) {
            console.error('Failed to load connection status:', formatError(err));
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', formatError(err));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [userId, isOwnProfile]);

  const handleConnect = async () => {
    if (!profile || isOwnProfile || isFullProfile(profile)) return;

    setIsConnecting(true);
    try {
      await networkApi.sendConnectionRequest(profile.user_id);
      setConnectionStatus('pending');
    } catch (err) {
      console.error('Failed to send connection request:', err);
      alert(formatError(err));
    } finally {
      setIsConnecting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Helper functions to get profile data regardless of type
  const getDisplayName = () => {
    if (!profile) return '';
    if (isFullProfile(profile)) {
      return profile.profile?.full_name || profile.user.username;
    }
    return profile.full_name || profile.username;
  };

  const getUsername = () => {
    if (!profile) return '';
    if (isFullProfile(profile)) {
      return profile.user.username;
    }
    return profile.username;
  };

  const getLocation = () => {
    if (!profile) return null;
    if (isFullProfile(profile)) {
      return profile.profile?.location;
    }
    return profile.location;
  };

  const getBio = () => {
    if (!profile) return null;
    if (isFullProfile(profile)) {
      return profile.profile?.bio;
    }
    return profile.bio;
  };

  const getProfileImageUrl = () => {
    if (!profile) return null;
    if (isFullProfile(profile)) {
      return profile.profile?.profile_image_url;
    }
    return profile.profile_image_url;
  };

  const getLinkedinUrl = () => {
    if (!profile) return null;
    if (isFullProfile(profile)) {
      return profile.profile?.linkedin_url;
    }
    return profile.linkedin_url;
  };

  const getGithubUrl = () => {
    if (!profile) return null;
    if (isFullProfile(profile)) {
      return profile.profile?.github_url;
    }
    return profile.github_url;
  };

  const getPortfolioUrl = () => {
    if (!profile) return null;
    if (isFullProfile(profile)) {
      return profile.profile?.portfolio_url;
    }
    return profile.portfolio_url;
  };

  if (isLoading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (!profile) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Profile Not Found</h2>
          <p>This profile doesn't exist or you don't have permission to view it</p>
          <Button onClick={() => navigate('/discover')}>Find People</Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'experience', label: 'Experience', count: profile.work_experience.length },
    { id: 'projects', label: 'Projects', count: profile.projects.length },
    { id: 'education', label: 'Education', count: profile.education.length },
  ];

  const displayName = getDisplayName();
  const username = getUsername();
  const location = getLocation();
  const bio = getBio();
  const profileImageUrl = getProfileImageUrl();
  const linkedinUrl = getLinkedinUrl();
  const githubUrl = getGithubUrl();
  const portfolioUrl = getPortfolioUrl();

  return (
    <div className={styles.container}>
      {/* Back Button */}
      {!isOwnProfile && (
        <div className={styles.backNav}>
          <BackButton fallbackPath="/discover" />
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Avatar
            name={displayName}
            src={profileImageUrl}
            size="xlarge"
          />
          <div className={styles.headerInfo}>
            <h1>{displayName}</h1>
            <p className={styles.username}>@{username}</p>
            {location && (
              <p className={styles.location}>{location}</p>
            )}
            {bio && (
              <p className={styles.bio}>{bio}</p>
            )}
            <div className={styles.socialLinks}>
              {linkedinUrl && (
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              )}
              {githubUrl && (
                <a href={githubUrl} target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              )}
              {portfolioUrl && (
                <a href={portfolioUrl} target="_blank" rel="noopener noreferrer">
                  Portfolio
                </a>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            {isOwnProfile ? (
              <Link to="/profile/setup">
                <Button variant="secondary">Edit Profile</Button>
              </Link>
            ) : (
              <>
                {connectionStatus === 'accepted' ? (
                  <Button variant="secondary" disabled>
                    Connected
                  </Button>
                ) : connectionStatus === 'pending' ? (
                  <Button variant="secondary" disabled>
                    Request Sent
                  </Button>
                ) : (
                  <Button onClick={handleConnect} isLoading={isConnecting}>
                    Connect
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Profile Score */}
        {analysis && analysis.profile_score !== null && (
          <div className={styles.scoreCard}>
            <div className={styles.scoreValue}>{analysis.profile_score}</div>
            <div className={styles.scoreLabel}>Profile Score</div>
          </div>
        )}
      </div>

      {/* Skills */}
      {profile.skills.length > 0 && (
        <div className={styles.section}>
          <h2>Skills</h2>
          <div className={styles.skillsList}>
            {profile.skills.map((us) => (
              <Badge key={us.id} variant={us.is_primary ? 'primary' : 'default'}>
                {us.skill.name}
                {us.proficiency_level && (
                  <span style={{ opacity: 0.7, marginLeft: '0.25rem' }}>
                    ({us.proficiency_level})
                  </span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {analysis && (
        <div className={styles.section}>
          <h2>AI Insights</h2>
          <div className={styles.insightsGrid}>
            {analysis.strengths.length > 0 && (
              <div className={styles.insightCard}>
                <h3>Strengths</h3>
                <ul>
                  {analysis.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.recommendations.length > 0 && (
              <div className={styles.insightCard}>
                <h3>Recommendations</h3>
                <ul>
                  {analysis.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className={styles.insightActions}>
            <Button variant="secondary" onClick={() => navigate('/roadmap?view=skills')}>
              View Career Roadmap
            </Button>
          </div>
        </div>
      )}

      {/* Similar Professionals */}
      {similarUsers.length > 0 && isOwnProfile && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Similar Professionals</h2>
            <Link to="/roadmap?view=discover" className={styles.viewAllLink}>
              View in Graph
            </Link>
          </div>
          <div className={styles.similarUsersGrid}>
            {similarUsers.map((similar) => (
              <Link
                key={similar.user_id}
                to={`/profile/${similar.user_id}`}
                className={styles.similarUserCard}
              >
                <Avatar
                  name={similar.full_name || similar.username}
                  src={similar.profile_image_url}
                  size="medium"
                />
                <div className={styles.similarUserInfo}>
                  <div className={styles.similarUserName}>
                    {similar.full_name || similar.username}
                  </div>
                  <div className={styles.similarUserMatch}>
                    {Math.round(similar.similarity_score * 100)}% match
                  </div>
                  {similar.shared_skills.length > 0 && (
                    <div className={styles.sharedSkills}>
                      {similar.shared_skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} size="small" variant="default">
                          {skill}
                        </Badge>
                      ))}
                      {similar.shared_skills.length > 3 && (
                        <span className={styles.moreSkills}>
                          +{similar.shared_skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.section}>
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <TabPanel id="overview" activeTab={activeTab}>
          {profile.work_experience.length > 0 && (
            <div className={styles.overviewSection}>
              <h3>Recent Experience</h3>
              {profile.work_experience.slice(0, 2).map((exp) => (
                <div key={exp.id} className={styles.experienceItem}>
                  <div className={styles.expTitle}>{exp.job_title}</div>
                  <div className={styles.expCompany}>{exp.company_name}</div>
                  <div className={styles.expDates}>
                    {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel id="experience" activeTab={activeTab}>
          {profile.work_experience.map((exp) => (
            <div key={exp.id} className={styles.experienceItem}>
              <div className={styles.expTitle}>{exp.job_title}</div>
              <div className={styles.expCompany}>{exp.company_name}</div>
              <div className={styles.expDates}>
                {formatDate(exp.start_date)} - {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                {exp.location && ` | ${exp.location}`}
              </div>
              {exp.description && <p className={styles.expDescription}>{exp.description}</p>}
            </div>
          ))}
        </TabPanel>

        <TabPanel id="projects" activeTab={activeTab}>
          {profile.projects.map((project) => (
            <div key={project.id} className={styles.projectItem}>
              <div className={styles.projectTitle}>
                {project.title}
                {project.url && (
                  <a href={project.url} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                )}
              </div>
              {project.role && <div className={styles.projectRole}>{project.role}</div>}
              {project.description && <p>{project.description}</p>}
              {project.technologies && project.technologies.length > 0 && (
                <div className={styles.techList}>
                  {project.technologies.map((tech) => (
                    <Badge key={tech} size="small" variant="default">{tech}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </TabPanel>

        <TabPanel id="education" activeTab={activeTab}>
          {profile.education.map((edu) => (
            <div key={edu.id} className={styles.educationItem}>
              <div className={styles.eduInstitution}>{edu.institution_name}</div>
              <div className={styles.eduDegree}>
                {edu.degree_type && edu.field_of_study
                  ? `${edu.degree_type} in ${edu.field_of_study}`
                  : edu.field_of_study || edu.degree_type}
              </div>
              <div className={styles.eduDates}>
                {formatDate(edu.start_date)} - {formatDate(edu.end_date) || 'Present'}
                {edu.gpa && ` | GPA: ${edu.gpa}`}
              </div>
            </div>
          ))}
        </TabPanel>
      </div>
    </div>
  );
};

export default ProfilePage;
