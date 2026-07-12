import type { User, UserProfile } from './auth';

// ============== Skill Types ==============

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface UserSkill {
  id: string;
  skill: Skill;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  years_experience: number | null;
  is_primary: boolean;
  created_at: string;
}

export interface SkillCreate {
  skill_id: string;
  proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
  is_primary?: boolean;
}

export interface SkillUpdate {
  proficiency_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience?: number;
  is_primary?: boolean;
}

// ============== Project Types ==============

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  role: string | null;
  url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  technologies: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  title: string;
  description?: string;
  role?: string;
  url?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  technologies?: string[];
}

export type ProjectUpdate = Partial<ProjectCreate>;

// ============== Certification Types ==============

export interface Certification {
  id: string;
  user_id: string;
  name: string;
  issuing_organization: string;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificationCreate {
  name: string;
  issuing_organization: string;
  issue_date?: string;
  expiry_date?: string;
  credential_id?: string;
  credential_url?: string;
}

export type CertificationUpdate = Partial<CertificationCreate>;

// ============== Award Types ==============

export interface Award {
  id: string;
  user_id: string;
  title: string;
  issuer: string | null;
  date_received: string | null;
  description: string | null;
  created_at: string;
}

export interface AwardCreate {
  title: string;
  issuer?: string;
  date_received?: string;
  description?: string;
}

export type AwardUpdate = Partial<AwardCreate>;

// ============== Work Experience Types ==============

export interface WorkExperience {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  achievements: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface WorkExperienceCreate {
  company_name: string;
  job_title: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
  achievements?: string[];
}

export type WorkExperienceUpdate = Partial<WorkExperienceCreate>;

// ============== Education Types ==============

export interface Education {
  id: string;
  user_id: string;
  institution_name: string;
  degree_type: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  gpa: number | null;
  activities: string | null;
  created_at: string;
  updated_at: string;
}

export interface EducationCreate {
  institution_name: string;
  degree_type?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  gpa?: number;
  activities?: string;
}

export type EducationUpdate = Partial<EducationCreate>;

// ============== Profile Analysis Types ==============

export interface ProfileAnalysis {
  profile_score: number | null;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  summary: string | null;
  created_at: string;
}

// ============== Full Profile Types ==============

export interface BasicProfileUpdate {
  full_name?: string;
  bio?: string;
  location?: string;
  profile_image_url?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
}

export interface FullProfile {
  user: User;
  profile: UserProfile | null;
  skills: UserSkill[];
  projects: Project[];
  certifications: Certification[];
  awards: Award[];
  work_experience: WorkExperience[];
  education: Education[];
}

export interface PublicProfile {
  user_id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  profile_image_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  skills: UserSkill[];
  projects: Project[];
  certifications: Certification[];
  awards: Award[];
  work_experience: WorkExperience[];
  education: Education[];
}

export interface ProfileCompletion {
  percentage: number;
  completed_sections: string[];
  missing_sections: string[];
}

// ============== Search Types ==============

export interface ProfileSearchRequest {
  query: string;
  filters?: {
    location?: string;
    skills?: string[];
  };
  limit?: number;
  offset?: number;
}

export interface ProfileSearchResult {
  user_id: string;
  username: string;
  full_name: string | null;
  profile_image_url: string | null;
  location: string | null;
  bio: string | null;
  top_skills: string[];
  similarity_score: number;
  connection_status?: 'none' | 'pending' | 'accepted';
}

export interface ProfileSearchResponse {
  results: ProfileSearchResult[];
  total: number;
  query: string;
}

// ============== Skill Recommendation Types ==============

export interface SkillRecommendation {
  skill: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

// ============== Wizard Step Types ==============

export type WizardStep =
  | 'resume'
  | 'basic'
  | 'skills'
  | 'experience'
  | 'education'
  | 'projects'
  | 'certifications'
  | 'review';

export interface WizardStepConfig {
  id: WizardStep;
  title: string;
  description: string;
  isOptional: boolean;
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  { id: 'resume', title: 'Resume Upload', description: 'Upload your resume to auto-fill your profile', isOptional: true },
  { id: 'basic', title: 'Basic Info', description: 'Your name, bio, and location', isOptional: false },
  { id: 'skills', title: 'Skills', description: 'Your technical and soft skills', isOptional: false },
  { id: 'experience', title: 'Experience', description: 'Your work history', isOptional: false },
  { id: 'education', title: 'Education', description: 'Your educational background', isOptional: false },
  { id: 'projects', title: 'Projects', description: 'Showcase your work', isOptional: true },
  { id: 'certifications', title: 'Certifications', description: 'Professional credentials', isOptional: true },
  { id: 'review', title: 'Review', description: 'Review and submit', isOptional: false },
];

// ============== Resume Types ==============

export interface ParsedSkill {
  name: string;
  proficiency_level?: string | null;
  years_experience?: number | null;
}

export interface ParsedExperience {
  company_name: string;
  job_title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current: boolean;
  description?: string | null;
  achievements?: string[] | null;
}

export interface ParsedEducation {
  institution_name: string;
  degree_type?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  gpa?: number | null;
}

export interface ParsedProject {
  title: string;
  description?: string | null;
  role?: string | null;
  technologies?: string[] | null;
}

export interface ParsedCertification {
  name: string;
  issuing_organization: string;
  issue_date?: string | null;
}

export interface ResumeParseResult {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  skills: ParsedSkill[];
  work_experience: ParsedExperience[];
  education: ParsedEducation[];
  projects: ParsedProject[];
  certifications: ParsedCertification[];
}

export interface ResumeUploadResponse {
  id: string;
  filename: string;
  file_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  parsed_data?: ResumeParseResult | null;
}
