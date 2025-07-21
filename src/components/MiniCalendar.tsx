import React from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import { useEvents } from '@/hooks/useEvents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function MiniCalendar() {
  const { miniCalendarDate, getMiniCalendarDates, navigateToDate } = useCalendar();
  const { getFilteredEvents } = useEvents();

  const dates = getMiniCalendarDates();
  const events = getFilteredEvents();

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(miniCalendarDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    navigateToDate(newDate);
  };

  const hasEventsOnDate = (date: Date) => {
    return events.some(event => {
      if (event.kind === 31922) {
        // Date-based event
        if (!event.start) return false;
        
        const eventStart = new Date(event.start);
        const eventEnd = event.end ? new Date(event.end) : eventStart;
        
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        return eventStart <= dayEnd && eventEnd >= dayStart;
      } else {
        // Time-based event
        if (!event.start) return false;
        
        const eventStart = new Date(parseInt(event.start) * 1000);
        const eventEnd = event.end ? new Date(parseInt(event.end) * 1000) : eventStart;
        
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Check if the event overlaps with this day
        return eventStart <= dayEnd && eventEnd >= dayStart;
      }
    });
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === miniCalendarDate.getMonth();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {formatMonthYear(miniCalendarDate)}
          </h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-6 w-6 p-0"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-6 w-6 p-0"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={index} className="text-center text-xs font-medium text-muted-foreground p-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {dates.map((date, index) => {
            const isCurrentMonthDate = isCurrentMonth(date);
            const isTodayDate = isToday(date);
            const hasEvents = hasEventsOnDate(date);

            return (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className={`h-7 w-7 p-0 text-xs hover:bg-accent relative ${
                  isCurrentMonthDate 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
                } ${
                  isTodayDate 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                    : ''
                }`}
                onClick={() => navigateToDate(date)}
              >
                {date.getDate()}
                {hasEvents && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-accent-foreground rounded-full" />
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}