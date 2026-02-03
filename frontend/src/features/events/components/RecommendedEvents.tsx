import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi } from '../api/eventsApi';
import type { RecommendedEvent } from '../../../types/events';
import styles from './RecommendedEvents.module.css';

export const RecommendedEvents: React.FC = () => {
  const [events, setEvents] = useState<RecommendedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await eventsApi.getRecommendations(5);
      setEvents(data.events);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setError('Unable to load recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Recommended for You</h3>
        <div className={styles.loading}>Loading recommendations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Recommended for You</h3>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchRecommendations} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Recommended for You
      </h3>

      <div className={styles.list}>
        {events.map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className={styles.eventItem}>
            <div className={styles.eventDate}>
              <span className={styles.month}>
                {new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <span className={styles.day}>
                {new Date(event.start_datetime).getDate()}
              </span>
            </div>
            <div className={styles.eventInfo}>
              <h4 className={styles.eventName}>{event.name}</h4>
              <p className={styles.eventReason}>{event.recommendation_reason}</p>
              <div className={styles.eventMeta}>
                {event.event_type && (
                  <span className={styles.eventType}>{event.event_type}</span>
                )}
                {event.location_city && (
                  <span className={styles.eventLocation}>{event.location_city}</span>
                )}
              </div>
            </div>
            <div className={styles.matchScore}>
              <div className={styles.scoreCircle}>
                {Math.round(event.recommendation_score)}
              </div>
              <span className={styles.scoreLabel}>match</span>
            </div>
          </Link>
        ))}
      </div>

      <Link to="/events" className={styles.viewAll}>
        View all events
      </Link>
    </div>
  );
};

export default RecommendedEvents;
