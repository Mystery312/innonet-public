import type { UserBrief } from './common';

export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
export type ChallengeStatus = 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  website?: string;
  logo_url?: string;
  banner_url?: string;
  size: CompanySize;
  location?: string;
  founded_year?: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CompanyMember {
  id: string;
  user_id: string;
  role: string;
  title?: string;
  joined_at: string;
  user?: UserBrief;
}

export interface CompanyDetail extends Company {
  challenge_count: number;
  team_members: CompanyMember[];
  recent_challenges: Challenge[];
}

export interface CompanyListResponse {
  companies: Company[];
  total: number;
  page: number;
  pages: number;
}

export interface CompanyCreate {
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  logo_url?: string;
  banner_url?: string;
  size?: CompanySize;
  location?: string;
  founded_year?: number;
}

export interface CompanyUpdate {
  name?: string;
  description?: string;
  industry?: string;
  website?: string;
  logo_url?: string;
  banner_url?: string;
  size?: CompanySize;
  location?: string;
  founded_year?: number;
}

export interface Challenge {
  id: string;
  company_id: string;
  title: string;
  description: string;
  problem_statement?: string;
  expected_outcome?: string;
  status: ChallengeStatus;
  difficulty: ChallengeDifficulty;
  skills_required?: string;
  duration_weeks: number;
  max_participants?: number;
  reward_description?: string;
  reward_amount?: number;
  start_date?: string;
  end_date?: string;
  application_deadline?: string;
  created_at: string;
  company?: Company;
}

export interface ChallengeDetail extends Challenge {
  application_count: number;
  has_applied: boolean;
  user_application?: Application;
}

export interface ChallengeListResponse {
  challenges: Challenge[];
  total: number;
  page: number;
  pages: number;
}

export interface ChallengeCreate {
  title: string;
  description: string;
  problem_statement?: string;
  expected_outcome?: string;
  difficulty?: ChallengeDifficulty;
  skills_required?: string;
  duration_weeks?: number;
  max_participants?: number;
  reward_description?: string;
  reward_amount?: number;
  start_date?: string;
  end_date?: string;
  application_deadline?: string;
}

export interface ChallengeUpdate {
  title?: string;
  description?: string;
  problem_statement?: string;
  expected_outcome?: string;
  status?: ChallengeStatus;
  difficulty?: ChallengeDifficulty;
  skills_required?: string;
  duration_weeks?: number;
  max_participants?: number;
  reward_description?: string;
  reward_amount?: number;
  start_date?: string;
  end_date?: string;
  application_deadline?: string;
}

export interface Application {
  id: string;
  challenge_id: string;
  user_id: string;
  status: ApplicationStatus;
  cover_letter?: string;
  portfolio_url?: string;
  applied_at: string;
  reviewed_at?: string;
  applicant?: UserBrief;
}

export interface ApplicationListResponse {
  applications: Application[];
  total: number;
}

export interface ApplicationCreate {
  cover_letter?: string;
  portfolio_url?: string;
}

export interface ApplicationUpdate {
  status: ApplicationStatus;
  reviewer_notes?: string;
}

// Company Member Management Types
export interface CompanyMemberCreate {
  user_id: string;
  role?: 'admin' | 'member';
  title?: string;
}

export interface CompanyMemberUpdate {
  role?: 'admin' | 'member';
  title?: string;
}
