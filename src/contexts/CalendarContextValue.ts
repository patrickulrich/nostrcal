export interface CalendarContextValue {
  // Calendar view state
  currentDate: Date;
  miniCalendarDate: Date;
  view: 'day' | 'week' | 'month';
  
  // Navigation methods
  navigateNext: () => void;
  navigatePrevious: () => void;
  navigateToToday: () => void;
  navigateToDate: (date: Date) => void;
  setCalendarView: (view: 'day' | 'week' | 'month') => void;
  
  // Utility methods
  getWeekDates: () => Date[];
  getMiniCalendarDates: () => Date[];
}