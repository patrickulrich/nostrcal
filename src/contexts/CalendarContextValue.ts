export interface CalendarContextValue {
  // Calendar view state
  currentDate: Date;
  miniCalendarDate: Date;
  view: 'day' | 'week' | 'month';
  is24HourFormat: boolean;
  
  // Navigation methods
  navigateNext: () => void;
  navigatePrevious: () => void;
  navigateToToday: () => void;
  navigateToDate: (date: Date) => void;
  setCalendarView: (view: 'day' | 'week' | 'month') => void;
  setTimeFormat: (is24Hour: boolean) => void;
  
  // Utility methods
  getWeekDates: () => Date[];
  getMiniCalendarDates: () => Date[];
}