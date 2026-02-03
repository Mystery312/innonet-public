import api from '../../../lib/api';
import type {
  Company,
  CompanyCreate,
  CompanyUpdate,
  CompanyDetail,
  CompanyListResponse,
  Challenge,
  ChallengeCreate,
  ChallengeUpdate,
  ChallengeDetail,
  ChallengeListResponse,
  Application,
  ApplicationCreate,
  ApplicationUpdate,
  ApplicationListResponse,
} from '../../../types/company';

export const companiesApi = {
  // Company endpoints
  getCompanies: async (params?: {
    page?: number;
    limit?: number;
    industry?: string;
    search?: string;
    verified_only?: boolean;
  }): Promise<CompanyListResponse> => {
    try {
      const response = await api.get('/companies', { params });
      return response.data;
    } catch (error) {
      console.error('[companiesApi] getCompanies failed:', error);
      throw error;
    }
  },

  getCompany: async (companyId: string): Promise<CompanyDetail> => {
    try {
      const response = await api.get(`/companies/${companyId}`);
      return response.data;
    } catch (error) {
      console.error('[companiesApi] getCompany failed:', error);
      throw error;
    }
  },

  createCompany: async (data: CompanyCreate): Promise<Company> => {
    try {
      const response = await api.post('/companies', data);
      return response.data;
    } catch (error) {
      console.error('[companiesApi] createCompany failed:', error);
      throw error;
    }
  },

  updateCompany: async (
    companyId: string,
    data: CompanyUpdate
  ): Promise<Company> => {
    try {
      const response = await api.put(`/companies/${companyId}`, data);
      return response.data;
    } catch (error) {
      console.error('[companiesApi] updateCompany failed:', error);
      throw error;
    }
  },

  // Challenge endpoints
  getChallenges: async (params?: {
    company_id?: string;
    status?: string;
    difficulty?: string;
    page?: number;
    limit?: number;
  }): Promise<ChallengeListResponse> => {
    try {
      const response = await api.get('/challenges', { params });
      return response.data;
    } catch (error) {
      console.error('[companiesApi] getChallenges failed:', error);
      throw error;
    }
  },

  getChallenge: async (challengeId: string): Promise<ChallengeDetail> => {
    try {
      const response = await api.get(`/challenges/${challengeId}`);
      return response.data;
    } catch (error) {
      console.error('[companiesApi] getChallenge failed:', error);
      throw error;
    }
  },

  createChallenge: async (companyId: string, data: ChallengeCreate): Promise<Challenge> => {
    try {
      const response = await api.post(`/companies/${companyId}/challenges`, data);
      return response.data;
    } catch (error) {
      console.error('[companiesApi] createChallenge failed:', error);
      throw error;
    }
  },

  updateChallenge: async (
    challengeId: string,
    data: ChallengeUpdate
  ): Promise<Challenge> => {
    try {
      const response = await api.put(`/challenges/${challengeId}`, data);
      return response.data;
    } catch (error) {
      console.error('[companiesApi] updateChallenge failed:', error);
      throw error;
    }
  },

  applyToChallenge: async (
    challengeId: string,
    data: ApplicationCreate
  ): Promise<Application> => {
    try {
      const response = await api.post(`/challenges/${challengeId}/apply`, data);
      return response.data;
    } catch (error) {
      console.error('[companiesApi] applyToChallenge failed:', error);
      throw error;
    }
  },

  getApplications: async (params?: {
    challenge_id?: string;
    user_id?: string;
    status?: string;
  }): Promise<ApplicationListResponse> => {
    try {
      const response = await api.get('/my-applications', { params });
      return response.data;
    } catch (error) {
      console.error('[companiesApi] getApplications failed:', error);
      throw error;
    }
  },
};
