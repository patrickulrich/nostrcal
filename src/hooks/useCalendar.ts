import { useContext } from 'react';
import { CalendarContext } from '@/contexts/CalendarContextInstance';

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}