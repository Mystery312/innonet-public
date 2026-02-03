import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi } from '../api/eventsApi';
import type { CalendarEvent } from '../../../types/events';
import styles from './EventCalendar.module.css';

interface EventCalendarProps {
  onEventClick?: (eventId: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const EventCalendar: React.FC<EventCalendarProps> = ({ onEventClick }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const data = await eventsApi.getCalendarEvents(currentYear, currentMonth);
        setEvents(data.events);
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [currentYear, currentMonth]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getEventsForDay = (day: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_datetime);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() + 1 === currentMonth &&
        eventDate.getFullYear() === currentYear
      );
    });
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() + 1 &&
      currentYear === today.getFullYear()
    );
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const renderDays = () => {
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={styles.emptyDay} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const hasEvents = dayEvents.length > 0;
      const hasRegistered = dayEvents.some((e) => e.is_registered);

      days.push(
        <div
          key={day}
          className={`${styles.day} ${isToday(day) ? styles.today : ''} ${hasEvents ? styles.hasEvents : ''}`}
        >
          <span className={styles.dayNumber}>{day}</span>
          {hasEvents && (
            <div className={styles.eventDots}>
              {dayEvents.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className={`${styles.eventDot} ${event.is_registered ? styles.registeredDot : ''}`}
                  title={event.name}
                  onClick={(e) => {
                    if (onEventClick) {
                      e.preventDefault();
                      onEventClick(event.id);
                    }
                  }}
                />
              ))}
              {dayEvents.length > 3 && (
                <span className={styles.moreEvents}>+{dayEvents.length - 3}</span>
              )}
            </div>
          )}
          {hasRegistered && <div className={styles.registeredIndicator} />}
        </div>
      );
    }

    return days;
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button className={styles.navButton} onClick={handlePrevMonth}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h3 className={styles.monthYear}>
          {MONTH_NAMES[currentMonth - 1]} {currentYear}
        </h3>
        <button className={styles.navButton} onClick={handleNextMonth}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className={styles.weekdays}>
        {DAY_NAMES.map((day) => (
          <div key={day} className={styles.weekday}>
            {day}
          </div>
        ))}
      </div>

      <div className={styles.days}>
        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : (
          renderDays()
        )}
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} />
          <span>Events</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.registeredDot}`} />
          <span>Registered</span>
        </div>
      </div>
    </div>
  );
};

export default EventCalendar;
