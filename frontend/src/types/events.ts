export interface Event {
  id: string;
  name: string;
  description: string | null;
  event_type: string | null;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  location_country: string | null;
  start_datetime: string;
  end_datetime: string | null;
  max_attendees: number | null;
  price_cents: number;
  currency: string;
  is_published: boolean;
  is_cancelled: boolean;
  image_url: string | null;
  created_at: string;
}

export interface EventDetail extends Event {
  registration_count: number;
  is_registered: boolean;
  spots_remaining: number | null;
}

export interface EventListResponse {
  events: Event[];
  total: number;
  page: number;
  pages: number;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  ticket_code: string | null;
  registered_at: string;
}

export interface EventWithRegistration extends Event {
  registration_status: string | null;
  ticket_code: string | null;
  registered_at: string | null;
}

export interface UserEventsResponse {
  upcoming: EventWithRegistration[];
  past: EventWithRegistration[];
}

export interface RecommendedEvent extends Event {
  recommendation_score: number;
  recommendation_reason: string | null;
}

export interface EventRecommendationsResponse {
  events: RecommendedEvent[];
  total: number;
}

export interface CalendarEvent {
  id: string;
  name: string;
  event_type: string | null;
  start_datetime: string;
  end_datetime: string | null;
  location_city: string | null;
  is_registered: boolean;
}

export interface CalendarResponse {
  events: CalendarEvent[];
  month: number;
  year: number;
}

export interface EventCreate {
  name: string;
  description?: string;
  event_type?: string;
  location_name?: string;
  location_address?: string;
  location_city?: string;
  location_country?: string;
  start_datetime: string;
  end_datetime?: string;
  max_attendees?: number;
  price_cents?: number;
  currency?: string;
  image_url?: string;
}
