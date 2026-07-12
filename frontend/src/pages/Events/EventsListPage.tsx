import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../../features/events/api/eventsApi';
import EventCard from '../../features/events/components/EventCard';
import { EventCalendar } from '../../features/events/components/EventCalendar';
import { RecommendedEvents } from '../../features/events/components/RecommendedEvents';
import { MyEvents } from '../../features/events/components/MyEvents';
import type { Event } from '../../types/events';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

type ViewMode = 'grid' | 'calendar';

export const EventsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [eventType, setEventType] = useState<string>('');
  const [city, setCity] = useState<string>('');

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await eventsApi.getEvents({
        page,
        limit: 12,
        event_type: eventType || undefined,
        city: city || undefined,
      });
      setEvents(response.events);
      setTotalPages(response.pages);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError('Unable to load events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, eventType, city]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-end mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              title="Calendar view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-3 mb-6">
              <Select
                value={eventType}
                onChange={(e) => { setEventType(e.target.value); setPage(1); }}
                className="w-40"
              >
                <option value="">All Types</option>
                <option value="hackathon">Hackathon</option>
                <option value="meetup">Meetup</option>
                <option value="workshop">Workshop</option>
                <option value="conference">Conference</option>
              </Select>
              <Select
                value={city}
                onChange={(e) => { setCity(e.target.value); setPage(1); }}
                className="w-44"
              >
                <option value="">All Locations</option>
                <option value="San Francisco">San Francisco</option>
                <option value="New York">New York</option>
                <option value="Austin">Austin</option>
                <option value="Seattle">Seattle</option>
                <option value="Boston">Boston</option>
              </Select>
            </div>

            {viewMode === 'grid' ? (
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : error ? (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button variant="outline" onClick={fetchEvents}>Retry</Button>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <p className="text-lg font-medium mb-1">No events found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {events.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-8">
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="w-full">
                <EventCalendar onEventClick={handleEventClick} />
              </div>
            )}
          </div>

          <aside className="hidden lg:block w-72 shrink-0 space-y-6">
            <MyEvents />
            <RecommendedEvents />
          </aside>
        </div>
      </div>
    </main>
  );
};

export default EventsListPage;
