import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { Button } from '../../components/common/Button';
import { BackButton } from '../../components/common/BackButton';
import { eventsApi } from '../../features/events/api/eventsApi';
import { PaymentModal } from '../../features/events/components/PaymentModal';
import type { EventDetail } from '../../types/events';
import styles from './EventDetailPage.module.css';

export const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const data = await eventsApi.getEvent(eventId);
      setEvent(data);
    } catch {
      setError('Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Handle payment result from Stripe redirect
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setPaymentMessage({
        type: 'success',
        text: 'Payment successful! You are now registered for this event.',
      });
      // Clean up URL
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
      // Reload event to show updated registration status
      loadEvent();
    } else if (paymentStatus === 'cancelled') {
      setPaymentMessage({
        type: 'error',
        text: 'Payment was cancelled. You can try again when ready.',
      });
      // Clean up URL
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, loadEvent]);

  const handleRegister = async () => {
    if (!eventId || !event) return;

    // For paid events, show payment modal
    if (event.price_cents > 0) {
      setShowPaymentModal(true);
      return;
    }

    // For free events, register directly
    setIsRegistering(true);
    try {
      await eventsApi.registerForEvent(eventId);
      await loadEvent(); // Refresh event data
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { detail?: string } } };
      if (error.response?.status === 402) {
        setPaymentMessage({
          type: 'error',
          text: 'Payment required for this event.',
        });
      } else {
        setPaymentMessage({
          type: 'error',
          text: error.response?.data?.detail || 'Failed to register. Please try again.',
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!eventId) return;
    if (!confirm('Are you sure you want to cancel your registration?')) return;

    setIsCancelling(true);
    try {
      await eventsApi.cancelRegistration(eventId);
      await loadEvent();
    } catch {
      alert('Failed to cancel registration');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
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

  const addToCalendar = () => {
    if (!event) return;
    const startDate = new Date(event.start_datetime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endDate = event.end_datetime
      ? new Date(event.end_datetime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      : startDate;
    const location = [event.location_name, event.location_address, event.location_city, event.location_country]
      .filter(Boolean)
      .join(', ');

    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.name)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(location)}`;
    window.open(googleCalUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main className={styles.main}>
          <div className="container">
            <div className={styles.loading}>Loading event details...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className={styles.page}>
        <Navbar />
        <main className={styles.main}>
          <div className="container">
            <div className={styles.error}>
              <h2>Event not found</h2>
              <p>{error || 'The event you are looking for does not exist.'}</p>
              <Button onClick={() => navigate('/events')}>Back to Events</Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isFull = Boolean(event.max_attendees && event.spots_remaining === 0);
  const isPast = new Date(event.start_datetime) < new Date();

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className="container">
          {/* Payment Message */}
          {paymentMessage && (
            <div className={`${styles.paymentMessage} ${styles[paymentMessage.type]}`}>
              <span>{paymentMessage.text}</span>
              <button
                onClick={() => setPaymentMessage(null)}
                className={styles.dismissButton}
                aria-label="Dismiss"
              >
                &times;
              </button>
            </div>
          )}

          <div className={styles.breadcrumb}>
            <BackButton label="Back to Events" fallbackPath="/events" />
          </div>

          <div className={styles.layout}>
            {/* Main Content */}
            <div className={styles.content}>
              {/* Hero Image */}
              <div className={styles.hero}>
                {event.image_url ? (
                  <img src={event.image_url} alt={event.name} className={styles.heroImage} />
                ) : (
                  <div className={styles.heroPlaceholder}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                {event.is_cancelled && (
                  <span className={styles.cancelledBadge}>Cancelled</span>
                )}
              </div>

              {/* Event Title */}
              <h1 className={styles.title}>{event.name}</h1>

              {/* Date & Time */}
              <div className={styles.dateTime}>
                <div className={styles.dateTimeItem}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <div>
                    <strong>{formatDate(event.start_datetime)}</strong>
                    <span>{formatTime(event.start_datetime)}</span>
                    {event.end_datetime && (
                      <span> - {formatTime(event.end_datetime)}</span>
                    )}
                  </div>
                </div>
                <button className={styles.calendarButton} onClick={addToCalendar}>
                  Add to Calendar
                </button>
              </div>

              {/* Location */}
              {(event.location_name || event.location_address) && (
                <div className={styles.location}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div>
                    {event.location_name && <strong>{event.location_name}</strong>}
                    {event.location_address && <span>{event.location_address}</span>}
                    {(event.location_city || event.location_country) && (
                      <span>
                        {[event.location_city, event.location_country].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className={styles.section}>
                <h2>About this event</h2>
                <div className={styles.description}>
                  {event.description || 'No description provided.'}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className={styles.sidebar}>
              <div className={styles.card}>
                <div className={styles.price}>
                  {formatPrice(event.price_cents, event.currency)}
                </div>

                {/* Registration Status */}
                {event.is_registered ? (
                  <div className={styles.registeredStatus}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>You're registered!</span>
                  </div>
                ) : null}

                {/* Spots Info */}
                {event.max_attendees && (
                  <div className={styles.spotsInfo}>
                    <div className={styles.spotsBar}>
                      <div
                        className={styles.spotsFilled}
                        style={{
                          width: `${(event.registration_count / event.max_attendees) * 100}%`,
                        }}
                      />
                    </div>
                    <span>
                      {event.spots_remaining !== null
                        ? `${event.spots_remaining} spots remaining`
                        : `${event.registration_count} registered`}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                {!isPast && !event.is_cancelled && (
                  <>
                    {event.is_registered ? (
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={handleCancelRegistration}
                        disabled={isCancelling}
                      >
                        {isCancelling ? 'Cancelling...' : 'Cancel Registration'}
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        onClick={handleRegister}
                        disabled={isRegistering || isFull}
                      >
                        {isRegistering
                          ? 'Registering...'
                          : isFull
                          ? 'Event Full'
                          : event.price_cents > 0
                          ? 'Register (Payment Required)'
                          : 'Register for Free'}
                      </Button>
                    )}
                  </>
                )}

                {isPast && (
                  <div className={styles.pastEvent}>This event has ended</div>
                )}

                {event.is_cancelled && (
                  <div className={styles.cancelledEvent}>
                    This event has been cancelled
                  </div>
                )}

                {/* Stats */}
                <div className={styles.stats}>
                  <div className={styles.stat}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>{event.registration_count} attending</span>
                  </div>
                </div>
              </div>

              {/* Share */}
              <div className={styles.shareSection}>
                <h3>Share this event</h3>
                <div className={styles.shareButtons}>
                  <button
                    className={styles.shareButton}
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Payment Modal */}
      {event && (
        <PaymentModal
          event={event}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            loadEvent();
          }}
        />
      )}
    </div>
  );
};

export default EventDetailPage;
