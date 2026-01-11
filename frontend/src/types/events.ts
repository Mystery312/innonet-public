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
