'use client'

import { useEffect } from 'react';
import useCalendarStore from '@/stores/use-calendar-store';

export function useCalendar() {
  const { events, isSyncing, setEvents, setSyncing, addEvent } = useCalendarStore();

  const fetchTodayEvents = async () => {
    try {
      const res = await fetch('/api/calendar/today');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    }
  };

  const syncGoogleCalendar = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      if (res.ok) {
        await fetchTodayEvents();
      }
    } catch (err) {
      console.error('Failed to sync google calendar:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchTodayEvents();
  }, []);

  return {
    events,
    isSyncing,
    syncGoogleCalendar,
    refreshEvents: fetchTodayEvents,
    addLocalEvent: addEvent,
  };
}
export default useCalendar;
