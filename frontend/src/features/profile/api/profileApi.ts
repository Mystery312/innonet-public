import api from '../../../lib/api';
import type {
  FullProfile,
  PublicProfile,
  ProfileCompletion,
  BasicProfileUpdate,
  Skill,
  UserSkill,
  SkillCreate,
  SkillUpdate,
  Project,
  ProjectCreate,
  ProjectUpdate,
  Certification,
  CertificationCreate,
  CertificationUpdate,
  Award,
  AwardCreate,
  AwardUpdate,
  WorkExperience,
  WorkExperienceCreate,
  WorkExperienceUpdate,
  Education,
  EducationCreate,
  EducationUpdate,
  ProfileSearchRequest,
  ProfileSearchResponse,
  ProfileAnalysis,
  SkillRecommendation,
  ResumeUploadResponse,
} from '../../../types/profile';

// ============== Profile API ==============

export const profileApi = {
  // Get current user's full profile
  getMyProfile: async (): Promise<FullProfile> => {
    const response = await api.get('/profiles/me');
    return response.data;
  },

  // Update basic profile info
  updateBasicProfile: async (data: BasicProfileUpdate): Promise<void> => {
    await api.put('/profiles/me', data);
  },

  // Get profile completion
  getProfileCompletion: async (): Promise<ProfileCompletion> => {
    const response = await api.get('/profiles/me/completion');
    return response.data;
  },

  // Get public profile
  getPublicProfile: async (userId: string): Promise<PublicProfile> => {
    const response = await api.get(`/profiles/${userId}`);
    return response.data;
  },

  // Skills
  getSkills: async (search?: string): Promise<{ skills: Skill[]; total: number }> => {
    const response = await api.get('/skills', { params: { search, limit: 50 } });
    return response.data;
  },

  getMySkills: async (): Promise<UserSkill[]> => {
    const response = await api.get('/profiles/me/skills');
    return response.data;
  },

  addSkill: async (data: SkillCreate): Promise<UserSkill> => {
    const response = await api.post('/profiles/me/skills', data);
    return response.data;
  },

  updateSkill: async (skillId: string, data: SkillUpdate): Promise<UserSkill> => {
    const response = await api.put(`/profiles/me/skills/${skillId}`, data);
    return response.data;
  },

  removeSkill: async (skillId: string): Promise<void> => {
    await api.delete(`/profiles/me/skills/${skillId}`);
  },

  createSkill: async (name: string, category?: string): Promise<Skill> => {
    const response = await api.post('/skills', { name, category });
    return response.data;
  },

  // Projects
  getMyProjects: async (): Promise<Project[]> => {
    const response = await api.get('/profiles/me/projects');
    return response.data;
  },

  createProject: async (data: ProjectCreate): Promise<Project> => {
    const response = await api.post('/profiles/me/projects', data);
    return response.data;
  },

  updateProject: async (projectId: string, data: ProjectUpdate): Promise<Project> => {
    const response = await api.put(`/profiles/me/projects/${projectId}`, data);
    return response.data;
  },

  deleteProject: async (projectId: string): Promise<void> => {
    await api.delete(`/profiles/me/projects/${projectId}`);
  },

  // Certifications
  getMyCertifications: async (): Promise<Certification[]> => {
    const response = await api.get('/profiles/me/certifications');
    return response.data;
  },

  createCertification: async (data: CertificationCreate): Promise<Certification> => {
    const response = await api.post('/profiles/me/certifications', data);
    return response.data;
  },

  updateCertification: async (certId: string, data: CertificationUpdate): Promise<Certification> => {
    const response = await api.put(`/profiles/me/certifications/${certId}`, data);
    return response.data;
  },

  deleteCertification: async (certId: string): Promise<void> => {
    await api.delete(`/profiles/me/certifications/${certId}`);
  },

  // Awards
  getMyAwards: async (): Promise<Award[]> => {
    const response = await api.get('/profiles/me/awards');
    return response.data;
  },

  createAward: async (data: AwardCreate): Promise<Award> => {
    const response = await api.post('/profiles/me/awards', data);
    return response.data;
  },

  updateAward: async (awardId: string, data: AwardUpdate): Promise<Award> => {
    const response = await api.put(`/profiles/me/awards/${awardId}`, data);
    return response.data;
  },

  deleteAward: async (awardId: string): Promise<void> => {
    await api.delete(`/profiles/me/awards/${awardId}`);
  },

  // Work Experience
  getMyExperience: async (): Promise<WorkExperience[]> => {
    const response = await api.get('/profiles/me/experience');
    return response.data;
  },

  createExperience: async (data: WorkExperienceCreate): Promise<WorkExperience> => {
    const response = await api.post('/profiles/me/experience', data);
    return response.data;
  },

  updateExperience: async (expId: string, data: WorkExperienceUpdate): Promise<WorkExperience> => {
    const response = await api.put(`/profiles/me/experience/${expId}`, data);
    return response.data;
  },

  deleteExperience: async (expId: string): Promise<void> => {
    await api.delete(`/profiles/me/experience/${expId}`);
  },

  // Education
  getMyEducation: async (): Promise<Education[]> => {
    const response = await api.get('/profiles/me/education');
    return response.data;
  },

  createEducation: async (data: EducationCreate): Promise<Education> => {
    const response = await api.post('/profiles/me/education', data);
    return response.data;
  },

  updateEducation: async (eduId: string, data: EducationUpdate): Promise<Education> => {
    const response = await api.put(`/profiles/me/education/${eduId}`, data);
    return response.data;
  },

  deleteEducation: async (eduId: string): Promise<void> => {
    await api.delete(`/profiles/me/education/${eduId}`);
  },

  // Resume
  uploadResume: async (file: File): Promise<ResumeUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/profiles/me/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getMyResume: async (): Promise<ResumeUploadResponse | null> => {
    const response = await api.get('/profiles/me/resume');
    return response.data;
  },
};

// ============== AI API ==============

export const aiApi = {
  // Semantic search
  search: async (request: ProfileSearchRequest): Promise<ProfileSearchResponse> => {
    const response = await api.post('/ai/search', request);
    return response.data;
  },

  // Search by skills
  searchBySkills: async (skills: string[], limit?: number): Promise<ProfileSearchResponse> => {
    const response = await api.get('/ai/search/skills', {
      params: { skills: skills.join(','), limit },
    });
    return response.data;
  },

  // Find similar profiles
  findSimilar: async (limit?: number): Promise<ProfileSearchResponse> => {
    const response = await api.get('/ai/search/similar', { params: { limit } });
    return response.data;
  },

  // Get profile analysis
  analyzeProfile: async (refresh?: boolean): Promise<ProfileAnalysis> => {
    const response = await api.get('/ai/analyze/me', { params: { refresh } });
    return response.data;
  },

  // Get skill recommendations
  getSkillRecommendations: async (limit?: number): Promise<{ recommendations: SkillRecommendation[] }> => {
    const response = await api.get('/ai/recommendations/skills', { params: { limit } });
    return response.data;
  },

  // Get people recommendations
  getPeopleRecommendations: async (limit?: number): Promise<ProfileSearchResponse> => {
    const response = await api.get('/ai/recommendations/people', { params: { limit } });
    return response.data;
  },

  // Update embedding
  updateEmbedding: async (): Promise<void> => {
    await api.post('/ai/embeddings/update');
  },
};

export default profileApi;
