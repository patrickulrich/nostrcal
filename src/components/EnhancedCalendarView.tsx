import React, { useState, useEffect } from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import { useEvents } from '@/hooks/useEvents';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDeleteCalendarEvent } from '@/hooks/useCalendarPublish';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Lock, MoreVertical, Edit, Trash2 } from 'lucide-react';
import ParticipantsList from '@/components/ParticipantsList';
import { EditEventModal } from './EditEventModal';
import { CalendarEvent } from '@/contexts/EventsContextTypes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EventPosition {
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

interface EventModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

function EventModal({ event, onClose, onEdit, onDelete }: EventModalProps) {
  const { user } = useCurrentUser();
  const deleteEventMutation = useDeleteCalendarEvent();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  if (!event) return null;

  // Check if current user can edit/delete this event
  const canManageEvent = user?.pubkey && (
    // User is the event organizer
    event.id?.includes(user.pubkey) ||
    // For calendar events, check if user is the author (pubkey is in the event data)
    (event as CalendarEvent & { pubkey?: string }).pubkey === user.pubkey
  );

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!event.id) return;
    
    try {
      await deleteEventMutation.mutateAsync(event.id);
      onClose();
      if (onDelete) onDelete(event);
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col sm:mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{event.title || 'Untitled Event'}</CardTitle>
            <div className="flex items-center gap-2">
              {canManageEvent && (onEdit || onDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(event)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Event
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem 
                        onClick={handleDeleteClick}
                        className="text-destructive focus:text-destructive"
                        disabled={deleteEventMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleteEventMutation.isPending ? 'Deleting...' : 'Delete Event'}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
            <ParticipantsList participants={event.participants} maxVisible={3} />
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
              {event.kind === 31922 ? 'All Day' : event.kind === 31925 ? 'RSVP' : 'Timed Event'}
            </Badge>
            {event.kind === 31925 && event.rsvpStatus && (
              <Badge variant="outline" className={`${
                event.rsvpStatus === 'accepted' ? 'bg-green-100 text-green-800' :
                event.rsvpStatus === 'declined' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {event.rsvpStatus.charAt(0).toUpperCase() + event.rsvpStatus.slice(1)}
              </Badge>
            )}
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

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full">
            <CardHeader>
              <CardTitle className="text-lg">Delete Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete "{event.title || 'Untitled Event'}"? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteEventMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleDeleteConfirm}
                  disabled={deleteEventMutation.isPending}
                >
                  {deleteEventMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Helper function to calculate overlapping event layout
function calculateEventLayout(events: CalendarEvent[], date: Date): Map<string, EventPosition> {
  const positions = new Map<string, EventPosition>();
  const columns: Array<{ start: number; end: number; events: CalendarEvent[] }> = [];
  
  // Sort events by start time
  const sortedEvents = events.sort((a, b) => {
    const aStart = getEventStartTime(a, date);
    const bStart = getEventStartTime(b, date);
    return aStart - bStart;
  });

  sortedEvents.forEach(event => {
    const startTime = getEventStartTime(event, date);
    const endTime = getEventEndTime(event, date);
    
    // Find the first column that doesn't overlap
    let columnIndex = 0;
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const hasOverlap = column.events.some(existingEvent => {
        const existingStart = getEventStartTime(existingEvent, date);
        const existingEnd = getEventEndTime(existingEvent, date);
        return startTime < existingEnd && endTime > existingStart;
      });
      
      if (!hasOverlap) {
        columnIndex = i;
        break;
      }
      columnIndex = i + 1;
    }
    
    // Create new column if needed
    if (columnIndex >= columns.length) {
      columns.push({ start: startTime, end: endTime, events: [] });
    }
    
    columns[columnIndex].events.push(event);
    
    // Calculate position
    const totalColumns = Math.max(columns.length, 1);
    const width = Math.floor(95 / totalColumns); // Leave 5% margin
    const left = (columnIndex * width) + 2; // 2% left margin
    
    positions.set(event.id || `${event.kind}-${event.start}`, {
      top: getEventTopPosition(event, date),
      height: getEventHeight(event, date),
      left,
      width,
      zIndex: 10 + columnIndex
    });
  });
  
  return positions;
}

function getEventStartTime(event: CalendarEvent, date: Date): number {
  if (event.kind === 31922) {
    // All-day events start at midnight
    return 0;
  } else {
    if (!event.start) return 0;
    const eventDate = new Date(parseInt(event.start) * 1000);
    
    // If event starts on a different day, it starts at midnight for this day
    if (eventDate.toDateString() !== date.toDateString()) {
      return 0;
    }
    
    return eventDate.getHours() * 60 + eventDate.getMinutes();
  }
}

function getEventEndTime(event: CalendarEvent, date: Date): number {
  if (event.kind === 31922) {
    // All-day events end at midnight of next day
    return 24 * 60;
  } else {
    if (!event.end) {
      // Default 1 hour duration if no end time
      return getEventStartTime(event, date) + 60;
    }
    
    const eventEndDate = new Date(parseInt(event.end) * 1000);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    // If event ends on a different day, it ends at midnight
    if (eventEndDate > dayEnd) {
      return 24 * 60;
    }
    
    return eventEndDate.getHours() * 60 + eventEndDate.getMinutes();
  }
}

function getEventTopPosition(event: CalendarEvent, date: Date): number {
  if (event.kind === 31922) {
    return 0; // All-day events at top
  } else {
    const startTime = getEventStartTime(event, date);
    return (startTime / 60) * 64; // 64px per hour
  }
}

function getEventHeight(event: CalendarEvent, date: Date): number {
  if (event.kind === 31922) {
    return 30; // Fixed height for all-day events
  } else {
    const startTime = getEventStartTime(event, date);
    const endTime = getEventEndTime(event, date);
    const duration = endTime - startTime;
    return Math.max((duration / 60) * 64, 30); // Minimum 30px height
  }
}

// Enhanced function to check if event spans multiple days
function getEventSpanInfo(event: CalendarEvent, date: Date) {
  if (event.kind === 31922) {
    // Date-based event
    if (!event.start) return { spans: false, isFirst: false, isLast: false, continues: false };
    
    const eventStart = new Date(event.start);
    const eventEnd = event.end ? new Date(event.end) : eventStart;
    
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const spansThisDay = eventStart <= dayEnd && eventEnd >= dayStart;
    const isFirstDay = eventStart.toDateString() === date.toDateString();
    const isLastDay = eventEnd.toDateString() === date.toDateString();
    const continuesAfter = eventEnd > dayEnd;
    const continuesBefore = eventStart < dayStart;
    
    return {
      spans: spansThisDay,
      isFirst: isFirstDay,
      isLast: isLastDay,
      continues: continuesAfter,
      continuedFrom: continuesBefore
    };
  } else {
    // Time-based event
    if (!event.start) return { spans: false, isFirst: false, isLast: false, continues: false };
    
    const eventStartDate = new Date(parseInt(event.start) * 1000);
    const eventEndDate = event.end ? new Date(parseInt(event.end) * 1000) : new Date(eventStartDate.getTime() + 60 * 60 * 1000);
    
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const spansThisDay = eventStartDate <= dayEnd && eventEndDate >= dayStart;
    const isFirstDay = eventStartDate.toDateString() === date.toDateString();
    const isLastDay = eventEndDate.toDateString() === date.toDateString();
    const continuesAfter = eventEndDate > dayEnd;
    const continuesBefore = eventStartDate < dayStart;
    
    return {
      spans: spansThisDay,
      isFirst: isFirstDay,
      isLast: isLastDay,
      continues: continuesAfter,
      continuedFrom: continuesBefore
    };
  }
}

function WeekView({ onEditEvent }: { onEditEvent: (event: CalendarEvent) => void }) {
  const { getWeekDates } = useCalendar();
  const { getFilteredEvents } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleEditEvent = (event: CalendarEvent) => {
    onEditEvent(event);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    // TODO: Implement event deletion functionality
    console.log('Delete event:', event);
    setSelectedEvent(null);
  };

  const weekDates = getWeekDates();
  const events = getFilteredEvents();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (hour: number) => {
    return hour === 0 ? '12 AM' : 
           hour < 12 ? `${hour} AM` : 
           hour === 12 ? '12 PM' : 
           `${hour - 12} PM`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Week header */}
      <div className="relative border-b bg-background sticky top-0 z-10">
        <div className="flex">
          <div className="w-16 flex-shrink-0 min-w-[64px] max-w-[64px]">
            <div className="h-full flex items-center justify-center min-h-[60px]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          {weekDates.map((date, index) => (
            <div key={index} className="flex-1 min-h-[60px]">
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
        <div className="relative">
          <div className="flex">
            {/* Hour labels */}
            <div className="w-16 flex-shrink-0 min-w-[64px] max-w-[64px]">
              {hours.map(hour => (
                <div key={hour} className="h-16 border-b border-border min-h-[64px]">
                  <div className="h-full flex items-center justify-end pr-2">
                    <span className="text-xs text-muted-foreground">
                      {formatHour(hour)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDates.map((date, dayIndex) => {
              const dayEvents = events.filter(event => {
                const spanInfo = getEventSpanInfo(event, date);
                return spanInfo.spans;
              });
              
              const eventPositions = calculateEventLayout(dayEvents, date);

              return (
                <div key={dayIndex} className="flex-1 relative">
                  {/* Hour slots */}
                  {hours.map(hour => (
                    <div key={hour} className="h-16 border-b border-border min-h-[64px]" />
                  ))}

                  {/* Events */}
                  {dayEvents.map(event => {
                    const spanInfo = getEventSpanInfo(event, date);
                    const position = eventPositions.get(event.id || `${event.kind}-${event.start}`) || {
                      top: 0, height: 30, left: 2, width: 95, zIndex: 10
                    };

                    return (
                      <div
                        key={`${event.id || `${event.kind}-${event.start}`}-${dayIndex}`}
                        className="absolute p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                        style={{
                          top: `${position.top}px`,
                          height: `${position.height}px`,
                          left: `${position.left}%`,
                          width: `${position.width}%`,
                          backgroundColor: event.color || '#3b82f6',
                          color: 'white',
                          zIndex: position.zIndex,
                          // Visual indicators for multi-day events
                          borderLeftStyle: spanInfo.continuedFrom ? 'none' : 'solid',
                          borderRightStyle: spanInfo.continues ? 'none' : 'solid',
                          borderTopLeftRadius: spanInfo.continuedFrom ? '0' : '4px',
                          borderBottomLeftRadius: spanInfo.continuedFrom ? '0' : '4px',
                          borderTopRightRadius: spanInfo.continues ? '0' : '4px',
                          borderBottomRightRadius: spanInfo.continues ? '0' : '4px',
                        }}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="font-medium truncate">
                          {spanInfo.continuedFrom && '← '}
                          {event.kind === 31925 ? '✓ ' : ''}{event.title || 'Untitled Event'}
                          {spanInfo.continues && ' →'}
                        </div>
                        {event.location && position.height > 40 && (
                          <div className="truncate opacity-90 text-[10px]">
                            {event.location}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
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

      <EventModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

function MonthView({ onEditEvent }: { onEditEvent: (event: CalendarEvent) => void }) {
  const { currentDate, getMiniCalendarDates } = useCalendar();
  const { getFilteredEvents } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleEditEvent = (event: CalendarEvent) => {
    onEditEvent(event);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    // TODO: Implement event deletion functionality
    console.log('Delete event:', event);
    setSelectedEvent(null);
  };

  const dates = getMiniCalendarDates();
  const events = getFilteredEvents();

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const spanInfo = getEventSpanInfo(event, date);
      return spanInfo.spans;
    });
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
                {dayEvents.slice(0, 3).map(event => {
                  const spanInfo = getEventSpanInfo(event, date);
                  
                  return (
                    <div
                      key={`${event.id || `${event.kind}-${event.start}`}-${index}`}
                      className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity truncate relative"
                      style={{
                        backgroundColor: event.color || '#3b82f6',
                        color: 'white',
                        borderLeftStyle: spanInfo.continuedFrom ? 'none' : 'solid',
                        borderRightStyle: spanInfo.continues ? 'none' : 'solid',
                        borderTopLeftRadius: spanInfo.continuedFrom ? '0' : '4px',
                        borderBottomLeftRadius: spanInfo.continuedFrom ? '0' : '4px',
                        borderTopRightRadius: spanInfo.continues ? '0' : '4px',
                        borderBottomRightRadius: spanInfo.continues ? '0' : '4px',
                        marginLeft: spanInfo.continuedFrom ? '-8px' : '0',
                        marginRight: spanInfo.continues ? '-8px' : '0',
                        paddingLeft: spanInfo.continuedFrom ? '12px' : '4px',
                        paddingRight: spanInfo.continues ? '12px' : '4px',
                      }}
                      onClick={() => setSelectedEvent(event)}
                    >
                      {spanInfo.continuedFrom && '← '}
                      {event.kind === 31925 ? '✓ ' : ''}{event.title || 'Untitled Event'}
                      {spanInfo.continues && ' →'}
                    </div>
                  );
                })}
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

      <EventModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

function DayView({ onEditEvent }: { onEditEvent: (event: CalendarEvent) => void }) {
  const { currentDate } = useCalendar();
  const { getFilteredEvents } = useEvents();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const handleEditEvent = (event: CalendarEvent) => {
    onEditEvent(event);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    // TODO: Implement event deletion functionality
    console.log('Delete event:', event);
    setSelectedEvent(null);
  };

  const events = getFilteredEvents();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (hour: number) => {
    return hour === 0 ? '12 AM' : 
           hour < 12 ? `${hour} AM` : 
           hour === 12 ? '12 PM' : 
           `${hour - 12} PM`;
  };

  const dayEvents = events.filter(event => {
    const spanInfo = getEventSpanInfo(event, currentDate);
    return spanInfo.spans;
  });

  const eventPositions = calculateEventLayout(dayEvents, currentDate);

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
              const spanInfo = getEventSpanInfo(event, currentDate);
              const position = eventPositions.get(event.id || `${event.kind}-${event.start}`) || {
                top: 0, height: 30, left: 2, width: 95, zIndex: 10
              };

              return (
                <div
                  key={event.id || `${event.kind}-${event.start}`}
                  className="absolute p-2 rounded text-sm cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                  style={{
                    top: `${position.top}px`,
                    height: `${position.height}px`,
                    left: `${position.left}%`,
                    width: `${position.width}%`,
                    backgroundColor: event.color || '#3b82f6',
                    color: 'white',
                    zIndex: position.zIndex,
                    borderLeftStyle: spanInfo.continuedFrom ? 'none' : 'solid',
                    borderRightStyle: spanInfo.continues ? 'none' : 'solid',
                  }}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="font-medium truncate">
                    {spanInfo.continuedFrom && '← '}
                    {event.kind === 31925 ? '✓ ' : ''}{event.title || 'Untitled Event'}
                    {spanInfo.continues && ' →'}
                  </div>
                  {event.location && position.height > 50 && (
                    <div className="truncate opacity-90 text-xs">
                      {event.location}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <EventModal 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

export default function EnhancedCalendarView() {
  const { view } = useCalendar();
  const { data: calendarEvents, isLoading, error } = useCalendarEvents();
  const { user } = useCurrentUser();
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  
  // Hash-based change detection to prevent infinite re-renders
  const [lastEventHash, setLastEventHash] = useState('');

  // Create a hash of events to detect real changes
  const eventsHash = React.useMemo(() => {
    if (!calendarEvents) return '';
    return calendarEvents.map(e => `${e.id}-${e.start || 'no-time'}-${e.source || 'no-source'}`).join('|');
  }, [calendarEvents]);

  // Memoize event categorization to avoid repeated filtering
  const categorizedEvents = React.useMemo(() => {
    if (!calendarEvents) return null;

    // Separate private and public events by source
    const publicEvents = calendarEvents.filter(event => event.source !== 'private');
    const privateEvents = calendarEvents.filter(event => event.source === 'private');
    
    return {
      // Public events
      dayEvents: publicEvents.filter(event => event.kind === 31922),
      timeEvents: publicEvents.filter(event => event.kind === 31923),
      availabilityTemplates: publicEvents.filter(event => event.kind === 31926),
      availabilityBlocks: publicEvents.filter(event => event.kind === 31927),

      // Private events
      privateDayEvents: privateEvents.filter(event => event.kind === 31922),
      privateTimeEvents: privateEvents.filter(event => event.kind === 31923),
      privateRsvps: privateEvents.filter(event => event.kind === 31925),

      // All RSVP events (kind 31925) regardless of time inheritance
      allRsvpKind31925: calendarEvents.filter(event => event.kind === 31925)
    };
  }, [calendarEvents]);

  // Update events context when data loads
  const eventsContext = useEvents();
  useEffect(() => {
    if (categorizedEvents && eventsHash !== lastEventHash) {
      setLastEventHash(eventsHash);
      
      eventsContext.setDayEvents(categorizedEvents.dayEvents);
      eventsContext.setTimeEvents(categorizedEvents.timeEvents); // Time events only, no RSVPs
      eventsContext.setRsvpEvents(categorizedEvents.allRsvpKind31925); // RSVPs go in their own category
      eventsContext.setBookingBlocks([...categorizedEvents.availabilityBlocks, ...categorizedEvents.availabilityTemplates]); // Combine templates and blocks
      eventsContext.setPrivateDayEvents(categorizedEvents.privateDayEvents);
      eventsContext.setPrivateTimeEvents(categorizedEvents.privateTimeEvents);
      eventsContext.setPrivateRsvps(categorizedEvents.privateRsvps);
    }
  }, [eventsHash, categorizedEvents, eventsContext, lastEventHash]);

  // Edit modal handlers
  const handleOpenEditModal = (event: CalendarEvent) => {
    setEventToEdit(event);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEventToEdit(null);
  };

  const handleEventUpdated = () => {
    // The calendar events will be automatically refreshed via the useCalendarEvents hook
    // due to query invalidation in the publish hooks
  };

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

  const renderView = () => {
    switch (view) {
      case 'day':
        return <DayView onEditEvent={handleOpenEditModal} />;
      case 'week':
        return <WeekView onEditEvent={handleOpenEditModal} />;
      case 'month':
        return <MonthView onEditEvent={handleOpenEditModal} />;
      default:
        return <WeekView onEditEvent={handleOpenEditModal} />;
    }
  };

  return (
    <>
      {renderView()}
      <EditEventModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        event={eventToEdit}
        onEventUpdated={handleEventUpdated}
      />
    </>
  );
}