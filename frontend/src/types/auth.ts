export interface User {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  profile_image_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterData {
  username: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginData {
  identifier: string;
  password: string;
}
