import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import EventCard from '../../features/events/components/EventCard';
import type { Event, EventListResponse } from '../../types/events';
import styles from './EventsListPage.module.css';

export const EventsListPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const response = await api.get<EventListResponse>('/events', {
          params: { page, limit: 12 },
        });
        setEvents(response.data.events);
        setTotalPages(response.data.pages);
      } catch {
        setError('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [page]);

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className="container">
          <header className={styles.header}>
            <h1 className={styles.title}>Upcoming Events</h1>
            <p className={styles.subtitle}>
              Discover hackathons, meetups, and workshops near you
            </p>
          </header>

          {isLoading ? (
            <div className={styles.loading}>Loading events...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : events.length === 0 ? (
            <div className={styles.empty}>
              <p>No events found. Check back later!</p>
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EventsListPage;
