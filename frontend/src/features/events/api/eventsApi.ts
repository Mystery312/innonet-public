import { api } from '../../../lib/api';
import type {
  Event,
  EventDetail,
  EventListResponse,
  EventRegistration,
  UserEventsResponse,
  EventRecommendationsResponse,
  CalendarResponse,
} from '../../../types/events';

export interface RegistrationStatus {
  is_registered: boolean;
  registration?: EventRegistration;
  ticket_code?: string;
}

export const eventsApi = {
  // Get list of events with pagination and filters
  getEvents: async (params?: {
    page?: number;
    limit?: number;
    city?: string;
    country?: string;
    event_type?: string;
  }): Promise<EventListResponse> => {
    const response = await api.get('/events', { params });
    return response.data;
  },

  // Get events for a specific company
  getCompanyEvents: async (companyId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<EventListResponse> => {
    const response = await api.get(`/events/company/${companyId}`, { params });
    return response.data;
  },

  // Get single event details
  getEvent: async (eventId: string): Promise<EventDetail> => {
    const response = await api.get(`/events/${eventId}`);
    return response.data;
  },

  // Register for a free event
  registerForEvent: async (eventId: string): Promise<EventRegistration> => {
    const response = await api.post(`/events/${eventId}/register`);
    return response.data;
  },

  // Get registration status for an event
  getRegistrationStatus: async (eventId: string): Promise<RegistrationStatus> => {
    const response = await api.get(`/events/${eventId}/status`);
    return response.data;
  },

  // Cancel registration
  cancelRegistration: async (eventId: string): Promise<void> => {
    await api.delete(`/events/${eventId}/register`);
  },

  // Create a new event
  createEvent: async (data: Partial<Event>): Promise<Event> => {
    const response = await api.post('/events', data);
    return response.data;
  },

  // Get user's registered events
  getMyEvents: async (): Promise<UserEventsResponse> => {
    const response = await api.get('/events/my-events');
    return response.data;
  },

  // Get personalized event recommendations
  getRecommendations: async (limit?: number): Promise<EventRecommendationsResponse> => {
    const response = await api.get('/events/recommendations', {
      params: { limit },
    });
    return response.data;
  },

  // Get calendar events for a specific month
  getCalendarEvents: async (year: number, month: number): Promise<CalendarResponse> => {
    const response = await api.get('/events/calendar', {
      params: { year, month },
    });
    return response.data;
  },
};

export default eventsApi;
