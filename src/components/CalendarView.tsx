import React, { useState, useEffect } from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import { useEvents } from '@/hooks/useEvents';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users, Lock } from 'lucide-react';

interface CalendarEvent {
  id: string;
  kind: number;
  title?: string;
  summary?: string;
  image?: string;
  start?: string;
  end?: string;
  location?: string;
  geohash?: string;
  description?: string;
  timezone?: string;
  endTimezone?: string;
  hashtags?: string[];
  references?: string[];
  participants?: string[];
  color?: string;
  source?: string;
}

interface EventModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
}

function EventModal({ event, onClose }: EventModalProps) {
  if (!event) return null;

  const formatDateTime = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{event.title || 'Untitled Event'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {event.kind === 31922 ? (
                // Date-based event
                event.start && event.end ? (
                  `${formatDate(event.start)} - ${formatDate(event.end)}`
                ) : (
                  event.start ? formatDate(event.start) : 'No date'
                )
              ) : (
                // Time-based event
                event.start && event.end ? (
                  `${formatDateTime(event.start)} - ${formatDateTime(event.end)}`
                ) : (
                  event.start ? formatDateTime(event.start) : 'No time'
                )
              )}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{event.location}</span>
            </div>
          )}

          {event.summary && (
            <div className="text-sm text-muted-foreground italic">{event.summary}</div>
          )}

          {event.participants && event.participants.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{event.participants.length} participants</span>
            </div>
          )}

          {event.description && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">{event.description}</p>
            </div>
          )}

          {event.image && (
            <div className="pt-2">
              <img 
                src={event.image} 
                alt={event.title || 'Event image'} 
                className="w-full rounded-md"
                onError={(e) => e.currentTarget.style.display = 'none'}
              />
            </div>
          )}

          {event.hashtags && event.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {event.hashtags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {event.references && event.references.length > 0 && (
            <div className="pt-2 space-y-1">
              <p className="text-xs text-muted-foreground">Links & References:</p>
              {event.references.map((ref, index) => (
                <a 
                  key={index} 
                  href={ref} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline block truncate"
                >
                  {ref}
                </a>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline">
              {event.kind === 31922 ? 'All Day' : 'Timed Event'}
            </Badge>
            {event.timezone && (
              <Badge variant="outline">{event.timezone}</Badge>
            )}
            {event.endTimezone && event.endTimezone !== event.timezone && (
              <Badge variant="outline">End: {event.endTimezone}</Badge>
            )}
            {event.geohash && (
              <Badge variant="outline" title={`Geohash: ${event.geohash}`}>
                📍 {event.geohash}
              </Badge>
            )}
            {event.source === 'private' && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WeekView() {
  const { getWeekDates } = useCalendar();
  const { getFilteredEvents } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const weekDates = getWeekDates();
  const events = getFilteredEvents();

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (hour: number) => {
    return hour === 0 ? '12 AM' : 
           hour < 12 ? `${hour} AM` : 
           hour === 12 ? '12 PM' : 
           `${hour - 12} PM`;
  };

  const eventSpansDate = (event: CalendarEvent, date: Date) => {
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
      
      const eventDate = new Date(parseInt(event.start) * 1000);
      return eventDate.toDateString() === date.toDateString();
    }
  };

  const getEventPosition = (event: CalendarEvent) => {
    if (event.kind === 31922) {
      // All-day event - position at top
      return { top: 0, height: 30 };
    } else {
      // Time-based event
      if (!event.start) return { top: 0, height: 60 };
      
      const startDate = new Date(parseInt(event.start) * 1000);
      const endDate = event.end ? new Date(parseInt(event.end) * 1000) : new Date(startDate.getTime() + 60 * 60 * 1000);
      
      const startHour = startDate.getHours();
      const startMinutes = startDate.getMinutes();
      const endHour = endDate.getHours();
      const endMinutes = endDate.getMinutes();
      
      const startPosition = (startHour * 64) + (startMinutes / 60 * 64); // 64px per hour
      const endPosition = (endHour * 64) + (endMinutes / 60 * 64);
      
      return {
        top: startPosition,
        height: Math.max(endPosition - startPosition, 30)
      };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Week header */}
      <div className="relative border-b bg-background sticky top-0 z-10">
        <div className="flex" style={{ boxSizing: 'border-box' }}>
          <div className="w-16 flex-shrink-0 box-border" style={{ minWidth: '64px', maxWidth: '64px' }}>
            <div className="h-full flex items-center justify-center" style={{ minHeight: '60px' }}>
              <Clock className="h-4 w-4" />
            </div>
          </div>
          {weekDates.map((date, index) => (
            <div key={index} className="flex-1 box-border" style={{ minHeight: '60px' }}>
              <div className="p-2 text-center h-full flex flex-col justify-center">
                <div className="text-xs text-muted-foreground">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-sm font-medium ${
                  date.toDateString() === new Date().toDateString() 
                    ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto'
                    : ''
                }`}>
                  {date.getDate()}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Vertical grid lines */}
        <div className="absolute inset-0 pointer-events-none flex">
          <div className="w-16 border-r border-border"></div>
          {weekDates.map((_, index) => (
            <div key={index} className="flex-1 border-r border-border"></div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="relative" style={{ boxSizing: 'border-box' }}>
          <div className="flex">
            {/* Hour labels */}
            <div className="w-16 flex-shrink-0 box-border" style={{ minWidth: '64px', maxWidth: '64px' }}>
              {hours.map(hour => (
                <div key={hour} className="h-16 border-b border-border box-border" style={{ minHeight: '64px' }}>
                  <div className="h-full flex items-center justify-end pr-2">
                    <span className="text-xs text-muted-foreground">
                      {formatHour(hour)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDates.map((date, dayIndex) => (
              <div key={dayIndex} className="flex-1 relative box-border">
                {/* Hour slots */}
                {hours.map(hour => (
                  <div key={hour} className="h-16 border-b border-border box-border" style={{ minHeight: '64px' }} />
                ))}

                {/* Events */}
                {events
                  .filter(event => eventSpansDate(event, date))
                  .map(event => {
                    const position = getEventPosition(event);
                    return (
                      <div
                        key={event.id || `${event.kind}-${event.dTag}-${event.created_at}`}
                        className="absolute left-1 right-1 p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity box-border"
                        style={{
                          top: `${position.top}px`,
                          height: `${position.height}px`,
                          backgroundColor: event.color || '#3b82f6',
                          color: 'white',
                          zIndex: 3
                        }}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="font-medium truncate">
                          {event.title || 'Untitled Event'}
                        </div>
                        {event.location && (
                          <div className="truncate opacity-90">
                            {event.location}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
          
          {/* Vertical grid lines overlay */}
          <div className="absolute inset-0 pointer-events-none flex">
            <div className="w-16 border-r border-border"></div>
            {weekDates.map((_, index) => (
              <div key={index} className="flex-1 border-r border-border"></div>
            ))}
          </div>
        </div>
      </div>

      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}

function MonthView() {
  const { currentDate, getMiniCalendarDates } = useCalendar();
  const { getFilteredEvents } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const dates = getMiniCalendarDates();
  const events = getFilteredEvents();

  const eventSpansDate = (event: CalendarEvent, date: Date) => {
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
      
      const eventDate = new Date(parseInt(event.start) * 1000);
      return eventDate.toDateString() === date.toDateString();
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => eventSpansDate(event, date));
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Month header */}
      <div className="grid grid-cols-7 border-b bg-background">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium border-r">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {dates.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const isCurrentMonthDate = isCurrentMonth(date);
          const isTodayDate = isToday(date);

          return (
            <div
              key={index}
              className={`border-r border-b p-2 min-h-[100px] ${
                isCurrentMonthDate ? 'bg-background' : 'bg-muted/20'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isTodayDate
                  ? 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center'
                  : isCurrentMonthDate
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}>
                {date.getDate()}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id || `${event.kind}-${event.dTag}-${event.created_at}`}
                    className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate"
                    style={{
                      backgroundColor: event.color || '#3b82f6',
                      color: 'white'
                    }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    {event.title || 'Untitled Event'}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}

function DayView() {
  const { currentDate } = useCalendar();
  const { getFilteredEvents } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const events = getFilteredEvents();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (hour: number) => {
    return hour === 0 ? '12 AM' : 
           hour < 12 ? `${hour} AM` : 
           hour === 12 ? '12 PM' : 
           `${hour - 12} PM`;
  };

  const eventSpansDate = (event: CalendarEvent, date: Date) => {
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
      
      const eventDate = new Date(parseInt(event.start) * 1000);
      return eventDate.toDateString() === date.toDateString();
    }
  };

  const getEventPosition = (event: CalendarEvent) => {
    if (event.kind === 31922) {
      // All-day event - position at top
      return { top: 0, height: 30 };
    } else {
      // Time-based event
      if (!event.start) return { top: 0, height: 60 };
      
      const startDate = new Date(parseInt(event.start) * 1000);
      const endDate = event.end ? new Date(parseInt(event.end) * 1000) : new Date(startDate.getTime() + 60 * 60 * 1000);
      
      const startHour = startDate.getHours();
      const startMinutes = startDate.getMinutes();
      const endHour = endDate.getHours();
      const endMinutes = endDate.getMinutes();
      
      const startPosition = (startHour * 60 + startMinutes) * (60 / 60); // 60px per hour
      const endPosition = (endHour * 60 + endMinutes) * (60 / 60);
      
      return {
        top: startPosition + 40, // Offset for all-day events
        height: Math.max(endPosition - startPosition, 30)
      };
    }
  };

  const dayEvents = events.filter(event => eventSpansDate(event, currentDate));

  return (
    <div className="flex flex-col h-full">
      {/* Day header */}
      <div className="flex border-b bg-background sticky top-0 z-10">
        <div className="w-16 p-2 text-sm font-medium border-r">
          <Clock className="h-4 w-4" />
        </div>
        <div className="flex-1 p-2 text-center">
          <div className="text-xs text-muted-foreground">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className="text-lg font-semibold">
            {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex relative">
          {/* Hour labels */}
          <div className="w-16 border-r">
            {hours.map(hour => (
              <div key={hour} className="h-16 p-2 text-xs text-muted-foreground text-right border-b">
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="flex-1 relative">
            {/* Hour slots */}
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-muted/20" />
            ))}

            {/* Events */}
            {dayEvents.map(event => {
              const position = getEventPosition(event);
              return (
                <div
                  key={event.id || `${event.kind}-${event.dTag}-${event.created_at}`}
                  className="absolute left-2 right-2 p-2 rounded text-sm cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    top: `${position.top}px`,
                    height: `${position.height}px`,
                    backgroundColor: event.color || '#3b82f6',
                    color: 'white',
                    zIndex: 3
                  }}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="font-medium truncate">
                    {event.title || 'Untitled Event'}
                  </div>
                  {event.location && (
                    <div className="truncate opacity-90">
                      {event.location}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}

export default function CalendarView() {
  const { view } = useCalendar();
  const { data: calendarEvents, isLoading, error } = useCalendarEvents();
  const { user } = useCurrentUser();

  // Update events context when data loads
  const eventsContext = useEvents();
  useEffect(() => {
    if (calendarEvents) {
      // Separate private and public events by source
      const publicEvents = calendarEvents.filter(event => event.source !== 'private');
      const privateEvents = calendarEvents.filter(event => event.source === 'private');
      

      // Public events
      const dayEvents = publicEvents.filter(event => event.kind === 31922);
      const timeEvents = publicEvents.filter(event => event.kind === 31923);
      const rsvpEvents = publicEvents.filter(event => event.kind === 31925);
      const availabilityBlocks = publicEvents.filter(event => event.kind === 31927);

      // Private events
      const privateDayEvents = privateEvents.filter(event => event.kind === 31922);
      const privateTimeEvents = privateEvents.filter(event => event.kind === 31923);
      const privateRsvps = privateEvents.filter(event => event.kind === 31925);


      eventsContext.setDayEvents(dayEvents);
      eventsContext.setTimeEvents(timeEvents);
      eventsContext.setRsvpEvents(rsvpEvents);
      eventsContext.setBookingBlocks(availabilityBlocks);
      eventsContext.setPrivateDayEvents(privateDayEvents);
      eventsContext.setPrivateTimeEvents(privateTimeEvents);
      eventsContext.setPrivateRsvps(privateRsvps);
    } else if (user && !isLoading) {
      // Add some mock events for testing when no events are loaded
      eventsContext.addMockEvents();
    }
  }, [calendarEvents, eventsContext, user, isLoading]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Welcome to NostrCal</h2>
          <p className="text-muted-foreground">Please log in to view your calendar events</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full flex-col">
        <div className="text-destructive">Error loading calendar events</div>
        <div className="text-sm text-muted-foreground mt-2">
          {String(error)}
        </div>
      </div>
    );
  }

  switch (view) {
    case 'day':
      return <DayView />;
    case 'week':
      return <WeekView />;
    case 'month':
      return <MonthView />;
    default:
      return <WeekView />;
  }
}