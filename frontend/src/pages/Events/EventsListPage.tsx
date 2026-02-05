import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../../features/events/api/eventsApi';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { BackButton } from '../../components/common/BackButton';
import EventCard from '../../features/events/components/EventCard';
import { EventCalendar } from '../../features/events/components/EventCalendar';
import { RecommendedEvents } from '../../features/events/components/RecommendedEvents';
import { MyEvents } from '../../features/events/components/MyEvents';
import type { Event } from '../../types/events';
import styles from './EventsListPage.module.css';

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

  const fetchEvents = async () => {
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
  };

  useEffect(() => {
    fetchEvents();
  }, [page, eventType, city]);

  const handleEventClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className="container">
          <div className={styles.backNav}>
            <BackButton fallbackPath="/" />
          </div>
          <header className={styles.header}>
            <div className={styles.headerContent}>
              <div>
                <h1 className={styles.title}>Events</h1>
                <p className={styles.subtitle}>
                  Discover hackathons, meetups, and workshops
                </p>
              </div>
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </button>
                <button
                  className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.active : ''}`}
                  onClick={() => setViewMode('calendar')}
                  title="Calendar view"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          <div className={styles.layout}>
            <div className={styles.content}>
              {/* Filters */}
              <div className={styles.filters}>
                <select
                  className={styles.filterSelect}
                  value={eventType}
                  onChange={(e) => {
                    setEventType(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Types</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="meetup">Meetup</option>
                  <option value="workshop">Workshop</option>
                  <option value="conference">Conference</option>
                </select>
                <select
                  className={styles.filterSelect}
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Locations</option>
                  <option value="San Francisco">San Francisco</option>
                  <option value="New York">New York</option>
                  <option value="Austin">Austin</option>
                  <option value="Seattle">Seattle</option>
                  <option value="Boston">Boston</option>
                </select>
              </div>

              {viewMode === 'grid' ? (
                <>
                  {isLoading ? (
                    <div className={styles.loading}>Loading events...</div>
                  ) : error ? (
                    <div className={styles.error}>
                      <p>{error}</p>
                      <button onClick={fetchEvents} className={styles.retryButton}>
                        Retry
                      </button>
                    </div>
                  ) : events.length === 0 ? (
                    <div className={styles.empty}>
                      <p>None for now</p>
                    </div>
                  ) : (
                    <>
                      <div className={styles.grid}>
                        {events.map((event) => (
                          <EventCard key={event.id} event={event} />
                        ))}
                      </div>

                      {totalPages > 1 && (
                        <div className={styles.pagination}>
                          <button
                            className={styles.pageButton}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            Previous
                          </button>
                          <span className={styles.pageInfo}>
                            Page {page} of {totalPages}
                          </span>
                          <button
                            className={styles.pageButton}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className={styles.calendarView}>
                  <EventCalendar onEventClick={handleEventClick} />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className={styles.sidebar}>
              <MyEvents />
              <RecommendedEvents />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EventsListPage;
