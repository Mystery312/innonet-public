import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { profileApi, aiApi } from '../../features/profile/api/profileApi';
import { graphApi } from '../../features/graph/api/graphApi';
import { networkApi } from '../../features/network/api/networkApi';
import { useAuth } from '../../context/AuthContext';
import { formatError } from '../../utils/error';
import type { FullProfile, ProfileAnalysis, PublicProfile } from '../../types/profile';
import type { SimilarProfile } from '../../features/graph/types/graph';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { BackButton } from '../../components/common/BackButton';

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center py-20 px-4">
          <h2 className="text-xl font-semibold text-foreground mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground mb-6">This profile doesn't exist or you don't have permission to view it</p>
          <Button onClick={() => navigate('/discover')}>Find People</Button>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName();
  const username = getUsername();
  const location = getLocation();
  const bio = getBio();
  const profileImageUrl = getProfileImageUrl();
  const linkedinUrl = getLinkedinUrl();
  const githubUrl = getGithubUrl();
  const portfolioUrl = getPortfolioUrl();

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* Back Navigation */}
      {!isOwnProfile && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <BackButton fallbackPath="/discover" />
        </div>
      )}

      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Avatar */}
          <Avatar size="xlarge" className="shrink-0">
            {profileImageUrl && <AvatarImage src={profileImageUrl} alt={displayName} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">@{username}</p>
            {location && (
              <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {location}
              </p>
            )}
            {bio && (
              <p className="text-foreground text-sm mt-2 leading-relaxed max-w-lg">{bio}</p>
            )}

            {/* Social links */}
            <div className="flex flex-wrap gap-3 mt-3">
              {linkedinUrl && (
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  LinkedIn
                </a>
              )}
              {githubUrl && (
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  GitHub
                </a>
              )}
              {portfolioUrl && (
                <a
                  href={portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Portfolio
                </a>
              )}
            </div>
          </div>

          {/* Actions + Score */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            {/* Profile Score */}
            {analysis && analysis.profile_score !== null && (
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{analysis.profile_score}</div>
                <div className="text-xs text-muted-foreground">Profile Score</div>
              </div>
            )}

            {/* Action button */}
            {isOwnProfile ? (
              <Link to="/profile/setup">
                <Button variant="outline">Edit Profile</Button>
              </Link>
            ) : (
              <>
                {connectionStatus === 'accepted' ? (
                  <Button variant="outline" disabled>Connected</Button>
                ) : connectionStatus === 'pending' ? (
                  <Button variant="outline" disabled>Request Sent</Button>
                ) : (
                  <Button onClick={handleConnect} isLoading={isConnecting}>Connect</Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Skills */}
        {profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {profile.skills.map((us) => (
              <Badge key={us.id} variant={us.is_primary ? 'primary' : 'default'}>
                {us.skill.name}
                {us.proficiency_level && (
                  <span className="opacity-70 ml-1">({us.proficiency_level})</span>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        {/* AI Insights */}
        {analysis && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h2 className="text-base font-semibold text-foreground mb-4">AI Insights</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analysis.strengths.length > 0 && (
                  <div className="bg-success/5 rounded-lg p-4 border border-success/20">
                    <h3 className="text-sm font-medium text-foreground mb-2">Strengths</h3>
                    <ul className="space-y-1">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-success mt-0.5">&#10003;</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.recommendations.length > 0 && (
                  <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                    <h3 className="text-sm font-medium text-foreground mb-2">Recommendations</h3>
                    <ul className="space-y-1">
                      {analysis.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">&#8250;</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => navigate('/roadmap?view=skills')}>
                  View Career Roadmap
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Similar Professionals */}
        {similarUsers.length > 0 && isOwnProfile && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">Similar Professionals</h2>
                <Link to="/roadmap?view=discover" className="text-sm text-primary hover:underline">
                  View in Graph
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {similarUsers.map((similar) => (
                  <Link
                    key={similar.user_id}
                    to={`/profile/${similar.user_id}`}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-center"
                  >
                    <Avatar size="medium">
                      {similar.profile_image_url && (
                        <AvatarImage src={similar.profile_image_url} alt={similar.full_name || similar.username} />
                      )}
                      <AvatarFallback>
                        {(similar.full_name || similar.username).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="w-full">
                      <div className="text-sm font-medium text-foreground truncate">
                        {similar.full_name || similar.username}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(similar.similarity_score * 100)}% match
                      </div>
                      {similar.shared_skills.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                          {similar.shared_skills.slice(0, 3).map((skill) => (
                            <Badge key={skill} size="small" variant="default">{skill}</Badge>
                          ))}
                          {similar.shared_skills.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{similar.shared_skills.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="experience">
              Experience
              {profile.work_experience.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{profile.work_experience.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="projects">
              Projects
              {profile.projects.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{profile.projects.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="education">
              Education
              {profile.education.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{profile.education.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {profile.work_experience.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Recent Experience</h3>
                  <div className="space-y-4">
                    {profile.work_experience.slice(0, 2).map((exp) => (
                      <div key={exp.id} className="border-l-2 border-primary/30 pl-4">
                        <div className="font-medium text-foreground text-sm">{exp.job_title}</div>
                        <div className="text-sm text-muted-foreground">{exp.company_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(exp.start_date)} &mdash; {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">No experience added yet.</div>
            )}
          </TabsContent>

          <TabsContent value="experience">
            {profile.work_experience.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {profile.work_experience.map((exp) => (
                      <div key={exp.id} className="border-l-2 border-primary/30 pl-4">
                        <div className="font-medium text-foreground">{exp.job_title}</div>
                        <div className="text-sm text-muted-foreground">{exp.company_name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(exp.start_date)} &mdash; {exp.is_current ? 'Present' : formatDate(exp.end_date)}
                          {exp.location && ` | ${exp.location}`}
                        </div>
                        {exp.description && (
                          <p className="text-sm text-foreground mt-2 leading-relaxed">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">No experience added yet.</div>
            )}
          </TabsContent>

          <TabsContent value="projects">
            {profile.projects.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {profile.projects.map((project) => (
                      <div key={project.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{project.title}</span>
                          {project.url && (
                            <a
                              href={project.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              View &rarr;
                            </a>
                          )}
                        </div>
                        {project.role && (
                          <div className="text-sm text-muted-foreground mt-0.5">{project.role}</div>
                        )}
                        {project.description && (
                          <p className="text-sm text-foreground mt-2 leading-relaxed">{project.description}</p>
                        )}
                        {project.technologies && project.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {project.technologies.map((tech) => (
                              <Badge key={tech} size="small" variant="default">{tech}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">No projects added yet.</div>
            )}
          </TabsContent>

          <TabsContent value="education">
            {profile.education.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-5">
                    {profile.education.map((edu) => (
                      <div key={edu.id} className="border-l-2 border-secondary/40 pl-4">
                        <div className="font-medium text-foreground">{edu.institution_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {edu.degree_type && edu.field_of_study
                            ? `${edu.degree_type} in ${edu.field_of_study}`
                            : edu.field_of_study || edu.degree_type}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(edu.start_date)} &mdash; {formatDate(edu.end_date) || 'Present'}
                          {edu.gpa && ` | GPA: ${edu.gpa}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">No education added yet.</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;
