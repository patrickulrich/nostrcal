import { useState, useEffect, ReactNode } from 'react';
import { CalendarContextValue } from './CalendarContextValue';
import { CalendarContext } from './CalendarContextInstance';

interface CalendarProviderProps {
  children: ReactNode;
}

const CALENDAR_VIEW_STORAGE_KEY = 'nostrcal-calendar-view';
const TIME_FORMAT_STORAGE_KEY = 'nostrcal-time-format';

const getStoredCalendarView = (): 'day' | 'week' | 'month' => {
  try {
    const stored = localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);
    if (stored && ['day', 'week', 'month'].includes(stored)) {
      return stored as 'day' | 'week' | 'month';
    }
  } catch (error) {
    // Ignore localStorage errors (e.g., in private browsing mode)
    console.warn('Failed to read calendar view preference from localStorage:', error);
  }
  return 'week'; // Default fallback
};

const storeCalendarView = (view: 'day' | 'week' | 'month') => {
  try {
    localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, view);
  } catch (error) {
    // Ignore localStorage errors (e.g., in private browsing mode)
    console.warn('Failed to save calendar view preference to localStorage:', error);
  }
};

const getStoredTimeFormat = (): boolean => {
  try {
    const stored = localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
    return stored === 'true';
  } catch (error) {
    console.warn('Failed to read time format preference from localStorage:', error);
  }
  return false; // Default to 12-hour format
};

const storeTimeFormat = (is24Hour: boolean) => {
  try {
    localStorage.setItem(TIME_FORMAT_STORAGE_KEY, is24Hour.toString());
  } catch (error) {
    console.warn('Failed to save time format preference to localStorage:', error);
  }
};

export function CalendarProvider({ children }: CalendarProviderProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalendarDate, setMiniCalendarDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>(getStoredCalendarView());
  const [is24HourFormat, setIs24HourFormat] = useState(getStoredTimeFormat());

  // Navigation methods
  const navigateNext = () => {
    const nextDate = new Date(currentDate);
    if (view === 'day') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (view === 'week') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (view === 'month') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    setCurrentDate(nextDate);
  };

  const navigatePrevious = () => {
    const prevDate = new Date(currentDate);
    if (view === 'day') {
      prevDate.setDate(prevDate.getDate() - 1);
    } else if (view === 'week') {
      prevDate.setDate(prevDate.getDate() - 7);
    } else if (view === 'month') {
      prevDate.setMonth(prevDate.getMonth() - 1);
    }
    setCurrentDate(prevDate);
  };

  const navigateToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setMiniCalendarDate(today);
  };

  const navigateToDate = (date: Date) => {
    setCurrentDate(new Date(date));
    setMiniCalendarDate(new Date(date));
  };

  const setCalendarView = (newView: 'day' | 'week' | 'month') => {
    setView(newView);
    storeCalendarView(newView);
  };

  const setTimeFormat = (is24Hour: boolean) => {
    setIs24HourFormat(is24Hour);
    storeTimeFormat(is24Hour);
  };

  // Utility methods
  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const getMiniCalendarDates = () => {
    const year = miniCalendarDate.getFullYear();
    const month = miniCalendarDate.getMonth();
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    
    // Get start of calendar grid (including previous month days)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 42 days (6 weeks)
    const dates: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  // Keep mini calendar in sync with main calendar
  useEffect(() => {
    if (currentDate.getMonth() !== miniCalendarDate.getMonth() || 
        currentDate.getFullYear() !== miniCalendarDate.getFullYear()) {
      setMiniCalendarDate(new Date(currentDate));
    }
  }, [currentDate, miniCalendarDate]);

  const value: CalendarContextValue = {
    currentDate,
    miniCalendarDate,
    view,
    is24HourFormat,
    navigateNext,
    navigatePrevious,
    navigateToToday,
    navigateToDate,
    setCalendarView,
    setTimeFormat,
    getWeekDates,
    getMiniCalendarDates,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}