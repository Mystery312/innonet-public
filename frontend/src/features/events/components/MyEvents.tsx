import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi } from '../api/eventsApi';
import { Badge } from '../../../components/common/Badge';
import type { EventWithRegistration } from '../../../types/events';
import styles from './MyEvents.module.css';

type TabType = 'upcoming' | 'past';

export const MyEvents: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithRegistration[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await eventsApi.getMyEvents();
      setUpcomingEvents(data.upcoming);
      setPastEvents(data.past);
    } catch (error) {
      console.error('Failed to fetch my events:', error);
      setError('Unable to load your events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEvents();
  }, []);

  const events = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>My Events</h3>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'upcoming' ? styles.active : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'past' ? styles.active : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past ({pastEvents.length})
          </button>
        </div>
      </div>

      {error ? (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchMyEvents} className={styles.retryButton}>
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className={styles.loading}>Loading your events...</div>
      ) : events.length === 0 ? (
        <div className={styles.empty}>
          {activeTab === 'upcoming' ? (
            <>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p>No upcoming events</p>
              <Link to="/events" className={styles.browseLink}>
                Browse events
              </Link>
            </>
          ) : (
            <p>No past events</p>
          )}
        </div>
      ) : (
        <div className={styles.list}>
          {events.map((event) => (
            <Link key={event.id} to={`/events/${event.id}`} className={styles.eventItem}>
              <div className={styles.eventImage}>
                {event.image_url ? (
                  <img src={event.image_url} alt={event.name} />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                )}
              </div>
              <div className={styles.eventInfo}>
                <h4 className={styles.eventName}>{event.name}</h4>
                <p className={styles.eventDate}>{formatDate(event.start_datetime)}</p>
                <div className={styles.eventMeta}>
                  {event.event_type && (
                    <Badge variant="default" size="small">
                      {event.event_type}
                    </Badge>
                  )}
                  {event.location_city && (
                    <span className={styles.location}>{event.location_city}</span>
                  )}
                </div>
              </div>
              {event.ticket_code && (
                <div className={styles.ticketBadge}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>{event.ticket_code}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyEvents;
