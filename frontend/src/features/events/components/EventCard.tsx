import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Event } from '../../../types/events';
import Button from '../../../components/common/Button';
import styles from './EventCard.module.css';

interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const navigate = useNavigate();

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

  const formatPrice = (cents: number, currency: string) => {
    if (cents === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        {event.image_url ? (
          <img src={event.image_url} alt={event.name} className={styles.image} />
        ) : (
          <div className={styles.placeholder}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
        )}
        {event.event_type && (
          <span className={styles.badge}>{event.event_type}</span>
        )}
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{event.name}</h3>
        <div className={styles.meta}>
          <span className={styles.date}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(event.start_datetime)}
          </span>
          {event.location_city && (
            <span className={styles.location}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {event.location_city}
            </span>
          )}
        </div>
        <div className={styles.footer}>
          <span className={styles.price}>{formatPrice(event.price_cents, event.currency)}</span>
          <Button size="sm" onClick={() => navigate(`/events/${event.id}`)}>
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
